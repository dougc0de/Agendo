import {
    actualizarCobro as actualizarCobroRepository,
    buscarCobroPorId,
    buscarCobroPorReservaId,
    crearCobro as crearCobroRepository,
    listarCobrosPorWorkspaceId
} from "../repositories/financeRepository.js";
import { buscarReservaPorId as buscarReservaPorIdRepository } from "../repositories/reservaRepository.js";
import { listarReservas as listarReservasRepository } from "../repositories/reservaRepository.js";
import { buscarSalaPorId } from "../repositories/salaRepository.js";
import { canAccessFinance } from "../../shared/roles.js";

const ESTADOS_COBRO = ["pendiente", "pagado", "anulado"];
const METODOS_PAGO = ["efectivo", "tarjeta", "transferencia", "otro"];
const DEFAULT_CURRENCY_CODE = "CRC";

function resolveWorkspaceId(auth) {
    const workspaceId = Number(auth?.workspaceId);

    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
        return null;
    }

    return workspaceId;
}

function resolveUserId(auth) {
    const userId = Number(auth?.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
        return null;
    }

    return userId;
}

function hasFinanceAccess(auth) {
    return canAccessFinance({
        membershipRole: auth?.membershipRole,
        userRole: auth?.userRole
    });
}

function normalizarTexto(valor) {
    return String(valor ?? "").trim();
}

function normalizarFecha(valor) {
    if (!valor) {
        return null;
    }

    if (valor instanceof Date) {
        return valor.toISOString().slice(0, 10);
    }

    return String(valor).slice(0, 10);
}

function normalizarEstadoCobro(valor) {
    return normalizarTexto(valor).toLowerCase() || "pendiente";
}

function normalizarMetodoPago(valor) {
    return normalizarTexto(valor).toLowerCase() || "otro";
}

function normalizarMonto(valor) {
    const amount = Number(valor);
    return Number.isFinite(amount) ? amount : NaN;
}

function normalizarPaidAt(valor, paymentStatus) {
    if (paymentStatus !== "pagado") {
        return null;
    }

    if (!valor) {
        return new Date().toISOString();
    }

    const date = new Date(valor);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatearCobroSalida(filaCobro) {
    if (!filaCobro) {
        return null;
    }

    return {
        id: filaCobro.id,
        workspaceId: filaCobro.workspace_id,
        reservationId: filaCobro.reservation_id,
        patientId: filaCobro.patient_id,
        patientNameSnapshot: filaCobro.patient_name_snapshot,
        roomId: filaCobro.room_id,
        roomNameSnapshot: filaCobro.room_name_snapshot,
        branchId: filaCobro.branch_id ?? null,
        branchNameSnapshot: filaCobro.branch_name_snapshot ?? null,
        procedureName: filaCobro.procedure_name,
        tipoAtencion: filaCobro.tipo_atencion,
        amount: Number(filaCobro.amount ?? 0),
        currencyCode: filaCobro.currency_code ?? DEFAULT_CURRENCY_CODE,
        paymentStatus: filaCobro.payment_status,
        paymentMethod: filaCobro.payment_method,
        paidAt: filaCobro.paid_at ?? null,
        registeredByUserId: filaCobro.registered_by_user_id,
        notes: filaCobro.notes ?? "",
        reservationDate: normalizarFecha(filaCobro.reservation_date),
        reservationStartTime: String(filaCobro.reservation_start_time ?? "").slice(0, 5),
        reservationEndTime: String(filaCobro.reservation_end_time ?? "").slice(0, 5),
        reservationStatus: filaCobro.reservation_status,
        reservationUserId: filaCobro.reservation_user_id ?? null,
        reservationUserName: filaCobro.reservation_user_nombre ?? null,
        createdAt: filaCobro.created_at,
        updatedAt: filaCobro.updated_at
    };
}

function cumpleFiltrosCobro(filaCobro, filtros = {}) {
    const from = normalizarFecha(filtros.from);
    const to = normalizarFecha(filtros.to);
    const patientQuery = normalizarTexto(filtros.patient).toLowerCase();
    const userId = Number(filtros.userId);
    const roomId = Number(filtros.roomId);
    const paymentStatus = normalizarEstadoCobro(filtros.paymentStatus);

    if (from && normalizarFecha(filaCobro.reservation_date) < from) {
        return false;
    }

    if (to && normalizarFecha(filaCobro.reservation_date) > to) {
        return false;
    }

    if (
        patientQuery &&
        !String(filaCobro.patient_name_snapshot ?? "").toLowerCase().includes(patientQuery)
    ) {
        return false;
    }

    if (Number.isInteger(userId) && userId > 0 && filaCobro.reservation_user_id !== userId) {
        return false;
    }

    if (Number.isInteger(roomId) && roomId > 0 && filaCobro.room_id !== roomId) {
        return false;
    }

    if (
        paymentStatus &&
        paymentStatus !== "todos" &&
        ESTADOS_COBRO.includes(paymentStatus) &&
        filaCobro.payment_status !== paymentStatus
    ) {
        return false;
    }

    return true;
}

function estaDentroDelRango(fecha, from, to) {
    const normalizedDate = normalizarFecha(fecha);

    if (!normalizedDate) {
        return !from && !to;
    }

    if (from && normalizedDate < from) {
        return false;
    }

    if (to && normalizedDate > to) {
        return false;
    }

    return true;
}

function cumpleFiltrosReservaParaResumen(filaReserva, filtros = {}) {
    const from = normalizarFecha(filtros.from);
    const to = normalizarFecha(filtros.to);
    const patientQuery = normalizarTexto(filtros.patient).toLowerCase();
    const userId = Number(filtros.userId);
    const roomId = Number(filtros.roomId);

    if (from && normalizarFecha(filaReserva.fecha) < from) {
        return false;
    }

    if (to && normalizarFecha(filaReserva.fecha) > to) {
        return false;
    }

    if (
        patientQuery &&
        ![
            filaReserva.paciente_nombre,
            filaReserva.paciente_telefono,
            filaReserva.paciente_correo
        ]
            .join(" ")
            .toLowerCase()
            .includes(patientQuery)
    ) {
        return false;
    }

    if (Number.isInteger(userId) && userId > 0 && filaReserva.usuario_id !== userId) {
        return false;
    }

    if (Number.isInteger(roomId) && roomId > 0 && filaReserva.sala_id !== roomId) {
        return false;
    }

    return true;
}

function buildUsageStats(rows) {
    const roomMap = new Map();
    const userMap = new Map();

    for (const row of rows) {
        if (row.estado === "cancelada") {
            continue;
        }

        const roomKey = Number(row.sala_id);
        const roomName = row.sala_nombre ?? `Sala #${row.sala_id}`;
        const userKey = Number(row.usuario_id);
        const userName = row.usuario_nombre ?? `Usuario #${row.usuario_id}`;
        const startMinutes =
            Number(String(row.hora_inicio).slice(0, 2)) * 60 +
            Number(String(row.hora_inicio).slice(3, 5));
        const endMinutes =
            Number(String(row.hora_fin).slice(0, 2)) * 60 +
            Number(String(row.hora_fin).slice(3, 5));
        const hoursUsed = Math.max(0, endMinutes - startMinutes) / 60;

        if (!roomMap.has(roomKey)) {
            roomMap.set(roomKey, {
                roomId: roomKey,
                roomName,
                frequency: 0,
                hoursUsed: 0,
                capitalGenerated: 0
            });
        }

        if (!userMap.has(userKey)) {
            userMap.set(userKey, {
                userId: userKey,
                userName,
                capitalGenerated: 0
            });
        }

        roomMap.get(roomKey).frequency += 1;
        roomMap.get(roomKey).hoursUsed += hoursUsed;
    }

    return {
        roomMap,
        userMap
    };
}

async function obtenerReservaProcedural(reservationId, workspaceId) {
    const reservation = await buscarReservaPorIdRepository(reservationId, workspaceId);

    if (!reservation) {
        return {
            ok: false,
            msg: "La reserva indicada no existe en esta cuenta."
        };
    }

    if (reservation.tipo_atencion !== "procedimiento") {
        return {
            ok: false,
            msg: "Solo las reservas de procedimiento pueden registrarse en finanzas."
        };
    }

    return {
        ok: true,
        data: reservation
    };
}

function normalizarPayloadCobro(payload = {}) {
    const paymentStatus = normalizarEstadoCobro(payload.paymentStatus);

    return {
        reservationId: Number(payload.reservationId),
        procedureName: normalizarTexto(payload.procedureName),
        amount: normalizarMonto(payload.amount),
        currencyCode: normalizarTexto(payload.currencyCode).toUpperCase() || DEFAULT_CURRENCY_CODE,
        paymentStatus,
        paymentMethod: normalizarMetodoPago(payload.paymentMethod),
        paidAt: normalizarPaidAt(payload.paidAt, paymentStatus),
        notes: normalizarTexto(payload.notes) || null
    };
}

export async function listarCobros(filtros, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!hasFinanceAccess(auth)) {
            return {
                ok: false,
                msg: "No autorizado. No tienes acceso al modulo financiero."
            };
        }

        const rows = await listarCobrosPorWorkspaceId(workspaceId);
        const filteredRows = rows.filter((row) => cumpleFiltrosCobro(row, filtros));

        return {
            ok: true,
            msg: "Cobros listados correctamente.",
            data: filteredRows.map((row) => formatearCobroSalida(row))
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al listar los cobros: ${error.message}`
        };
    }
}

export async function crearCobro(payload, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const registeredByUserId = resolveUserId(auth);

        if (!workspaceId || !registeredByUserId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!hasFinanceAccess(auth)) {
            return {
                ok: false,
                msg: "No autorizado. No tienes acceso al modulo financiero."
            };
        }

        const datos = normalizarPayloadCobro(payload);

        if (!Number.isInteger(datos.reservationId) || datos.reservationId <= 0) {
            return {
                ok: false,
                msg: "La reserva indicada no es valida."
            };
        }

        if (!datos.procedureName) {
            return {
                ok: false,
                msg: "El nombre del procedimiento es obligatorio."
            };
        }

        if (!Number.isFinite(datos.amount) || datos.amount < 0) {
            return {
                ok: false,
                msg: "El monto del cobro debe ser un numero valido."
            };
        }

        if (!ESTADOS_COBRO.includes(datos.paymentStatus)) {
            return {
                ok: false,
                msg: "El estado del cobro no es valido."
            };
        }

        if (!METODOS_PAGO.includes(datos.paymentMethod)) {
            return {
                ok: false,
                msg: "El metodo de pago no es valido."
            };
        }

        const cobroExistente = await buscarCobroPorReservaId(datos.reservationId, workspaceId);

        if (cobroExistente) {
            return {
                ok: false,
                msg: "Esta reserva ya tiene un cobro registrado."
            };
        }

        const reservationResult = await obtenerReservaProcedural(
            datos.reservationId,
            workspaceId
        );

        if (!reservationResult.ok) {
            return reservationResult;
        }

        const reservation = reservationResult.data;
        const room = await buscarSalaPorId(reservation.sala_id, workspaceId);

        if (!room) {
            return {
                ok: false,
                msg: "La sala asociada a la reserva no existe."
            };
        }

        const createdCharge = await crearCobroRepository({
            workspaceId,
            reservationId: reservation.id,
            patientId: reservation.paciente_id,
            patientNameSnapshot: reservation.paciente_nombre ?? `Paciente #${reservation.paciente_id}`,
            roomId: reservation.sala_id,
            roomNameSnapshot: reservation.sala_nombre ?? `Sala #${reservation.sala_id}`,
            branchId: room.sucursal_id ?? null,
            branchNameSnapshot: room.sucursal_nombre ?? null,
            procedureName: datos.procedureName,
            tipoAtencion: reservation.tipo_atencion,
            amount: datos.amount,
            currencyCode: datos.currencyCode || DEFAULT_CURRENCY_CODE,
            paymentStatus: datos.paymentStatus,
            paymentMethod: datos.paymentMethod,
            paidAt: datos.paidAt,
            registeredByUserId,
            notes: datos.notes
        });

        const row = await buscarCobroPorId(createdCharge.id, workspaceId);

        return {
            ok: true,
            msg: "Cobro registrado correctamente.",
            data: formatearCobroSalida(row)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al registrar el cobro: ${error.message}`
        };
    }
}

export async function actualizarCobro(id, payload, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const registeredByUserId = resolveUserId(auth);
        const chargeId = Number(id);

        if (!workspaceId || !registeredByUserId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!hasFinanceAccess(auth)) {
            return {
                ok: false,
                msg: "No autorizado. No tienes acceso al modulo financiero."
            };
        }

        if (!Number.isInteger(chargeId) || chargeId <= 0) {
            return {
                ok: false,
                msg: "El cobro indicado no es valido."
            };
        }

        const charge = await buscarCobroPorId(chargeId, workspaceId);

        if (!charge) {
            return {
                ok: false,
                msg: "El cobro indicado no existe en esta cuenta."
            };
        }

        const datos = normalizarPayloadCobro({
            reservationId: charge.reservation_id,
            procedureName: payload?.procedureName ?? charge.procedure_name,
            amount: payload?.amount ?? charge.amount,
            currencyCode: payload?.currencyCode ?? charge.currency_code,
            paymentStatus: payload?.paymentStatus ?? charge.payment_status,
            paymentMethod: payload?.paymentMethod ?? charge.payment_method,
            paidAt: payload?.paidAt ?? charge.paid_at,
            notes: payload?.notes ?? charge.notes
        });

        if (!datos.procedureName) {
            return {
                ok: false,
                msg: "El nombre del procedimiento es obligatorio."
            };
        }

        if (!Number.isFinite(datos.amount) || datos.amount < 0) {
            return {
                ok: false,
                msg: "El monto del cobro debe ser un numero valido."
            };
        }

        if (!ESTADOS_COBRO.includes(datos.paymentStatus)) {
            return {
                ok: false,
                msg: "El estado del cobro no es valido."
            };
        }

        if (!METODOS_PAGO.includes(datos.paymentMethod)) {
            return {
                ok: false,
                msg: "El metodo de pago no es valido."
            };
        }

        await actualizarCobroRepository(chargeId, workspaceId, {
            procedureName: datos.procedureName,
            amount: datos.amount,
            currencyCode: datos.currencyCode || DEFAULT_CURRENCY_CODE,
            paymentStatus: datos.paymentStatus,
            paymentMethod: datos.paymentMethod,
            paidAt: datos.paidAt,
            registeredByUserId,
            notes: datos.notes
        });

        const updatedCharge = await buscarCobroPorId(chargeId, workspaceId);

        return {
            ok: true,
            msg: "Cobro actualizado correctamente.",
            data: formatearCobroSalida(updatedCharge)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al actualizar el cobro: ${error.message}`
        };
    }
}

export async function obtenerResumenFinanciero(filtros, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!hasFinanceAccess(auth)) {
            return {
                ok: false,
                msg: "No autorizado. No tienes acceso al modulo financiero."
            };
        }

        const chargeRows = await listarCobrosPorWorkspaceId(workspaceId);
        const filteredCharges = chargeRows.filter((row) => cumpleFiltrosCobro(row, filtros));
        const from = normalizarFecha(filtros.from);
        const to = normalizarFecha(filtros.to);
        const reservationRows = (await listarReservasRepository(workspaceId)).filter((row) =>
            cumpleFiltrosReservaParaResumen(row, filtros)
        );
        const { roomMap, userMap } = buildUsageStats(reservationRows);

        let ingresosCobrados = 0;
        let ingresosPendientes = 0;
        let procedimientosCobrados = 0;

        for (const row of filteredCharges) {
            const roomEntry = roomMap.get(Number(row.room_id));
            const userEntry = userMap.get(Number(row.reservation_user_id));
            const withinPaidRange = estaDentroDelRango(row.paid_at, from, to);

            if (row.payment_status === "pagado" && withinPaidRange) {
                ingresosCobrados += Number(row.amount ?? 0);
                procedimientosCobrados += 1;

                if (roomEntry) {
                    roomEntry.capitalGenerated += Number(row.amount ?? 0);
                }

                if (userEntry) {
                    userEntry.capitalGenerated += Number(row.amount ?? 0);
                }
            } else if (row.payment_status === "pendiente") {
                ingresosPendientes += Number(row.amount ?? 0);
            }
        }

        return {
            ok: true,
            msg: "Resumen financiero generado correctamente.",
            data: {
                ingresosCobrados,
                ingresosPendientes,
                procedimientosCobrados,
                rooms: [...roomMap.values()].sort((left, right) => right.capitalGenerated - left.capitalGenerated),
                users: [...userMap.values()].sort((left, right) => right.capitalGenerated - left.capitalGenerated)
            }
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al generar el resumen financiero: ${error.message}`
        };
    }
}

import { withTransaction } from "../db/connection.js";
import {
    actualizarCobro as actualizarCobroRepository,
    actualizarItemInventario as actualizarItemInventarioRepository,
    buscarCobroPorId,
    buscarCobroPorReservaId,
    buscarItemInventarioPorId,
    crearCobro as crearCobroRepository,
    crearItemInventario as crearItemInventarioRepository,
    listarCobrosPorWorkspaceId,
    listarInventarioPorWorkspaceId,
    listarLineasInsumosPorChargeIds,
    reemplazarLineasInsumos
} from "../repositories/financeRepository.js";
import {
    buscarReservaPorId as buscarReservaPorIdRepository,
    listarReservas as listarReservasRepository
} from "../repositories/reservaRepository.js";
import { buscarSalaPorId } from "../repositories/salaRepository.js";
import { canAccessFinance, isAdministrativeUser } from "../../shared/roles.js";
import { obtenerConfiguracionOperativaNormalizada } from "./workspaceSettingsService.js";

const ESTADOS_COBRO = ["pendiente", "pagado", "anulado"];
const METODOS_PAGO = ["efectivo", "tarjeta", "transferencia", "otro"];
const ESTADOS_INVENTARIO = ["activo", "inactivo"];
const MODOS_COBRO = ["solo_sala", "solo_insumos", "sala_mas_insumos"];
const DECISIONES_COBRO = ["cobrable", "exonerado"];
const DEFAULT_CURRENCY_CODE = "CRC";
const DEFAULT_PRICING_MODE = "solo_sala";

function resolveWorkspaceId(auth) {
    const workspaceId = Number(auth?.workspaceId);
    return Number.isInteger(workspaceId) && workspaceId > 0 ? workspaceId : null;
}

function resolveUserId(auth) {
    const userId = Number(auth?.userId);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function hasFinanceAccess(auth) {
    return canAccessFinance({
        membershipRole: auth?.membershipRole,
        userRole: auth?.userRole
    });
}

function canWaiveCharge(auth) {
    return isAdministrativeUser({
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

function normalizarMonto(valor, fallback = NaN) {
    if (valor === undefined || valor === null || valor === "") {
        return fallback;
    }

    const amount = Number(valor);
    return Number.isFinite(amount) ? amount : NaN;
}

function normalizarMoneda(valor) {
    return normalizarTexto(valor).toUpperCase() || DEFAULT_CURRENCY_CODE;
}

function normalizarModoCobro(valor, fallback = DEFAULT_PRICING_MODE) {
    const normalized = normalizarTexto(valor).toLowerCase();
    return MODOS_COBRO.includes(normalized) ? normalized : fallback;
}

function normalizarDecisionCobro(valor, fallback = "cobrable") {
    const normalized = normalizarTexto(valor).toLowerCase();
    return DECISIONES_COBRO.includes(normalized) ? normalized : fallback;
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

function roundMoney(value) {
    return Number(Number(value ?? 0).toFixed(2));
}

function formatearLineaInsumo(linea) {
    return {
        id: linea.id,
        chargeId: linea.charge_id,
        inventoryItemId: linea.inventory_item_id,
        itemNameSnapshot: linea.item_name_snapshot,
        itemCategorySnapshot: linea.item_category_snapshot ?? "",
        unitSnapshot: linea.unit_snapshot,
        quantity: Number(linea.quantity ?? 0),
        unitCost: Number(linea.unit_cost ?? 0),
        unitPrice: Number(linea.unit_price ?? 0),
        subtotalCost: Number(linea.subtotal_cost ?? 0),
        subtotalPrice: Number(linea.subtotal_price ?? 0),
        notes: linea.notes ?? "",
        createdAt: linea.created_at,
        updatedAt: linea.updated_at
    };
}

function formatearCobroSalida(filaCobro, supplies = []) {
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
        amount: Number(filaCobro.total_billed_amount ?? filaCobro.amount ?? 0),
        currencyCode: filaCobro.currency_code ?? DEFAULT_CURRENCY_CODE,
        paymentStatus: filaCobro.payment_status,
        paymentMethod: filaCobro.payment_method,
        paidAt: filaCobro.paid_at ?? null,
        registeredByUserId: filaCobro.registered_by_user_id,
        notes: filaCobro.notes ?? "",
        pricingMode: filaCobro.pricing_mode ?? DEFAULT_PRICING_MODE,
        roomChargeAmount: Number(filaCobro.room_charge_amount ?? 0),
        suppliesTotalAmount: Number(filaCobro.supplies_total_amount ?? 0),
        suppliesTotalCost: Number(filaCobro.supplies_total_cost ?? 0),
        totalBilledAmount: Number(filaCobro.total_billed_amount ?? filaCobro.amount ?? 0),
        chargeDecision: filaCobro.charge_decision ?? "cobrable",
        waivedByUserId: filaCobro.waived_by_user_id ?? null,
        waivedByUserName: filaCobro.waived_by_user_nombre ?? null,
        waiverReason: filaCobro.waiver_reason ?? "",
        reservationDate: normalizarFecha(filaCobro.reservation_date),
        reservationStartTime: String(filaCobro.reservation_start_time ?? "").slice(0, 5),
        reservationEndTime: String(filaCobro.reservation_end_time ?? "").slice(0, 5),
        reservationStatus: filaCobro.reservation_status,
        reservationUserId: filaCobro.reservation_user_id ?? null,
        reservationUserName: filaCobro.reservation_user_nombre ?? null,
        createdAt: filaCobro.created_at,
        updatedAt: filaCobro.updated_at,
        supplies
    };
}

function formatearInventarioSalida(row) {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        nombre: row.nombre,
        categoria: row.categoria ?? "",
        unidad: row.unidad,
        costoBase: Number(row.costo_base ?? 0),
        precioSugerido: Number(row.precio_sugerido ?? 0),
        estado: row.estado,
        createdAt: row.created_at,
        updatedAt: row.updated_at
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

async function obtenerReservaProcedural(reservationId, workspaceId, executor = undefined) {
    const reservation = await buscarReservaPorIdRepository(reservationId, workspaceId, executor);

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

async function enriquecerCobrosConLineas(rows, workspaceId, executor = undefined) {
    const chargeIds = rows.map((row) => Number(row.id));
    const lineas = await listarLineasInsumosPorChargeIds(chargeIds, workspaceId, executor);
    const grouped = new Map();

    for (const linea of lineas) {
        const chargeId = Number(linea.charge_id);

        if (!grouped.has(chargeId)) {
            grouped.set(chargeId, []);
        }

        grouped.get(chargeId).push(formatearLineaInsumo(linea));
    }

    return rows.map((row) =>
        formatearCobroSalida(row, grouped.get(Number(row.id)) ?? [])
    );
}

function normalizarLineasInsumos(payloadSupplies = []) {
    if (!Array.isArray(payloadSupplies)) {
        return [];
    }

    return payloadSupplies
        .map((linea) => ({
            inventoryItemId: Number(linea?.inventoryItemId),
            quantity: normalizarMonto(linea?.quantity),
            unitCost: normalizarMonto(linea?.unitCost, 0),
            unitPrice: normalizarMonto(linea?.unitPrice, 0),
            notes: normalizarTexto(linea?.notes) || null
        }))
        .filter((linea) => Number.isInteger(linea.inventoryItemId) && linea.inventoryItemId > 0);
}

async function prepararLineasInsumos(lineas, workspaceId, executor = undefined) {
    const prepared = [];

    for (const linea of lineas) {
        if (!Number.isFinite(linea.quantity) || linea.quantity <= 0) {
            return {
                ok: false,
                msg: "Cada insumo debe tener una cantidad mayor a cero."
            };
        }

        if (!Number.isFinite(linea.unitCost) || linea.unitCost < 0) {
            return {
                ok: false,
                msg: "El costo unitario de los insumos debe ser valido."
            };
        }

        if (!Number.isFinite(linea.unitPrice) || linea.unitPrice < 0) {
            return {
                ok: false,
                msg: "El precio unitario de los insumos debe ser valido."
            };
        }

        const inventoryItem = await buscarItemInventarioPorId(
            linea.inventoryItemId,
            workspaceId,
            executor
        );

        if (!inventoryItem) {
            return {
                ok: false,
                msg: "Uno de los insumos seleccionados no existe en esta cuenta."
            };
        }

        prepared.push({
            inventoryItemId: inventoryItem.id,
            itemNameSnapshot: inventoryItem.nombre,
            itemCategorySnapshot: inventoryItem.categoria ?? null,
            unitSnapshot: inventoryItem.unidad,
            quantity: roundMoney(linea.quantity),
            unitCost: roundMoney(linea.unitCost),
            unitPrice: roundMoney(linea.unitPrice),
            subtotalCost: roundMoney(linea.quantity * linea.unitCost),
            subtotalPrice: roundMoney(linea.quantity * linea.unitPrice),
            notes: linea.notes
        });
    }

    return {
        ok: true,
        data: prepared
    };
}

async function normalizarPayloadReporte(payload, auth, opciones = {}) {
    const workspaceId = resolveWorkspaceId(auth);
    const registeredByUserId = resolveUserId(auth);
    const existingCharge = opciones.existingCharge ?? null;
    const pricingModeFallback =
        opciones.defaultPricingMode ??
        existingCharge?.pricingMode ??
        existingCharge?.pricing_mode ??
        DEFAULT_PRICING_MODE;
    const pricingMode = normalizarModoCobro(payload?.pricingMode, pricingModeFallback);
    const chargeDecision = normalizarDecisionCobro(
        payload?.chargeDecision,
        existingCharge?.chargeDecision ?? existingCharge?.charge_decision ?? "cobrable"
    );
    const roomChargeAmount = roundMoney(
        normalizarMonto(
            payload?.roomChargeAmount,
            Number(existingCharge?.roomChargeAmount ?? existingCharge?.room_charge_amount ?? 0)
        )
    );
    const paymentStatus = normalizarEstadoCobro(
        payload?.paymentStatus ?? existingCharge?.paymentStatus ?? existingCharge?.payment_status
    );
    const paymentMethod = normalizarMetodoPago(
        payload?.paymentMethod ?? existingCharge?.paymentMethod ?? existingCharge?.payment_method
    );
    const currencyCode = normalizarMoneda(
        payload?.currencyCode ?? existingCharge?.currencyCode ?? existingCharge?.currency_code
    );
    const procedureName = normalizarTexto(
        payload?.procedureName ?? existingCharge?.procedureName ?? existingCharge?.procedure_name
    );
    const notes = normalizarTexto(payload?.notes ?? existingCharge?.notes) || null;
    const waiverReason = normalizarTexto(
        payload?.waiverReason ?? existingCharge?.waiverReason ?? existingCharge?.waiver_reason
    );
    const requestedSupplies = normalizarLineasInsumos(
        payload?.supplies ?? existingCharge?.supplies ?? []
    );

    if (!workspaceId || !registeredByUserId) {
        return {
            ok: false,
            msg: "No autorizado. Falta el contexto de la cuenta."
        };
    }

    if (!procedureName) {
        return {
            ok: false,
            msg: "El nombre del procedimiento es obligatorio."
        };
    }

    if (!MODOS_COBRO.includes(pricingMode)) {
        return {
            ok: false,
            msg: "La modalidad de cobro no es valida."
        };
    }

    if (!ESTADOS_COBRO.includes(paymentStatus)) {
        return {
            ok: false,
            msg: "El estado del cobro no es valido."
        };
    }

    if (!METODOS_PAGO.includes(paymentMethod)) {
        return {
            ok: false,
            msg: "El metodo de pago no es valido."
        };
    }

    if (!DECISIONES_COBRO.includes(chargeDecision)) {
        return {
            ok: false,
            msg: "La decision de cobro no es valida."
        };
    }

    if (!Number.isFinite(roomChargeAmount) || roomChargeAmount < 0) {
        return {
            ok: false,
            msg: "El monto por uso de sala debe ser un numero valido."
        };
    }

    if (
        (existingCharge?.chargeDecision === "exonerado" ||
            existingCharge?.charge_decision === "exonerado") &&
        !canWaiveCharge(auth)
    ) {
        return {
            ok: false,
            msg: "Solo el admin puede editar un reporte exonerado."
        };
    }

    if (chargeDecision === "exonerado" && !canWaiveCharge(auth)) {
        return {
            ok: false,
            msg: "Solo el admin puede exonerar una operacion."
        };
    }

    const preparedSuppliesResult = await prepararLineasInsumos(
        requestedSupplies,
        workspaceId,
        opciones.executor
    );

    if (!preparedSuppliesResult.ok) {
        return preparedSuppliesResult;
    }

    const preparedSupplies = preparedSuppliesResult.data;
    const suppliesTotalAmount = roundMoney(
        preparedSupplies.reduce((sum, linea) => sum + linea.subtotalPrice, 0)
    );
    const suppliesTotalCost = roundMoney(
        preparedSupplies.reduce((sum, linea) => sum + linea.subtotalCost, 0)
    );

    if (pricingMode === "solo_sala" && preparedSupplies.length) {
        return {
            ok: false,
            msg: "La modalidad solo sala no admite insumos cargados en el reporte."
        };
    }

    if (pricingMode === "solo_insumos" && !preparedSupplies.length) {
        return {
            ok: false,
            msg: "La modalidad solo insumos requiere al menos un insumo en el reporte."
        };
    }

    if (pricingMode === "solo_insumos" && roomChargeAmount > 0) {
        return {
            ok: false,
            msg: "La modalidad solo insumos no debe incluir monto de sala."
        };
    }

    if (pricingMode === "sala_mas_insumos" && !preparedSupplies.length) {
        return {
            ok: false,
            msg: "La modalidad sala mas insumos requiere al menos un insumo cargado."
        };
    }

    const totalBilledAmount = roundMoney(roomChargeAmount + suppliesTotalAmount);
    const normalizedPaymentStatus = chargeDecision === "exonerado" ? "anulado" : paymentStatus;

    if (chargeDecision === "exonerado" && !waiverReason) {
        return {
            ok: false,
            msg: "El motivo de exoneracion es obligatorio."
        };
    }

    return {
        ok: true,
        data: {
            procedureName,
            currencyCode,
            pricingMode,
            roomChargeAmount,
            supplies: preparedSupplies,
            suppliesTotalAmount,
            suppliesTotalCost,
            totalBilledAmount,
            paymentStatus: normalizedPaymentStatus,
            paymentMethod,
            paidAt:
                chargeDecision === "exonerado"
                    ? null
                    : normalizarPaidAt(
                          payload?.paidAt ?? existingCharge?.paidAt ?? existingCharge?.paid_at,
                          normalizedPaymentStatus
                      ),
            notes,
            chargeDecision,
            waivedByUserId: chargeDecision === "exonerado" ? registeredByUserId : null,
            waiverReason: chargeDecision === "exonerado" ? waiverReason : null
        }
    };
}

function normalizarItemInventario(payload = {}) {
    return {
        nombre: normalizarTexto(payload.nombre),
        categoria: normalizarTexto(payload.categoria) || null,
        unidad: normalizarTexto(payload.unidad) || "unidad",
        costoBase: roundMoney(normalizarMonto(payload.costoBase, NaN)),
        precioSugerido: roundMoney(normalizarMonto(payload.precioSugerido, NaN)),
        estado: normalizarTexto(payload.estado).toLowerCase() || "activo"
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
            msg: "Reportes operativos listados correctamente.",
            data: await enriquecerCobrosConLineas(filteredRows, workspaceId)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al listar los reportes operativos: ${error.message}`
        };
    }
}

export async function obtenerReporteOperacionPdf(id, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const chargeId = Number(id);

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

        if (!Number.isInteger(chargeId) || chargeId <= 0) {
            return {
                ok: false,
                msg: "El reporte indicado no es valido."
            };
        }

        const charge = await buscarCobroPorId(chargeId, workspaceId);

        if (!charge) {
            return {
                ok: false,
                msg: "El reporte indicado no existe en esta cuenta."
            };
        }

        const [report] = await enriquecerCobrosConLineas([charge], workspaceId);

        return {
            ok: true,
            msg: "Datos del PDF cargados correctamente.",
            data: {
                ...report,
                generatedAt: new Date().toISOString()
            }
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al preparar el PDF: ${error.message}`
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

        const reservationId = Number(payload?.reservationId);

        if (!Number.isInteger(reservationId) || reservationId <= 0) {
            return {
                ok: false,
                msg: "La reserva indicada no es valida."
            };
        }

        const cobroExistente = await buscarCobroPorReservaId(reservationId, workspaceId);

        if (cobroExistente) {
            return {
                ok: false,
                msg: "Esta reserva ya tiene un reporte operativo registrado."
            };
        }

        const result = await withTransaction(async (client) => {
            const settings = await obtenerConfiguracionOperativaNormalizada(workspaceId, client);
            const normalizedPayload = await normalizarPayloadReporte(payload, auth, {
                defaultPricingMode: settings.defaultProcedurePricingMode,
                executor: client
            });

            if (!normalizedPayload.ok) {
                return normalizedPayload;
            }

            const reservationResult = await obtenerReservaProcedural(
                reservationId,
                workspaceId,
                client
            );

            if (!reservationResult.ok) {
                return reservationResult;
            }

            const reservation = reservationResult.data;
            const room = await buscarSalaPorId(reservation.sala_id, workspaceId, client);

            if (!room) {
                return {
                    ok: false,
                    msg: "La sala asociada a la reserva no existe."
                };
            }

            const createdCharge = await crearCobroRepository(
                {
                    workspaceId,
                    reservationId: reservation.id,
                    patientId: reservation.paciente_id,
                    patientNameSnapshot:
                        reservation.paciente_nombre ?? `Paciente #${reservation.paciente_id}`,
                    roomId: reservation.sala_id,
                    roomNameSnapshot: reservation.sala_nombre ?? `Sala #${reservation.sala_id}`,
                    branchId: room.sucursal_id ?? null,
                    branchNameSnapshot: room.sucursal_nombre ?? null,
                    procedureName: normalizedPayload.data.procedureName,
                    tipoAtencion: reservation.tipo_atencion,
                    amount: normalizedPayload.data.totalBilledAmount,
                    currencyCode: normalizedPayload.data.currencyCode,
                    paymentStatus: normalizedPayload.data.paymentStatus,
                    paymentMethod: normalizedPayload.data.paymentMethod,
                    paidAt: normalizedPayload.data.paidAt,
                    registeredByUserId,
                    notes: normalizedPayload.data.notes,
                    pricingMode: normalizedPayload.data.pricingMode,
                    roomChargeAmount: normalizedPayload.data.roomChargeAmount,
                    suppliesTotalAmount: normalizedPayload.data.suppliesTotalAmount,
                    suppliesTotalCost: normalizedPayload.data.suppliesTotalCost,
                    totalBilledAmount: normalizedPayload.data.totalBilledAmount,
                    chargeDecision: normalizedPayload.data.chargeDecision,
                    waivedByUserId: normalizedPayload.data.waivedByUserId,
                    waiverReason: normalizedPayload.data.waiverReason
                },
                client
            );

            await reemplazarLineasInsumos(
                createdCharge.id,
                workspaceId,
                normalizedPayload.data.supplies,
                client
            );

            const createdRow = await buscarCobroPorId(createdCharge.id, workspaceId, client);
            const [formattedReport] = await enriquecerCobrosConLineas(
                [createdRow],
                workspaceId,
                client
            );

            return {
                ok: true,
                msg: "Reporte operativo registrado correctamente.",
                data: formattedReport
            };
        });

        return result;
    } catch (error) {
        return {
            ok: false,
            msg: `Error al registrar el reporte operativo: ${error.message}`
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
                msg: "El reporte indicado no es valido."
            };
        }

        const result = await withTransaction(async (client) => {
            const charge = await buscarCobroPorId(chargeId, workspaceId, client);

            if (!charge) {
                return {
                    ok: false,
                    msg: "El reporte indicado no existe en esta cuenta."
                };
            }

            const existingReport = (await enriquecerCobrosConLineas([charge], workspaceId, client))[0];
            const settings = await obtenerConfiguracionOperativaNormalizada(workspaceId, client);
            const normalizedPayload = await normalizarPayloadReporte(payload, auth, {
                existingCharge: existingReport,
                defaultPricingMode: settings.defaultProcedurePricingMode,
                executor: client
            });

            if (!normalizedPayload.ok) {
                return normalizedPayload;
            }

            await actualizarCobroRepository(
                chargeId,
                workspaceId,
                {
                    procedureName: normalizedPayload.data.procedureName,
                    amount: normalizedPayload.data.totalBilledAmount,
                    currencyCode: normalizedPayload.data.currencyCode,
                    paymentStatus: normalizedPayload.data.paymentStatus,
                    paymentMethod: normalizedPayload.data.paymentMethod,
                    paidAt: normalizedPayload.data.paidAt,
                    registeredByUserId,
                    notes: normalizedPayload.data.notes,
                    pricingMode: normalizedPayload.data.pricingMode,
                    roomChargeAmount: normalizedPayload.data.roomChargeAmount,
                    suppliesTotalAmount: normalizedPayload.data.suppliesTotalAmount,
                    suppliesTotalCost: normalizedPayload.data.suppliesTotalCost,
                    totalBilledAmount: normalizedPayload.data.totalBilledAmount,
                    chargeDecision: normalizedPayload.data.chargeDecision,
                    waivedByUserId: normalizedPayload.data.waivedByUserId,
                    waiverReason: normalizedPayload.data.waiverReason
                },
                client
            );

            await reemplazarLineasInsumos(
                chargeId,
                workspaceId,
                normalizedPayload.data.supplies,
                client
            );

            const updatedRow = await buscarCobroPorId(chargeId, workspaceId, client);
            const [formattedReport] = await enriquecerCobrosConLineas(
                [updatedRow],
                workspaceId,
                client
            );

            return {
                ok: true,
                msg: "Reporte operativo actualizado correctamente.",
                data: formattedReport
            };
        });

        return result;
    } catch (error) {
        return {
            ok: false,
            msg: `Error al actualizar el reporte operativo: ${error.message}`
        };
    }
}

export async function listarInventario(auth) {
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
                msg: "No autorizado. No tienes acceso al inventario."
            };
        }

        const rows = await listarInventarioPorWorkspaceId(workspaceId);

        return {
            ok: true,
            msg: "Inventario cargado correctamente.",
            data: rows.map((row) => formatearInventarioSalida(row))
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al cargar el inventario: ${error.message}`
        };
    }
}

export async function crearItemInventario(payload, auth) {
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
                msg: "No autorizado. No tienes acceso al inventario."
            };
        }

        const datos = normalizarItemInventario(payload);

        if (!datos.nombre) {
            return {
                ok: false,
                msg: "El nombre del insumo es obligatorio."
            };
        }

        if (!Number.isFinite(datos.costoBase) || datos.costoBase < 0) {
            return {
                ok: false,
                msg: "El costo base del insumo debe ser valido."
            };
        }

        if (!Number.isFinite(datos.precioSugerido) || datos.precioSugerido < 0) {
            return {
                ok: false,
                msg: "El precio sugerido del insumo debe ser valido."
            };
        }

        if (!ESTADOS_INVENTARIO.includes(datos.estado)) {
            return {
                ok: false,
                msg: "El estado del insumo no es valido."
            };
        }

        const createdItem = await crearItemInventarioRepository({
            workspaceId,
            ...datos
        });

        return {
            ok: true,
            msg: "Insumo creado correctamente.",
            data: formatearInventarioSalida(createdItem)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al crear el insumo: ${error.message}`
        };
    }
}

export async function actualizarItemInventario(id, payload, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const itemId = Number(id);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!hasFinanceAccess(auth)) {
            return {
                ok: false,
                msg: "No autorizado. No tienes acceso al inventario."
            };
        }

        if (!Number.isInteger(itemId) || itemId <= 0) {
            return {
                ok: false,
                msg: "El insumo indicado no es valido."
            };
        }

        const existingItem = await buscarItemInventarioPorId(itemId, workspaceId);

        if (!existingItem) {
            return {
                ok: false,
                msg: "El insumo indicado no existe en esta cuenta."
            };
        }

        const datos = normalizarItemInventario({
            nombre: payload?.nombre ?? existingItem.nombre,
            categoria: payload?.categoria ?? existingItem.categoria,
            unidad: payload?.unidad ?? existingItem.unidad,
            costoBase: payload?.costoBase ?? existingItem.costo_base,
            precioSugerido: payload?.precioSugerido ?? existingItem.precio_sugerido,
            estado: payload?.estado ?? existingItem.estado
        });

        if (!datos.nombre) {
            return {
                ok: false,
                msg: "El nombre del insumo es obligatorio."
            };
        }

        if (!Number.isFinite(datos.costoBase) || datos.costoBase < 0) {
            return {
                ok: false,
                msg: "El costo base del insumo debe ser valido."
            };
        }

        if (!Number.isFinite(datos.precioSugerido) || datos.precioSugerido < 0) {
            return {
                ok: false,
                msg: "El precio sugerido del insumo debe ser valido."
            };
        }

        if (!ESTADOS_INVENTARIO.includes(datos.estado)) {
            return {
                ok: false,
                msg: "El estado del insumo no es valido."
            };
        }

        const updatedItem = await actualizarItemInventarioRepository(
            itemId,
            workspaceId,
            datos
        );

        return {
            ok: true,
            msg: "Insumo actualizado correctamente.",
            data: formatearInventarioSalida(updatedItem)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al actualizar el insumo: ${error.message}`
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
        let ingresosSala = 0;
        let ingresosInsumos = 0;
        let ingresosMixtos = 0;
        let procedimientosCobrados = 0;
        let operacionesExoneradas = 0;
        let montoExonerado = 0;
        let costoInsumos = 0;
        let margenBrutoAproximado = 0;

        for (const row of filteredCharges) {
            const billed = Number(row.total_billed_amount ?? row.amount ?? 0);
            const roomCharge = Number(row.room_charge_amount ?? 0);
            const suppliesRevenue = Number(row.supplies_total_amount ?? 0);
            const suppliesCost = Number(row.supplies_total_cost ?? 0);
            const roomEntry = roomMap.get(Number(row.room_id));
            const userEntry = userMap.get(Number(row.reservation_user_id));
            const withinPaidRange = estaDentroDelRango(row.paid_at, from, to);

            if (row.charge_decision === "exonerado") {
                operacionesExoneradas += 1;
                montoExonerado += billed;
                continue;
            }

            if (row.payment_status === "pagado" && withinPaidRange) {
                ingresosCobrados += billed;
                ingresosSala += roomCharge;
                ingresosInsumos += suppliesRevenue;
                costoInsumos += suppliesCost;
                margenBrutoAproximado += billed - suppliesCost;
                procedimientosCobrados += 1;

                if (row.pricing_mode === "sala_mas_insumos") {
                    ingresosMixtos += billed;
                }

                if (roomEntry) {
                    roomEntry.capitalGenerated += billed;
                }

                if (userEntry) {
                    userEntry.capitalGenerated += billed;
                }
            } else if (row.payment_status === "pendiente") {
                ingresosPendientes += billed;
            }
        }

        return {
            ok: true,
            msg: "Resumen financiero generado correctamente.",
            data: {
                ingresosCobrados: roundMoney(ingresosCobrados),
                ingresosPendientes: roundMoney(ingresosPendientes),
                ingresosSala: roundMoney(ingresosSala),
                ingresosInsumos: roundMoney(ingresosInsumos),
                ingresosMixtos: roundMoney(ingresosMixtos),
                procedimientosCobrados,
                operacionesExoneradas,
                montoExonerado: roundMoney(montoExonerado),
                costoInsumos: roundMoney(costoInsumos),
                margenBrutoAproximado: roundMoney(margenBrutoAproximado),
                cobrosRegistrados: filteredCharges.length,
                rooms: [...roomMap.values()].sort(
                    (left, right) => right.capitalGenerated - left.capitalGenerated
                ),
                users: [...userMap.values()].sort(
                    (left, right) => right.capitalGenerated - left.capitalGenerated
                )
            }
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al generar el resumen financiero: ${error.message}`
        };
    }
}

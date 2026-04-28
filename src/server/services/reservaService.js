import { Reserva, Sala } from "../../models/index.js";
import {
    crearReserva as crearReservaRepository,
    buscarReservaPorId as buscarReservaPorIdRepository,
    buscarReservasPorSalaYFecha as buscarReservasPorSalaYFechaRepository,
    listarReservas as listarReservasRepository,
    actualizarReserva as actualizarReservaRepository,
    actualizarEstadoReserva as actualizarEstadoReservaRepository,
    actualizarResultadoReserva as actualizarResultadoReservaRepository,
    eliminarReserva as eliminarReservaRepository
} from "../repositories/reservaRepository.js";
import { buscarSalaPorId } from "../repositories/salaRepository.js";
import { buscarPacientePorId as buscarPacientePorIdRepository } from "../repositories/pacienteRepository.js";
import { listarCobrosPorReservationIds } from "../repositories/financeRepository.js";
import { buscarUsuarioInternoPorId } from "../repositories/workspaceMemberRepository.js";
import { obtenerConfiguracionOperativaNormalizada } from "./workspaceSettingsService.js";
import {
    canAccessFinance,
    canViewAllPastReservations,
    isDoctorUser,
    normalizeRole
} from "../../shared/roles.js";

const ESTADOS_RESERVA_PERMITIDOS = ["pendiente", "confirmada", "cancelada"];
const TIPOS_ATENCION_PERMITIDOS = ["consulta", "procedimiento"];
const RESULTADOS_RESERVA_PERMITIDOS = ["pendiente", "atendida", "no_show", "cancelada"];
const PAST_RESERVATION_ERROR_MESSAGE =
    "La fecha u hora de la reserva ya transcurrieron. Revisalas una vez mas.";

function esIdValido(valor) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0;
}

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

function actorPuedeAsignarDoctorResponsable(auth) {
    return canAccessFinance({
        membershipRole: auth?.membershipRole,
        userRole: auth?.userRole
    });
}

function resolverUsuarioResponsable(datosReserva, auth, options = {}) {
    const actorUserId = resolveUserId(auth);
    const actorEsDoctor = isDoctorUser({
        membershipRole: auth?.membershipRole,
        userRole: auth?.userRole
    });
    const currentResponsibleUserId =
        Number(options.currentResponsibleUserId ?? 0) || null;

    if (!actorUserId) {
        return {
            ok: false,
            msg: "No autorizado. Falta el usuario de sesion."
        };
    }

    if (actorEsDoctor) {
        return {
            ok: true,
            data: currentResponsibleUserId ?? actorUserId
        };
    }

    if (!actorPuedeAsignarDoctorResponsable(auth)) {
        return {
            ok: false,
            msg: "No autorizado. Tu rol no puede asignar responsables en reservas."
        };
    }

    const requestedResponsibleUserId =
        Number(datosReserva?.usuarioId ?? currentResponsibleUserId ?? 0) || null;

    if (!requestedResponsibleUserId) {
        return {
            ok: false,
            msg: "Debes seleccionar un doctor responsable para esta reserva."
        };
    }

    return {
        ok: true,
        data: requestedResponsibleUserId
    };
}

function normalizarFecha(fecha) {
    if (!fecha) {
        return null;
    }

    if (fecha instanceof Date) {
        return fecha.toISOString().slice(0, 10);
    }

    return String(fecha).slice(0, 10);
}

function normalizarHora(hora) {
    if (!hora) {
        return null;
    }

    return String(hora).slice(0, 5);
}

function normalizarTexto(valor) {
    return String(valor ?? "").trim();
}

function normalizarFechaHora(valor) {
    if (!valor) {
        return null;
    }

    const date = new Date(valor);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizarTipoAtencion(valor) {
    return normalizarTexto(valor).toLowerCase();
}

function disponibilidadABooleano(disponibilidad) {
    if (typeof disponibilidad === "boolean") {
        return disponibilidad;
    }

    return String(disponibilidad).toLowerCase() === "disponible";
}

function mapearEstadoADominio(estado) {
    return estado === "cancelada" ? "cancelada" : "activa";
}

function deriveFinancialStatus(filaCobro) {
    if (!filaCobro) {
        return "sin_factura";
    }

    if (filaCobro.charge_decision === "exonerado") {
        return "exonerado";
    }

    if (filaCobro.payment_status === "pagado") {
        return "pagado";
    }

    if (filaCobro.payment_status === "anulado") {
        return "anulado";
    }

    if (filaCobro.payment_status === "pendiente") {
        return "pendiente";
    }

    return "sin_factura";
}

function derivePaymentLabel(financialStatus) {
    return financialStatus === "pagado" ? "Pagado" : "No pagado";
}

function matchesPastPaymentFilter(financialStatus, paymentStatusFilter) {
    const normalizedFilter = normalizarTexto(paymentStatusFilter).toLowerCase();

    if (!normalizedFilter || normalizedFilter === "todos") {
        return true;
    }

    if (normalizedFilter === "pagado") {
        return financialStatus === "pagado";
    }

    if (normalizedFilter === "no_pagado") {
        return financialStatus !== "pagado";
    }

    return financialStatus === normalizedFilter;
}

function formatearReservaSalida(filaReserva, options = {}) {
    if (!filaReserva) {
        return null;
    }

    const financialCharge = options.financialCharge ?? null;
    const financialStatus = deriveFinancialStatus(financialCharge);

    return {
        id: filaReserva.id,
        fecha: normalizarFecha(filaReserva.fecha),
        horaInicio: normalizarHora(filaReserva.hora_inicio),
        horaFin: normalizarHora(filaReserva.hora_fin),
        descripcion: filaReserva.descripcion,
        estado: filaReserva.estado,
        tipoAtencion: filaReserva.tipo_atencion ?? "consulta",
        tipoConsulta: filaReserva.tipo_consulta,
        appointmentOutcome: filaReserva.appointment_outcome ?? "pendiente",
        usuarioId: filaReserva.usuario_id,
        usuarioNombre: filaReserva.usuario_nombre ?? null,
        pacienteId: filaReserva.paciente_id,
        pacienteNombre: filaReserva.paciente_nombre ?? null,
        pacienteTelefono: filaReserva.paciente_telefono ?? null,
        pacienteCorreo: filaReserva.paciente_correo ?? null,
        salaId: filaReserva.sala_id,
        salaNombre: filaReserva.sala_nombre ?? null,
        branchId: filaReserva.sucursal_id ?? null,
        branchName: filaReserva.sucursal_nombre ?? null,
        confirmedAt: filaReserva.confirmed_at ?? null,
        confirmedByUserId: filaReserva.confirmed_by_user_id ?? null,
        cancelledAt: filaReserva.cancelled_at ?? null,
        cancelledByUserId: filaReserva.cancelled_by_user_id ?? null,
        cancellationReason: filaReserva.cancellation_reason ?? null,
        checkedInAt: filaReserva.checked_in_at ?? null,
        completedAt: filaReserva.completed_at ?? null,
        outcomeRecordedAt: filaReserva.outcome_recorded_at ?? null,
        outcomeRecordedByUserId: filaReserva.outcome_recorded_by_user_id ?? null,
        createdAt: filaReserva.created_at,
        updatedAt: filaReserva.updated_at,
        financialStatus,
        paymentStatus: financialCharge?.payment_status ?? null,
        paymentLabel: derivePaymentLabel(financialStatus),
        paymentDetailLabel:
            financialStatus === "pagado"
                ? "pagado"
                : financialStatus === "sin_factura"
                  ? "sin factura"
                  : financialStatus,
        paidAt: financialCharge?.paid_at ?? null,
        chargeDecision: financialCharge?.charge_decision ?? null,
        totalBilledAmount: financialCharge
            ? Number(
                  financialCharge.total_billed_amount ??
                      financialCharge.amount ??
                      0
              )
            : 0,
        currencyCode: financialCharge?.currency_code ?? null,
        ...(options.timeZone
            ? {
                  timeStatus: resolveTimeStatus(filaReserva, options.timeZone)
              }
            : {})
    };
}

function normalizarDatosEntrada(datosReserva) {
    return {
        id:
            datosReserva?.id !== undefined && datosReserva?.id !== null
                ? Number(datosReserva.id)
                : null,
        fecha: normalizarFecha(datosReserva?.fecha),
        horaInicio: normalizarHora(datosReserva?.horaInicio),
        horaFin: normalizarHora(datosReserva?.horaFin),
        descripcion: normalizarTexto(datosReserva?.descripcion) || null,
        estado: normalizarTexto(datosReserva?.estado).toLowerCase() || "pendiente",
        appointmentOutcome:
            normalizarTexto(datosReserva?.appointmentOutcome).toLowerCase() || "pendiente",
        tipoAtencion: normalizarTipoAtencion(datosReserva?.tipoAtencion) || "consulta",
        tipoConsulta: normalizarTexto(datosReserva?.tipoConsulta) || null,
        usuarioId: Number(datosReserva?.usuarioId),
        pacienteId: Number(datosReserva?.pacienteId),
        salaId: Number(datosReserva?.salaId),
        workspaceId: Number(datosReserva?.workspaceId)
    };
}

function validarEntradaReserva(datosReserva) {
    if (!datosReserva) {
        return {
            ok: false,
            msg: "Debe proporcionar los datos de la reserva."
        };
    }

    const datosNormalizados = normalizarDatosEntrada(datosReserva);

    if (!datosNormalizados.fecha) {
        return {
            ok: false,
            msg: "La fecha es obligatoria."
        };
    }

    if (!datosNormalizados.horaInicio || !datosNormalizados.horaFin) {
        return {
            ok: false,
            msg: "La hora de inicio y la hora de fin son obligatorias."
        };
    }

    if (!TIPOS_ATENCION_PERMITIDOS.includes(datosNormalizados.tipoAtencion)) {
        return {
            ok: false,
            msg: "El tipo de atencion no es valido."
        };
    }

    if (!datosNormalizados.tipoConsulta) {
        return {
            ok: false,
            msg: "El nombre de la consulta o procedimiento es obligatorio."
        };
    }

    if (!esIdValido(datosNormalizados.usuarioId)) {
        return {
            ok: false,
            msg: "El usuarioId no es valido."
        };
    }

    if (!esIdValido(datosNormalizados.pacienteId)) {
        return {
            ok: false,
            msg: "El pacienteId no es valido."
        };
    }

    if (!esIdValido(datosNormalizados.salaId)) {
        return {
            ok: false,
            msg: "El salaId no es valido."
        };
    }

    if (!ESTADOS_RESERVA_PERMITIDOS.includes(datosNormalizados.estado)) {
        return {
            ok: false,
            msg: "El estado de la reserva no es valido."
        };
    }

    if (!RESULTADOS_RESERVA_PERMITIDOS.includes(datosNormalizados.appointmentOutcome)) {
        return {
            ok: false,
            msg: "El resultado de la reserva no es valido."
        };
    }

    return {
        ok: true,
        data: datosNormalizados
    };
}

function construirSalaDominio(filaSala) {
    return new Sala(
        filaSala.id,
        filaSala.nombre,
        filaSala.tipo,
        filaSala.descripcion ?? "",
        filaSala.estado,
        filaSala.capacidad,
        disponibilidadABooleano(filaSala.disponibilidad)
    );
}

function construirReservaDominio(datosReserva) {
    return new Reserva(
        Number(datosReserva.id ?? 0),
        normalizarFecha(datosReserva.fecha),
        normalizarHora(datosReserva.horaInicio ?? datosReserva.hora_inicio),
        normalizarHora(datosReserva.horaFin ?? datosReserva.hora_fin),
        datosReserva.descripcion ?? "",
        mapearEstadoADominio(datosReserva.estado),
        Number(datosReserva.salaId ?? datosReserva.sala_id),
        `Paciente ${datosReserva.pacienteId ?? datosReserva.paciente_id}`,
        datosReserva.tipoConsulta ?? datosReserva.tipo_consulta ?? "consulta"
    );
}

async function obtenerSala(salaId, workspaceId) {
    const filaSala = await buscarSalaPorId(salaId, workspaceId);

    if (!filaSala) {
        return {
            ok: false,
            msg: "La sala no existe."
        };
    }

    const sala = construirSalaDominio(filaSala);
    const validacionSala = sala.puedeReservarse();

    if (!validacionSala.ok) {
        return validacionSala;
    }

    return {
        ok: true,
        data: {
            sala,
            filaSala
        }
    };
}

function doctorInternoEstaActivo(filaUsuario) {
    return filaUsuario?.membership_estado === "activo" && filaUsuario?.user_estado === "activo";
}

function doctorPerteneceALaSucursalDeSala(filaUsuario, filaSala) {
    const doctorBranchId = Number(filaUsuario?.sucursal_id ?? 0) || null;
    const roomBranchId = Number(filaSala?.sucursal_id ?? 0) || null;
    return doctorBranchId === roomBranchId;
}

async function validarDoctorResponsable(usuarioId, workspaceId, filaSala) {
    const filaUsuario = await buscarUsuarioInternoPorId(usuarioId, workspaceId);

    if (!filaUsuario) {
        return {
            ok: false,
            msg: "El doctor responsable seleccionado no existe en esta cuenta."
        };
    }

    const role = normalizeRole(filaUsuario.membership_role || filaUsuario.rol);

    if (role !== "doctor") {
        return {
            ok: false,
            msg: "El responsable seleccionado debe ser un doctor activo de la misma sucursal de la sala."
        };
    }

    if (!doctorInternoEstaActivo(filaUsuario)) {
        return {
            ok: false,
            msg: "El doctor responsable seleccionado esta inactivo."
        };
    }

    if (!doctorPerteneceALaSucursalDeSala(filaUsuario, filaSala)) {
        return {
            ok: false,
            msg: "El doctor responsable debe pertenecer a la misma sucursal de la sala."
        };
    }

    return {
        ok: true,
        data: filaUsuario
    };
}

function resolverVentanaOperativa(settings, tipoAtencion) {
    if (tipoAtencion === "procedimiento") {
        return {
            etiqueta: "procedimiento",
            openTime: settings.procedureOpenTime,
            closeTime: settings.procedureCloseTime,
            noClosing: Boolean(settings.procedureNoClosing)
        };
    }

    return {
        etiqueta: "consulta",
        openTime: settings.consultationOpenTime,
        closeTime: settings.consultationCloseTime,
        noClosing: Boolean(settings.consultationNoClosing)
    };
}

function validarReservaContraConfiguracionOperativa(datosReserva, settings) {
    const ventana = resolverVentanaOperativa(settings, datosReserva.tipoAtencion);

    if (datosReserva.horaInicio < ventana.openTime) {
        return {
            ok: false,
            msg: `La ${ventana.etiqueta} debe iniciar a partir de ${ventana.openTime}.`
        };
    }

    if (!ventana.noClosing && datosReserva.horaFin > ventana.closeTime) {
        return {
            ok: false,
            msg: `La ${ventana.etiqueta} debe terminar antes de ${ventana.closeTime}.`
        };
    }

    return {
        ok: true
    };
}

function horaAMinutos(hora) {
    const normalizedTime = normalizarHora(hora);

    if (!normalizedTime) {
        return null;
    }

    const [hours, minutes] = normalizedTime.split(":").map((value) => Number(value));

    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
        return null;
    }

    return hours * 60 + minutes;
}

function reservaConsumeAgenda(datosReserva) {
    return normalizarTexto(datosReserva?.estado).toLowerCase() !== "cancelada";
}

function reservaEsProcedimiento(datosReserva) {
    return normalizarTipoAtencion(datosReserva?.tipoAtencion ?? datosReserva?.tipo_atencion) === "procedimiento";
}

function hayConflictoPorBufferDeProcedimiento(nuevaReserva, reservaExistente, settings) {
    if (!settings?.procedureTurnoverEnabled) {
        return false;
    }

    const turnoverMinutes = Number(settings?.procedureTurnoverMinutes ?? 0);

    if (!Number.isInteger(turnoverMinutes) || turnoverMinutes <= 0) {
        return false;
    }

    if (!reservaConsumeAgenda(nuevaReserva) || !reservaConsumeAgenda(reservaExistente)) {
        return false;
    }

    const newStartMinutes = horaAMinutos(nuevaReserva.horaInicio);
    const newEndMinutes = horaAMinutos(nuevaReserva.horaFin);
    const existingStartMinutes = horaAMinutos(reservaExistente.hora_inicio);
    const existingEndMinutes = horaAMinutos(reservaExistente.hora_fin);

    if (
        !Number.isInteger(newStartMinutes) ||
        !Number.isInteger(newEndMinutes) ||
        !Number.isInteger(existingStartMinutes) ||
        !Number.isInteger(existingEndMinutes)
    ) {
        return false;
    }

    if (existingEndMinutes <= newStartMinutes) {
        return (
            reservaEsProcedimiento(reservaExistente) &&
            newStartMinutes < existingEndMinutes + turnoverMinutes
        );
    }

    if (newEndMinutes <= existingStartMinutes) {
        return (
            reservaEsProcedimiento(nuevaReserva) &&
            newEndMinutes + turnoverMinutes > existingStartMinutes
        );
    }

    return false;
}

function compareDateTimeToNow(fecha, hora, timeZone) {
    const current = getCurrentZonedDateTime(timeZone);
    const reservationDate = normalizarFecha(fecha);
    const reservationTime = normalizarHora(hora);

    if (!reservationDate || !reservationTime) {
        return 1;
    }

    const reservationKey = `${reservationDate}T${reservationTime}`;
    const currentKey = `${current.date}T${current.time}`;

    if (reservationKey < currentKey) {
        return -1;
    }

    if (reservationKey > currentKey) {
        return 1;
    }

    return 0;
}

function getCurrentZonedDateTime(timeZone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });

    const partMap = {};

    for (const part of formatter.formatToParts(new Date())) {
        if (part.type !== "literal") {
            partMap[part.type] = part.value;
        }
    }

    const date = `${partMap.year}-${partMap.month}-${partMap.day}`;
    const time = `${partMap.hour}:${partMap.minute}`;

    return {
        date,
        time
    };
}

function compareReservationEndToNow(filaReserva, timeZone) {
    return compareDateTimeToNow(filaReserva.fecha, filaReserva.hora_fin, timeZone);
}

function compareReservationStartToNow(filaReserva, timeZone) {
    return compareDateTimeToNow(filaReserva.fecha, filaReserva.hora_inicio, timeZone);
}

function esReservaPasada(filaReserva, timeZone) {
    return compareReservationEndToNow(filaReserva, timeZone) < 0;
}

function resolveTimeStatus(filaReserva, timeZone) {
    const endComparison = compareReservationEndToNow(filaReserva, timeZone);

    if (endComparison < 0) {
        return "pasada";
    }

    const startComparison = compareReservationStartToNow(filaReserva, timeZone);

    if (startComparison <= 0 && endComparison >= 0) {
        return "en_curso";
    }

    const current = getCurrentZonedDateTime(timeZone);
    const reservationDate = normalizarFecha(filaReserva.fecha);

    if (reservationDate === current.date) {
        return "proxima_hoy";
    }

    return "programada";
}

function validarReservaNoIniciadaEnPasado(datosReserva, settings) {
    if (
        compareDateTimeToNow(
            datosReserva.fecha,
            datosReserva.horaInicio,
            settings.timeZone
        ) < 0
    ) {
        return {
            ok: false,
            msg: PAST_RESERVATION_ERROR_MESSAGE
        };
    }

    return {
        ok: true
    };
}

function debeOcultarseEnAgendaOperativa(filaReserva, financialCharge, timeZone) {
    return deriveFinancialStatus(financialCharge) === "pagado";
}

async function construirMapaCobrosPorReserva(filasReservas, workspaceId) {
    const reservationIds = filasReservas
        .map((filaReserva) => Number(filaReserva.id))
        .filter((reservationId) => Number.isInteger(reservationId) && reservationId > 0);
    const chargeRows = await listarCobrosPorReservationIds(reservationIds, workspaceId);

    return new Map(
        chargeRows.map((filaCobro) => [Number(filaCobro.reservation_id), filaCobro])
    );
}

function crearEstadoReservaExtendido(filaReserva, actorUserId) {
    return {
        estado: filaReserva.estado,
        appointmentOutcome: filaReserva.appointment_outcome ?? "pendiente",
        confirmedAt: filaReserva.confirmed_at ?? null,
        confirmedByUserId: filaReserva.confirmed_by_user_id ?? null,
        cancelledAt: filaReserva.cancelled_at ?? null,
        cancelledByUserId: filaReserva.cancelled_by_user_id ?? null,
        cancellationReason: filaReserva.cancellation_reason ?? null,
        checkedInAt: filaReserva.checked_in_at ?? null,
        completedAt: filaReserva.completed_at ?? null,
        outcomeRecordedAt: filaReserva.outcome_recorded_at ?? null,
        outcomeRecordedByUserId: filaReserva.outcome_recorded_by_user_id ?? null,
        actorUserId
    };
}

function resolverTransicionEstadoReserva(filaReserva, nextStatus, actorUserId, cancellationReason = null) {
    const now = new Date().toISOString();
    const state = crearEstadoReservaExtendido(filaReserva, actorUserId);
    state.estado = nextStatus;

    if (nextStatus === "confirmada") {
        state.confirmedAt = state.confirmedAt ?? now;
        state.confirmedByUserId = state.confirmedByUserId ?? actorUserId;

        if (filaReserva.estado === "cancelada") {
            state.cancelledAt = null;
            state.cancelledByUserId = null;
            state.cancellationReason = null;

            if (state.appointmentOutcome === "cancelada") {
                state.appointmentOutcome = "pendiente";
                state.outcomeRecordedAt = null;
                state.outcomeRecordedByUserId = null;
            }
        }

        return state;
    }

    if (nextStatus === "cancelada") {
        state.appointmentOutcome = "cancelada";
        state.cancelledAt = now;
        state.cancelledByUserId = actorUserId;
        state.cancellationReason =
            normalizarTexto(cancellationReason) || state.cancellationReason || null;
        state.completedAt = null;
        state.outcomeRecordedAt = now;
        state.outcomeRecordedByUserId = actorUserId;
        return state;
    }

    if (filaReserva.estado === "cancelada") {
        state.cancelledAt = null;
        state.cancelledByUserId = null;
        state.cancellationReason = null;

        if (state.appointmentOutcome === "cancelada") {
            state.appointmentOutcome = "pendiente";
            state.outcomeRecordedAt = null;
            state.outcomeRecordedByUserId = null;
        }
    }

    return state;
}

function normalizarResultadoPayload(payload = {}) {
    return {
        appointmentOutcome:
            normalizarTexto(payload?.appointmentOutcome).toLowerCase() || "pendiente",
        checkedInAt: normalizarFechaHora(payload?.checkedInAt),
        completedAt: normalizarFechaHora(payload?.completedAt),
        cancellationReason: normalizarTexto(payload?.cancellationReason) || null
    };
}

function resolverActualizacionResultadoReserva(filaReserva, payload, actorUserId) {
    const normalized = normalizarResultadoPayload(payload);

    if (!RESULTADOS_RESERVA_PERMITIDOS.includes(normalized.appointmentOutcome)) {
        return {
            ok: false,
            msg: "El resultado de la reserva no es valido."
        };
    }

    if (
        filaReserva.estado === "cancelada" &&
        normalized.appointmentOutcome !== "cancelada"
    ) {
        return {
            ok: false,
            msg: "Primero debes reabrir la reserva antes de registrar un resultado distinto a cancelada."
        };
    }

    const now = new Date().toISOString();
    const state = crearEstadoReservaExtendido(filaReserva, actorUserId);

    state.appointmentOutcome = normalized.appointmentOutcome;

    if (normalized.appointmentOutcome === "cancelada") {
        state.estado = "cancelada";
        state.cancelledAt = state.cancelledAt ?? now;
        state.cancelledByUserId = state.cancelledByUserId ?? actorUserId;
        state.cancellationReason =
            normalized.cancellationReason ?? state.cancellationReason ?? null;
        state.completedAt = null;
        state.outcomeRecordedAt = now;
        state.outcomeRecordedByUserId = actorUserId;

        return {
            ok: true,
            data: state
        };
    }

    state.cancelledAt = null;
    state.cancelledByUserId = null;
    state.cancellationReason = null;

    if (normalized.appointmentOutcome === "pendiente") {
        state.checkedInAt = null;
        state.completedAt = null;
        state.outcomeRecordedAt = null;
        state.outcomeRecordedByUserId = null;
    } else if (normalized.appointmentOutcome === "atendida") {
        state.checkedInAt = normalized.checkedInAt ?? state.checkedInAt ?? now;
        state.completedAt = normalized.completedAt ?? state.completedAt ?? now;
        state.outcomeRecordedAt = now;
        state.outcomeRecordedByUserId = actorUserId;
    } else if (normalized.appointmentOutcome === "no_show") {
        state.checkedInAt = null;
        state.completedAt = null;
        state.outcomeRecordedAt = now;
        state.outcomeRecordedByUserId = actorUserId;
    }

    return {
        ok: true,
        data: state
    };
}

function ordenarReservasPorInicio(filasReservas, direction = "asc") {
    const multiplier = direction === "desc" ? -1 : 1;

    return [...filasReservas].sort((left, right) => {
        const leftKey = `${normalizarFecha(left.fecha)}T${normalizarHora(left.hora_inicio)}`;
        const rightKey = `${normalizarFecha(right.fecha)}T${normalizarHora(right.hora_inicio)}`;

        if (leftKey === rightKey) {
            return 0;
        }

        return leftKey > rightKey ? multiplier : -1 * multiplier;
    });
}

function filtrarReservasPasadasPorCriterio(
    filasReservas,
    filters,
    auth,
    timeZone
) {
    const from = normalizarFecha(filters?.from);
    const to = normalizarFecha(filters?.to);
    const patientQuery = normalizarTexto(filters?.patient).toLowerCase();
    const requestedUserId = Number(filters?.userId);
    const status = normalizarTexto(filters?.status).toLowerCase();
    const authUserId = resolveUserId(auth);
    const canViewAll = canViewAllPastReservations({
        membershipRole: auth?.membershipRole,
        userRole: auth?.userRole
    });

    return filasReservas.filter((filaReserva) => {
        if (!esReservaPasada(filaReserva, timeZone)) {
            return false;
        }

        if (from && normalizarFecha(filaReserva.fecha) < from) {
            return false;
        }

        if (to && normalizarFecha(filaReserva.fecha) > to) {
            return false;
        }

        if (status && status !== "todos" && filaReserva.estado !== status) {
            return false;
        }

        if (!canViewAll && filaReserva.usuario_id !== authUserId) {
            return false;
        }

        if (canViewAll && esIdValido(requestedUserId) && filaReserva.usuario_id !== requestedUserId) {
            return false;
        }

        if (patientQuery) {
            const haystack = [
                filaReserva.paciente_nombre,
                filaReserva.paciente_telefono,
                filaReserva.paciente_correo
            ]
                .join(" ")
                .toLowerCase();

            if (!haystack.includes(patientQuery)) {
                return false;
            }
        }

        return true;
    });
}

function filtrarReservasCalendarioPorCriterio(
    filasReservas,
    filters,
    auth
) {
    const from = normalizarFecha(filters?.from);
    const to = normalizarFecha(filters?.to);
    const authUserId = resolveUserId(auth);
    const canViewAll = canViewAllPastReservations({
        membershipRole: auth?.membershipRole,
        userRole: auth?.userRole
    });

    return filasReservas.filter((filaReserva) => {
        const reservationDate = normalizarFecha(filaReserva.fecha);

        if (from && reservationDate < from) {
            return false;
        }

        if (to && reservationDate > to) {
            return false;
        }

        if (!canViewAll && filaReserva.usuario_id !== authUserId) {
            return false;
        }

        return true;
    });
}

function construirResumenCalendarioPorFecha(filasReservas, timeZone) {
    const summaryMap = filasReservas.reduce((accumulator, filaReserva) => {
        const dateKey = normalizarFecha(filaReserva.fecha);

        if (!dateKey) {
            return accumulator;
        }

        if (!accumulator[dateKey]) {
            accumulator[dateKey] = {
                date: dateKey,
                total: 0,
                pending: 0,
                confirmed: 0,
                cancelled: 0,
                inProgress: 0
            };
        }

        const summary = accumulator[dateKey];
        summary.total += 1;

        if (filaReserva.estado === "pendiente") {
            summary.pending += 1;
        }

        if (filaReserva.estado === "confirmada") {
            summary.confirmed += 1;
        }

        if (filaReserva.estado === "cancelada") {
            summary.cancelled += 1;
        }

        if (resolveTimeStatus(filaReserva, timeZone) === "en_curso") {
            summary.inProgress += 1;
        }

        return accumulator;
    }, {});

    return Object.values(summaryMap).sort((left, right) => left.date.localeCompare(right.date));
}

async function validarReservaContraContexto(datosReserva, auth, opciones = {}) {
    const workspaceId = resolveWorkspaceId(auth);

    if (!workspaceId) {
        return {
            ok: false,
            msg: "No autorizado. Falta el contexto de workspace."
        };
    }

    const resultadoEntrada = validarEntradaReserva(datosReserva);

    if (!resultadoEntrada.ok) {
        return resultadoEntrada;
    }

    const datosNormalizados = resultadoEntrada.data;
    const resultadoSala = await obtenerSala(datosNormalizados.salaId, workspaceId);

    if (!resultadoSala.ok) {
        return resultadoSala;
    }

    const validacionDoctorResponsable = await validarDoctorResponsable(
        datosNormalizados.usuarioId,
        workspaceId,
        resultadoSala.data.filaSala
    );

    if (!validacionDoctorResponsable.ok) {
        return validacionDoctorResponsable;
    }

    const reservaDominio = construirReservaDominio(datosNormalizados);
    const validacionHorario = reservaDominio.validarHorario();

    if (!validacionHorario.ok) {
        return validacionHorario;
    }

    const settings = await obtenerConfiguracionOperativaNormalizada(workspaceId);
    const validacionOperativa = validarReservaContraConfiguracionOperativa(
        datosNormalizados,
        settings
    );

    if (!validacionOperativa.ok) {
        return validacionOperativa;
    }

    const validacionTemporal = validarReservaNoIniciadaEnPasado(
        datosNormalizados,
        settings
    );

    if (!validacionTemporal.ok) {
        return validacionTemporal;
    }

    const filaPaciente = await buscarPacientePorIdRepository(
        datosNormalizados.pacienteId,
        workspaceId
    );

    if (!filaPaciente) {
        return {
            ok: false,
            msg: "El paciente no existe en esta cuenta."
        };
    }

    const excluirReservaId =
        opciones?.excluirReservaId !== undefined && opciones?.excluirReservaId !== null
            ? Number(opciones.excluirReservaId)
            : null;

    const filasReservasExistentes = await buscarReservasPorSalaYFechaRepository(
        datosNormalizados.salaId,
        datosNormalizados.fecha,
        workspaceId,
        excluirReservaId
    );

    const reservasExistentes = filasReservasExistentes.map((filaReserva) =>
        construirReservaDominio(filaReserva)
    );

    const hayChoque = reservasExistentes.some((reservaExistente) =>
        reservaDominio.seSolapaCon(reservaExistente)
    );

    if (hayChoque) {
        return {
            ok: false,
            msg: "La sala ya tiene una reserva en ese horario."
        };
    }

    const hayChoquePorBuffer = filasReservasExistentes.some((filaReservaExistente) =>
        hayConflictoPorBufferDeProcedimiento(datosNormalizados, filaReservaExistente, settings)
    );

    if (hayChoquePorBuffer) {
        return {
            ok: false,
            msg: `Debes dejar ${settings.procedureTurnoverMinutes} minutos de separacion despues de cada procedimiento en esta sala.`
        };
    }

    return {
        ok: true,
        data: {
            ...datosNormalizados,
            workspaceId
        }
    };
}

export async function listarReservas(auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        const settings = await obtenerConfiguracionOperativaNormalizada(workspaceId);
        const filasReservas = await listarReservasRepository(workspaceId);
        const chargeMap = await construirMapaCobrosPorReserva(filasReservas, workspaceId);
        const reservasActivas = ordenarReservasPorInicio(
            filasReservas.filter(
                (filaReserva) => !esReservaPasada(filaReserva, settings.timeZone)
            ).filter(
                (filaReserva) =>
                    !debeOcultarseEnAgendaOperativa(
                        filaReserva,
                        chargeMap.get(Number(filaReserva.id)),
                        settings.timeZone
                    )
            )
        );

        return {
            ok: true,
            msg: "Reservas activas listadas correctamente.",
            data: reservasActivas.map((filaReserva) =>
                formatearReservaSalida(filaReserva, {
                    financialCharge: chargeMap.get(Number(filaReserva.id)),
                    timeZone: settings.timeZone
                })
            )
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al listar las reservas: ${error.message}`
        };
    }
}

export async function listarReservasPasadas(filters, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        const settings = await obtenerConfiguracionOperativaNormalizada(workspaceId);
        const filasReservas = await listarReservasRepository(workspaceId);
        const reservasPasadas = ordenarReservasPorInicio(
            filtrarReservasPasadasPorCriterio(
                filasReservas,
                filters,
                auth,
                settings.timeZone
            ),
            "desc"
        );
        const chargeMap = await construirMapaCobrosPorReserva(reservasPasadas, workspaceId);
        const formattedReservations = reservasPasadas
            .map((filaReserva) =>
                formatearReservaSalida(filaReserva, {
                    financialCharge: chargeMap.get(Number(filaReserva.id)),
                    timeZone: settings.timeZone
                })
            )
            .filter((reserva) =>
                matchesPastPaymentFilter(reserva.financialStatus, filters?.paymentStatus)
            );

        return {
            ok: true,
            msg: "Reservas pasadas listadas correctamente.",
            data: formattedReservations
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al listar las reservas pasadas: ${error.message}`
        };
    }
}

export async function listarReservasCalendario(filters, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        const settings = await obtenerConfiguracionOperativaNormalizada(workspaceId);
        const filasReservas = await listarReservasRepository(workspaceId);
        const chargeMap = await construirMapaCobrosPorReserva(filasReservas, workspaceId);
        const reservasFiltradas = ordenarReservasPorInicio(
            filtrarReservasCalendarioPorCriterio(filasReservas, filters, auth).filter(
                (filaReserva) =>
                    !debeOcultarseEnAgendaOperativa(
                        filaReserva,
                        chargeMap.get(Number(filaReserva.id)),
                        settings.timeZone
                    )
            )
        );

        return {
            ok: true,
            msg: "Calendario de reservas cargado correctamente.",
            data: {
                summaryByDate: construirResumenCalendarioPorFecha(
                    reservasFiltradas,
                    settings.timeZone
                ),
                items: reservasFiltradas.map((filaReserva) =>
                    formatearReservaSalida(filaReserva, {
                        financialCharge: chargeMap.get(Number(filaReserva.id)),
                        timeZone: settings.timeZone
                    })
                )
            }
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al cargar el calendario de reservas: ${error.message}`
        };
    }
}

export async function buscarReservaPorId(id, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        if (!esIdValido(id)) {
            return {
                ok: false,
                msg: "El id de la reserva no es valido."
            };
        }

        const [settings, filaReserva] = await Promise.all([
            obtenerConfiguracionOperativaNormalizada(workspaceId),
            buscarReservaPorIdRepository(id, workspaceId)
        ]);

        if (!filaReserva) {
            return {
                ok: false,
                msg: "Reserva no encontrada."
            };
        }

        const chargeMap = await construirMapaCobrosPorReserva([filaReserva], workspaceId);

        return {
            ok: true,
            msg: "Reserva encontrada.",
            data: formatearReservaSalida(filaReserva, {
                financialCharge: chargeMap.get(Number(filaReserva.id)),
                timeZone: settings.timeZone
            })
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al buscar la reserva: ${error.message}`
        };
    }
}

export async function crearReserva(datosReserva, auth) {
    try {
        const usuarioId = resolveUserId(auth);

        if (!usuarioId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el usuario de sesion."
            };
        }

        const resultadoResponsable = resolverUsuarioResponsable(datosReserva, auth);

        if (!resultadoResponsable.ok) {
            return resultadoResponsable;
        }

        const resultadoValidacion = await validarReservaContraContexto(
            {
                ...datosReserva,
                usuarioId: resultadoResponsable.data
            },
            auth
        );

        if (!resultadoValidacion.ok) {
            return resultadoValidacion;
        }

        const datosNormalizados = resultadoValidacion.data;
        datosNormalizados.appointmentOutcome = "pendiente";
        const result = await crearReservaRepository(datosNormalizados);
        const filaReservaCreada = await buscarReservaPorIdRepository(
            result.insertId,
            datosNormalizados.workspaceId
        );

        return {
            ok: true,
            msg: "Reserva creada correctamente.",
            data: formatearReservaSalida(filaReservaCreada)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al crear la reserva: ${error.message}`
        };
    }
}

export async function editarReserva(id, datosReserva, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const usuarioId = resolveUserId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        if (!usuarioId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el usuario de sesion."
            };
        }

        if (!esIdValido(id)) {
            return {
                ok: false,
                msg: "El id de la reserva no es valido."
            };
        }

        const filaReservaActual = await buscarReservaPorIdRepository(id, workspaceId);

        if (!filaReservaActual) {
            return {
                ok: false,
                msg: "Reserva no encontrada."
            };
        }

        const datosActualizados = {
            id,
            fecha: datosReserva?.fecha ?? normalizarFecha(filaReservaActual.fecha),
            horaInicio:
                datosReserva?.horaInicio ?? normalizarHora(filaReservaActual.hora_inicio),
            horaFin: datosReserva?.horaFin ?? normalizarHora(filaReservaActual.hora_fin),
            descripcion: datosReserva?.descripcion ?? filaReservaActual.descripcion,
            estado: datosReserva?.estado ?? filaReservaActual.estado,
            tipoAtencion: datosReserva?.tipoAtencion ?? filaReservaActual.tipo_atencion,
            tipoConsulta: datosReserva?.tipoConsulta ?? filaReservaActual.tipo_consulta,
            appointmentOutcome:
                datosReserva?.appointmentOutcome ?? filaReservaActual.appointment_outcome ?? "pendiente",
            usuarioId: filaReservaActual.usuario_id,
            pacienteId: datosReserva?.pacienteId ?? filaReservaActual.paciente_id,
            salaId: datosReserva?.salaId ?? filaReservaActual.sala_id,
            workspaceId
        };

        const resultadoResponsable = resolverUsuarioResponsable(datosReserva, auth, {
            currentResponsibleUserId: filaReservaActual.usuario_id
        });

        if (!resultadoResponsable.ok) {
            return resultadoResponsable;
        }

        datosActualizados.usuarioId = resultadoResponsable.data;

        const resultadoValidacion = await validarReservaContraContexto(
            datosActualizados,
            auth,
            {
                excluirReservaId: id
            }
        );

        if (!resultadoValidacion.ok) {
            return resultadoValidacion;
        }

        const datosNormalizados = resultadoValidacion.data;
        const transicionEstado = resolverTransicionEstadoReserva(
            filaReservaActual,
            datosNormalizados.estado,
            usuarioId,
            datosReserva?.cancellationReason
        );
        const result = await actualizarReservaRepository(
            id,
            {
                ...datosNormalizados,
                appointmentOutcome: transicionEstado.appointmentOutcome,
                confirmedAt: transicionEstado.confirmedAt,
                confirmedByUserId: transicionEstado.confirmedByUserId,
                cancelledAt: transicionEstado.cancelledAt,
                cancelledByUserId: transicionEstado.cancelledByUserId,
                cancellationReason: transicionEstado.cancellationReason,
                checkedInAt: transicionEstado.checkedInAt,
                completedAt: transicionEstado.completedAt,
                outcomeRecordedAt: transicionEstado.outcomeRecordedAt,
                outcomeRecordedByUserId: transicionEstado.outcomeRecordedByUserId
            },
            workspaceId
        );

        if (result.affectedRows === 0) {
            return {
                ok: false,
                msg: "No se pudo actualizar la reserva."
            };
        }

        const filaReservaActualizada = await buscarReservaPorIdRepository(id, workspaceId);

        return {
            ok: true,
            msg: "Reserva actualizada correctamente.",
            data: formatearReservaSalida(filaReservaActualizada)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al editar la reserva: ${error.message}`
        };
    }
}

export async function actualizarEstadoReserva(id, estado, auth, extras = {}) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const usuarioId = resolveUserId(auth);
        const normalizedStatus = normalizarTexto(estado).toLowerCase();

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        if (!usuarioId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el usuario de sesion."
            };
        }

        if (!esIdValido(id)) {
            return {
                ok: false,
                msg: "El id de la reserva no es valido."
            };
        }

        if (!ESTADOS_RESERVA_PERMITIDOS.includes(normalizedStatus)) {
            return {
                ok: false,
                msg: "El estado de la reserva no es valido."
            };
        }

        const filaReservaActual = await buscarReservaPorIdRepository(id, workspaceId);

        if (!filaReservaActual) {
            return {
                ok: false,
                msg: "Reserva no encontrada."
            };
        }

        const transicionEstado = resolverTransicionEstadoReserva(
            filaReservaActual,
            normalizedStatus,
            usuarioId,
            extras?.cancellationReason
        );

        const result = await actualizarEstadoReservaRepository(id, transicionEstado, workspaceId);

        if (result.affectedRows === 0) {
            return {
                ok: false,
                msg: "No se pudo actualizar el estado de la reserva."
            };
        }

        const filaReservaActualizada = await buscarReservaPorIdRepository(id, workspaceId);

        return {
            ok: true,
            msg: "Estado de la reserva actualizado correctamente.",
            data: formatearReservaSalida(filaReservaActualizada)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al actualizar el estado de la reserva: ${error.message}`
        };
    }
}

export async function actualizarResultadoReserva(id, payload, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const usuarioId = resolveUserId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        if (!usuarioId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el usuario de sesion."
            };
        }

        if (!esIdValido(id)) {
            return {
                ok: false,
                msg: "El id de la reserva no es valido."
            };
        }

        const filaReservaActual = await buscarReservaPorIdRepository(id, workspaceId);

        if (!filaReservaActual) {
            return {
                ok: false,
                msg: "Reserva no encontrada."
            };
        }

        const resultado = resolverActualizacionResultadoReserva(
            filaReservaActual,
            payload,
            usuarioId
        );

        if (!resultado.ok) {
            return resultado;
        }

        const updateResult = await actualizarResultadoReservaRepository(
            id,
            resultado.data,
            workspaceId
        );

        if (updateResult.affectedRows === 0) {
            return {
                ok: false,
                msg: "No se pudo actualizar el resultado de la reserva."
            };
        }

        const filaReservaActualizada = await buscarReservaPorIdRepository(id, workspaceId);

        return {
            ok: true,
            msg: "Resultado de la reserva actualizado correctamente.",
            data: formatearReservaSalida(filaReservaActualizada)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al actualizar el resultado de la reserva: ${error.message}`
        };
    }
}

export async function eliminarReserva(id, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        if (!esIdValido(id)) {
            return {
                ok: false,
                msg: "El id de la reserva no es valido."
            };
        }

        const filaReserva = await buscarReservaPorIdRepository(id, workspaceId);

        if (!filaReserva) {
            return {
                ok: false,
                msg: "Reserva no encontrada."
            };
        }

        const result = await eliminarReservaRepository(id, workspaceId);

        if (result.affectedRows === 0) {
            return {
                ok: false,
                msg: "No se pudo eliminar la reserva."
            };
        }

        return {
            ok: true,
            msg: "Reserva eliminada correctamente.",
            data: formatearReservaSalida(filaReserva)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al eliminar la reserva: ${error.message}`
        };
    }
}

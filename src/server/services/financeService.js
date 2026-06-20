import { withTransaction } from "../db/connection.js";
import {
    actualizarCobro as actualizarCobroRepository,
    actualizarPagoCobro as actualizarPagoCobroRepository,
    buscarCobroPorId,
    buscarCobroPorReservaId,
    crearPagoCobro as crearPagoCobroRepository,
    crearCobro as crearCobroRepository,
    listarCobrosPorReservationIds,
    listarCobrosPorWorkspaceId,
    listarLineasInsumosPorChargeIds,
    listarPagosPorChargeIds,
    reemplazarLineasInsumos
} from "../repositories/financeRepository.js";
import { buscarItemInventarioPorId } from "../repositories/inventoryRepository.js";
import {
    buscarReservaPorId as buscarReservaPorIdRepository,
    listarReservas as listarReservasRepository
} from "../repositories/reservaRepository.js";
import { buscarSalaPorId } from "../repositories/salaRepository.js";
import { canAccessFinance, isAdministrativeUser } from "../../shared/roles.js";
import { obtenerConfiguracionOperativaNormalizada } from "./workspaceSettingsService.js";
import {
    DEFAULT_CURRENCY_CODE,
    normalizeSupportedCurrencyCode,
    SUPPORTED_CURRENCY_CODES
} from "../../shared/currencies.js";
import { syncProcedureConsumption } from "./inventoryService.js";
import { ChargeInvoice } from "../domain/finance/ChargeInvoice.js";
import { ChargePayment } from "../domain/finance/ChargePayment.js";
import { InvoiceStatusPolicy } from "../domain/finance/InvoiceStatusPolicy.js";
import { Money } from "../domain/finance/Money.js";
import {
    listarComprobantesFormateadosPorWorkspaceId,
    listarReservationBillingDocumentsMap
} from "./billingDocumentService.js";

const ESTADOS_COBRO = ["pendiente", "pagado", "anulado"];
const METODOS_PAGO = ["efectivo", "tarjeta", "transferencia", "otro"];
const MODOS_COBRO = ["solo_sala", "solo_insumos", "sala_mas_insumos"];
const DECISIONES_COBRO = ["cobrable", "exonerado"];
const DEFAULT_PRICING_POLICY = "bloqueado";
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

function normalizarHora(valor) {
    if (!valor) {
        return null;
    }

    return String(valor).slice(0, 5);
}

function normalizarEstadoCobroPersistencia(valor, fallback = "pendiente") {
    const normalized = normalizarTexto(valor).toLowerCase();
    return ESTADOS_COBRO.includes(normalized) ? normalized : fallback;
}

function normalizarFiltroEstadoCobro(valor) {
    const normalized = normalizarTexto(valor).toLowerCase();

    if (!normalized) {
        return "";
    }

    if (normalized === "todos") {
        return "todos";
    }

    return ESTADOS_COBRO.includes(normalized) ? normalized : "";
}

function normalizarMetodoPago(valor) {
    const normalized = normalizarTexto(valor).toLowerCase();
    return normalized || null;
}

function normalizarMonto(valor, fallback = NaN) {
    if (valor === undefined || valor === null || valor === "") {
        return fallback;
    }

    const amount = Number(valor);
    return Number.isFinite(amount) ? amount : NaN;
}

function normalizarMoneda(valor) {
    return normalizeSupportedCurrencyCode(valor, DEFAULT_CURRENCY_CODE);
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

function deriveFinancialStatus(row) {
    if (!row) {
        return "sin_factura";
    }

    const invoice = ChargeInvoice.fromRow(row);

    if (invoice.usesLegacyPaidFallback()) {
        return "pagado";
    }

    if (row.financial_status) {
        return row.financial_status;
    }

    return InvoiceStatusPolicy.resolve({
        chargeDecision: row.charge_decision ?? row.chargeDecision,
        paymentStatus: row.payment_status ?? row.paymentStatus,
        totalBilledAmount:
            row.total_billed_amount ?? row.totalBilledAmount ?? row.amount ?? 0,
        paidAmount: row.paid_amount ?? row.paidAmount ?? 0
    });
}

function derivePaymentLabel(financialStatus) {
    return (
        {
            pendiente: "Pendiente",
            parcial: "Abono parcial",
            pagado: "Pagada",
            anulado: "Anulada",
            exonerado: "Exonerada",
            sin_factura: "Sin factura"
        }[financialStatus] ?? "Pendiente"
    );
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

function formatearPagoSalida(filaPago) {
    if (!filaPago) {
        return null;
    }

    return {
        id: filaPago.id,
        chargeId: filaPago.charge_id,
        workspaceId: filaPago.workspace_id,
        amount: Number(filaPago.amount ?? 0),
        currencyCode: filaPago.currency_code ?? DEFAULT_CURRENCY_CODE,
        paymentMethod: filaPago.payment_method ?? null,
        paidAt: filaPago.paid_at ?? null,
        notes: filaPago.notes ?? "",
        registeredByUserId: filaPago.registered_by_user_id ?? null,
        createdAt: filaPago.created_at ?? null,
        updatedAt: filaPago.updated_at ?? null
    };
}

function buildChargeInvoiceFromRow(filaCobro, payments = []) {
    return ChargeInvoice.fromRow(
        filaCobro,
        payments.map((payment) =>
            payment instanceof ChargePayment ? payment : ChargePayment.fromRow(payment)
        )
    );
}

async function ensureLedgerForPaidCharge({
    chargeId,
    workspaceId,
    registeredByUserId,
    paymentMethod,
    paidAt,
    notes = null,
    executor
}) {
    const existingPayments = await listarPagosPorChargeIds([chargeId], workspaceId, executor);

    if (existingPayments.length) {
        return existingPayments;
    }

    const charge = await buscarCobroPorId(chargeId, workspaceId, executor);

    if (!charge || charge.charge_decision === "exonerado") {
        return existingPayments;
    }

    const amount = Number(charge.total_billed_amount ?? charge.amount ?? 0);

    if (!Number.isFinite(amount) || amount <= 0) {
        return existingPayments;
    }

    const createdPayment = new ChargePayment({
        workspaceId,
        chargeId,
        amount,
        currencyCode: charge.currency_code ?? DEFAULT_CURRENCY_CODE,
        paymentMethod: normalizarMetodoPago(paymentMethod ?? charge.payment_method) || "otro",
        paidAt: paidAt ?? charge.paid_at ?? new Date().toISOString(),
        notes,
        registeredByUserId
    });

    await crearPagoCobroRepository(createdPayment.toPersistence(), executor);
    return listarPagosPorChargeIds([chargeId], workspaceId, executor);
}

function formatearCobroSalida(filaCobro, supplies = [], payments = []) {
    if (!filaCobro) {
        return null;
    }

    const normalizedPayments = payments
        .map((payment) => formatearPagoSalida(payment))
        .filter(Boolean);
    const invoice = buildChargeInvoiceFromRow(filaCobro, normalizedPayments);
    const financialSnapshot = invoice.toFinancialSnapshot();
    const financialStatus = financialSnapshot.financialStatus;

    return {
        id: filaCobro.id,
        workspaceId: filaCobro.workspace_id,
        reservationId: filaCobro.reservation_id,
        patientId: filaCobro.patient_id,
        patientNameSnapshot: filaCobro.patient_name_snapshot,
        patientPhoneSnapshot: filaCobro.patient_phone_snapshot ?? null,
        roomId: filaCobro.room_id,
        roomNameSnapshot: filaCobro.room_name_snapshot,
        branchId: filaCobro.branch_id ?? null,
        branchNameSnapshot: filaCobro.branch_name_snapshot ?? null,
        procedureName: filaCobro.procedure_name,
        tipoAtencion: filaCobro.tipo_atencion,
        billableItemId: filaCobro.billable_item_id ?? null,
        billableItemName: filaCobro.billable_item_name ?? null,
        billableItemCategory: filaCobro.billable_item_category ?? null,
        amount: Number(filaCobro.total_billed_amount ?? filaCobro.amount ?? 0),
        currencyCode: filaCobro.currency_code ?? DEFAULT_CURRENCY_CODE,
        paymentStatus: financialSnapshot.paymentStatus,
        paymentMethod: filaCobro.payment_method,
        paidAt: financialSnapshot.lastPaymentAt ?? filaCobro.paid_at ?? null,
        registeredByUserId: filaCobro.registered_by_user_id,
        notes: filaCobro.notes ?? "",
        pricingMode: filaCobro.pricing_mode ?? DEFAULT_PRICING_MODE,
        roomChargeAmount: Number(filaCobro.room_charge_amount ?? 0),
        suppliesTotalAmount: Number(filaCobro.supplies_total_amount ?? 0),
        suppliesTotalCost: Number(filaCobro.supplies_total_cost ?? 0),
        totalBilledAmount: Number(filaCobro.total_billed_amount ?? filaCobro.amount ?? 0),
        paidAmount: financialSnapshot.paidAmount,
        outstandingAmount: financialSnapshot.outstandingAmount,
        paymentCount: financialSnapshot.paymentCount,
        lastPaymentAt: financialSnapshot.lastPaymentAt ?? null,
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
        financialStatus,
        paymentLabel: derivePaymentLabel(financialStatus),
        paymentDetailLabel:
            financialStatus === "parcial"
                ? `Abonado ${financialSnapshot.paidAmount} / ${Number(
                      filaCobro.total_billed_amount ?? filaCobro.amount ?? 0
                  )}`
                : derivePaymentLabel(financialStatus),
        hasRegisteredPayments: financialSnapshot.hasRegisteredPayments,
        createdAt: filaCobro.created_at,
        updatedAt: filaCobro.updated_at,
        supplies,
        payments: normalizedPayments
    };
}

function groupRowsByChargeId(rows = [], accessor) {
    const grouped = new Map();

    for (const row of rows) {
        const chargeId = Number(accessor(row));

        if (!Number.isInteger(chargeId) || chargeId <= 0) {
            continue;
        }

        if (!grouped.has(chargeId)) {
            grouped.set(chargeId, []);
        }

        grouped.get(chargeId).push(row);
    }

    return grouped;
}

function sumPaymentsWithinRange(payments = [], from = null, to = null) {
    return payments.reduce((sum, payment) => {
        if (!estaDentroDelRango(payment?.paidAt ?? payment?.paid_at, from, to)) {
            return sum;
        }

        return sum + Number(payment?.amount ?? 0);
    }, 0);
}

function resolveCollectedAmountWithinRange(invoice, payments = [], from = null, to = null) {
    const collectedFromLedger = roundMoney(sumPaymentsWithinRange(payments, from, to));

    if (collectedFromLedger > 0 || !invoice?.usesLegacyPaidFallback?.()) {
        return collectedFromLedger;
    }

    return estaDentroDelRango(invoice.resolvedLastPaymentAt(), from, to)
        ? invoice.totalPaid().toNumber()
        : 0;
}

function resolveCollectedRatio(collectedAmount, totalBilledAmount) {
    const total = Number(totalBilledAmount ?? 0);

    if (total <= 0) {
        return 0;
    }

    return Math.min(Math.max(Number(collectedAmount ?? 0), 0), total) / total;
}

function cumpleFiltrosCobro(filaCobro, filtros = {}) {
    const from = normalizarFecha(filtros.from);
    const to = normalizarFecha(filtros.to);
    const patientQuery = normalizarTexto(filtros.patient).toLowerCase();
    const userId = Number(filtros.userId);
    const roomId = Number(filtros.roomId);
    const branchId = Number(filtros.branchId);
    const paymentStatus = normalizarFiltroEstadoCobro(filtros.paymentStatus);
    const scope = normalizarTexto(filtros.scope).toLowerCase();
    const financialStatus = deriveFinancialStatus(filaCobro);

    if (from && normalizarFecha(filaCobro.reservation_date) < from) {
        return false;
    }

    if (to && normalizarFecha(filaCobro.reservation_date) > to) {
        return false;
    }

    if (
        patientQuery &&
        ![
            filaCobro.patient_name_snapshot,
            filaCobro.patient_phone_snapshot
        ]
            .join(" ")
            .toLowerCase()
            .includes(patientQuery)
    ) {
        return false;
    }

    if (Number.isInteger(userId) && userId > 0 && filaCobro.reservation_user_id !== userId) {
        return false;
    }

    if (Number.isInteger(roomId) && roomId > 0 && filaCobro.room_id !== roomId) {
        return false;
    }

    if (Number.isInteger(branchId) && branchId > 0 && Number(filaCobro.branch_id) !== branchId) {
        return false;
    }

    if (
        paymentStatus === "pagado" &&
        financialStatus !== "pagado"
    ) {
        return false;
    }

    if (
        paymentStatus === "pendiente" &&
        !["pendiente", "parcial"].includes(financialStatus)
    ) {
        return false;
    }

    if (paymentStatus === "anulado" && financialStatus !== "anulado") {
        return false;
    }

    if (scope === "pagado" && financialStatus !== "pagado") {
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

function getCurrentZonedDateTime(timeZone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
    const partMap = {};

    for (const part of formatter.formatToParts(new Date())) {
        if (part.type !== "literal") {
            partMap[part.type] = part.value;
        }
    }

    return {
        date: `${partMap.year}-${partMap.month}-${partMap.day}`,
        time: `${partMap.hour}:${partMap.minute}`
    };
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

function cumpleFiltrosReservaParaResumen(filaReserva, filtros = {}) {
    const from = normalizarFecha(filtros.from);
    const to = normalizarFecha(filtros.to);
    const patientQuery = normalizarTexto(filtros.patient).toLowerCase();
    const userId = Number(filtros.userId);
    const roomId = Number(filtros.roomId);
    const branchId = Number(filtros.branchId);

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

    if (Number.isInteger(branchId) && branchId > 0 && Number(filaReserva.sucursal_id) !== branchId) {
        return false;
    }

    return true;
}

function formatearReservaFacturable(filaReserva) {
    return {
        id: filaReserva.id,
        fecha: normalizarFecha(filaReserva.fecha),
        horaInicio: normalizarHora(filaReserva.hora_inicio),
        horaFin: normalizarHora(filaReserva.hora_fin),
        descripcion: filaReserva.descripcion ?? "",
        estado: filaReserva.estado,
        tipoAtencion: filaReserva.tipo_atencion ?? "procedimiento",
        tipoConsulta: filaReserva.tipo_consulta ?? "",
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
        billableItemId: filaReserva.billable_item_id ?? null,
        confirmedAt: filaReserva.confirmed_at ?? null
    };
}

function esReservaFacturable(filaReserva, chargeMap, documentMap = new Map()) {
    return (
        filaReserva.estado === "confirmada" &&
        !chargeMap.has(Number(filaReserva.id)) &&
        !documentMap.has(Number(filaReserva.id))
    );
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
    const pagos = await listarPagosPorChargeIds(chargeIds, workspaceId, executor);
    const groupedSupplies = groupRowsByChargeId(lineas, (linea) => linea.charge_id);
    const groupedPayments = groupRowsByChargeId(pagos, (pago) => pago.charge_id);

    return rows.map((row) =>
        formatearCobroSalida(
            row,
            (groupedSupplies.get(Number(row.id)) ?? []).map((linea) => formatearLineaInsumo(linea)),
            groupedPayments.get(Number(row.id)) ?? []
        )
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

function lineasInsumosCoinciden(existingSupplies = [], nextSupplies = []) {
    if (existingSupplies.length !== nextSupplies.length) {
        return false;
    }

    return existingSupplies.every((existingSupply, index) => {
        const nextSupply = nextSupplies[index];

        if (!nextSupply) {
            return false;
        }

        return (
            Number(existingSupply.inventoryItemId ?? existingSupply.inventory_item_id ?? 0) ===
                Number(nextSupply.inventoryItemId ?? nextSupply.inventory_item_id ?? 0) &&
            roundMoney(existingSupply.quantity ?? 0) === roundMoney(nextSupply.quantity ?? 0) &&
            roundMoney(existingSupply.unitCost ?? existingSupply.unit_cost ?? 0) ===
                roundMoney(nextSupply.unitCost ?? nextSupply.unit_cost ?? 0) &&
            roundMoney(existingSupply.unitPrice ?? existingSupply.unit_price ?? 0) ===
                roundMoney(nextSupply.unitPrice ?? nextSupply.unit_price ?? 0) &&
            normalizarTexto(existingSupply.notes) === normalizarTexto(nextSupply.notes)
        );
    });
}

function canMutateChargeStructure(existingCharge) {
    return Number(existingCharge?.paymentCount ?? existingCharge?.payment_count ?? 0) === 0;
}

function validarEdicionEstructuralFactura(existingCharge, nextData) {
    if (!existingCharge || canMutateChargeStructure(existingCharge)) {
        return {
            ok: true
        };
    }

    const existingPricingMode = normalizarModoCobro(
        existingCharge?.pricingMode ?? existingCharge?.pricing_mode,
        DEFAULT_PRICING_MODE
    );
    const existingCurrencyCode = normalizarMoneda(
        existingCharge?.currencyCode ?? existingCharge?.currency_code
    );
    const existingRoomChargeAmount = roundMoney(
        existingCharge?.roomChargeAmount ?? existingCharge?.room_charge_amount ?? 0
    );
    const existingChargeDecision = normalizarDecisionCobro(
        existingCharge?.chargeDecision ?? existingCharge?.charge_decision,
        "cobrable"
    );

    if (
        existingPricingMode !== nextData.pricingMode ||
        existingCurrencyCode !== nextData.currencyCode ||
        existingRoomChargeAmount !== nextData.roomChargeAmount ||
        existingChargeDecision !== nextData.chargeDecision ||
        !lineasInsumosCoinciden(existingCharge?.supplies ?? [], nextData.supplies)
    ) {
        return {
            ok: false,
            msg: "La factura ya tiene abonos registrados. No se pueden cambiar moneda, modalidad, montos o insumos."
        };
    }

    return {
        ok: true
    };
}

async function normalizarPayloadReporte(payload, auth, opciones = {}) {
    const workspaceId = resolveWorkspaceId(auth);
    const registeredByUserId = resolveUserId(auth);
    const existingCharge = opciones.existingCharge ?? null;
    const pricingPolicy = normalizarTexto(
        opciones.pricingPolicy ?? DEFAULT_PRICING_POLICY
    ).toLowerCase();
    const defaultPricingMode = normalizarModoCobro(
        opciones.defaultPricingMode,
        DEFAULT_PRICING_MODE
    );
    const lockedPricingMode = existingCharge
        ? normalizarModoCobro(
              existingCharge?.pricingMode ?? existingCharge?.pricing_mode,
              defaultPricingMode
          )
        : defaultPricingMode;
    const requestedPricingMode = normalizarTexto(payload?.pricingMode)
        ? normalizarModoCobro(payload?.pricingMode, lockedPricingMode)
        : null;
    const pricingMode =
        pricingPolicy === DEFAULT_PRICING_POLICY
            ? lockedPricingMode
            : normalizarModoCobro(payload?.pricingMode, lockedPricingMode);
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
    const currencyCode = normalizarMoneda(
        payload?.currencyCode ?? existingCharge?.currencyCode ?? existingCharge?.currency_code
    );
    const requestedCurrencyCode = normalizarTexto(payload?.currencyCode).toUpperCase();
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

    if (requestedCurrencyCode && !SUPPORTED_CURRENCY_CODES.includes(requestedCurrencyCode)) {
        return {
            ok: false,
            msg: "La moneda de la factura no es valida."
        };
    }

    if (pricingPolicy !== DEFAULT_PRICING_POLICY) {
        return {
            ok: false,
            msg: "La politica procedural configurada no es valida."
        };
    }

    if (requestedPricingMode && requestedPricingMode !== lockedPricingMode) {
        return {
            ok: false,
            msg: "La modalidad del procedimiento esta bloqueada por la cuenta y no puede cambiarse desde este reporte."
        };
    }

    if (!MODOS_COBRO.includes(pricingMode)) {
        return {
            ok: false,
            msg: "La modalidad de cobro no es valida."
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

    const structuralEditValidation = validarEdicionEstructuralFactura(existingCharge, {
        pricingMode,
        currencyCode,
        roomChargeAmount,
        chargeDecision,
        supplies: preparedSupplies
    });

    if (!structuralEditValidation.ok) {
        return structuralEditValidation;
    }

    const totalBilledAmount = roundMoney(roomChargeAmount + suppliesTotalAmount);

    let normalizedPaymentStatus = "pendiente";
    let paymentMethod = null;
    let paidAt = null;

    if (chargeDecision === "exonerado") {
        normalizedPaymentStatus = "anulado";
    } else if (
        existingCharge?.chargeDecision === "exonerado" ||
        existingCharge?.charge_decision === "exonerado"
    ) {
        normalizedPaymentStatus = "pendiente";
    } else if (existingCharge) {
        normalizedPaymentStatus = normalizarEstadoCobroPersistencia(
            existingCharge?.paymentStatus ?? existingCharge?.payment_status
        );
        paymentMethod = normalizarMetodoPago(
            existingCharge?.paymentMethod ?? existingCharge?.payment_method
        );
        paidAt =
            existingCharge?.lastPaymentAt ??
            existingCharge?.last_payment_at ??
            existingCharge?.paidAt ??
            existingCharge?.paid_at ??
            null;
    }

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
            paidAt: chargeDecision === "exonerado" ? null : paidAt,
            notes,
            chargeDecision,
            waivedByUserId: chargeDecision === "exonerado" ? registeredByUserId : null,
            waiverReason: chargeDecision === "exonerado" ? waiverReason : null
        }
    };
}

function normalizarPayloadPago(payload = {}) {
    const paymentMethod = normalizarMetodoPago(payload.paymentMethod);

    if (!METODOS_PAGO.includes(paymentMethod)) {
        return {
            ok: false,
            msg: "El metodo de pago no es valido."
        };
    }

    const paidAt = normalizarPaidAt(payload.paidAt, "pagado");

    if (!paidAt) {
        return {
            ok: false,
            msg: "La fecha y hora de pago no es valida."
        };
    }

    const requestedAmount = normalizarMonto(payload.amount, null);

    if (requestedAmount !== null && (!Number.isFinite(requestedAmount) || requestedAmount <= 0)) {
        return {
            ok: false,
            msg: "El monto del abono no es valido."
        };
    }

    return {
        ok: true,
        data: {
            paymentMethod,
            paidAt,
            amount: requestedAmount === null ? null : roundMoney(requestedAmount),
            notes: normalizarTexto(payload.notes) || null
        }
    };
}

function resolverMontoAbono(normalizedPayment, invoice) {
    const outstandingAmount = invoice.outstandingAmount();

    if (!outstandingAmount.isPositive()) {
        return {
            ok: false,
            msg: "La factura indicada ya no tiene saldo pendiente."
        };
    }

    const requestedAmount = normalizedPayment.amount;
    const resolvedAmount = requestedAmount === null
        ? outstandingAmount.toNumber()
        : roundMoney(requestedAmount);
    const amountMoney = Money.from(resolvedAmount);

    if (!amountMoney.isPositive()) {
        return {
            ok: false,
            msg: "El monto del abono debe ser mayor que cero."
        };
    }

    if (amountMoney.isGreaterThan(outstandingAmount)) {
        return {
            ok: false,
            msg: `El abono excede el saldo pendiente de ${outstandingAmount.toNumber()}.`
        };
    }

    return {
        ok: true,
        data: {
            ...normalizedPayment,
            amount: amountMoney.toNumber()
        }
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
        const genericDocuments = await listarComprobantesFormateadosPorWorkspaceId(
            workspaceId,
            filtros
        );
        const legacyCharges = await enriquecerCobrosConLineas(filteredRows, workspaceId);
        const mergedReports = [...legacyCharges, ...genericDocuments].sort((left, right) => {
            const leftKey = String(left.createdAt ?? left.issuedAt ?? "");
            const rightKey = String(right.createdAt ?? right.issuedAt ?? "");
            return rightKey.localeCompare(leftKey);
        });

        return {
            ok: true,
            msg: "Reportes operativos listados correctamente.",
            data: mergedReports
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al listar los reportes operativos: ${error.message}`
        };
    }
}

export async function listarReservasFacturables(filtros, auth) {
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

        const reservationRows = await listarReservasRepository(workspaceId);
        const chargeMap = new Map(
            (
                await listarCobrosPorReservationIds(
                    reservationRows.map((row) => Number(row.id)),
                    workspaceId
                )
            ).map((chargeRow) => [Number(chargeRow.reservation_id), chargeRow])
        );
        const documentMap = await listarReservationBillingDocumentsMap(
            reservationRows.map((row) => Number(row.id)),
            workspaceId
        );

        return {
            ok: true,
            msg: "Reservas facturables listadas correctamente.",
            data: reservationRows
                .filter((filaReserva) => cumpleFiltrosReservaParaResumen(filaReserva, filtros))
                .filter((filaReserva) =>
                    esReservaFacturable(filaReserva, chargeMap, documentMap)
                )
                .sort((left, right) => {
                    const leftKey = `${normalizarFecha(left.fecha)}T${normalizarHora(left.hora_inicio)}`;
                    const rightKey = `${normalizarFecha(right.fecha)}T${normalizarHora(right.hora_inicio)}`;
                    return rightKey.localeCompare(leftKey);
                })
                .map((filaReserva) => formatearReservaFacturable(filaReserva))
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al listar las reservas facturables: ${error.message}`
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
                pricingPolicy: settings.procedurePricingPolicy,
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
                    patientPhoneSnapshot: reservation.paciente_telefono ?? null,
                    roomId: reservation.sala_id,
                    roomNameSnapshot: reservation.sala_nombre ?? `Sala #${reservation.sala_id}`,
                    branchId: room.sucursal_id ?? null,
                    branchNameSnapshot: room.sucursal_nombre ?? null,
                    procedureName: normalizedPayload.data.procedureName,
                    tipoAtencion: reservation.tipo_atencion,
                    billableItemId: reservation.billable_item_id ?? null,
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

            const inventorySyncResult = await syncProcedureConsumption({
                workspaceId,
                branchId: room.sucursal_id ?? null,
                reservationId: reservation.id,
                chargeId: createdCharge.id,
                previousSupplies: [],
                nextSupplies: normalizedPayload.data.supplies,
                createdByUserId: registeredByUserId,
                executor: client
            });

            if (!inventorySyncResult.ok) {
                throw new Error(inventorySyncResult.msg);
            }

            if (
                normalizedPayload.data.chargeDecision === "cobrable" &&
                normalizedPayload.data.paymentStatus === "pagado"
            ) {
                await ensureLedgerForPaidCharge({
                    chargeId: createdCharge.id,
                    workspaceId,
                    registeredByUserId,
                    paymentMethod: normalizedPayload.data.paymentMethod,
                    paidAt: normalizedPayload.data.paidAt,
                    notes: "Pago sincronizado al guardar una factura procedural ya marcada como pagada.",
                    executor: client
                });
            }

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
                pricingPolicy: settings.procedurePricingPolicy,
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

            const reservation = await buscarReservaPorIdRepository(
                charge.reservation_id,
                workspaceId,
                client
            );

            if (!reservation) {
                throw new Error("La reserva asociada al reporte ya no existe.");
            }

            const room = await buscarSalaPorId(reservation.sala_id, workspaceId, client);

            if (!room) {
                throw new Error("La sala asociada a la reserva no existe.");
            }

            const inventorySyncResult = await syncProcedureConsumption({
                workspaceId,
                branchId: room.sucursal_id ?? null,
                reservationId: reservation.id,
                chargeId,
                previousSupplies: existingReport.supplies ?? [],
                nextSupplies: normalizedPayload.data.supplies,
                createdByUserId: registeredByUserId,
                executor: client
            });

            if (!inventorySyncResult.ok) {
                throw new Error(inventorySyncResult.msg);
            }

            if (
                normalizedPayload.data.chargeDecision === "cobrable" &&
                normalizedPayload.data.paymentStatus === "pagado"
            ) {
                await ensureLedgerForPaidCharge({
                    chargeId,
                    workspaceId,
                    registeredByUserId,
                    paymentMethod: normalizedPayload.data.paymentMethod,
                    paidAt: normalizedPayload.data.paidAt,
                    notes: "Pago sincronizado al actualizar una factura procedural marcada como pagada.",
                    executor: client
                });
            }

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

export async function confirmarPagoCobro(id, payload, auth) {
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

        const normalizedPayment = normalizarPayloadPago(payload);

        if (!normalizedPayment.ok) {
            return normalizedPayment;
        }

        return await withTransaction(async (client) => {
            const charge = await buscarCobroPorId(chargeId, workspaceId, client);

            if (!charge) {
                return {
                    ok: false,
                    msg: "El reporte indicado no existe en esta cuenta."
                };
            }

            const [existingReport] = await enriquecerCobrosConLineas(
                [charge],
                workspaceId,
                client
            );
            const existingInvoice = buildChargeInvoiceFromRow(
                existingReport,
                existingReport?.payments ?? []
            );

            if (charge.charge_decision === "exonerado") {
                return {
                    ok: false,
                    msg: "Un caso exonerado no puede confirmarse como pagado."
                };
            }

            if (charge.payment_status === "anulado") {
                return {
                    ok: false,
                    msg: "Esta factura esta anulada y no puede confirmarse como pagada."
                };
            }

            if (!existingInvoice.canRegisterPayment()) {
                return {
                    ok: true,
                    msg: "La factura ya no tiene saldo pendiente.",
                    data: existingReport
                };
            }

            const resolvedPaymentAmount = resolverMontoAbono(
                normalizedPayment.data,
                existingInvoice
            );

            if (!resolvedPaymentAmount.ok) {
                return resolvedPaymentAmount;
            }

            const createdPayment = new ChargePayment({
                workspaceId,
                chargeId,
                amount: resolvedPaymentAmount.data.amount,
                currencyCode: existingReport.currencyCode,
                paymentMethod: resolvedPaymentAmount.data.paymentMethod,
                paidAt: resolvedPaymentAmount.data.paidAt,
                notes: resolvedPaymentAmount.data.notes,
                registeredByUserId
            });

            await crearPagoCobroRepository(createdPayment.toPersistence(), client);

            const paymentRows = await listarPagosPorChargeIds([chargeId], workspaceId, client);
            const refreshedCharge = await buscarCobroPorId(chargeId, workspaceId, client);
            const refreshedInvoice = buildChargeInvoiceFromRow(refreshedCharge, paymentRows);
            const financialSnapshot = refreshedInvoice.toFinancialSnapshot();

            await actualizarPagoCobroRepository(
                chargeId,
                workspaceId,
                {
                    paymentStatus: financialSnapshot.paymentStatus,
                    paymentMethod: createdPayment.paymentMethod,
                    paidAt: financialSnapshot.lastPaymentAt,
                    registeredByUserId
                },
                client
            );

            const updatedCharge = await buscarCobroPorId(chargeId, workspaceId, client);
            const [formattedReport] = await enriquecerCobrosConLineas(
                [updatedCharge],
                workspaceId,
                client
            );
            const verb = formattedReport.outstandingAmount > 0 ? "Abono registrado" : "Pago confirmado";

            return {
                ok: true,
                msg: `${verb} correctamente.`,
                data: formattedReport
            };
        });
    } catch (error) {
        return {
            ok: false,
            msg: `Error al confirmar el pago: ${error.message}`
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
        const paymentRows = await listarPagosPorChargeIds(
            filteredCharges.map((row) => Number(row.id)),
            workspaceId
        );
        const paymentsByChargeId = groupRowsByChargeId(paymentRows, (payment) => payment.charge_id);
        const genericDocuments = await listarComprobantesFormateadosPorWorkspaceId(
            workspaceId,
            filtros
        );
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
            const payments = (paymentsByChargeId.get(Number(row.id)) ?? []).map((payment) =>
                formatearPagoSalida(payment)
            );
            const invoice = buildChargeInvoiceFromRow(row, payments);
            const financialSnapshot = invoice.toFinancialSnapshot();
            const collectedInRange = resolveCollectedAmountWithinRange(
                invoice,
                payments,
                from,
                to
            );
            const outstandingAmount = financialSnapshot.outstandingAmount;
            const financialStatus = financialSnapshot.financialStatus;
            const collectedRatio = resolveCollectedRatio(collectedInRange, billed);

            if (row.charge_decision === "exonerado") {
                operacionesExoneradas += 1;
                montoExonerado += billed;
                continue;
            }

            if (collectedInRange > 0) {
                ingresosCobrados += collectedInRange;
                ingresosSala += roomCharge * collectedRatio;
                ingresosInsumos += suppliesRevenue * collectedRatio;
                costoInsumos += suppliesCost * collectedRatio;
                margenBrutoAproximado += collectedInRange - suppliesCost * collectedRatio;

                if (row.pricing_mode === "sala_mas_insumos") {
                    ingresosMixtos += collectedInRange;
                }

                if (roomEntry) {
                    roomEntry.capitalGenerated += collectedInRange;
                }

                if (userEntry) {
                    userEntry.capitalGenerated += collectedInRange;
                }
            }

            if (outstandingAmount > 0) {
                ingresosPendientes += outstandingAmount;
            }

            if (
                financialStatus === "pagado" &&
                estaDentroDelRango(financialSnapshot.lastPaymentAt, from, to)
            ) {
                procedimientosCobrados += 1;
            }
        }

        for (const document of genericDocuments) {
            const billed = Number(document.totalBilledAmount ?? 0);
            const roomEntryKey = Number(document.roomId ?? 0);
            const userEntryKey = Number(document.reservationUserId ?? 0);
            const payments = document.payments ?? [];
            const collectedInRange = roundMoney(sumPaymentsWithinRange(payments, from, to));

            if (document.chargeDecision === "exonerado") {
                operacionesExoneradas += 1;
                montoExonerado += billed;
                continue;
            }

            if (collectedInRange > 0) {
                ingresosCobrados += collectedInRange;

                if (roomEntryKey > 0) {
                    if (!roomMap.has(roomEntryKey)) {
                        roomMap.set(roomEntryKey, {
                            roomId: roomEntryKey,
                            roomName: document.roomNameSnapshot ?? `Sala #${roomEntryKey}`,
                            frequency: 0,
                            hoursUsed: 0,
                            capitalGenerated: 0
                        });
                    }

                    roomMap.get(roomEntryKey).capitalGenerated += collectedInRange;
                }

                if (userEntryKey > 0) {
                    if (!userMap.has(userEntryKey)) {
                        userMap.set(userEntryKey, {
                            userId: userEntryKey,
                            userName:
                                document.reservationUserName ?? `Usuario #${userEntryKey}`,
                            capitalGenerated: 0
                        });
                    }

                    userMap.get(userEntryKey).capitalGenerated += collectedInRange;
                }
            }

            if (Number(document.outstandingAmount ?? 0) > 0) {
                ingresosPendientes += Number(document.outstandingAmount ?? 0);
            }

            if (
                document.financialStatus === "pagado" &&
                estaDentroDelRango(document.lastPaymentAt, from, to)
            ) {
                procedimientosCobrados += 1;
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
                cobrosRegistrados: filteredCharges.length + genericDocuments.length,
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

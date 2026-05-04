import { withTransaction } from "../db/connection.js";
import { normalizeSupportedCurrencyCode } from "../../shared/currencies.js";
import {
    buscarBillingDocumentActivoPorReservationId,
    buscarBillingDocumentPorId,
    crearBillingDocument,
    crearBillingDocumentLine,
    crearBillingDocumentPayment,
    listarBillingDocumentLinesPorDocumentIds,
    listarBillingDocumentPaymentsPorDocumentIds,
    listarBillingDocumentsPorReservationIds,
    listarBillingDocumentsPorWorkspaceId
} from "../repositories/billingDocumentRepository.js";
import { buscarBillableItemPorId } from "../repositories/billableItemRepository.js";
import { buscarPacientePorId } from "../repositories/pacienteRepository.js";
import { buscarSalaPorId } from "../repositories/salaRepository.js";
import { buscarUsuarioInternoPorId } from "../repositories/workspaceMemberRepository.js";
import { buscarReservaPorId as buscarReservaPorIdRepository } from "../repositories/reservaRepository.js";
import { buscarCobroPorReservaId } from "../repositories/financeRepository.js";
import { obtenerConfiguracionCuentaNormalizada } from "./workspaceSettingsService.js";
import { BillingDocumentPayment } from "../domain/finance/BillingDocumentPayment.js";
import { BillingDocumentInvoice } from "../domain/finance/BillingDocumentInvoice.js";
import { Money } from "../domain/finance/Money.js";

const DOCUMENT_TYPES = ["comprobante_simple", "prefactura"];
const DOCUMENT_STATUS = ["emitido", "anulado"];
const PAYMENT_METHODS = ["efectivo", "tarjeta", "transferencia", "otro"];
const CHARGE_DECISIONS = ["cobrable", "exonerado"];

function resolveWorkspaceId(auth) {
    const workspaceId = Number(auth?.workspaceId);
    return Number.isInteger(workspaceId) && workspaceId > 0 ? workspaceId : null;
}

function resolveUserId(auth) {
    const userId = Number(auth?.userId);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function normalizeText(value) {
    return String(value ?? "").trim();
}

function normalizeDate(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    return String(value).slice(0, 10);
}

function normalizeTime(value) {
    if (!value) {
        return null;
    }

    return String(value).slice(0, 5);
}

function normalizeDateTime(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeAmount(value, fallback = NaN) {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : NaN;
}

function normalizeOptionalId(value) {
    const numericValue = Number(value);
    return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
}

function roundMoney(value) {
    return Number(Number(value ?? 0).toFixed(2));
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

function formatBillingDocumentLine(row) {
    return {
        id: row.id,
        documentId: row.document_id,
        workspaceId: row.workspace_id,
        billableItemId: row.billable_item_id ?? null,
        lineNameSnapshot: row.line_name_snapshot,
        descriptionSnapshot: row.description_snapshot ?? "",
        categorySnapshot: row.category_snapshot ?? "",
        quantity: Number(row.quantity ?? 0),
        unitPrice: Number(row.unit_price ?? 0),
        discountAmount: Number(row.discount_amount ?? 0),
        taxRate: Number(row.tax_rate ?? 0),
        taxAmount: Number(row.tax_amount ?? 0),
        lineTotal: Number(row.line_total ?? 0),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function formatBillingDocumentPayment(row) {
    return {
        id: row.id,
        documentId: row.document_id,
        workspaceId: row.workspace_id,
        amount: Number(row.amount ?? 0),
        currencyCode: row.currency_code,
        paymentMethod: row.payment_method,
        paidAt: row.paid_at,
        notes: row.notes ?? "",
        registeredByUserId: row.registered_by_user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function buildBillingDocumentInvoiceFromRow(row, payments = []) {
    return BillingDocumentInvoice.fromRow(
        row,
        payments.map((payment) =>
            payment instanceof BillingDocumentPayment
                ? payment
                : BillingDocumentPayment.fromRow(payment)
        )
    );
}

function formatBillingDocumentOutput(row, lines = [], payments = []) {
    const normalizedPayments = payments.map((payment) => formatBillingDocumentPayment(payment));
    const invoice = buildBillingDocumentInvoiceFromRow(row, normalizedPayments);
    const financialSnapshot = invoice.toFinancialSnapshot();
    const firstLine = lines[0] ? formatBillingDocumentLine(lines[0]) : null;
    const primaryDate = normalizeDate(row.reservation_date ?? row.issued_at);

    return {
        id: row.id,
        recordType: "billing_document",
        recordKey: `billing_document:${row.id}`,
        sourceType: row.source_type ?? "manual",
        sourceId: row.source_id ?? null,
        reservationId: row.reservation_id ?? null,
        reservationDate: primaryDate,
        reservationStartTime: normalizeTime(row.reservation_start_time) ?? "--:--",
        reservationEndTime: normalizeTime(row.reservation_end_time) ?? "--:--",
        reservationStatus: row.reservation_status ?? row.document_status,
        patientId: row.patient_id ?? null,
        patientNameSnapshot:
            row.patient_name_snapshot ?? row.patient_name ?? "Sin paciente asignado",
        patientPhoneSnapshot:
            row.patient_phone_snapshot ?? row.patient_phone ?? null,
        roomId: row.room_id ?? null,
        roomNameSnapshot: row.room_name_snapshot ?? row.room_name ?? null,
        branchId: row.branch_id ?? null,
        branchNameSnapshot: row.branch_name ?? null,
        reservationUserId: row.professional_user_id ?? null,
        reservationUserName:
            row.professional_name_snapshot ?? row.professional_user_name ?? null,
        procedureName: firstLine?.lineNameSnapshot ?? "Comprobante manual",
        pricingMode:
            row.source_type === "reservation"
                ? "servicio_catalogado"
                : row.source_type === "rental"
                  ? "alquiler"
                  : "manual",
        roomChargeAmount: 0,
        suppliesTotalAmount: 0,
        suppliesTotalCost: 0,
        totalBilledAmount: Number(row.total_amount ?? 0),
        paidAmount: financialSnapshot.paidAmount,
        outstandingAmount: financialSnapshot.outstandingAmount,
        paymentCount: financialSnapshot.paymentCount,
        paymentStatus: financialSnapshot.paymentStatus,
        paidAt: financialSnapshot.lastPaymentAt ?? null,
        lastPaymentAt: financialSnapshot.lastPaymentAt ?? null,
        paymentMethod:
            normalizedPayments[normalizedPayments.length - 1]?.paymentMethod ?? null,
        currencyCode: row.currency_code,
        chargeDecision: row.charge_decision ?? "cobrable",
        financialStatus: financialSnapshot.financialStatus,
        paymentLabel: derivePaymentLabel(financialSnapshot.financialStatus),
        paymentDetailLabel:
            financialSnapshot.financialStatus === "parcial"
                ? `Abonado ${financialSnapshot.paidAmount} / ${Number(row.total_amount ?? 0)}`
                : derivePaymentLabel(financialSnapshot.financialStatus),
        hasRegisteredPayments: financialSnapshot.hasRegisteredPayments,
        notes: row.notes ?? "",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        issuedAt: row.issued_at ?? row.created_at,
        documentType: row.document_type ?? "comprobante_simple",
        documentStatus: row.document_status ?? "emitido",
        primaryBillableItemId: firstLine?.billableItemId ?? null,
        primaryCategory: firstLine?.categorySnapshot ?? null,
        lineCount: lines.length,
        lines: lines.map((line) => formatBillingDocumentLine(line)),
        payments: normalizedPayments,
        supplies: []
    };
}

function groupRowsByDocumentId(rows = [], accessor) {
    const grouped = new Map();

    for (const row of rows) {
        const documentId = Number(accessor(row));

        if (!Number.isInteger(documentId) || documentId <= 0) {
            continue;
        }

        if (!grouped.has(documentId)) {
            grouped.set(documentId, []);
        }

        grouped.get(documentId).push(row);
    }

    return grouped;
}

function matchesBillingDocumentFilters(row, filters = {}) {
    const patientQuery = normalizeText(filters.patient).toLowerCase();
    const from = normalizeDate(filters.from);
    const to = normalizeDate(filters.to);
    const userId = normalizeOptionalId(filters.userId);
    const roomId = normalizeOptionalId(filters.roomId);
    const branchId = normalizeOptionalId(filters.branchId);
    const paymentStatus = normalizeText(filters.paymentStatus).toLowerCase();
    const dateKey = normalizeDate(row.reservation_date ?? row.issued_at);

    if (from && dateKey && dateKey < from) {
        return false;
    }

    if (to && dateKey && dateKey > to) {
        return false;
    }

    if (userId && Number(row.professional_user_id) !== userId) {
        return false;
    }

    if (roomId && Number(row.room_id) !== roomId) {
        return false;
    }

    if (branchId && Number(row.branch_id) !== branchId) {
        return false;
    }

    if (paymentStatus && paymentStatus !== "todos") {
        if (paymentStatus === "pagado" && row.financial_status !== "pagado") {
            return false;
        }

        if (paymentStatus === "pendiente" && !["pendiente", "parcial"].includes(row.financial_status)) {
            return false;
        }

        if (paymentStatus === "anulado" && row.financial_status !== "anulado") {
            return false;
        }
    }

    if (!patientQuery) {
        return true;
    }

    return [
        row.patient_name_snapshot,
        row.patient_phone_snapshot,
        row.patient_name,
        row.patient_phone
    ]
        .join(" ")
        .toLowerCase()
        .includes(patientQuery);
}

async function enrichBillingDocuments(rows, workspaceId, executor = undefined) {
    if (!Array.isArray(rows) || !rows.length) {
        return [];
    }

    const documentIds = rows.map((row) => Number(row.id));
    const [lineRows, paymentRows] = await Promise.all([
        listarBillingDocumentLinesPorDocumentIds(documentIds, workspaceId, executor),
        listarBillingDocumentPaymentsPorDocumentIds(documentIds, workspaceId, executor)
    ]);
    const linesByDocumentId = groupRowsByDocumentId(lineRows, (line) => line.document_id);
    const paymentsByDocumentId = groupRowsByDocumentId(
        paymentRows,
        (payment) => payment.document_id
    );

    return rows.map((row) =>
        formatBillingDocumentOutput(
            row,
            linesByDocumentId.get(Number(row.id)) ?? [],
            paymentsByDocumentId.get(Number(row.id)) ?? []
        )
    );
}

function resolveDocumentType(payloadDocumentType, settings) {
    const documentType = normalizeText(
        payloadDocumentType ?? settings.policies.documentMode ?? "comprobante_simple"
    ).toLowerCase();

    return DOCUMENT_TYPES.includes(documentType) ? documentType : "comprobante_simple";
}

function computeLineAmounts({
    quantity,
    unitPrice,
    discountAmount,
    taxRate,
    taxBehavior,
    taxesEnabled
}) {
    const quantityMoney = Math.max(0, Number(quantity ?? 0));
    const unitPriceMoney = Money.from(unitPrice);
    const grossBase = unitPriceMoney.toNumber() * quantityMoney;
    const resolvedDiscount = roundMoney(Math.max(0, Number(discountAmount ?? 0)));
    const netBeforeTax = Math.max(0, grossBase - resolvedDiscount);
    const resolvedTaxRate = taxesEnabled ? Math.max(0, Number(taxRate ?? 0)) : 0;

    if (!taxesEnabled || taxBehavior === "no_aplica" || resolvedTaxRate <= 0) {
        return {
            taxAmount: 0,
            lineTotal: roundMoney(netBeforeTax)
        };
    }

    if (taxBehavior === "incluido") {
        const embeddedTax = roundMoney((netBeforeTax * resolvedTaxRate) / (100 + resolvedTaxRate));

        return {
            taxAmount: embeddedTax,
            lineTotal: roundMoney(netBeforeTax)
        };
    }

    const computedTaxAmount = roundMoney((netBeforeTax * resolvedTaxRate) / 100);

    return {
        taxAmount: computedTaxAmount,
        lineTotal: roundMoney(netBeforeTax + computedTaxAmount)
    };
}

async function normalizeDocumentPayload(payload, auth, executor) {
    const workspaceId = resolveWorkspaceId(auth);
    const settings = await obtenerConfiguracionCuentaNormalizada(
        workspaceId,
        auth?.planCode ?? "basic",
        executor
    );

    if (!settings.capabilities.manualBillingEnabled) {
        return {
            ok: false,
            msg: "La cuenta actual no tiene habilitado el cobro general sin reserva."
        };
    }

    const billableItemId = normalizeOptionalId(payload?.billableItemId);

    if (!billableItemId) {
        return {
            ok: false,
            msg: "Debes seleccionar un item facturable."
        };
    }

    const item = await buscarBillableItemPorId(billableItemId, workspaceId, executor);

    if (!item || item.state !== "activo") {
        return {
            ok: false,
            msg: "El item facturable seleccionado no existe o esta inactivo."
        };
    }

    const reservationId = normalizeOptionalId(payload?.reservationId);
    const quantity = Math.max(1, normalizeAmount(payload?.quantity, 1));
    const chargeDecision = normalizeText(payload?.chargeDecision ?? "cobrable").toLowerCase();
    const notes = normalizeText(payload?.notes);

    if (!CHARGE_DECISIONS.includes(chargeDecision)) {
        return {
            ok: false,
            msg: "La decision del comprobante no es valida."
        };
    }

    let reservation = null;
    let patient = null;
    let room = null;
    let professional = null;
    let branchId = normalizeOptionalId(payload?.branchId);

    if (reservationId) {
        reservation = await buscarReservaPorIdRepository(reservationId, workspaceId, executor);

        if (!reservation) {
            return {
                ok: false,
                msg: "La reserva indicada no existe en esta cuenta."
            };
        }

        if (reservation.estado === "cancelada") {
            return {
                ok: false,
                msg: "No puedes emitir un comprobante sobre una reserva cancelada."
            };
        }

        const existingLegacyCharge = await buscarCobroPorReservaId(
            reservationId,
            workspaceId,
            executor
        );

        if (existingLegacyCharge) {
            return {
                ok: false,
                msg: "La reserva indicada ya tiene una factura procedural emitida."
            };
        }

        const existingDocument = await buscarBillingDocumentActivoPorReservationId(
            reservationId,
            workspaceId,
            executor
        );

        if (existingDocument) {
            return {
                ok: false,
                msg: "La reserva indicada ya tiene un comprobante emitido."
            };
        }

        patient = reservation.paciente_id
            ? await buscarPacientePorId(reservation.paciente_id, workspaceId, executor)
            : null;
        room = reservation.sala_id
            ? await buscarSalaPorId(reservation.sala_id, workspaceId, executor)
            : null;
        professional = reservation.usuario_id
            ? await buscarUsuarioInternoPorId(reservation.usuario_id, workspaceId, executor)
            : null;
        branchId = room?.sucursal_id ?? branchId;
    } else {
        const patientId = normalizeOptionalId(payload?.patientId);
        const roomId = normalizeOptionalId(payload?.roomId);
        const professionalUserId = normalizeOptionalId(payload?.professionalUserId);

        patient = patientId
            ? await buscarPacientePorId(patientId, workspaceId, executor)
            : null;
        room = roomId ? await buscarSalaPorId(roomId, workspaceId, executor) : null;
        professional = professionalUserId
            ? await buscarUsuarioInternoPorId(professionalUserId, workspaceId, executor)
            : null;
        branchId = room?.sucursal_id ?? branchId;
    }

    if (item.requires_patient && !patient) {
        return {
            ok: false,
            msg: "Este item facturable requiere un paciente asociado."
        };
    }

    if (item.requires_room && !room) {
        return {
            ok: false,
            msg: "Este item facturable requiere una sala o consultorio."
        };
    }

    if (item.requires_professional && !professional) {
        return {
            ok: false,
            msg: "Este item facturable requiere un profesional responsable."
        };
    }

    if (!reservation && !item.billable_without_reservation) {
        return {
            ok: false,
            msg: "Este item solo puede cobrarse cuando esta ligado a una reserva."
        };
    }

    const currencyCode = normalizeSupportedCurrencyCode(
        payload?.currencyCode ?? item.currency_code ?? settings.defaultCurrencyCode,
        ""
    );

    if (!currencyCode) {
        return {
            ok: false,
            msg: "La moneda del comprobante no es valida."
        };
    }

    const unitPrice = normalizeAmount(payload?.unitPrice, Number(item.base_price ?? 0));

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return {
            ok: false,
            msg: "El precio unitario del comprobante no es valido."
        };
    }

    const computedAmounts = computeLineAmounts({
        quantity,
        unitPrice,
        discountAmount: payload?.discountAmount,
        taxRate: payload?.taxRate ?? item.tax_rate,
        taxBehavior: item.tax_behavior ?? "no_aplica",
        taxesEnabled: settings.policies.taxesEnabled
    });

    return {
        ok: true,
        data: {
            settings,
            reservation,
            patient,
            professional,
            room,
            item,
            branchId,
            documentType: resolveDocumentType(payload?.documentType, settings),
            chargeDecision,
            notes,
            currencyCode,
            quantity: roundMoney(quantity),
            unitPrice: roundMoney(unitPrice),
            discountAmount: roundMoney(Math.max(0, normalizeAmount(payload?.discountAmount, 0))),
            taxRate: settings.policies.taxesEnabled
                ? roundMoney(Math.max(0, normalizeAmount(payload?.taxRate ?? item.tax_rate, 0)))
                : 0,
            taxAmount: computedAmounts.taxAmount,
            lineTotal: computedAmounts.lineTotal,
            subtotalAmount: roundMoney(
                roundMoney(quantity) * roundMoney(unitPrice) -
                    roundMoney(Math.max(0, normalizeAmount(payload?.discountAmount, 0)))
            ),
            totalAmount: computedAmounts.lineTotal
        }
    };
}

function normalizePaymentPayload(payload = {}) {
    const paymentMethod = normalizeText(payload.paymentMethod || "efectivo").toLowerCase();
    const amount = normalizeAmount(payload.amount);
    const paidAt = normalizeDateTime(payload.paidAt) ?? new Date().toISOString();
    const notes = normalizeText(payload.notes);

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
        return {
            ok: false,
            msg: "El metodo de pago indicado no es valido."
        };
    }

    if (payload.amount !== undefined && payload.amount !== null && payload.amount !== "") {
        if (!Number.isFinite(amount) || amount <= 0) {
            return {
                ok: false,
                msg: "El monto del pago no es valido."
            };
        }
    }

    return {
        ok: true,
        data: {
            paymentMethod,
            amount,
            paidAt,
            notes
        }
    };
}

function resolvePaymentAmount(normalizedPayment, invoice, partialPaymentsEnabled) {
    const outstandingAmount = invoice.outstandingAmount().toNumber();

    if (outstandingAmount <= 0) {
        return {
            ok: false,
            msg: "El comprobante ya no tiene saldo pendiente."
        };
    }

    if (!Number.isFinite(normalizedPayment.amount)) {
        return {
            ok: true,
            data: {
                amount: outstandingAmount,
                paymentMethod: normalizedPayment.paymentMethod,
                paidAt: normalizedPayment.paidAt,
                notes: normalizedPayment.notes
            }
        };
    }

    const requestedAmount = roundMoney(normalizedPayment.amount);

    if (requestedAmount > outstandingAmount) {
        return {
            ok: false,
            msg: "El abono no puede superar el saldo pendiente del comprobante."
        };
    }

    if (requestedAmount < outstandingAmount && !partialPaymentsEnabled) {
        return {
            ok: false,
            msg: "Los pagos parciales no estan habilitados para esta cuenta."
        };
    }

    return {
        ok: true,
        data: {
            amount: requestedAmount,
            paymentMethod: normalizedPayment.paymentMethod,
            paidAt: normalizedPayment.paidAt,
            notes: normalizedPayment.notes
        }
    };
}

export async function listarComprobantesFormateadosPorWorkspaceId(
    workspaceId,
    filtros = {},
    executor = undefined
) {
    const rows = await listarBillingDocumentsPorWorkspaceId(workspaceId, executor);
    const filteredRows = rows.filter((row) => matchesBillingDocumentFilters(row, filtros));
    return enrichBillingDocuments(filteredRows, workspaceId, executor);
}

export async function listarComprobantesGenericos(filtros, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        const data = await listarComprobantesFormateadosPorWorkspaceId(workspaceId, filtros);

        return {
            ok: true,
            msg: "Comprobantes cargados correctamente.",
            data
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al cargar los comprobantes: ${error.message}`
        };
    }
}

export async function crearComprobanteFinanciero(payload, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const issuedByUserId = resolveUserId(auth);

        if (!workspaceId || !issuedByUserId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        const result = await withTransaction(async (client) => {
            const normalizedPayload = await normalizeDocumentPayload(payload, auth, client);

            if (!normalizedPayload.ok) {
                return normalizedPayload;
            }

            const data = normalizedPayload.data;
            const createdDocument = await crearBillingDocument(
                {
                    workspaceId,
                    branchId: data.branchId,
                    reservationId: data.reservation?.id ?? null,
                    patientId: data.patient?.id ?? null,
                    patientNameSnapshot: data.patient?.nombre ?? null,
                    patientPhoneSnapshot: data.patient?.telefono ?? null,
                    professionalUserId: data.professional?.id ?? null,
                    professionalNameSnapshot: data.professional?.nombre ?? null,
                    roomId: data.room?.id ?? null,
                    roomNameSnapshot: data.room?.nombre ?? null,
                    sourceType: data.reservation ? "reservation" : "manual",
                    sourceId: data.reservation?.id ?? null,
                    partyType: data.patient
                        ? "patient"
                        : data.professional
                          ? "professional"
                          : "workspace",
                    partyId: data.patient?.id ?? data.professional?.id ?? null,
                    documentType: data.documentType,
                    documentStatus: "emitido",
                    currencyCode: data.currencyCode,
                    subtotalAmount: data.subtotalAmount,
                    taxAmount: data.taxAmount,
                    discountAmount: data.discountAmount,
                    totalAmount: data.totalAmount,
                    chargeDecision: data.chargeDecision,
                    notes: data.notes,
                    issuedAt: new Date().toISOString(),
                    issuedByUserId
                },
                client
            );

            await crearBillingDocumentLine(
                {
                    workspaceId,
                    documentId: createdDocument.id,
                    billableItemId: data.item.id,
                    lineNameSnapshot: data.item.name,
                    descriptionSnapshot: data.item.description ?? null,
                    categorySnapshot: data.item.category,
                    quantity: data.quantity,
                    unitPrice: data.unitPrice,
                    discountAmount: data.discountAmount,
                    taxRate: data.taxRate,
                    taxAmount: data.taxAmount,
                    lineTotal: data.lineTotal
                },
                client
            );

            const row = await buscarBillingDocumentPorId(createdDocument.id, workspaceId, client);
            const [formattedDocument] = await enrichBillingDocuments([row], workspaceId, client);

            return {
                ok: true,
                msg: "Comprobante registrado correctamente.",
                data: formattedDocument
            };
        });

        return result;
    } catch (error) {
        return {
            ok: false,
            msg: `Error al registrar el comprobante: ${error.message}`
        };
    }
}

export async function confirmarPagoComprobante(id, payload, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const registeredByUserId = resolveUserId(auth);
        const documentId = Number(id);

        if (!workspaceId || !registeredByUserId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!Number.isInteger(documentId) || documentId <= 0) {
            return {
                ok: false,
                msg: "El comprobante indicado no es valido."
            };
        }

        const settings = await obtenerConfiguracionCuentaNormalizada(
            workspaceId,
            auth?.planCode ?? "basic"
        );
        const normalizedPayment = normalizePaymentPayload(payload);

        if (!normalizedPayment.ok) {
            return normalizedPayment;
        }

        return withTransaction(async (client) => {
            const existingDocument = await buscarBillingDocumentPorId(documentId, workspaceId, client);

            if (!existingDocument) {
                return {
                    ok: false,
                    msg: "El comprobante indicado no existe en esta cuenta."
                };
            }

            const paymentRows = await listarBillingDocumentPaymentsPorDocumentIds(
                [documentId],
                workspaceId,
                client
            );
            const invoice = buildBillingDocumentInvoiceFromRow(existingDocument, paymentRows);

            if (!invoice.canRegisterPayment()) {
                return {
                    ok: true,
                    msg: "El comprobante ya no tiene saldo pendiente.",
                    data: (await enrichBillingDocuments([existingDocument], workspaceId, client))[0]
                };
            }

            const resolvedPaymentAmount = resolvePaymentAmount(
                normalizedPayment.data,
                invoice,
                settings.capabilities.partialPaymentsEnabled
            );

            if (!resolvedPaymentAmount.ok) {
                return resolvedPaymentAmount;
            }

            const createdPayment = new BillingDocumentPayment({
                workspaceId,
                documentId,
                amount: resolvedPaymentAmount.data.amount,
                currencyCode: existingDocument.currency_code,
                paymentMethod: resolvedPaymentAmount.data.paymentMethod,
                paidAt: resolvedPaymentAmount.data.paidAt,
                notes: resolvedPaymentAmount.data.notes,
                registeredByUserId
            });

            await crearBillingDocumentPayment(createdPayment.toPersistence(), client);

            const refreshedRow = await buscarBillingDocumentPorId(documentId, workspaceId, client);
            const [formattedDocument] = await enrichBillingDocuments([refreshedRow], workspaceId, client);
            const verb =
                Number(formattedDocument.outstandingAmount ?? 0) > 0
                    ? "Abono registrado"
                    : "Pago confirmado";

            return {
                ok: true,
                msg: `${verb} correctamente.`,
                data: formattedDocument
            };
        });
    } catch (error) {
        return {
            ok: false,
            msg: `Error al confirmar el pago del comprobante: ${error.message}`
        };
    }
}

export async function obtenerComprobantePdf(id, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const documentId = Number(id);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!Number.isInteger(documentId) || documentId <= 0) {
            return {
                ok: false,
                msg: "El comprobante indicado no es valido."
            };
        }

        const row = await buscarBillingDocumentPorId(documentId, workspaceId);

        if (!row) {
            return {
                ok: false,
                msg: "El comprobante indicado no existe en esta cuenta."
            };
        }

        const [formattedDocument] = await enrichBillingDocuments([row], workspaceId);

        return {
            ok: true,
            msg: "Datos del comprobante cargados correctamente.",
            data: {
                ...formattedDocument,
                generatedAt: new Date().toISOString()
            }
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al preparar el comprobante: ${error.message}`
        };
    }
}

export async function listarReservationBillingDocumentsMap(
    reservationIds,
    workspaceId,
    executor = undefined
) {
    const rows = await listarBillingDocumentsPorReservationIds(reservationIds, workspaceId, executor);
    return new Map(rows.map((row) => [Number(row.reservation_id), row]));
}

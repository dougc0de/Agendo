import { BillingDocumentPayment } from "./BillingDocumentPayment.js";
import { InvoiceStatusPolicy } from "./InvoiceStatusPolicy.js";
import { Money } from "./Money.js";

export class BillingDocumentInvoice {
    constructor({
        id = null,
        workspaceId = null,
        reservationId = null,
        chargeDecision = "cobrable",
        documentStatus = "emitido",
        totalAmount = 0,
        currencyCode = "USD",
        payments = [],
        lastPaymentAt = null
    } = {}) {
        this.id = id ? Number(id) : null;
        this.workspaceId = workspaceId ? Number(workspaceId) : null;
        this.reservationId = reservationId ? Number(reservationId) : null;
        this.chargeDecision = String(chargeDecision ?? "cobrable").trim().toLowerCase() || "cobrable";
        this.documentStatus = String(documentStatus ?? "emitido").trim().toLowerCase() || "emitido";
        this.totalAmount = Money.from(totalAmount);
        this.currencyCode = String(currencyCode ?? "USD").trim().toUpperCase() || "USD";
        this.payments = payments.map((payment) =>
            payment instanceof BillingDocumentPayment
                ? payment
                : BillingDocumentPayment.fromRow(payment)
        );
        this.lastPaymentAt = lastPaymentAt ?? null;
    }

    static fromRow(row = {}, payments = []) {
        return new BillingDocumentInvoice({
            id: row.id ?? row.document_id,
            workspaceId: row.workspace_id ?? row.workspaceId,
            reservationId: row.reservation_id ?? row.reservationId,
            chargeDecision: row.charge_decision ?? row.chargeDecision,
            documentStatus: row.document_status ?? row.documentStatus,
            totalAmount: row.total_amount ?? row.totalAmount ?? 0,
            currencyCode: row.currency_code ?? row.currencyCode,
            payments,
            lastPaymentAt: row.last_payment_at ?? row.lastPaymentAt
        });
    }

    totalPaid() {
        return this.payments.reduce(
            (accumulator, payment) => accumulator.plus(payment.amount),
            new Money(0)
        );
    }

    outstandingAmount() {
        return this.totalAmount.minus(this.totalPaid()).clampNonNegative();
    }

    paymentCount() {
        return this.payments.length;
    }

    financialStatus() {
        return InvoiceStatusPolicy.resolve({
            chargeDecision: this.chargeDecision,
            paymentStatus: this.documentStatus === "anulado" ? "anulado" : "pendiente",
            totalBilledAmount: this.totalAmount.toNumber(),
            paidAmount: this.totalPaid().toNumber()
        });
    }

    summaryPaymentStatus() {
        const status = this.financialStatus();
        return status === "pagado" ? "pagado" : status === "anulado" ? "anulado" : "pendiente";
    }

    canRegisterPayment() {
        const status = this.financialStatus();
        return status !== "pagado" && status !== "anulado" && status !== "exonerado";
    }

    resolvedLastPaymentAt() {
        if (this.payments.length) {
            return this.payments[this.payments.length - 1]?.paidAt ?? this.lastPaymentAt;
        }

        return this.lastPaymentAt;
    }

    toFinancialSnapshot() {
        return {
            paidAmount: this.totalPaid().toNumber(),
            outstandingAmount: this.outstandingAmount().toNumber(),
            paymentCount: this.paymentCount(),
            financialStatus: this.financialStatus(),
            paymentStatus: this.summaryPaymentStatus(),
            lastPaymentAt: this.resolvedLastPaymentAt(),
            hasRegisteredPayments: this.paymentCount() > 0
        };
    }
}

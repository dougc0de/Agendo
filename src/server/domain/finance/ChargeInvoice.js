import { ChargePayment } from "./ChargePayment.js";
import { InvoiceStatusPolicy } from "./InvoiceStatusPolicy.js";
import { Money } from "./Money.js";

export class ChargeInvoice {
    constructor({
        id = null,
        reservationId = null,
        workspaceId = null,
        chargeDecision = "cobrable",
        paymentStatus = "pendiente",
        paymentMethod = null,
        totalBilledAmount = 0,
        currencyCode = "CRC",
        payments = [],
        lastPaymentAt = null
    } = {}) {
        this.id = id ? Number(id) : null;
        this.reservationId = reservationId ? Number(reservationId) : null;
        this.workspaceId = workspaceId ? Number(workspaceId) : null;
        this.chargeDecision = String(chargeDecision ?? "cobrable").trim().toLowerCase() || "cobrable";
        this.paymentStatus = String(paymentStatus ?? "pendiente").trim().toLowerCase() || "pendiente";
        this.paymentMethod = paymentMethod ? String(paymentMethod).trim().toLowerCase() : null;
        this.totalBilledAmount = Money.from(totalBilledAmount);
        this.currencyCode = String(currencyCode ?? "CRC").trim().toUpperCase() || "CRC";
        this.payments = payments.map((payment) =>
            payment instanceof ChargePayment ? payment : ChargePayment.fromRow(payment)
        );
        this.lastPaymentAt = lastPaymentAt ?? null;
    }

    static fromRow(row = {}, payments = []) {
        return new ChargeInvoice({
            id: row.id ?? row.charge_id,
            reservationId: row.reservation_id ?? row.reservationId,
            workspaceId: row.workspace_id ?? row.workspaceId,
            chargeDecision: row.charge_decision ?? row.chargeDecision,
            paymentStatus: row.payment_status ?? row.paymentStatus,
            paymentMethod: row.payment_method ?? row.paymentMethod,
            totalBilledAmount:
                row.total_billed_amount ?? row.totalBilledAmount ?? row.amount ?? 0,
            currencyCode: row.currency_code ?? row.currencyCode,
            payments,
            lastPaymentAt: row.last_payment_at ?? row.lastPaymentAt ?? row.paid_at ?? row.paidAt
        });
    }

    totalPaid() {
        return this.payments.reduce(
            (accumulator, payment) => accumulator.plus(payment.amount),
            new Money(0)
        );
    }

    outstandingAmount() {
        return this.totalBilledAmount.minus(this.totalPaid()).clampNonNegative();
    }

    paymentCount() {
        return this.payments.length;
    }

    financialStatus() {
        return InvoiceStatusPolicy.resolve({
            chargeDecision: this.chargeDecision,
            paymentStatus: this.paymentStatus,
            totalBilledAmount: this.totalBilledAmount.toNumber(),
            paidAmount: this.totalPaid().toNumber()
        });
    }

    hasPayments() {
        return this.paymentCount() > 0;
    }

    canRegisterPayment() {
        const status = this.financialStatus();
        return status !== "pagado" && status !== "anulado" && status !== "exonerado";
    }

    summaryPaymentStatus() {
        const status = this.financialStatus();
        return status === "pagado" ? "pagado" : status === "anulado" ? "anulado" : "pendiente";
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
            hasRegisteredPayments: this.hasPayments()
        };
    }
}

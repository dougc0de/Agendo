import { Money } from "./Money.js";

export class InvoiceStatusPolicy {
    static resolve({
        chargeDecision = "cobrable",
        paymentStatus = "pendiente",
        totalBilledAmount = 0,
        paidAmount = 0
    } = {}) {
        if (chargeDecision === "exonerado") {
            return "exonerado";
        }

        if (paymentStatus === "anulado") {
            return "anulado";
        }

        const total = Money.from(totalBilledAmount);
        const paid = Money.from(paidAmount);
        const outstanding = total.minus(paid).clampNonNegative();

        if (outstanding.isZero()) {
            return "pagado";
        }

        if (paid.isPositive()) {
            return "parcial";
        }

        return "pendiente";
    }
}

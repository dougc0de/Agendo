import { Money } from "./Money.js";

export class ChargePayment {
    constructor({
        id = null,
        workspaceId = null,
        chargeId = null,
        amount = 0,
        currencyCode = "CRC",
        paymentMethod = "otro",
        paidAt = null,
        notes = "",
        registeredByUserId = null,
        createdAt = null,
        updatedAt = null
    } = {}) {
        this.id = id ? Number(id) : null;
        this.workspaceId = workspaceId ? Number(workspaceId) : null;
        this.chargeId = chargeId ? Number(chargeId) : null;
        this.amount = Money.from(amount);
        this.currencyCode = String(currencyCode ?? "CRC").trim().toUpperCase() || "CRC";
        this.paymentMethod = String(paymentMethod ?? "otro").trim().toLowerCase() || "otro";
        this.paidAt = paidAt ?? null;
        this.notes = String(notes ?? "").trim();
        this.registeredByUserId = registeredByUserId ? Number(registeredByUserId) : null;
        this.createdAt = createdAt ?? null;
        this.updatedAt = updatedAt ?? null;
    }

    static fromRow(row = {}) {
        return new ChargePayment({
            id: row.id,
            workspaceId: row.workspace_id ?? row.workspaceId,
            chargeId: row.charge_id ?? row.chargeId,
            amount: row.amount,
            currencyCode: row.currency_code ?? row.currencyCode,
            paymentMethod: row.payment_method ?? row.paymentMethod,
            paidAt: row.paid_at ?? row.paidAt,
            notes: row.notes,
            registeredByUserId: row.registered_by_user_id ?? row.registeredByUserId,
            createdAt: row.created_at ?? row.createdAt,
            updatedAt: row.updated_at ?? row.updatedAt
        });
    }

    toPersistence() {
        return {
            workspaceId: this.workspaceId,
            chargeId: this.chargeId,
            amount: this.amount.toNumber(),
            currencyCode: this.currencyCode,
            paymentMethod: this.paymentMethod,
            paidAt: this.paidAt,
            notes: this.notes || null,
            registeredByUserId: this.registeredByUserId
        };
    }
}

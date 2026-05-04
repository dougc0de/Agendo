import { Money } from "./Money.js";

export class BillingDocumentPayment {
    constructor({
        id = null,
        workspaceId = null,
        documentId = null,
        amount = 0,
        currencyCode = "USD",
        paymentMethod = "otro",
        paidAt = null,
        notes = "",
        registeredByUserId = null,
        createdAt = null,
        updatedAt = null
    } = {}) {
        this.id = id ? Number(id) : null;
        this.workspaceId = workspaceId ? Number(workspaceId) : null;
        this.documentId = documentId ? Number(documentId) : null;
        this.amount = Money.from(amount);
        this.currencyCode = String(currencyCode ?? "USD").trim().toUpperCase() || "USD";
        this.paymentMethod = String(paymentMethod ?? "otro").trim().toLowerCase() || "otro";
        this.paidAt = paidAt ?? null;
        this.notes = String(notes ?? "").trim();
        this.registeredByUserId = registeredByUserId ? Number(registeredByUserId) : null;
        this.createdAt = createdAt ?? null;
        this.updatedAt = updatedAt ?? null;
    }

    static fromRow(row = {}) {
        return new BillingDocumentPayment({
            id: row.id,
            workspaceId: row.workspace_id ?? row.workspaceId,
            documentId: row.document_id ?? row.documentId,
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
            documentId: this.documentId,
            amount: this.amount.toNumber(),
            currencyCode: this.currencyCode,
            paymentMethod: this.paymentMethod,
            paidAt: this.paidAt,
            notes: this.notes || null,
            registeredByUserId: this.registeredByUserId
        };
    }
}

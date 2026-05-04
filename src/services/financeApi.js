import { apiRequest } from "./api.js";

function buildQueryString(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "" || value === "todos") {
            return;
        }

        params.set(key, String(value));
    });

    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
}

export async function getFinanceCharges(filters = {}) {
    return apiRequest(`/finanzas/cobros${buildQueryString(filters)}`);
}

export async function getFinanceOperationReports(filters = {}) {
    return apiRequest(`/finanzas/reportes-operacion${buildQueryString(filters)}`);
}

export async function getFinanceBillableReservations(filters = {}) {
    return apiRequest(`/finanzas/reservas-facturables${buildQueryString(filters)}`);
}

export async function getFinanceBillableItems(filters = {}) {
    return apiRequest(`/finanzas/items-facturables${buildQueryString(filters)}`);
}

export async function getFinanceBillingDocuments(filters = {}) {
    return apiRequest(`/finanzas/comprobantes${buildQueryString(filters)}`);
}

export async function createFinanceCharge(payload) {
    return apiRequest("/finanzas/cobros", {
        method: "POST",
        body: payload
    });
}

export async function createFinanceOperationReport(payload) {
    return apiRequest("/finanzas/reportes-operacion", {
        method: "POST",
        body: payload
    });
}

export async function createFinanceBillableItem(payload) {
    return apiRequest("/finanzas/items-facturables", {
        method: "POST",
        body: payload
    });
}

export async function createFinanceBillingDocument(payload) {
    return apiRequest("/finanzas/comprobantes", {
        method: "POST",
        body: payload
    });
}

export async function updateFinanceCharge(id, payload) {
    return apiRequest(`/finanzas/cobros/${id}`, {
        method: "PUT",
        body: payload
    });
}

export async function updateFinanceOperationReport(id, payload) {
    return apiRequest(`/finanzas/reportes-operacion/${id}`, {
        method: "PUT",
        body: payload
    });
}

export async function updateFinanceBillableItem(id, payload) {
    return apiRequest(`/finanzas/items-facturables/${id}`, {
        method: "PUT",
        body: payload
    });
}

export async function confirmFinanceOperationReportPayment(id, payload) {
    return apiRequest(`/finanzas/reportes-operacion/${id}/pago`, {
        method: "PATCH",
        body: payload
    });
}

export async function confirmFinanceBillingDocumentPayment(id, payload) {
    return apiRequest(`/finanzas/comprobantes/${id}/pago`, {
        method: "PATCH",
        body: payload
    });
}

export async function getFinanceOperationReportPdf(id) {
    return apiRequest(`/finanzas/reportes-operacion/${id}/pdf`);
}

export async function getFinanceBillingDocumentPdf(id) {
    return apiRequest(`/finanzas/comprobantes/${id}/pdf`);
}

export async function getFinanceSummary(filters = {}) {
    return apiRequest(`/finanzas/resumen${buildQueryString(filters)}`);
}

export async function getFinanceInventory(filters = {}) {
    return apiRequest(`/finanzas/inventario${buildQueryString(filters)}`);
}

export async function getFinanceInventoryItem(id) {
    return apiRequest(`/finanzas/inventario/${id}`);
}

export async function createFinanceInventoryItem(payload) {
    return apiRequest("/finanzas/inventario", {
        method: "POST",
        body: payload
    });
}

export async function updateFinanceInventoryItem(id, payload) {
    return apiRequest(`/finanzas/inventario/${id}`, {
        method: "PUT",
        body: payload
    });
}

export async function updateFinanceInventoryItemStatus(id, estado) {
    return apiRequest(`/finanzas/inventario/${id}/estado`, {
        method: "PATCH",
        body: { estado }
    });
}

export async function getFinanceInventoryMovements(id, filters = {}) {
    return apiRequest(`/finanzas/inventario/${id}/movimientos${buildQueryString(filters)}`);
}

export async function createFinanceInventoryMovement(id, payload) {
    return apiRequest(`/finanzas/inventario/${id}/movimientos`, {
        method: "POST",
        body: payload
    });
}

export async function getFinanceInventorySummary(filters = {}) {
    return apiRequest(`/finanzas/inventario/resumen${buildQueryString(filters)}`);
}

export async function getFinanceInventoryReports(filters = {}) {
    return apiRequest(`/finanzas/inventario/reportes${buildQueryString(filters)}`);
}

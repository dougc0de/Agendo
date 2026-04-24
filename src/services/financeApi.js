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

export async function confirmFinanceOperationReportPayment(id, payload) {
    return apiRequest(`/finanzas/reportes-operacion/${id}/pago`, {
        method: "PATCH",
        body: payload
    });
}

export async function getFinanceOperationReportPdf(id) {
    return apiRequest(`/finanzas/reportes-operacion/${id}/pdf`);
}

export async function getFinanceSummary(filters = {}) {
    return apiRequest(`/finanzas/resumen${buildQueryString(filters)}`);
}

export async function getFinanceInventory() {
    return apiRequest("/finanzas/inventario");
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

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

export async function createFinanceCharge(payload) {
    return apiRequest("/finanzas/cobros", {
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

export async function getFinanceSummary(filters = {}) {
    return apiRequest(`/finanzas/resumen${buildQueryString(filters)}`);
}

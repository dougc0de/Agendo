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

export async function getKpiDashboard(filters = {}) {
    return apiRequest(`/kpis/dashboard${buildQueryString(filters)}`);
}

export async function getKpiTrends(filters = {}) {
    return apiRequest(`/kpis/trends${buildQueryString(filters)}`);
}

export async function getKpiBreakdown(filters = {}) {
    return apiRequest(`/kpis/breakdown${buildQueryString(filters)}`);
}

export async function getKpiReports(filters = {}) {
    return apiRequest(`/kpis/reports${buildQueryString(filters)}`);
}

export async function getKpiAlerts(filters = {}) {
    return apiRequest(`/kpis/alerts${buildQueryString(filters)}`);
}

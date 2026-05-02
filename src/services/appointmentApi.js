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

export async function getAppointments(filters = {}) {
    return apiRequest(`/reservas${buildQueryString(filters)}`);
}

export async function getPastAppointments(filters = {}) {
    return apiRequest(`/reservas/pasadas${buildQueryString(filters)}`);
}

export async function getAppointmentById(id) {
    return apiRequest(`/reservas/${id}`);
}

export async function getAppointmentCalendar(filters = {}) {
    return apiRequest(`/reservas/calendario${buildQueryString(filters)}`);
}

export async function createAppointment(payload) {
    return apiRequest("/reservas", {
        method: "POST",
        body: payload
    });
}

export async function updateAppointment(id, payload) {
    return apiRequest(`/reservas/${id}`, {
        method: "PUT",
        body: payload
    });
}

export async function updateAppointmentStatus(id, estado, extras = {}) {
    return apiRequest(`/reservas/${id}/estado`, {
        method: "PATCH",
        body: { estado, ...extras }
    });
}

export async function updateAppointmentOutcome(id, payload) {
    return apiRequest(`/reservas/${id}/resultado`, {
        method: "PATCH",
        body: payload
    });
}

export async function deleteAppointment(id) {
    return apiRequest(`/reservas/${id}`, {
        method: "DELETE"
    });
}

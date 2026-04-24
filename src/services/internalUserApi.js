import { apiRequest } from "./api.js";

export async function getInternalUsers() {
    return apiRequest("/usuarios-internos");
}

export async function createInternalUser(payload) {
    return apiRequest("/usuarios-internos", {
        method: "POST",
        body: payload
    });
}

export async function updateInternalUser(id, payload) {
    return apiRequest(`/usuarios-internos/${id}`, {
        method: "PUT",
        body: payload
    });
}

export async function updateInternalUserStatus(id, estado) {
    return apiRequest(`/usuarios-internos/${id}/estado`, {
        method: "PATCH",
        body: { estado }
    });
}

import { apiRequest } from "./api.js";

export async function getBranches() {
    return apiRequest("/sucursales");
}

export async function createBranch(payload) {
    return apiRequest("/sucursales", {
        method: "POST",
        body: payload
    });
}

export async function updateBranch(id, payload) {
    return apiRequest(`/sucursales/${id}`, {
        method: "PUT",
        body: payload
    });
}

export async function updateBranchStatus(id, estado) {
    return apiRequest(`/sucursales/${id}/estado`, {
        method: "PATCH",
        body: { estado }
    });
}

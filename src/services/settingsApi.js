import { apiRequest } from "./api.js";

export async function getAccountSettings() {
    return apiRequest("/configuraciones");
}

export async function updateAccountSettings(payload) {
    return apiRequest("/configuraciones", {
        method: "PUT",
        body: payload
    });
}

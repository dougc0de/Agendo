import { apiRequest } from "./api.js";

export async function searchPatients(search) {
    const searchValue = encodeURIComponent(String(search ?? "").trim());
    return apiRequest(`/pacientes?search=${searchValue}`);
}

export async function createPatient(payload) {
    return apiRequest("/pacientes", {
        method: "POST",
        body: payload
    });
}

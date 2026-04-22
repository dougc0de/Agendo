import { apiRequest } from "./api.js";

export async function getRooms() {
    return apiRequest("/salas");
}

export async function createRoom(payload) {
    return apiRequest("/salas", {
        method: "POST",
        body: payload
    });
}

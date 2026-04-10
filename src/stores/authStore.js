import { defineStore } from "pinia";
import { apiRequest } from "../services/api.js";

const TOKEN_KEY = "agendo-token";
const USER_KEY = "agendo-user";

function readUserFromStorage() {
    const raw = localStorage.getItem(USER_KEY);

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export const useAuthStore = defineStore("auth", {
    state: () => ({
        isAuthenticated: false,
        token: null,
        user: null
    }),

    actions: {
        hydrate() {
            this.token = localStorage.getItem(TOKEN_KEY);
            this.user = readUserFromStorage();
            this.isAuthenticated = Boolean(this.token);
        },

        async login(credentials) {
            const correo = String(credentials?.email ?? "").trim();
            const contrasena = String(credentials?.password ?? "").trim();

            if (!correo || !contrasena) {
                return {
                    ok: false,
                    msg: "Debe completar correo y contrasena."
                };
            }

            try {
                const response = await apiRequest("/auth/login", {
                    method: "POST",
                    body: {
                        correo,
                        contrasena
                    }
                });

                this.token = response.data.token;
                this.user = {
                    id: response.data.user.id,
                    email: response.data.user.correo,
                    displayName: response.data.user.nombre,
                    role: response.data.user.rol
                };
                this.isAuthenticated = true;

                localStorage.setItem(TOKEN_KEY, this.token);
                localStorage.setItem(USER_KEY, JSON.stringify(this.user));

                return {
                    ok: true,
                    msg: response.msg
                };
            } catch (error) {
                return {
                    ok: false,
                    msg: error.response?.msg || error.message || "No fue posible iniciar sesion."
                };
            }
        },

        logout() {
            this.isAuthenticated = false;
            this.token = null;
            this.user = null;
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        }
    }
});

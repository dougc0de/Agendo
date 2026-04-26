import { defineStore } from "pinia";
import { apiRequest } from "../services/api.js";

let hydratePromise = null;

const TOKEN_KEY = "agendo-token";
const USER_KEY = "agendo-user";
const WORKSPACE_KEY = "agendo-workspace";
const BRANCH_KEY = "agendo-branch";
const SUBSCRIPTION_KEY = "agendo-subscription";
const MEMBERSHIP_ROLE_KEY = "agendo-membership-role";

function readJsonFromStorage(key) {
    const raw = localStorage.getItem(key);

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function persistJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function clearSessionStorage() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(WORKSPACE_KEY);
    localStorage.removeItem(BRANCH_KEY);
    localStorage.removeItem(SUBSCRIPTION_KEY);
    localStorage.removeItem(MEMBERSHIP_ROLE_KEY);
}

export const useAuthStore = defineStore("auth", {
    state: () => ({
        isAuthenticated: false,
        isHydrated: false,
        token: null,
        user: null,
        workspace: null,
        branch: null,
        subscription: null,
        membershipRole: null
    }),

    actions: {
        applySessionData(sessionData = {}) {
            this.token = sessionData.token ?? this.token ?? null;
            this.user = sessionData.user ?? null;
            this.workspace = sessionData.workspace ?? null;
            this.branch = sessionData.branch ?? null;
            this.subscription = sessionData.subscription ?? null;
            this.membershipRole = sessionData.membershipRole ?? null;
            this.isAuthenticated = Boolean(this.token);

            if (this.token) {
                localStorage.setItem(TOKEN_KEY, this.token);
            }

            if (this.user) {
                persistJson(USER_KEY, this.user);
            } else {
                localStorage.removeItem(USER_KEY);
            }

            if (this.workspace) {
                persistJson(WORKSPACE_KEY, this.workspace);
            } else {
                localStorage.removeItem(WORKSPACE_KEY);
            }

            if (this.branch) {
                persistJson(BRANCH_KEY, this.branch);
            } else {
                localStorage.removeItem(BRANCH_KEY);
            }

            if (this.subscription) {
                persistJson(SUBSCRIPTION_KEY, this.subscription);
            } else {
                localStorage.removeItem(SUBSCRIPTION_KEY);
            }

            if (this.membershipRole) {
                localStorage.setItem(MEMBERSHIP_ROLE_KEY, this.membershipRole);
            } else {
                localStorage.removeItem(MEMBERSHIP_ROLE_KEY);
            }
        },

        clearSessionState() {
            this.isAuthenticated = false;
            this.token = null;
            this.user = null;
            this.workspace = null;
            this.branch = null;
            this.subscription = null;
            this.membershipRole = null;
        },

        async hydrate() {
            if (hydratePromise) {
                return hydratePromise;
            }

            this.token = localStorage.getItem(TOKEN_KEY);
            this.user = readJsonFromStorage(USER_KEY);
            this.workspace = readJsonFromStorage(WORKSPACE_KEY);
            this.branch = readJsonFromStorage(BRANCH_KEY);
            this.subscription = readJsonFromStorage(SUBSCRIPTION_KEY);
            this.membershipRole = localStorage.getItem(MEMBERSHIP_ROLE_KEY);
            this.isAuthenticated = Boolean(this.token);

            if (!this.token) {
                this.clearSessionState();
                this.isHydrated = true;
                return {
                    ok: false,
                    msg: "No hay una sesion guardada."
                };
            }

            hydratePromise = this.fetchMe()
                .then((result) => {
                    this.isHydrated = true;
                    return result;
                })
                .finally(() => {
                    hydratePromise = null;
                });

            return hydratePromise;
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

                this.applySessionData(response.data);
                this.isHydrated = true;

                return {
                    ok: true,
                    msg: response.msg
                };
            } catch (error) {
                this.clearSessionState();
                clearSessionStorage();

                return {
                    ok: false,
                    msg: error.response?.msg || error.message || "No fue posible iniciar sesion."
                };
            }
        },

        async signup(payload) {
            try {
                const response = await apiRequest("/auth/signup", {
                    method: "POST",
                    body: payload
                });

                this.applySessionData(response.data);
                this.isHydrated = true;

                return {
                    ok: true,
                    msg: response.msg
                };
            } catch (error) {
                this.clearSessionState();
                clearSessionStorage();

                return {
                    ok: false,
                    msg: error.response?.msg || error.message || "No fue posible crear la cuenta."
                };
            }
        },

        async fetchMe() {
            if (!this.token) {
                this.clearSessionState();
                clearSessionStorage();
                return {
                    ok: false,
                    msg: "No hay token para recuperar la sesion."
                };
            }

            try {
                const response = await apiRequest("/auth/me");
                this.applySessionData(response.data);

                return {
                    ok: true,
                    msg: response.msg
                };
            } catch (error) {
                this.clearSessionState();
                clearSessionStorage();

                return {
                    ok: false,
                    msg: error.response?.msg || error.message || "No fue posible recuperar la sesion."
                };
            }
        },

        logout() {
            this.clearSessionState();
            this.isHydrated = true;
            clearSessionStorage();
        }
    }
});

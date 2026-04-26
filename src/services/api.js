const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const AUTH_STORAGE_KEYS = [
    "agendo-token",
    "agendo-user",
    "agendo-workspace",
    "agendo-branch",
    "agendo-subscription",
    "agendo-membership-role"
];

function clearStoredSession() {
    AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

async function apiRequest(path, options = {}) {
    const { method = "GET", body, headers = {} } = options;
    const token = localStorage.getItem("agendo-token");

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers
        },
        body: body !== undefined ? JSON.stringify(body) : undefined
    });

    const data = await response.json().catch(() => ({
        ok: false,
        msg: "La respuesta del servidor no es un JSON valido."
    }));

    if (!response.ok) {
        if (response.status === 401) {
            clearStoredSession();

            if (
                typeof window !== "undefined" &&
                window.location.pathname !== "/login" &&
                window.location.pathname !== "/signup"
            ) {
                window.location.assign("/login");
            }
        }

        const error = new Error(data.msg || "Error al comunicarse con la API.");
        error.response = data;
        throw error;
    }

    return data;
}

export { API_BASE_URL, apiRequest };

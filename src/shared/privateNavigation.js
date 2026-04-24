import { isAdministrativeUser } from "./roles.js";

function buildPrivateNavLinks({ membershipRole, userRole } = {}) {
    const links = [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Sucursales", href: "/branches" },
        { label: "Reservas", href: "/appointments" },
        { label: "Pacientes", href: "/patients" }
    ];

    if (
        isAdministrativeUser({
            membershipRole,
            userRole
        })
    ) {
        links.push({ label: "Configuraciones", href: "/settings" });
    }

    return links;
}

function readStoredJson(key) {
    if (typeof window === "undefined") {
        return null;
    }

    const raw = window.localStorage.getItem(key);

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function hasStoredAdministrativeAccess() {
    if (typeof window === "undefined") {
        return false;
    }

    const token = window.localStorage.getItem("agendo-token");

    if (!token) {
        return false;
    }

    const membershipRole = window.localStorage.getItem("agendo-membership-role");
    const user = readStoredJson("agendo-user");

    if (!membershipRole && !user?.rol) {
        return true;
    }

    return isAdministrativeUser({
        membershipRole,
        userRole: user?.rol
    });
}

export { buildPrivateNavLinks, hasStoredAdministrativeAccess };

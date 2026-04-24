import {
    canAccessFinance,
    canManageInternalUsers,
    isAdministrativeUser
} from "./roles.js";

function buildPrivateNavLinks({ membershipRole, userRole } = {}) {
    const links = [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Sucursales", href: "/branches" },
        { label: "Reservas", href: "/appointments" },
        { label: "Reservas pasadas", href: "/appointments/past" },
        { label: "Pacientes", href: "/patients" }
    ];

    if (canAccessFinance({ membershipRole, userRole })) {
        links.push({ label: "Finanzas", href: "/finance" });
    }

    if (canManageInternalUsers({ membershipRole, userRole })) {
        links.push({ label: "Usuarios", href: "/users" });
    }

    if (isAdministrativeUser({ membershipRole, userRole })) {
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

function hasStoredFinanceAccess() {
    if (typeof window === "undefined") {
        return false;
    }

    const token = window.localStorage.getItem("agendo-token");

    if (!token) {
        return false;
    }

    const membershipRole = window.localStorage.getItem("agendo-membership-role");
    const user = readStoredJson("agendo-user");

    return canAccessFinance({
        membershipRole,
        userRole: user?.rol
    });
}

function hasStoredUserManagementAccess() {
    if (typeof window === "undefined") {
        return false;
    }

    const token = window.localStorage.getItem("agendo-token");

    if (!token) {
        return false;
    }

    const membershipRole = window.localStorage.getItem("agendo-membership-role");
    const user = readStoredJson("agendo-user");

    return canManageInternalUsers({
        membershipRole,
        userRole: user?.rol
    });
}

export {
    buildPrivateNavLinks,
    hasStoredAdministrativeAccess,
    hasStoredFinanceAccess,
    hasStoredUserManagementAccess
};

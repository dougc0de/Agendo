const ADMIN_MEMBERSHIP_ROLES = ["owner", "admin"];

function normalizeRole(value) {
    return String(value ?? "").trim().toLowerCase();
}

function isAdministrativeMembershipRole(role) {
    return ADMIN_MEMBERSHIP_ROLES.includes(normalizeRole(role));
}

function isAdministrativeUser({ membershipRole, userRole } = {}) {
    return (
        isAdministrativeMembershipRole(membershipRole) ||
        normalizeRole(userRole) === "admin"
    );
}

export {
    ADMIN_MEMBERSHIP_ROLES,
    normalizeRole,
    isAdministrativeMembershipRole,
    isAdministrativeUser
};

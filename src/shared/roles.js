const ADMIN_MEMBERSHIP_ROLES = ["owner", "admin"];
const FINANCE_MEMBERSHIP_ROLES = ["owner", "admin", "recepcionista"];
const STAFF_LEGACY_ROLE = "staff";

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

function canAccessFinance({ membershipRole, userRole } = {}) {
    const normalizedMembershipRole = normalizeRole(membershipRole);
    const normalizedUserRole = normalizeRole(userRole);

    return (
        FINANCE_MEMBERSHIP_ROLES.includes(normalizedMembershipRole) ||
        ["admin", "recepcionista"].includes(normalizedUserRole)
    );
}

function canManageInternalUsers({ membershipRole, userRole } = {}) {
    return isAdministrativeUser({
        membershipRole,
        userRole
    });
}

function isDoctorUser({ membershipRole, userRole } = {}) {
    return (
        normalizeRole(membershipRole) === "doctor" ||
        normalizeRole(userRole) === "doctor"
    );
}

function canViewAllPastReservations({ membershipRole, userRole } = {}) {
    return canAccessFinance({
        membershipRole,
        userRole
    });
}

export {
    ADMIN_MEMBERSHIP_ROLES,
    FINANCE_MEMBERSHIP_ROLES,
    STAFF_LEGACY_ROLE,
    normalizeRole,
    isAdministrativeMembershipRole,
    isAdministrativeUser,
    canAccessFinance,
    canManageInternalUsers,
    isDoctorUser,
    canViewAllPastReservations
};

import {
    canAccessFinance,
    isAdministrativeUser,
    isDoctorUser,
    normalizeRole
} from "./roles.js";

const DASHBOARD_KINDS = Object.freeze({
    EXECUTIVE: "executive",
    OPERATIONS: "operations",
    PERSONAL: "personal",
    NONE: "none"
});

const KPI_ACCESS_LEVELS = Object.freeze({
    FULL: "full",
    BASIC: "basic",
    NONE: "none"
});

class KpiAccessPolicy {
    constructor(auth = {}) {
        this.membershipRole = normalizeRole(auth.membershipRole);
        this.userRole = normalizeRole(auth.userRole);
        this.branchId = Number(auth.branchId ?? 0) || null;
        this.branchName = auth.branchName ?? null;
        this.userId = Number(auth.userId ?? 0) || null;
    }

    isAdmin() {
        return isAdministrativeUser({
            membershipRole: this.membershipRole,
            userRole: this.userRole
        });
    }

    isDoctor() {
        return isDoctorUser({
            membershipRole: this.membershipRole,
            userRole: this.userRole
        });
    }

    isReception() {
        if (this.isAdmin() || this.isDoctor()) {
            return false;
        }

        return (
            this.membershipRole === "recepcionista" ||
            this.userRole === "recepcionista" ||
            canAccessFinance({
                membershipRole: this.membershipRole,
                userRole: this.userRole
            })
        );
    }

    dashboardKind() {
        if (this.isAdmin()) {
            return DASHBOARD_KINDS.EXECUTIVE;
        }

        if (this.isReception()) {
            return DASHBOARD_KINDS.OPERATIONS;
        }

        if (this.isDoctor()) {
            return DASHBOARD_KINDS.PERSONAL;
        }

        return DASHBOARD_KINDS.NONE;
    }

    canAccessDashboard() {
        return this.dashboardKind() !== DASHBOARD_KINDS.NONE;
    }

    canAccessKpiDashboard() {
        return this.isAdmin() || this.isReception();
    }

    canAccessAnalyticalEndpoints() {
        return this.isAdmin();
    }

    canAccessStrategicFinancials() {
        return this.isAdmin();
    }

    canAccessBasicCollections() {
        return this.isAdmin() || this.isReception();
    }

    canAccessOperationalComparisons() {
        return this.isAdmin() || this.isReception();
    }

    canAccessDoctorComparisons() {
        return this.isAdmin();
    }

    canSelectAnyBranch() {
        return this.isAdmin();
    }

    canFilterByDoctor() {
        return this.isAdmin();
    }

    canFilterByRoom() {
        return this.isAdmin() || this.isReception();
    }

    canAccessMetric(metricKey) {
        const normalizedMetric = normalizeRole(metricKey);

        if (this.isAdmin()) {
            return true;
        }

        if (this.isReception()) {
            return [
                "occupancy",
                "no_show",
                "cancellation",
                "paid_revenue",
                "pending_revenue",
                "revenue_leakage"
            ].includes(normalizedMetric);
        }

        return false;
    }

    canAccessBreakdownDimension(dimension) {
        const normalizedDimension = normalizeRole(dimension);

        if (this.isAdmin()) {
            return true;
        }

        if (this.isReception()) {
            return normalizedDimension === "room";
        }

        return false;
    }

    resolveBranchScope(requestedBranchId) {
        const normalizedRequestedBranchId = Number(requestedBranchId ?? 0) || null;

        if (this.isAdmin()) {
            return normalizedRequestedBranchId;
        }

        return this.branchId;
    }

    resolveDoctorScope(requestedDoctorUserId) {
        const normalizedRequestedDoctorUserId = Number(requestedDoctorUserId ?? 0) || null;

        if (this.isAdmin()) {
            return normalizedRequestedDoctorUserId;
        }

        if (this.isDoctor()) {
            return this.userId;
        }

        return null;
    }

    financialAccessLevel() {
        if (this.isAdmin()) {
            return KPI_ACCESS_LEVELS.FULL;
        }

        if (this.isReception()) {
            return KPI_ACCESS_LEVELS.BASIC;
        }

        return KPI_ACCESS_LEVELS.NONE;
    }

    meta() {
        return {
            dashboardKind: this.dashboardKind(),
            isAdmin: this.isAdmin(),
            isReception: this.isReception(),
            isDoctor: this.isDoctor(),
            branchId: this.branchId,
            branchName: this.branchName,
            userId: this.userId,
            canAccessKpiDashboard: this.canAccessKpiDashboard(),
            canAccessAnalyticalEndpoints: this.canAccessAnalyticalEndpoints(),
            canAccessStrategicFinancials: this.canAccessStrategicFinancials(),
            canAccessBasicCollections: this.canAccessBasicCollections(),
            canSelectAnyBranch: this.canSelectAnyBranch(),
            canFilterByDoctor: this.canFilterByDoctor(),
            canFilterByRoom: this.canFilterByRoom(),
            financialAccessLevel: this.financialAccessLevel()
        };
    }
}

export { DASHBOARD_KINDS, KPI_ACCESS_LEVELS, KpiAccessPolicy };

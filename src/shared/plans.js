const PLAN_DEFINITIONS = {
    basic: {
        code: "basic",
        name: "Basico",
        description: "Para clinicas pequenas que necesitan ordenar su operacion diaria.",
        priceLabel: "Ideal para empezar",
        maxUsers: 3,
        maxRooms: 3,
        maxReservationsPerMonth: 500
    },
    premium: {
        code: "premium",
        name: "Premium",
        description: "Para equipos con mas salas, mas personal y mas movimiento.",
        priceLabel: "Escala con mas capacidad",
        maxUsers: 10,
        maxRooms: 10,
        maxReservationsPerMonth: 3000
    },
    enterprise: {
        code: "enterprise",
        name: "Enterprise",
        description: "Plan de acuerdo comercial y configuracion personalizada.",
        priceLabel: "Venta asistida",
        maxUsers: 9999,
        maxRooms: 9999,
        maxReservationsPerMonth: 999999
    }
};

const PUBLIC_SIGNUP_PLAN_CODES = ["basic", "premium"];

function getPlanDefinition(planCode) {
    return PLAN_DEFINITIONS[planCode] ?? null;
}

function getPublicSignupPlans() {
    return PUBLIC_SIGNUP_PLAN_CODES
        .map((planCode) => getPlanDefinition(planCode))
        .filter(Boolean);
}

function isPublicSignupPlan(planCode) {
    return PUBLIC_SIGNUP_PLAN_CODES.includes(planCode);
}

export {
    PLAN_DEFINITIONS,
    PUBLIC_SIGNUP_PLAN_CODES,
    getPlanDefinition,
    getPublicSignupPlans,
    isPublicSignupPlan
};

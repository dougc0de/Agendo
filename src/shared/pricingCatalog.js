import {
    PLAN_DEFINITIONS,
    PUBLIC_SIGNUP_PLAN_CODES,
    isPublicSignupPlan
} from "./plans.js";

const DEFAULT_PRICING_PLAN_CODE = "premium";
const DEFAULT_SIGNUP_PLAN_CODE = "basic";
const DEFAULT_CURRENCY_CODE = "USD";
const WHATSAPP_ADDON_CODE = "whatsapp_assistant";

const PLAN_DISPLAY_ORDER = ["basic", "premium", "enterprise"];

const PLAN_PRICING_META = {
    basic: {
        headline: "Operacion clara para clinicas que quieren empezar con orden.",
        idealFor: "Clinicas pequenas con recepcion activa y una operacion en crecimiento.",
        monthlyPrice: 39,
        isStartingPrice: false,
        trialDays: 14,
        isPopular: false,
        ctaLabel: "Empezar prueba",
        ctaMode: "signup",
        addonAvailabilityLabel: "WhatsApp disponible desde Premium",
        benefits: [
            "Agenda y reservas mas ordenadas",
            "Pacientes, salas y sucursales en una sola cuenta",
            "Base lista para operar sin hojas sueltas"
        ]
    },
    premium: {
        headline: "Mas capacidad para clinicas con mas movimiento diario.",
        idealFor: "Equipos con mas salas, mas personal y una recepcion que necesita respirar mejor.",
        monthlyPrice: 89,
        isStartingPrice: false,
        trialDays: 14,
        isPopular: true,
        ctaLabel: "Elegir Premium",
        ctaMode: "signup",
        addonAvailabilityLabel: "Listo para sumar WhatsApp cuando haga falta",
        benefits: [
            "Mas usuarios, salas y reservas por mes",
            "Mejor preparado para recepcion con mayor carga operativa",
            "Compatible con el asistente por WhatsApp"
        ]
    },
    enterprise: {
        headline: "Configuracion comercial asistida para operaciones mas exigentes.",
        idealFor: "Clinicas con varias sedes o necesidades de capacidad y acompanamiento comercial.",
        monthlyPrice: 149,
        isStartingPrice: true,
        trialDays: 0,
        isPopular: false,
        ctaLabel: "Hablar con ventas",
        ctaMode: "sales",
        addonAvailabilityLabel: "Disponible para agregar o negociar dentro del acuerdo",
        benefits: [
            "Capacidad ampliada para equipos mas grandes",
            "Ruta comercial asistida para necesidades especiales",
            "WhatsApp disponible como complemento operativo"
        ]
    }
};

const ADDON_CATALOG = {
    [WHATSAPP_ADDON_CODE]: {
        id: "addon_whatsapp_assistant",
        code: WHATSAPP_ADDON_CODE,
        name: "Asistente Operativo de Citas por WhatsApp",
        description:
            "Una capa operativa para confirmar, mover y ordenar citas sin cargar mas a recepcion.",
        monthlyPrice: 19,
        includedMessages: 500,
        overagePricePerMessage: 0.04,
        eligiblePlanCodes: ["premium", "enterprise"],
        status: "active",
        capabilities: [
            "Confirmar cita",
            "Cancelar cita",
            "Solicitar reprogramacion",
            "Consultar fecha y hora",
            "Consultar ubicacion u horario",
            "Derivar a recepcion cuando haga falta"
        ],
        commercialMeta: {
            positioning: "Mejora operativa opcional para clinicas con mas citas al dia.",
            audience:
                "Centros que quieren bajar llamadas repetitivas y reducir ausencias evitables."
        },
        technicalMeta: {
            billingScope: "workspace",
            activationMode: "commercial",
            usageType: "sent_and_received_messages"
        }
    }
};

function normalizePlanCode(planCode) {
    return String(planCode ?? "").trim().toLowerCase();
}

function normalizeAddonCode(addonCode) {
    return String(addonCode ?? "").trim().toLowerCase();
}

function formatUsdMonthly(amount, { isStartingPrice = false } = {}) {
    const prefix = isStartingPrice ? "Desde " : "";
    return `${prefix}${DEFAULT_CURRENCY_CODE} ${Number(amount ?? 0)}/mes`;
}

function getPricingPlan(planCode) {
    const normalizedPlanCode = normalizePlanCode(planCode);
    const plan = PLAN_DEFINITIONS[normalizedPlanCode];
    const meta = PLAN_PRICING_META[normalizedPlanCode];

    if (!plan || !meta) {
        return null;
    }

    return {
        ...plan,
        ...meta,
        currencyCode: DEFAULT_CURRENCY_CODE,
        formattedMonthlyPrice: formatUsdMonthly(meta.monthlyPrice, {
            isStartingPrice: meta.isStartingPrice
        }),
        formattedTrialLabel: meta.trialDays > 0
            ? `${meta.trialDays} dias de trial`
            : "Configuracion comercial asistida",
        supportsPublicSignup: PUBLIC_SIGNUP_PLAN_CODES.includes(normalizedPlanCode),
        eligibleAddonCodes: Object.values(ADDON_CATALOG)
            .filter((addon) => addon.eligiblePlanCodes.includes(normalizedPlanCode))
            .map((addon) => addon.code)
    };
}

function getPublicPlans() {
    return PLAN_DISPLAY_ORDER
        .map((planCode) => getPricingPlan(planCode))
        .filter(Boolean);
}

function getAddonByCode(addonCode) {
    return ADDON_CATALOG[normalizeAddonCode(addonCode)] ?? null;
}

function canPlanUseAddon(planCode, addonCode) {
    const addon = getAddonByCode(addonCode);

    if (!addon) {
        return false;
    }

    return addon.eligiblePlanCodes.includes(normalizePlanCode(planCode));
}

function calculateAddonOverage(messageCount, addonCode = WHATSAPP_ADDON_CODE) {
    const addon = getAddonByCode(addonCode);

    if (!addon) {
        return 0;
    }

    const normalizedMessageCount = Math.max(0, Number(messageCount) || 0);
    const extraMessages = Math.max(0, normalizedMessageCount - addon.includedMessages);

    return Number((extraMessages * addon.overagePricePerMessage).toFixed(2));
}

function calculateEstimatedMonthlyTotal(selection = {}) {
    const plan = getPricingPlan(selection.planCode);

    if (!plan) {
        return {
            baseMonthlyTotal: 0,
            estimatedMonthlyTotal: 0,
            estimatedMonthlyStartingTotal: 0,
            totalLabel: ""
        };
    }

    const addonCodes = Array.isArray(selection.addonCodes) ? selection.addonCodes : [];
    const addonTotal = addonCodes.reduce((accumulator, addonCode) => {
        if (!canPlanUseAddon(plan.code, addonCode)) {
            return accumulator;
        }

        const addon = getAddonByCode(addonCode);
        return accumulator + Number(addon?.monthlyPrice ?? 0);
    }, 0);

    const total = Number(plan.monthlyPrice ?? 0) + addonTotal;

    return {
        baseMonthlyTotal: Number(plan.monthlyPrice ?? 0),
        estimatedMonthlyTotal: plan.isStartingPrice ? null : total,
        estimatedMonthlyStartingTotal: plan.isStartingPrice ? total : null,
        totalLabel: formatUsdMonthly(total, {
            isStartingPrice: plan.isStartingPrice
        })
    };
}

function buildPricingSelection(planCode = DEFAULT_PRICING_PLAN_CODE, addonEnabled = false) {
    const normalizedPlanCode = getPricingPlan(planCode)?.code ?? DEFAULT_PRICING_PLAN_CODE;
    const plan = getPricingPlan(normalizedPlanCode);
    const addon = getAddonByCode(WHATSAPP_ADDON_CODE);
    const isAddonAvailable = canPlanUseAddon(normalizedPlanCode, WHATSAPP_ADDON_CODE);
    const normalizedAddonEnabled = Boolean(addonEnabled && isAddonAvailable);
    const addonCodes = normalizedAddonEnabled ? [WHATSAPP_ADDON_CODE] : [];
    const totals = calculateEstimatedMonthlyTotal({
        planCode: normalizedPlanCode,
        addonCodes
    });

    return {
        planCode: normalizedPlanCode,
        plan,
        addon,
        addonCodes,
        addonEnabled: normalizedAddonEnabled,
        isAddonAvailable,
        billingInterval: "monthly",
        currencyCode: DEFAULT_CURRENCY_CODE,
        ...totals
    };
}

function buildSignupQuery(selection = {}) {
    const query = {
        plan: normalizePlanCode(selection.planCode || DEFAULT_SIGNUP_PLAN_CODE)
    };

    if (
        Array.isArray(selection.addonCodes) &&
        selection.addonCodes.includes(WHATSAPP_ADDON_CODE) &&
        canPlanUseAddon(query.plan, WHATSAPP_ADDON_CODE)
    ) {
        query.addon = WHATSAPP_ADDON_CODE;
    }

    return query;
}

function resolveSignupIntentQuery(query = {}) {
    const requestedPlanCode = normalizePlanCode(query.plan);
    const planCode = isPublicSignupPlan(requestedPlanCode)
        ? requestedPlanCode
        : DEFAULT_SIGNUP_PLAN_CODE;
    const requestedAddonCode = normalizeAddonCode(query.addon);
    const addon = canPlanUseAddon(planCode, requestedAddonCode)
        ? getAddonByCode(requestedAddonCode)
        : null;

    return {
        planCode,
        addonCode: addon?.code ?? null,
        addonInterestMessage: addon
            ? `Seleccionaste interes en el ${addon.name}. La activacion se coordina durante la configuracion comercial.`
            : ""
    };
}

export {
    ADDON_CATALOG,
    DEFAULT_CURRENCY_CODE,
    DEFAULT_PRICING_PLAN_CODE,
    DEFAULT_SIGNUP_PLAN_CODE,
    WHATSAPP_ADDON_CODE,
    buildPricingSelection,
    buildSignupQuery,
    calculateAddonOverage,
    calculateEstimatedMonthlyTotal,
    canPlanUseAddon,
    formatUsdMonthly,
    getAddonByCode,
    getPricingPlan,
    getPublicPlans,
    resolveSignupIntentQuery
};

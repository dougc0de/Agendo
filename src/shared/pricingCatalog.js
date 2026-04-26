const DEFAULT_PRICING_PLAN_CODE = "premium";
const DEFAULT_SIGNUP_PLAN_CODE = "basic";
const DEFAULT_CURRENCY_CODE = "USD";
const WHATSAPP_ADDON_CODE = "whatsapp_assistant";
const PLAN_DISPLAY_ORDER = ["basic", "premium", "enterprise"];
const PUBLIC_SIGNUP_PLAN_CODES = ["basic", "premium", "enterprise"];
const DEFAULT_TRIAL_DAYS = 10;

const PLAN_CATALOG = {
    basic: {
        code: "basic",
        name: "Basico",
        description:
            "Orden operativo para clinicas que necesitan trabajar mejor antes de sumar finanzas e inventario.",
        headline:
            "Reservas, recepcion, salas y pacientes en una sola base operativa clara.",
        idealFor:
            "Clinicas pequenas que quieren dejar atras el desorden sin romper su trabajo diario.",
        monthlyPrice: 39,
        isStartingPrice: false,
        trialDays: DEFAULT_TRIAL_DAYS,
        isPopular: false,
        ctaLabel: "Empezar prueba",
        ctaMode: "signup",
        priceLabel: "Operacion central",
        eligibleAddonCodes: [],
        limits: {
            maxUsers: 3,
            maxRooms: 3,
            maxReservationsPerMonth: 500
        },
        benefits: [
            "Reservas completas con validacion de choques y horarios",
            "Calendario, historial de reservas y pacientes en una sola cuenta",
            "Usuarios internos, salas y sucursal principal listas para operar"
        ],
        includedFeatures: [
            "Reservas completas",
            "Calendario",
            "Historial de reservas",
            "Pacientes",
            "Salas",
            "Usuarios internos",
            "Sucursal principal",
            "Configuraciones base",
            "Dashboard operativo simple",
            "Validacion de choques y horarios"
        ],
        excludedFeatures: [
            "Finanzas operativas completas",
            "Facturacion procedural",
            "PDF imprimible",
            "Inventario con stock y movimientos",
            "KPIs gerenciales",
            "Reportes financieros operativos",
            "Asistente Operativo de Citas por WhatsApp"
        ],
        featureSummary: {
            operations:
                "Reservas, calendario, historial, pacientes, salas, usuarios internos y configuraciones base.",
            finances:
                "No incluye finanzas operativas completas ni facturacion procedural.",
            inventory:
                "No incluye inventario con stock, movimientos ni consumo automatico.",
            reporting:
                "Dashboard operativo simple para agenda, choques y lectura diaria basica.",
            whatsapp:
                "No disponible en este plan. Se habilita desde Premium."
        },
        upgradeValue:
            "Cuando la clinica ya necesita cobrar mejor, imprimir facturas y leer el negocio con mas control, Premium suma finanzas, inventario y reportes."
    },
    premium: {
        code: "premium",
        name: "Premium",
        description:
            "La version que ya resuelve la clinica de verdad con operacion, finanzas e inventario conectados.",
        headline:
            "Operacion diaria mas finanzas, inventario y control real para cerrar mejor el negocio.",
        idealFor:
            "Clinicas con mas citas al dia, mas recepcion activa y necesidad de trabajar con menos friccion manual.",
        monthlyPrice: 89,
        isStartingPrice: false,
        trialDays: DEFAULT_TRIAL_DAYS,
        isPopular: true,
        ctaLabel: "Empezar prueba",
        ctaMode: "signup",
        priceLabel: "Mas recomendado",
        eligibleAddonCodes: [WHATSAPP_ADDON_CODE],
        limits: {
            maxUsers: 10,
            maxRooms: 10,
            maxReservationsPerMonth: 3000
        },
        benefits: [
            "Finanzas operativas, facturacion procedural y PDF imprimible",
            "Historial pagado y no pagado con confirmacion posterior de pago",
            "Inventario con stock, movimientos y consumo automatico en procedimientos"
        ],
        includedFeatures: [
            "Todo lo de Basico",
            "Finanzas operativas completas",
            "Facturacion procedural",
            "Confirmacion posterior de pago",
            "Historial pagado / no pagado",
            "PDF imprimible",
            "Moneda por cuenta y por caso",
            "Inventario con stock",
            "Movimientos de inventario",
            "Consumo automatico en procedimientos",
            "Reportes financieros operativos",
            "Dashboard con KPIs para admin y recepcion",
            "Acceso al add-on de WhatsApp"
        ],
        excludedFeatures: [
            "Comparativas profundas entre sedes",
            "Onboarding asistido",
            "Acompanamiento comercial y tecnico continuo"
        ],
        featureSummary: {
            operations:
                "Incluye toda la operacion central y la mantiene estable mientras la clinica crece.",
            finances:
                "Finanzas operativas completas, facturacion procedural, confirmacion de pago e historial pagado/no pagado.",
            inventory:
                "Inventario con stock, movimientos y consumo automatico ligado a procedimientos.",
            reporting:
                "Reportes financieros operativos y dashboard con KPIs para admin y recepcion.",
            whatsapp:
                "Puede activar el Asistente Operativo de Citas por WhatsApp como complemento opcional."
        },
        upgradeValue:
            "Ya no solo trabajas mejor: tambien puedes cerrar pagos, leer cobros, controlar insumos y reducir trabajo manual."
    },
    enterprise: {
        code: "enterprise",
        name: "Enterprise",
        description:
            "Todo Premium, mas escala, lectura ejecutiva reforzada y acompanamiento para operaciones con mas exigencia.",
        headline:
            "Escala con mas capacidad, lectura ejecutiva y configuracion comercial mas acompanada.",
        idealFor:
            "Clinicas con varias sedes, mas personal o necesidad de acompanamiento para una operacion con mas capas.",
        monthlyPrice: 149,
        isStartingPrice: true,
        trialDays: DEFAULT_TRIAL_DAYS,
        isPopular: false,
        ctaLabel: "Empezar prueba",
        ctaMode: "signup",
        priceLabel: "Escala y acompanamiento",
        eligibleAddonCodes: [WHATSAPP_ADDON_CODE],
        limits: {
            maxUsers: 9999,
            maxRooms: 9999,
            maxReservationsPerMonth: 999999
        },
        benefits: [
            "Mayor capacidad para usuarios, salas y reservas sin frenar la operacion",
            "Lectura ejecutiva reforzada y comparativas mas profundas entre sedes",
            "Onboarding asistido, acompanamiento comercial y configuracion mas negociada"
        ],
        includedFeatures: [
            "Todo lo de Premium",
            "Mayor capacidad de usuarios, salas y reservas",
            "Enfoque multi-sucursal mas fuerte",
            "Comparativas mas profundas entre sedes",
            "Lectura ejecutiva reforzada",
            "Onboarding asistido",
            "Acompanamiento comercial y tecnico",
            "Configuracion mas negociada",
            "Add-on de WhatsApp opcional o negociable"
        ],
        excludedFeatures: [],
        featureSummary: {
            operations:
                "Mantiene toda la base operativa y la lleva mejor a entornos con mas sedes y movimiento.",
            finances:
                "Incluye el mismo cierre financiero de Premium y suma mejor lectura ejecutiva para direccion.",
            inventory:
                "Incluye inventario operativo y espacio para procesos de mayor escala.",
            reporting:
                "Comparativas mas profundas por sede y lectura ejecutiva reforzada para direccion.",
            whatsapp:
                "Puede sumarse como add-on o negociarse como parte de la configuracion comercial."
        },
        upgradeValue:
            "Enterprise no rompe la operacion base: la amplia con mas lectura ejecutiva, mas acompanamiento y mejor margen para crecer."
    }
};

const ADDON_CATALOG = {
    [WHATSAPP_ADDON_CODE]: {
        id: "addon_whatsapp_assistant",
        code: WHATSAPP_ADDON_CODE,
        name: "Asistente Operativo de Citas por WhatsApp",
        description:
            "Un complemento operativo para confirmar, mover y ordenar citas sin convertir la recepcion en un call center manual.",
        monthlyPrice: 19,
        includedMessages: 500,
        overagePricePerMessage: 0.04,
        eligiblePlanCodes: ["premium", "enterprise"],
        status: "active",
        capabilities: [
            "Confirmacion de citas",
            "Cancelacion guiada",
            "Consulta basica de cita",
            "Solicitud de reprogramacion",
            "Hasta 500 mensajes por mes",
            "Fallback a email cuando aplique"
        ],
        commercialMeta: {
            positioning:
                "Asistente operativo para clinicas que quieren bajar llamadas repetitivas y reducir ausencias evitables.",
            audience:
                "Equipos con mas citas diarias, mas carga en recepcion o necesidad de ordenar confirmaciones."
        },
        technicalMeta: {
            billingScope: "workspace",
            activationMode: "commercial_selection",
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

function decoratePlan(plan) {
    if (!plan) {
        return null;
    }

    return {
        ...plan,
        currencyCode: DEFAULT_CURRENCY_CODE,
        maxUsers: plan.limits.maxUsers,
        maxRooms: plan.limits.maxRooms,
        maxReservationsPerMonth: plan.limits.maxReservationsPerMonth,
        formattedMonthlyPrice: formatUsdMonthly(plan.monthlyPrice, {
            isStartingPrice: plan.isStartingPrice
        }),
        formattedTrialLabel: `${plan.trialDays} dias de trial`,
        supportsPublicSignup: PUBLIC_SIGNUP_PLAN_CODES.includes(plan.code),
        addonAvailabilityLabel: plan.eligibleAddonCodes.includes(WHATSAPP_ADDON_CODE)
            ? plan.code === "enterprise"
                ? "WhatsApp opcional o negociable dentro del plan"
                : "Listo para sumar WhatsApp cuando recepcion ya necesita mas aire"
            : "WhatsApp disponible desde Premium"
    };
}

function getPlanDefinition(planCode) {
    const normalizedPlanCode = normalizePlanCode(planCode);
    return decoratePlan(PLAN_CATALOG[normalizedPlanCode] ?? null);
}

const PLAN_DEFINITIONS = Object.freeze(
    Object.fromEntries(
        PLAN_DISPLAY_ORDER.map((planCode) => [planCode, getPlanDefinition(planCode)])
    )
);

function getPublicSignupPlans() {
    return PLAN_DISPLAY_ORDER
        .map((planCode) => getPlanDefinition(planCode))
        .filter((plan) => plan && plan.supportsPublicSignup);
}

function getPublicPlans() {
    return getPublicSignupPlans();
}

function isPublicSignupPlan(planCode) {
    return PUBLIC_SIGNUP_PLAN_CODES.includes(normalizePlanCode(planCode));
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
    const plan = getPlanDefinition(selection.planCode);

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

function buildPricingSelection(
    planCode = DEFAULT_PRICING_PLAN_CODE,
    addonEnabled = false,
    selectionSource = "pricing"
) {
    const normalizedPlanCode = getPlanDefinition(planCode)?.code ?? DEFAULT_PRICING_PLAN_CODE;
    const plan = getPlanDefinition(normalizedPlanCode);
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
        trialDays: plan?.trialDays ?? DEFAULT_TRIAL_DAYS,
        selectionSource,
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
    const addonRequested = Boolean(requestedAddonCode);

    return {
        planCode,
        addonCode: addon?.code ?? null,
        selectedAddonCodes: addon ? [addon.code] : [],
        addonInterestMessage: addon
            ? `Seleccionaste el ${addon.name}. Puedes mantenerlo en tu seleccion comercial y activarlo luego desde la configuracion de la cuenta.`
            : addonRequested
                ? "El Asistente Operativo de Citas por WhatsApp se habilita desde Premium."
                : ""
    };
}

export {
    ADDON_CATALOG,
    DEFAULT_CURRENCY_CODE,
    DEFAULT_PRICING_PLAN_CODE,
    DEFAULT_SIGNUP_PLAN_CODE,
    PLAN_CATALOG,
    PLAN_DEFINITIONS,
    PLAN_DISPLAY_ORDER,
    PUBLIC_SIGNUP_PLAN_CODES,
    WHATSAPP_ADDON_CODE,
    buildPricingSelection,
    buildSignupQuery,
    calculateAddonOverage,
    calculateEstimatedMonthlyTotal,
    canPlanUseAddon,
    formatUsdMonthly,
    getAddonByCode,
    getPlanDefinition,
    getPublicPlans,
    getPublicSignupPlans,
    isPublicSignupPlan,
    resolveSignupIntentQuery
};

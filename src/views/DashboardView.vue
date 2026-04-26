<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "../components/base/BaseButton.vue";
import BaseInput from "../components/base/BaseInput.vue";
import KpiMetricCard from "../components/dashboard/KpiMetricCard.vue";
import KpiRankingPanel from "../components/dashboard/KpiRankingPanel.vue";
import KpiTrendPanel from "../components/dashboard/KpiTrendPanel.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import { useAppointments } from "../composables/useAppointments.js";
import { getBranches } from "../services/branchApi.js";
import { getInternalUsers } from "../services/internalUserApi.js";
import { getKpiDashboard } from "../services/kpiApi.js";
import { getRooms } from "../services/roomApi.js";
import { getAccountSettings } from "../services/settingsApi.js";
import { KpiAccessPolicy, DASHBOARD_KINDS } from "../shared/kpiAccessPolicy.js";
import { buildPrivateNavLinks } from "../shared/privateNavigation.js";
import { DEFAULT_CURRENCY_CODE } from "../shared/currencies.js";
import { getPlanDefinition } from "../shared/plans.js";
import { useAuthStore } from "../stores/authStore.js";
import {
    addDays,
    getTodayDateKey,
    parseDateKey
} from "../utils/appointmentCalendar.js";

const router = useRouter();
const authStore = useAuthStore();
const {
    appointments,
    loading,
    error,
    fetchAppointments
} = useAppointments();

const fullMomentFormatter = new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short"
});

const shortDateFormatter = new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short"
});

const weekdayFormatter = new Intl.DateTimeFormat("es-CR", {
    weekday: "short"
});

const dashboardTimeZone = ref("America/Costa_Rica");
const branches = ref([]);
const rooms = ref([]);
const internalUsers = ref([]);
const kpiLoading = ref(false);
const kpiError = ref("");
const kpiFeedback = ref("");
const kpiDashboard = ref({
    summary: {},
    trends: [],
    breakdowns: {
        branches: [],
        rooms: [],
        doctors: [],
        procedures: []
    },
    alerts: [],
    meta: {
        from: "",
        to: "",
        granularity: "week",
        roomCount: 0,
        operationalWindowMinutes: 0,
        availableCurrencies: [],
        mixedCurrency: false,
        financialVisible: true,
        scopedBranchId: null,
        scopedBranchName: null
    }
});

const filters = ref({
    from: "",
    to: "",
    branchId: "",
    roomId: "",
    doctorUserId: "",
    status: "todos",
    currencyCode: "",
    granularity: "week"
});

const workspaceName = computed(() => authStore.workspace?.nombre ?? "Cuenta AGENDO");
const planDefinition = computed(
    () => getPlanDefinition(authStore.subscription?.planCode) ?? null
);
const kpiAccessPolicy = computed(
    () =>
        new KpiAccessPolicy({
            membershipRole: authStore.membershipRole,
            userRole: authStore.user?.rol,
            branchId: authStore.branch?.id,
            branchName: authStore.branch?.nombre,
            userId: authStore.user?.id
        })
);
const dashboardKind = computed(() => kpiAccessPolicy.value.dashboardKind());
const isAdminUser = computed(() => kpiAccessPolicy.value.isAdmin());
const canAccessKpiDashboard = computed(() => kpiAccessPolicy.value.canAccessKpiDashboard());
const canSeeExecutiveDashboard = computed(
    () => dashboardKind.value === DASHBOARD_KINDS.EXECUTIVE
);
const canSeeOperationalDashboard = computed(
    () => dashboardKind.value === DASHBOARD_KINDS.OPERATIONS
);
const canSeePersonalDashboard = computed(
    () => dashboardKind.value === DASHBOARD_KINDS.PERSONAL
);
const canSelectAnyBranch = computed(() => kpiAccessPolicy.value.canSelectAnyBranch());
const canFilterByDoctor = computed(() => kpiAccessPolicy.value.canFilterByDoctor());
const canSeeCollectionsShortcut = computed(() => kpiAccessPolicy.value.canAccessBasicCollections());
const dashboardLinks = computed(() =>
    buildPrivateNavLinks({
        membershipRole: authStore.membershipRole,
        userRole: authStore.user?.rol
    })
);

function createDefaultDateFilters() {
    const todayKey = getTodayDateKey(dashboardTimeZone.value);

    if (canSeeOperationalDashboard.value) {
        return {
            from: todayKey,
            to: todayKey
        };
    }

    return {
        from: addDays(todayKey, -29),
        to: todayKey
    };
}

function resetFilters() {
    const defaultRange = createDefaultDateFilters();

    filters.value = {
        from: defaultRange.from,
        to: defaultRange.to,
        branchId: canSelectAnyBranch.value ? "" : authStore.branch?.id ?? "",
        roomId: "",
        doctorUserId: "",
        status: "todos",
        currencyCode: "",
        granularity: "week"
    };
}

function toAppointmentDate(appointment) {
    const fecha = String(appointment?.fecha ?? "").trim();
    const hora = String(appointment?.horaInicio ?? "00:00").trim().slice(0, 5);

    if (!fecha) {
        return null;
    }

    const value = new Date(`${fecha}T${hora || "00:00"}`);
    return Number.isNaN(value.getTime()) ? null : value;
}

function formatAppointmentMoment(appointment) {
    const appointmentDate = toAppointmentDate(appointment);

    if (!appointmentDate) {
        return "Fecha no disponible";
    }

    return fullMomentFormatter.format(appointmentDate);
}

function formatDate(value) {
    if (!value) {
        return "Sin fecha";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Sin fecha" : shortDateFormatter.format(date);
}

function formatPercent(value) {
    if (value === null || value === undefined) {
        return "--";
    }

    return `${Number(value).toFixed(1)}%`;
}

function resolveDashboardCurrencyCode() {
    if (filters.value.currencyCode) {
        return filters.value.currencyCode;
    }

    if (kpiDashboard.value.meta.availableCurrencies?.length === 1) {
        return kpiDashboard.value.meta.availableCurrencies[0];
    }

    return DEFAULT_CURRENCY_CODE;
}

function formatCurrency(value, currencyCode = resolveDashboardCurrencyCode()) {
    if (value === null || value === undefined) {
        return "Filtra moneda";
    }

    return new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 2
    }).format(Number(value ?? 0));
}

function formatMinutes(minutes) {
    const totalMinutes = Number(minutes ?? 0);

    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
        return "0 min";
    }

    const hours = Math.floor(totalMinutes / 60);
    const remainder = totalMinutes % 60;

    if (hours <= 0) {
        return `${remainder} min`;
    }

    if (!remainder) {
        return `${hours} h`;
    }

    return `${hours} h ${remainder} min`;
}

function cardToneForRate(value, thresholds = { danger: 15, warning: 8 }) {
    const numericValue = Number(value ?? 0);

    if (!Number.isFinite(numericValue)) {
        return "default";
    }

    if (numericValue >= thresholds.danger) {
        return "danger";
    }

    if (numericValue >= thresholds.warning) {
        return "warning";
    }

    return "success";
}

function cardToneForOccupancy(value) {
    const numericValue = Number(value ?? 0);

    if (!Number.isFinite(numericValue)) {
        return "default";
    }

    if (numericValue < 40) {
        return "warning";
    }

    if (numericValue < 65) {
        return "default";
    }

    return "success";
}

const filteredRoomOptions = computed(() => {
    const selectedBranchId = Number(filters.value.branchId);

    return rooms.value.filter((room) => {
        if (selectedBranchId > 0) {
            return Number(room.sucursalId ?? room.sucursal_id ?? 0) === selectedBranchId;
        }

        return true;
    });
});

const filteredInternalUsers = computed(() => {
    const selectedBranchId = Number(filters.value.branchId);

    return internalUsers.value.filter((user) => {
        if (selectedBranchId > 0) {
            return Number(user.sucursalId ?? 0) === selectedBranchId;
        }

        return true;
    });
});

const todayDateKey = computed(() => getTodayDateKey(dashboardTimeZone.value));
const currentUserId = computed(() => Number(authStore.user?.id ?? 0) || null);
const currentBranchId = computed(() => Number(authStore.branch?.id ?? 0) || null);

const scopedAppointments = computed(() => {
    if (canSeePersonalDashboard.value && currentUserId.value) {
        return appointments.value.filter(
            (appointment) => Number(appointment.usuarioId ?? 0) === currentUserId.value
        );
    }

    if (canSeeOperationalDashboard.value && currentBranchId.value) {
        return appointments.value.filter(
            (appointment) => Number(appointment.branchId ?? 0) === currentBranchId.value
        );
    }

    return appointments.value;
});

const todayScopedAppointments = computed(() =>
    scopedAppointments.value.filter((appointment) => appointment.fecha === todayDateKey.value)
);

const scopedTotalAppointments = computed(() => scopedAppointments.value.length);
const scopedPendingAppointments = computed(
    () => scopedAppointments.value.filter((item) => item.estado === "pendiente").length
);
const scopedConfirmedAppointments = computed(
    () => scopedAppointments.value.filter((item) => item.estado === "confirmada").length
);

function getCurrentZonedTimeValue(timeZone) {
    const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
    const parts = {};

    for (const part of formatter.formatToParts(new Date())) {
        if (part.type !== "literal") {
            parts[part.type] = part.value;
        }
    }

    return `${parts.hour ?? "00"}:${parts.minute ?? "00"}`;
}

function timeToMinutes(timeValue) {
    const normalized = String(timeValue ?? "").trim().slice(0, 5);

    if (!/^\d{2}:\d{2}$/.test(normalized)) {
        return null;
    }

    const [hours, minutes] = normalized.split(":").map(Number);
    return (hours * 60) + minutes;
}

const availableRoomsNow = computed(() => {
    if (!canSeeOperationalDashboard.value) {
        return [];
    }

    const scopedBranchId = currentBranchId.value;
    const currentMinutes = timeToMinutes(getCurrentZonedTimeValue(dashboardTimeZone.value));

    if (currentMinutes === null) {
        return [];
    }

    const occupiedRoomIds = new Set(
        todayScopedAppointments.value
            .filter((appointment) => appointment.estado !== "cancelada")
            .filter((appointment) => {
                const startMinutes = timeToMinutes(appointment.horaInicio);
                const endMinutes = timeToMinutes(appointment.horaFin);

                if (startMinutes === null || endMinutes === null) {
                    return false;
                }

                return currentMinutes >= startMinutes && currentMinutes < endMinutes;
            })
            .map((appointment) => Number(appointment.salaId ?? 0))
            .filter(Boolean)
    );

    return rooms.value.filter((room) => {
        const roomId = Number(room.id ?? 0) || null;
        const roomBranchId = Number(room.sucursalId ?? room.sucursal_id ?? 0) || null;
        const roomStatus = String(room.estado ?? "").toLowerCase();
        const availability = String(room.disponibilidad ?? "").toLowerCase();

        if (!roomId || roomStatus !== "activa") {
            return false;
        }

        if (scopedBranchId && roomBranchId !== scopedBranchId) {
            return false;
        }

        if (availability && availability !== "disponible") {
            return false;
        }

        return !occupiedRoomIds.has(roomId);
    });
});

const availableRoomsPreview = computed(() => availableRoomsNow.value.slice(0, 3));

const nextSevenDaysAppointments = computed(() => {
    const now = new Date();
    const limit = new Date(now);
    limit.setDate(limit.getDate() + 7);

    return scopedAppointments.value.filter((appointment) => {
        const appointmentDate = toAppointmentDate(appointment);

        return Boolean(
            appointmentDate &&
            appointmentDate.getTime() >= now.getTime() &&
            appointmentDate.getTime() <= limit.getTime()
        );
    }).length;
});

const upcomingAppointments = computed(() =>
    [...scopedAppointments.value]
        .sort((left, right) => {
            const leftDate = toAppointmentDate(left)?.getTime() ?? 0;
            const rightDate = toAppointmentDate(right)?.getTime() ?? 0;
            return leftDate - rightDate;
        })
        .slice(0, 3)
);

const nextAppointment = computed(() => upcomingAppointments.value[0] ?? null);

const agendaPreviewDays = computed(() => {
    const todayKey = getTodayDateKey(dashboardTimeZone.value);

    return Array.from({ length: 7 }, (_, index) => {
        const dateKey = addDays(todayKey, index);
        const matchingAppointments = scopedAppointments.value.filter(
            (appointment) => appointment.fecha === dateKey
        );
        const date = parseDateKey(dateKey);

        return {
            dateKey,
            total: matchingAppointments.length,
            confirmed: matchingAppointments.filter((appointment) => appointment.estado === "confirmada")
                .length,
            pending: matchingAppointments.filter((appointment) => appointment.estado === "pendiente")
                .length,
            label: date ? weekdayFormatter.format(date).replace(".", "") : "",
            dayNumber: dateKey.slice(-2),
            isToday: index === 0
        };
    });
});

const basicStatCards = computed(() => [
    {
        label: "Reservas totales",
        value: scopedTotalAppointments.value
    },
    {
        label: "Pendientes",
        value: scopedPendingAppointments.value
    },
    {
        label: "Confirmadas",
        value: scopedConfirmedAppointments.value
    },
    {
        label: "Esta semana",
        value: nextSevenDaysAppointments.value
    }
]);

const personalStatCards = computed(() => [
    {
        label: "Mis citas de hoy",
        value: todayScopedAppointments.value.length
    },
    {
        label: "Confirmadas",
        value: todayScopedAppointments.value.filter((item) => item.estado === "confirmada").length
    },
    {
        label: "Pendientes",
        value: todayScopedAppointments.value.filter((item) => item.estado === "pendiente").length
    },
    {
        label: "Proximas 7 dias",
        value: nextSevenDaysAppointments.value
    }
]);

const kpiSummary = computed(() => kpiDashboard.value.summary ?? {});
const kpiMeta = computed(() => kpiDashboard.value.meta ?? {});

const executiveCards = computed(() => {
    const cards = [
        {
            label: "Ocupacion de salas",
            value: formatPercent(kpiSummary.value.occupancyRate),
            helper: `${formatMinutes(kpiSummary.value.bookedMinutes)} ocupados`,
            tone: cardToneForOccupancy(kpiSummary.value.occupancyRate)
        },
        {
            label: "No-show",
            value: formatPercent(kpiSummary.value.noShowRate),
            helper: `${kpiSummary.value.noShowCount ?? 0} casos cerrados`,
            tone: cardToneForRate(kpiSummary.value.noShowRate, {
                danger: 15,
                warning: 8
            })
        },
        {
            label: "Cancelacion",
            value: formatPercent(kpiSummary.value.cancellationRate),
            helper: `${kpiSummary.value.cancelledCount ?? 0} canceladas`,
            tone: cardToneForRate(kpiSummary.value.cancellationRate, {
                danger: 18,
                warning: 10
            })
        },
        {
            label: "Ticket promedio",
            value: formatCurrency(kpiSummary.value.averageTicket),
            helper: `${kpiSummary.value.paidChargeCount ?? 0} facturas pagadas`,
            tone: "default"
        },
        {
            label: "Ingreso por sala/hora",
            value: formatCurrency(kpiSummary.value.revenuePerRoomHour),
            helper: "Basado en tiempo realmente bloqueado",
            tone: "default"
        }
    ];

    if (isAdminUser.value) {
        cards.push(
            {
                label: "Ingreso promedio por medico",
                value: formatCurrency(kpiSummary.value.averageRevenuePerDoctor),
                helper: `${kpiSummary.value.distinctDoctorsCount ?? 0} usuarios con cobro`,
                tone: "default"
            },
            {
                label: "Margen bruto procedural",
                value: formatPercent(kpiSummary.value.grossMarginRate),
                helper: formatCurrency(kpiSummary.value.grossMarginAmount),
                tone: "success"
            }
        );
    }

    cards.push({
        label: "Revenue leakage",
        value: formatCurrency(kpiSummary.value.revenueLeakage),
        helper: "Pendiente + exonerado",
        tone: "warning"
    });

    return cards;
});

const operationalCards = computed(() => [
    {
        label: "Citas del dia",
        value: String(kpiSummary.value.scheduledCount ?? 0),
        helper: `${kpiSummary.value.confirmedCount ?? 0} confirmadas`,
        tone: "default"
    },
    {
        label: "Pendientes",
        value: String(kpiSummary.value.pendingCount ?? 0),
        helper: `${kpiSummary.value.cancelledCount ?? 0} canceladas`,
        tone: cardToneForRate(kpiSummary.value.cancellationRate, {
            danger: 18,
            warning: 10
        })
    },
    {
        label: "No-show",
        value: formatPercent(kpiSummary.value.noShowRate),
        helper: `${kpiSummary.value.noShowCount ?? 0} casos cerrados`,
        tone: cardToneForRate(kpiSummary.value.noShowRate, {
            danger: 15,
            warning: 8
        })
    },
    {
        label: "Ocupacion operativa",
        value: formatPercent(kpiSummary.value.occupancyRate),
        helper: `${formatMinutes(kpiSummary.value.bookedMinutes)} ocupados`,
        tone: cardToneForOccupancy(kpiSummary.value.occupancyRate)
    },
    {
        label: "Cobrado del corte",
        value: formatCurrency(kpiSummary.value.paidRevenue),
        helper: `${kpiSummary.value.paidReservationCount ?? 0} reservas pagadas`,
        tone: "success"
    },
    {
        label: "Pendiente de cobro",
        value: formatCurrency(kpiSummary.value.pendingRevenue),
        helper: `${kpiSummary.value.pendingChargeCount ?? 0} facturas pendientes`,
        tone: "warning"
    }
]);

const dashboardKpiCards = computed(() =>
    canSeeExecutiveDashboard.value ? executiveCards.value : operationalCards.value
);

const topRooms = computed(() => kpiDashboard.value.breakdowns?.rooms?.slice(0, 5) ?? []);
const topDoctors = computed(() => kpiDashboard.value.breakdowns?.doctors?.slice(0, 5) ?? []);
const roomRankingPrimaryMetricKey = computed(() =>
    canSeeExecutiveDashboard.value ? "paidRevenue" : "scheduledCount"
);
const roomRankingPrimaryMetricLabel = computed(() =>
    canSeeExecutiveDashboard.value ? "Cobrado" : "Reservas"
);
const roomRankingSecondaryMetricKey = computed(() =>
    canSeeExecutiveDashboard.value ? "occupancyRate" : "idleMinutes"
);
const roomRankingSecondaryMetricLabel = computed(() =>
    canSeeExecutiveDashboard.value ? "Ocupacion" : "Tiempo muerto"
);
const roomRankingPrimaryFormatter = computed(() =>
    canSeeExecutiveDashboard.value
        ? (value) => formatCurrency(value)
        : (value) => String(Number(value ?? 0))
);
const roomRankingSecondaryFormatter = computed(() =>
    canSeeExecutiveDashboard.value ? formatPercent : formatMinutes
);

const managerialWarnings = computed(() => {
    const warnings = [];

    if (kpiMeta.value.mixedCurrency) {
        warnings.push("Hay varias monedas en el rango. Filtra una moneda para habilitar los KPI financieros agregados.");
    }

    if (!kpiMeta.value.financialVisible && !kpiMeta.value.mixedCurrency) {
        warnings.push("Algunas metricas financieras estan ocultas por permisos del rol actual.");
    }

    if (canSeeOperationalDashboard.value && kpiMeta.value.strategicFinancialVisible === false) {
        warnings.push("Este tablero muestra solo KPIs operativos y cobranza basica de tu sucursal.");
    }

    return warnings;
});

const dashboardHeroDescription = computed(() => {
    if (canSeeExecutiveDashboard.value) {
        return "Combina operacion, cobranza y rendimiento para tomar decisiones reales sobre salas, recepcion y productividad.";
    }

    if (canSeeOperationalDashboard.value) {
        return "Prioriza la agenda del dia, la ocupacion practica y la cobranza basica de tu sucursal sin ruido estrategico innecesario.";
    }

    return "Administra tu agenda personal con una vista breve de tus proximas reservas y la carga operativa inmediata.";
});

const dashboardFilterEyebrow = computed(() =>
    canSeeExecutiveDashboard.value ? "KPIs gerenciales" : "KPIs operativos"
);

const dashboardFilterTitle = computed(() =>
    canSeeExecutiveDashboard.value ? "Filtro ejecutivo" : "Filtro operativo"
);

const dashboardFilterDescription = computed(() =>
    canSeeExecutiveDashboard.value
        ? "Afina el corte por fecha, sede, sala, responsable y moneda antes de interpretar los indicadores."
        : "Ajusta el corte por fecha, sala, estado y moneda para ordenar la operacion diaria y la cobranza de la sucursal."
);

const roomRankingTitle = computed(() =>
    canSeeExecutiveDashboard.value ? "Rendimiento por sala" : "Carga operativa por sala"
);

const roomRankingDescription = computed(() =>
    canSeeExecutiveDashboard.value
        ? "Compara uso, tiempo muerto y dinero generado por las salas del periodo."
        : "Detecta que salas concentran mas reservas y donde se acumula tiempo muerto en el corte actual."
);

const collectionsTrendTitle = computed(() =>
    canSeeExecutiveDashboard.value ? "Cobrado vs pendiente" : "Cobranza basica"
);

const collectionsTrendDescription = computed(() =>
    canSeeExecutiveDashboard.value
        ? "Separa la salud comercial real del dinero que aun no se ha recuperado."
        : "Muestra lo recuperado y lo pendiente en la sucursal sin abrir comparativas financieras sensibles."
);

async function fetchDashboardSettings() {
    try {
        const response = await getAccountSettings();
        dashboardTimeZone.value = response.data?.timeZone ?? "America/Costa_Rica";
    } catch {
        dashboardTimeZone.value = "America/Costa_Rica";
    }
}

async function fetchBranchesForFilters() {
    if (!canAccessKpiDashboard.value || !canSelectAnyBranch.value) {
        branches.value = [];
        return;
    }

    try {
        const response = await getBranches();
        branches.value = response.data ?? [];
    } catch {
        branches.value = [];
    }
}

async function fetchRoomsForFilters() {
    if (!canAccessKpiDashboard.value) {
        rooms.value = [];
        return;
    }

    try {
        const response = await getRooms();
        rooms.value = response.data ?? [];
    } catch {
        rooms.value = [];
    }
}

async function fetchInternalUsersForFilters() {
    if (!canAccessKpiDashboard.value || !canFilterByDoctor.value) {
        internalUsers.value = [];
        return;
    }

    try {
        const response = await getInternalUsers();
        internalUsers.value = (response.data ?? []).filter((user) => user.estado === "activo");
    } catch {
        internalUsers.value = [];
    }
}

async function fetchKpis() {
    if (!canAccessKpiDashboard.value) {
        return;
    }

    kpiLoading.value = true;
    kpiError.value = "";

    try {
        const response = await getKpiDashboard(filters.value);
        kpiDashboard.value = response.data ?? kpiDashboard.value;
    } catch (requestError) {
        kpiError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible cargar los indicadores del dashboard.";
    } finally {
        kpiLoading.value = false;
    }
}

async function applyKpiFilters() {
    kpiFeedback.value = "";
    await fetchKpis();
}

async function clearKpiFilters() {
    resetFilters();
    await fetchKpis();
}

function logout() {
    authStore.logout();
    router.push("/login");
}

async function bootstrapDashboard() {
    if (!authStore.isHydrated) {
        await authStore.hydrate();
    }

    if (!authStore.isAuthenticated) {
        router.replace("/login");
        return;
    }

    await fetchDashboardSettings();
    resetFilters();

    await Promise.all([
        fetchAppointments(),
        fetchBranchesForFilters(),
        fetchRoomsForFilters(),
        fetchInternalUsersForFilters()
    ]);

    await fetchKpis();
}

watch(
    () => filters.value.branchId,
    (nextBranchId) => {
        const normalizedBranchId = Number(nextBranchId);
        const selectedRoomId = Number(filters.value.roomId);
        const selectedDoctorUserId = Number(filters.value.doctorUserId);

        if (
            selectedRoomId > 0 &&
            !filteredRoomOptions.value.some((room) => Number(room.id) === selectedRoomId)
        ) {
            filters.value.roomId = "";
        }

        if (
            isAdminUser.value &&
            selectedDoctorUserId > 0 &&
            !filteredInternalUsers.value.some((user) => Number(user.id) === selectedDoctorUserId)
        ) {
            filters.value.doctorUserId = "";
        }

        if (!canSelectAnyBranch.value && normalizedBranchId !== Number(authStore.branch?.id ?? 0)) {
            filters.value.branchId = authStore.branch?.id ?? "";
        }
    }
);

onMounted(() => {
    bootstrapDashboard();
});
</script>

<template>
  <div class="dashboard-page page-view">
    <div class="dashboard-shell page-shell">
      <AppNavbar
        :links="dashboardLinks"
        brand-href="/dashboard"
        action-label="Cerrar Sesion"
        :show-profile-icon="true"
        @action="logout"
      />

      <main class="dashboard-main section-shell">
        <section v-reveal class="dashboard-hero">
          <div v-reveal="80" class="dashboard-hero__copy">
            <span class="dashboard-eyebrow">Centro de mando</span>
            <h1>{{ workspaceName }}</h1>
            <p>
              {{ dashboardHeroDescription }}
            </p>

            <div class="dashboard-hero__actions">
              <BaseButton @click="router.push('/appointments')">
                Abrir reservas
              </BaseButton>
              <BaseButton variant="ghost" @click="router.push('/appointments/past')">
                Historial de Reservas
              </BaseButton>
              <BaseButton
                v-if="canSeeCollectionsShortcut"
                variant="ghost"
                @click="router.push('/finance')"
              >
                Ver cobradas
              </BaseButton>
            </div>
          </div>

          <div class="dashboard-hero__side">
            <article v-reveal="140" class="dashboard-highlight-card">
              <p class="dashboard-panel__eyebrow">Siguiente reserva</p>

              <template v-if="nextAppointment">
                <div class="dashboard-highlight-card__order">
                  <span class="dashboard-info-chip dashboard-info-chip--time">
                    {{ formatAppointmentMoment(nextAppointment) }}
                  </span>
                  <span class="dashboard-info-chip">
                    {{ nextAppointment.salaNombre || `Sala #${nextAppointment.salaId}` }}
                  </span>
                  <span class="dashboard-info-chip">
                    {{ nextAppointment.tipoConsulta }}
                  </span>
                </div>
                <strong>{{ nextAppointment.pacienteNombre || `Paciente #${nextAppointment.pacienteId}` }}</strong>
                <p>{{ nextAppointment.descripcion || "Reserva lista para atencion." }}</p>
              </template>

              <template v-else>
                <strong>No hay reservas proximas</strong>
                <p>Usa el modulo de reservas para programar la siguiente atencion.</p>
              </template>
            </article>

            <article v-if="isAdminUser" v-reveal="180" class="dashboard-plan-card">
              <p class="dashboard-panel__eyebrow">Plan activo</p>
              <strong>{{ planDefinition?.name ?? "Sin plan disponible" }}</strong>
              <p class="dashboard-plan-card__status">
                {{ authStore.subscription?.commercialStatus ?? "Sin estado comercial" }}
              </p>
              <div class="dashboard-plan-card__limits">
                <span>Usuarios: {{ authStore.subscription?.maxUsers ?? "Ilimitado" }}</span>
                <span>Salas: {{ authStore.subscription?.maxRooms ?? "Ilimitado" }}</span>
              </div>
              <p class="dashboard-plan-card__date">
                Trial hasta {{ formatDate(authStore.subscription?.trialEndsAt) }}
              </p>
            </article>
          </div>
        </section>

        <section v-if="!canAccessKpiDashboard" class="dashboard-stats stats-strip">
          <article
            v-for="card in canSeePersonalDashboard ? personalStatCards : basicStatCards"
            :key="card.label"
            v-reveal="{ delay: 60 }"
            class="dashboard-stat-card"
          >
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </article>
        </section>

        <template v-if="canAccessKpiDashboard">
          <section v-reveal class="dashboard-filters dashboard-panel">
            <div class="dashboard-panel__heading">
              <div>
                <p class="dashboard-panel__eyebrow">{{ dashboardFilterEyebrow }}</p>
                <h2>{{ dashboardFilterTitle }}</h2>
                <p>{{ dashboardFilterDescription }}</p>
              </div>
            </div>

            <form class="dashboard-filters__grid" @submit.prevent="applyKpiFilters">
              <BaseInput
                :model-value="filters.from"
                label="Desde"
                type="date"
                @update:model-value="filters.from = $event"
              />
              <BaseInput
                :model-value="filters.to"
                label="Hasta"
                type="date"
                @update:model-value="filters.to = $event"
              />

              <label v-if="canSelectAnyBranch" class="dashboard-filter__field">
                <span class="dashboard-filter__label">Sucursal</span>
                <select v-model="filters.branchId" class="dashboard-filter__select">
                  <option value="">Todas</option>
                  <option v-for="branch in branches" :key="branch.id" :value="branch.id">
                    {{ branch.nombre }}
                  </option>
                </select>
              </label>

              <label v-else class="dashboard-filter__field">
                <span class="dashboard-filter__label">Sucursal</span>
                <input
                  class="dashboard-filter__input dashboard-filter__input--readonly"
                  type="text"
                  :value="authStore.branch?.nombre || 'Sucursal asignada'"
                  disabled
                >
              </label>

              <label class="dashboard-filter__field">
                <span class="dashboard-filter__label">Sala</span>
                <select v-model="filters.roomId" class="dashboard-filter__select">
                  <option value="">Todas</option>
                  <option v-for="room in filteredRoomOptions" :key="room.id" :value="room.id">
                    {{ room.nombre }} · {{ room.sucursalNombre || room.sucursal_nombre || "Sin sucursal" }}
                  </option>
                </select>
              </label>

              <label v-if="canFilterByDoctor" class="dashboard-filter__field">
                <span class="dashboard-filter__label">Medico / responsable</span>
                <select v-model="filters.doctorUserId" class="dashboard-filter__select">
                  <option value="">Todos</option>
                  <option
                    v-for="user in filteredInternalUsers"
                    :key="user.id"
                    :value="user.id"
                  >
                    {{ user.nombre }}
                  </option>
                </select>
              </label>

              <label class="dashboard-filter__field">
                <span class="dashboard-filter__label">Estado</span>
                <select v-model="filters.status" class="dashboard-filter__select">
                  <option value="todos">Todos</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </label>

              <label class="dashboard-filter__field">
                <span class="dashboard-filter__label">Moneda</span>
                <select v-model="filters.currencyCode" class="dashboard-filter__select">
                  <option value="">Todas</option>
                  <option
                    v-for="currencyCode in kpiMeta.availableCurrencies"
                    :key="currencyCode"
                    :value="currencyCode"
                  >
                    {{ currencyCode }}
                  </option>
                </select>
              </label>

              <label class="dashboard-filter__field">
                <span class="dashboard-filter__label">Granularidad</span>
                <select v-model="filters.granularity" class="dashboard-filter__select">
                  <option value="day">Dia</option>
                  <option value="week">Semana</option>
                  <option value="month">Mes</option>
                </select>
              </label>

              <div class="dashboard-filter__actions">
                <BaseButton variant="ghost" @click.prevent="clearKpiFilters">
                  Limpiar
                </BaseButton>
                <BaseButton type="submit" :disabled="kpiLoading">
                  {{ kpiLoading ? "Actualizando..." : "Aplicar filtros" }}
                </BaseButton>
              </div>
            </form>

            <p v-if="kpiError" class="dashboard-state dashboard-state--error">
              {{ kpiError }}
            </p>

            <div v-else-if="managerialWarnings.length" class="dashboard-warning-list">
              <p
                v-for="warning in managerialWarnings"
                :key="warning"
                class="dashboard-warning-list__item"
              >
                {{ warning }}
              </p>
            </div>
          </section>

          <section class="dashboard-kpis">
            <KpiMetricCard
              v-for="card in dashboardKpiCards"
              :key="card.label"
              :label="card.label"
              :value="card.value"
              :helper="card.helper"
              :tone="card.tone"
            />
          </section>

          <section class="dashboard-grid">
            <KpiTrendPanel
              title="Ocupacion y no-show"
              description="Mira si la capacidad vendida de verdad se convierte en atencion efectiva."
              :series="kpiDashboard.trends"
              primary-key="occupancyRate"
              secondary-key="noShowRate"
              primary-label="Ocupacion"
              secondary-label="No-show"
              :primary-formatter="formatPercent"
              :secondary-formatter="formatPercent"
            />

            <KpiTrendPanel
              :title="collectionsTrendTitle"
              :description="collectionsTrendDescription"
              :series="kpiDashboard.trends"
              primary-key="paidRevenue"
              secondary-key="pendingRevenue"
              primary-label="Cobrado"
              secondary-label="Pendiente"
              :primary-formatter="(value) => formatCurrency(value)"
              :secondary-formatter="(value) => formatCurrency(value)"
            />

            <KpiRankingPanel
              :title="roomRankingTitle"
              :description="roomRankingDescription"
              :rows="topRooms"
              label-key="roomName"
              :primary-metric-key="roomRankingPrimaryMetricKey"
              :primary-metric-label="roomRankingPrimaryMetricLabel"
              :secondary-metric-key="roomRankingSecondaryMetricKey"
              :secondary-metric-label="roomRankingSecondaryMetricLabel"
              :primary-formatter="roomRankingPrimaryFormatter"
              :secondary-formatter="roomRankingSecondaryFormatter"
            />

            <KpiRankingPanel
              v-if="canSeeExecutiveDashboard && isAdminUser"
              title="Rendimiento por medico"
              description="Lectura rapida del ingreso y resultado operativo por responsable de la reserva."
              :rows="topDoctors"
              label-key="doctorName"
              primary-metric-key="paidRevenue"
              primary-metric-label="Cobrado"
              secondary-metric-key="noShowRate"
              secondary-metric-label="No-show"
              :primary-formatter="(value) => formatCurrency(value)"
              :secondary-formatter="formatPercent"
            />

            <article v-if="canSeeOperationalDashboard" class="dashboard-panel">
              <div class="dashboard-panel__heading">
                <div>
                  <p class="dashboard-panel__eyebrow">Disponibilidad</p>
                  <h2>Salas disponibles ahora</h2>
                </div>
              </div>

              <template v-if="availableRoomsNow.length">
                <strong class="dashboard-availability-count">
                  {{ availableRoomsNow.length }} salas listas para recibir pacientes
                </strong>
                <div class="dashboard-highlight-card__order">
                  <span
                    v-for="room in availableRoomsPreview"
                    :key="room.id"
                    class="dashboard-info-chip"
                  >
                    {{ room.nombre }}
                  </span>
                </div>
              </template>

              <p v-else class="dashboard-state">
                Todas las salas activas de tu sucursal estan ocupadas en este momento.
              </p>
            </article>

            <article class="dashboard-panel">
              <div class="dashboard-panel__heading">
                <div>
                  <p class="dashboard-panel__eyebrow">Alertas operativas</p>
                  <h2>Lo que pide atencion</h2>
                </div>
              </div>

              <ul v-if="kpiDashboard.alerts.length" class="dashboard-alerts">
                <li
                  v-for="alert in kpiDashboard.alerts"
                  :key="alert.code"
                  class="dashboard-alert"
                  :class="`dashboard-alert--${alert.level}`"
                >
                  <strong>{{ alert.title }}</strong>
                  <p>{{ alert.message }}</p>
                </li>
              </ul>

              <p v-else class="dashboard-state">
                No hay alertas relevantes en este corte.
              </p>
            </article>

            <article class="dashboard-panel">
              <div class="dashboard-panel__heading">
                <div>
                  <p class="dashboard-panel__eyebrow">Agenda visual</p>
                  <h2>Proximos siete dias</h2>
                </div>
                <BaseButton
                  size="sm"
                  variant="ghost"
                  @click="router.push({ path: '/appointments', query: { view: 'calendar', scale: 'month', date: getTodayDateKey(dashboardTimeZone) } })"
                >
                  Abrir calendario
                </BaseButton>
              </div>

              <div class="dashboard-calendar-preview">
                <article
                  v-for="day in agendaPreviewDays"
                  :key="day.dateKey"
                  class="dashboard-calendar-preview__day"
                  :class="{ 'is-today': day.isToday }"
                >
                  <span>{{ day.label }}</span>
                  <strong>{{ day.dayNumber }}</strong>
                  <small>{{ day.total }} reservas</small>
                </article>
              </div>
            </article>
          </section>
        </template>

        <template v-else>
          <section class="dashboard-grid">
            <article v-reveal class="dashboard-panel dashboard-panel--wide">
              <div class="dashboard-panel__heading">
                <div>
                  <p class="dashboard-panel__eyebrow">
                    {{ canSeePersonalDashboard ? "Mi agenda" : "Agenda" }}
                  </p>
                  <h2>{{ canSeePersonalDashboard ? "Mis reservas proximas" : "Reservas proximas" }}</h2>
                </div>
              </div>

              <p v-if="loading" class="dashboard-state">
                Cargando reservas...
              </p>
              <p v-else-if="error" class="dashboard-state dashboard-state--error">
                {{ error }}
              </p>
              <ul v-else-if="upcomingAppointments.length" class="dashboard-appointment-list">
                <li
                  v-for="appointment in upcomingAppointments"
                  :key="appointment.id"
                  class="dashboard-appointment-item"
                >
                  <div class="dashboard-appointment-item__content">
                    <div class="dashboard-appointment-item__order">
                      <span class="dashboard-info-chip dashboard-info-chip--time">
                        {{ formatAppointmentMoment(appointment) }}
                      </span>
                      <span class="dashboard-info-chip">
                        {{ appointment.salaNombre || `Sala #${appointment.salaId}` }}
                      </span>
                      <span class="dashboard-info-chip">
                        {{ appointment.tipoConsulta }}
                      </span>
                    </div>
                    <strong>{{ appointment.pacienteNombre || `Paciente #${appointment.pacienteId}` }}</strong>
                    <p>{{ appointment.descripcion || "Reserva lista para atencion." }}</p>
                  </div>
                </li>
              </ul>
              <p v-else class="dashboard-state">
                No hay reservas activas para mostrar.
              </p>
            </article>

            <article class="dashboard-panel dashboard-panel--wide">
              <div class="dashboard-panel__heading">
                <div>
                  <p class="dashboard-panel__eyebrow">Agenda visual</p>
                  <h2>Proximos siete dias</h2>
                </div>
              </div>

              <div class="dashboard-calendar-preview">
                <article
                  v-for="day in agendaPreviewDays"
                  :key="day.dateKey"
                  class="dashboard-calendar-preview__day"
                  :class="{ 'is-today': day.isToday }"
                >
                  <span>{{ day.label }}</span>
                  <strong>{{ day.dayNumber }}</strong>
                  <small>{{ day.total }} reservas</small>
                </article>
              </div>
            </article>
          </section>
        </template>
      </main>

      <AppFooter />
    </div>
  </div>
</template>

<style scoped>
.dashboard-main {
  display: flex;
  flex-direction: column;
  gap: 1.3rem;
}

.dashboard-hero,
.dashboard-panel,
.dashboard-filters,
.dashboard-stat-card {
  border-radius: 8px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: #fff;
  box-shadow: 0 18px 44px rgba(16, 38, 44, 0.08);
  position: relative;
  overflow: hidden;
}

.dashboard-hero::before,
.dashboard-panel::before,
.dashboard-filters::before {
  content: "";
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, rgba(17, 184, 159, 0.92), rgba(22, 134, 190, 0.7));
}

.dashboard-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(300px, 0.9fr);
  gap: 1rem;
  padding: 1.3rem;
}

.dashboard-hero__copy {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.dashboard-eyebrow,
.dashboard-panel__eyebrow {
  display: inline-flex;
  padding: 0.34rem 0.72rem;
  border-radius: 999px;
  background: rgba(17, 184, 159, 0.12);
  color: var(--primary-dark);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.dashboard-hero__copy h1,
.dashboard-panel__heading h2 {
  margin: 0;
}

.dashboard-hero__copy p,
.dashboard-panel__heading p {
  margin: 0;
  color: var(--text-soft);
}

.dashboard-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.dashboard-hero__side {
  display: grid;
  gap: 1rem;
}

.dashboard-highlight-card,
.dashboard-plan-card {
  padding: 1rem;
  border-radius: 8px;
  background: #f8fbfc;
  border: 1px solid rgba(17, 184, 159, 0.1);
}

.dashboard-highlight-card strong,
.dashboard-plan-card strong,
.dashboard-availability-count {
  display: block;
  color: var(--primary-dark);
  margin-top: 0.45rem;
}

.dashboard-highlight-card p,
.dashboard-plan-card p {
  margin: 0.3rem 0 0;
}

.dashboard-highlight-card__order,
.dashboard-plan-card__limits,
.dashboard-appointment-item__order {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}

.dashboard-info-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  background: #eef5f8;
  color: var(--text-soft);
  font-size: 0.83rem;
}

.dashboard-info-chip--time {
  background: #edf5fb;
  color: var(--primary-dark);
}

.dashboard-plan-card__status,
.dashboard-plan-card__date {
  color: var(--text-soft);
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.dashboard-stat-card {
  padding: 1rem 1.05rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.dashboard-stat-card span {
  color: var(--text-soft);
}

.dashboard-stat-card strong {
  font-size: 1.9rem;
  color: var(--primary-dark);
}

.dashboard-filters {
  padding: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dashboard-filters__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  align-items: end;
}

.dashboard-filter__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.dashboard-filter__label {
  font-size: 0.92rem;
  font-weight: 600;
}

.dashboard-filter__select,
.dashboard-filter__input {
  width: 100%;
  border: 2px solid var(--border);
  border-radius: var(--border-radius);
  background: var(--surface);
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
  box-shadow: var(--shadow);
}

.dashboard-filter__input--readonly {
  background: #f4f8fa;
}

.dashboard-filter__actions {
  display: flex;
  gap: 0.75rem;
}

.dashboard-warning-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.dashboard-warning-list__item,
.dashboard-state {
  margin: 0;
  padding: 0.95rem 1rem;
  border-radius: 8px;
  background: #f6fbfc;
  color: var(--text-soft);
}

.dashboard-state--error {
  background: rgba(235, 85, 69, 0.12);
  color: #b8392d;
}

.dashboard-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.dashboard-panel {
  padding: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dashboard-panel--wide {
  min-height: 100%;
}

.dashboard-panel__heading {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
}

.dashboard-appointment-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.dashboard-appointment-item {
  padding: 0.95rem 1rem;
  border-radius: 8px;
  background: #f8fbfc;
  border: 1px solid rgba(17, 184, 159, 0.1);
}

.dashboard-appointment-item strong {
  color: var(--primary-dark);
}

.dashboard-appointment-item p {
  margin: 0.3rem 0 0;
  color: var(--text-soft);
}

.dashboard-calendar-preview {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.8rem;
}

.dashboard-calendar-preview__day {
  padding: 0.9rem 0.75rem;
  border-radius: 8px;
  background: #f8fbfc;
  border: 1px solid rgba(17, 184, 159, 0.1);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.dashboard-calendar-preview__day span,
.dashboard-calendar-preview__day small {
  color: var(--text-soft);
}

.dashboard-calendar-preview__day strong {
  color: var(--primary-dark);
}

.dashboard-calendar-preview__day.is-today {
  background: #edf8f7;
  border-color: rgba(17, 184, 159, 0.2);
}

.dashboard-alerts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.dashboard-alert {
  padding: 0.95rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: #f8fbfc;
}

.dashboard-alert strong,
.dashboard-alert p {
  margin: 0;
}

.dashboard-alert p {
  margin-top: 0.3rem;
  color: var(--text-soft);
}

.dashboard-alert--high {
  border-color: rgba(235, 85, 69, 0.24);
  background: rgba(235, 85, 69, 0.08);
}

.dashboard-alert--warning {
  border-color: rgba(242, 159, 56, 0.22);
  background: rgba(242, 159, 56, 0.08);
}

.dashboard-alert--info {
  border-color: rgba(17, 184, 159, 0.18);
}

@media (max-width: 1160px) {
  .dashboard-kpis,
  .dashboard-filters__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .dashboard-hero,
  .dashboard-grid,
  .dashboard-kpis,
  .dashboard-filters__grid,
  .dashboard-stats {
    grid-template-columns: 1fr;
  }

  .dashboard-calendar-preview {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .dashboard-hero,
  .dashboard-panel,
  .dashboard-filters,
  .dashboard-stat-card {
    padding: 1rem;
  }

  .dashboard-hero__actions,
  .dashboard-filter__actions,
  .dashboard-panel__heading {
    flex-direction: column;
    align-items: stretch;
  }

  .dashboard-hero__actions :deep(.base-button),
  .dashboard-filter__actions :deep(.base-button),
  .dashboard-panel__heading :deep(.base-button) {
    width: 100%;
  }

  .dashboard-calendar-preview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

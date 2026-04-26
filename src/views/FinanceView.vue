<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "../components/base/BaseButton.vue";
import BaseInput from "../components/base/BaseInput.vue";
import BaseModal from "../components/base/BaseModal.vue";
import FinanceChargeForm from "../components/finance/FinanceChargeForm.vue";
import InventoryMovementForm from "../components/finance/InventoryMovementForm.vue";
import FinancePaymentForm from "../components/finance/FinancePaymentForm.vue";
import InventoryItemForm from "../components/finance/InventoryItemForm.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import {
    getAppointmentById,
    getAppointments,
    getPastAppointments
} from "../services/appointmentApi.js";
import {
    confirmFinanceOperationReportPayment,
    createFinanceInventoryMovement,
    createFinanceInventoryItem,
    createFinanceOperationReport,
    getFinanceInventory,
    getFinanceInventoryMovements,
    getFinanceInventoryReports,
    getFinanceInventorySummary,
    getFinanceOperationReportPdf,
    getFinanceOperationReports,
    getFinanceSummary,
    updateFinanceInventoryItemStatus,
    updateFinanceInventoryItem,
    updateFinanceOperationReport
} from "../services/financeApi.js";
import { getBranches } from "../services/branchApi.js";
import { getInternalUsers } from "../services/internalUserApi.js";
import { getRooms } from "../services/roomApi.js";
import { getAccountSettings } from "../services/settingsApi.js";
import { buildPrivateNavLinks } from "../shared/privateNavigation.js";
import { DEFAULT_CURRENCY_CODE } from "../shared/currencies.js";
import { canAccessFinance, isAdministrativeUser } from "../shared/roles.js";
import { useAuthStore } from "../stores/authStore.js";
import { downloadOperationReportPdf } from "../utils/operationReportPdf.js";

const router = useRouter();
const authStore = useAuthStore();
const activeTab = ref("cobros");
const billingView = ref("por_facturar");
const inventoryTab = ref("catalogo");
const reports = ref([]);
const inventoryItems = ref([]);
const inventoryCatalogItems = ref([]);
const inventoryMovements = ref([]);
const inventorySummary = ref({
    totalItems: 0,
    stockControlledCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inactiveCount: 0,
    estimatedConsumedCost: 0,
    alerts: [],
    mostUsedItems: []
});
const inventoryReports = ref([]);
const summary = ref({
    ingresosCobrados: 0,
    ingresosPendientes: 0,
    ingresosSala: 0,
    ingresosInsumos: 0,
    ingresosMixtos: 0,
    procedimientosCobrados: 0,
    operacionesExoneradas: 0,
    montoExonerado: 0,
    costoInsumos: 0,
    margenBrutoAproximado: 0,
    cobrosRegistrados: 0,
    rooms: [],
    users: []
});
const loading = ref(false);
const inventoryLoading = ref(false);
const inventoryMovementsLoading = ref(false);
const inventorySummaryLoading = ref(false);
const inventoryReportsLoading = ref(false);
const reportModalOpen = ref(false);
const inventoryModalOpen = ref(false);
const movementModalOpen = ref(false);
const paymentModalOpen = ref(false);
const reportModalMode = ref("create");
const inventoryModalMode = ref("create");
const reportModalError = ref("");
const inventoryModalError = ref("");
const movementModalError = ref("");
const paymentModalError = ref("");
const savingReport = ref(false);
const savingInventory = ref(false);
const savingMovement = ref(false);
const savingPayment = ref(false);
const currentReport = ref({});
const currentInventoryItem = ref({});
const currentMovementItem = ref({});
const currentPaymentReport = ref({});
const selectedReservation = ref(null);
const reservationLoading = ref(false);
const reservationError = ref("");
const userOptions = ref([]);
const roomOptions = ref([]);
const branchOptions = ref([]);
const reservationOptions = ref([]);
const settings = ref({
    timeZone: "America/Costa_Rica",
    procedurePricingPolicy: "bloqueado",
    defaultProcedurePricingMode: "solo_sala",
    defaultCurrencyCode: DEFAULT_CURRENCY_CODE
});
const filters = ref({
    from: "",
    to: "",
    patient: "",
    userId: "",
    roomId: "",
    branchId: "",
    paymentStatus: "todos"
});
const inventoryFilters = ref({
    query: "",
    category: "",
    status: "todos",
    branchId: "",
    stockState: "todos",
    scopeType: "todos",
    stockControlled: "todos"
});
const inventoryMovementFilters = ref({
    itemId: "",
    from: "",
    to: "",
    branchId: "",
    movementType: "todos"
});
const inventoryReportFilters = ref({
    from: "",
    to: "",
    branchId: "",
    groupBy: "branch"
});
const feedback = ref("");
const error = ref("");

const navLinks = computed(() =>
    buildPrivateNavLinks({
        membershipRole: authStore.membershipRole,
        userRole: authStore.user?.rol
    })
);

const canEnterFinance = computed(() =>
    canAccessFinance({
        membershipRole: authStore.membershipRole,
        userRole: authStore.user?.rol
    })
);

const canWaive = computed(() =>
    isAdministrativeUser({
        membershipRole: authStore.membershipRole,
        userRole: authStore.user?.rol
    })
);

const heroTitle = computed(() =>
    ({
        cobros: "Facturacion de procedimientos",
        inventario: "Inventario clinico",
        reportes: "Reportes operativos"
    })[activeTab.value] ?? "Finanzas operativas"
);

const heroDescription = computed(() =>
    ({
        cobros:
            "Recepcion emite primero la factura del procedimiento, la imprime y confirma el pago despues cuando el paciente ya cancelo.",
        inventario:
            "Administra catalogo, stock por sucursal y movimientos reales de hilos, agujas, equipo y cualquier insumo propio de la clinica.",
        reportes:
            "Revisa ingresos por sala, insumos, exoneraciones, costo de materiales y rendimiento por usuario o sala."
    })[activeTab.value] ?? ""
);

const reportModalTitle = computed(() =>
    reportModalMode.value === "edit" ? "Editar Factura" : "Emitir Factura"
);

const inventoryModalTitle = computed(() =>
    inventoryModalMode.value === "edit" ? "Editar insumo" : "Agregar insumo"
);

const summaryCards = computed(() => [
    {
        label: "Ingresos cobrados",
        value: formatCurrency(summary.value.ingresosCobrados)
    },
    {
        label: "Pendiente por cobrar",
        value: formatCurrency(summary.value.ingresosPendientes)
    },
    {
        label: "Exonerado",
        value: formatCurrency(summary.value.montoExonerado)
    },
    {
        label: "Margen bruto",
        value: formatCurrency(summary.value.margenBrutoAproximado)
    },
    {
        label: "Reservas pagadas",
        value: summary.value.procedimientosCobrados ?? 0
    }
]);

const inventoryCategories = computed(() =>
    [...new Set(inventoryItems.value.map((item) => item.categoria).filter(Boolean))].sort(
        (left, right) => left.localeCompare(right)
    )
);

const inventorySummaryCards = computed(() => [
    {
        label: "Stock bajo",
        value: inventorySummary.value.lowStockCount
    },
    {
        label: "Agotados",
        value: inventorySummary.value.outOfStockCount
    },
    {
        label: "Inactivos",
        value: inventorySummary.value.inactiveCount
    },
    {
        label: "Costo consumido",
        value: formatCurrency(inventorySummary.value.estimatedConsumedCost)
    }
]);

const selectedMovementItem = computed(() =>
    inventoryItems.value.find(
        (item) => Number(item.id) === Number(inventoryMovementFilters.value.itemId)
    ) ?? null
);

const topRooms = computed(() => summary.value.rooms?.slice(0, 5) ?? []);
const topUsers = computed(() => summary.value.users?.slice(0, 5) ?? []);
const reportCurrencies = computed(() =>
    [...new Set(reports.value.map((report) => report.currencyCode).filter(Boolean))]
);
const hasMixedCurrencies = computed(() => reportCurrencies.value.length > 1);
const filteredReservationOptions = computed(() => {
    const patientQuery = String(filters.value.patient ?? "").trim().toLowerCase();
    const from = String(filters.value.from ?? "").trim();
    const to = String(filters.value.to ?? "").trim();
    const userId = Number(filters.value.userId);
    const roomId = Number(filters.value.roomId);
    const branchId = Number(filters.value.branchId);

    return reservationOptions.value.filter((reservation) => {
        if (from && String(reservation.fecha ?? "") < from) {
            return false;
        }

        if (to && String(reservation.fecha ?? "") > to) {
            return false;
        }

        if (Number.isInteger(userId) && userId > 0 && Number(reservation.usuarioId) !== userId) {
            return false;
        }

        if (Number.isInteger(roomId) && roomId > 0 && Number(reservation.salaId) !== roomId) {
            return false;
        }

        if (Number.isInteger(branchId) && branchId > 0 && Number(reservation.branchId) !== branchId) {
            return false;
        }

        if (!patientQuery) {
            return true;
        }

        return [
            reservation.pacienteNombre,
            reservation.pacienteTelefono,
            reservation.pacienteCorreo
        ]
            .join(" ")
            .toLowerCase()
            .includes(patientQuery);
    });
});
const pendingReports = computed(() =>
    reports.value.filter((report) => report.financialStatus !== "pagado")
);
const paidReports = computed(() =>
    reports.value.filter((report) => report.financialStatus === "pagado")
);
const displayedReports = computed(() =>
    billingView.value === "pagadas" ? paidReports.value : pendingReports.value
);
let reservationRequestToken = 0;

function formatCurrency(
    value,
    currencyCode = settings.value.defaultCurrencyCode || DEFAULT_CURRENCY_CODE
) {
    return new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 2
    }).format(Number(value ?? 0));
}

function formatPricingMode(mode) {
    return (
        {
            solo_sala: "Solo sala",
            solo_insumos: "Solo insumos",
            sala_mas_insumos: "Sala + insumos"
        }[mode] ?? mode
    );
}

function formatChargeDecision(decision) {
    return (
        {
            cobrable: "Cobrable",
            exonerado: "Exonerado"
        }[decision] ?? decision
    );
}

function formatFinancialStatus(status) {
    return (
        {
            sin_factura: "Sin factura",
            pendiente: "Pendiente",
            pagado: "Pagado",
            anulado: "Anulado",
            exonerado: "Exonerado"
        }[status] ?? status
    );
}

function formatInventoryStatus(status) {
    return status === "activo" ? "Activo" : "Inactivo";
}

function formatInventoryType(type) {
    return type === "reusable" ? "Reusable" : "Desechable";
}

function formatInventoryScope(item) {
    if (item.scopeType === "sucursal") {
        return `Sucursal · ${item.branchName || "Sin sucursal"}`;
    }

    return "Global para la cuenta";
}

function formatInventoryStockState(state) {
    return (
        {
            ok: "Disponible",
            bajo: "Stock bajo",
            agotado: "Agotado",
            inactivo: "Inactivo",
            referencial: "Referencial"
        }[state] ?? state
    );
}

function formatMovementType(type) {
    return (
        {
            entrada: "Entrada",
            salida: "Salida",
            ajuste: "Ajuste",
            consumo: "Consumo",
            devolucion: "Devolucion"
        }[type] ?? type
    );
}

function formatInventoryReportGroup(groupBy) {
    return (
        {
            room: "Sala",
            branch: "Sucursal",
            procedure: "Procedimiento",
            date: "Fecha",
            user: "Usuario"
        }[groupBy] ?? groupBy
    );
}

function buildReservationSummaryFromReport(report = {}) {
    if (!report?.reservationId) {
        return null;
    }

    return {
        id: Number(report.reservationId),
        fecha: report.reservationDate ?? null,
        horaInicio: report.reservationStartTime ?? null,
        horaFin: report.reservationEndTime ?? null,
        descripcion: report.notes ?? "",
        estado: report.reservationStatus ?? null,
        tipoAtencion: report.tipoAtencion ?? "procedimiento",
        tipoConsulta: report.procedureName ?? "",
        usuarioId: report.reservationUserId ?? null,
        usuarioNombre: report.reservationUserName ?? null,
        pacienteId: report.patientId ?? null,
        pacienteNombre: report.patientNameSnapshot ?? null,
        salaId: report.roomId ?? null,
        salaNombre: report.roomNameSnapshot ?? null,
        branchId: report.branchId ?? null,
        branchName: report.branchNameSnapshot ?? null
    };
}

function getCurrentFinanceDateKey() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: settings.value.timeZone ?? "America/Costa_Rica",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    })
        .format(new Date())
        .replaceAll("/", "-");
}

function addDaysToDateKey(dateKey, daysToAdd) {
    const base = new Date(`${dateKey}T00:00:00`);

    if (Number.isNaN(base.getTime())) {
        return dateKey;
    }

    base.setDate(base.getDate() + daysToAdd);
    return base.toISOString().slice(0, 10);
}

function applyDatePreset(preset) {
    const today = getCurrentFinanceDateKey();

    if (preset === "today") {
        filters.value.from = today;
        filters.value.to = today;
        return;
    }

    if (preset === "week") {
        filters.value.from = addDaysToDateKey(today, -6);
        filters.value.to = today;
        return;
    }

    filters.value.from = addDaysToDateKey(today, -29);
    filters.value.to = today;
}

async function loadSelectedReservation(reservationId, options = {}) {
    const numericReservationId = Number(reservationId);
    const requestToken = ++reservationRequestToken;
    const fallbackReservation = options.fallbackReservation ?? null;

    if (!Number.isInteger(numericReservationId) || numericReservationId <= 0) {
        selectedReservation.value = fallbackReservation;
        reservationLoading.value = false;
        reservationError.value = "";
        return;
    }

    reservationLoading.value = true;
    reservationError.value = "";
    selectedReservation.value = fallbackReservation;

    try {
        const response = await getAppointmentById(numericReservationId);

        if (requestToken !== reservationRequestToken) {
            return;
        }

        selectedReservation.value = response.data ?? null;
        reservationError.value = "";
    } catch (requestError) {
        if (requestToken !== reservationRequestToken) {
            return;
        }

        selectedReservation.value = fallbackReservation;
        reservationError.value =
            options.allowFallback && fallbackReservation
                ? "No fue posible refrescar la reserva. Se muestran los datos guardados en la factura."
                : requestError.response?.msg ||
                  requestError.message ||
                  "No fue posible cargar la reserva seleccionada.";
    } finally {
        if (requestToken === reservationRequestToken) {
            reservationLoading.value = false;
        }
    }
}

async function fetchReservationOptions() {
    try {
        const [activeResponse, pastResponse, reportsResponse] = await Promise.all([
            getAppointments(),
            getPastAppointments(),
            getFinanceOperationReports()
        ]);
        const existingReports = reportsResponse.data ?? [];
        const usedReservationIds = new Set(
            existingReports
                .filter((report) =>
                    reportModalMode.value === "edit" && currentReport.value.id
                        ? report.id !== currentReport.value.id
                        : true
                )
                .map((report) => Number(report.reservationId))
        );

        const todayKey = new Intl.DateTimeFormat("en-CA", {
            timeZone: settings.value.timeZone ?? "America/Costa_Rica",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        })
            .format(new Date())
            .replaceAll("/", "-");

        reservationOptions.value = [
            ...(activeResponse.data ?? []),
            ...(pastResponse.data ?? [])
        ].filter((reservation) => {
            if (reservation.tipoAtencion !== "procedimiento") {
                return false;
            }

            if (
                reportModalMode.value === "edit" &&
                Number(currentReport.value.reservationId) === Number(reservation.id)
            ) {
                return true;
            }

            return !usedReservationIds.has(Number(reservation.id));
        })
            .sort((left, right) => {
                const leftDate = String(left.fecha ?? "");
                const rightDate = String(right.fecha ?? "");
                const leftGroup = leftDate === todayKey ? 0 : leftDate < todayKey ? 1 : 2;
                const rightGroup = rightDate === todayKey ? 0 : rightDate < todayKey ? 1 : 2;

                if (leftGroup !== rightGroup) {
                    return leftGroup - rightGroup;
                }

                const leftKey = `${leftDate}T${String(left.horaFin ?? left.horaInicio ?? "00:00").slice(0, 5)}`;
                const rightKey = `${rightDate}T${String(right.horaFin ?? right.horaInicio ?? "00:00").slice(0, 5)}`;

                if (leftGroup === 2) {
                    return leftKey.localeCompare(rightKey);
                }

                return rightKey.localeCompare(leftKey);
            });
    } catch {
        reservationOptions.value = [];
    }
}

async function fetchFiltersSupport() {
    try {
        const [userResponse, roomResponse, branchResponse] = await Promise.all([
            getInternalUsers(),
            getRooms(),
            getBranches()
        ]);

        userOptions.value = userResponse.data ?? [];
        roomOptions.value = roomResponse.data ?? [];
        branchOptions.value = branchResponse.data ?? [];
    } catch {
        userOptions.value = [];
        roomOptions.value = [];
        branchOptions.value = [];
    }
}

async function fetchSettings() {
    try {
        const response = await getAccountSettings();
        settings.value = {
            timeZone: response.data?.timeZone ?? "America/Costa_Rica",
            procedurePricingPolicy: response.data?.procedurePricingPolicy ?? "bloqueado",
            defaultProcedurePricingMode:
                response.data?.defaultProcedurePricingMode ?? "solo_sala",
            defaultCurrencyCode:
                response.data?.defaultCurrencyCode ?? DEFAULT_CURRENCY_CODE
        };
    } catch {
        settings.value = {
            timeZone: "America/Costa_Rica",
            procedurePricingPolicy: "bloqueado",
            defaultProcedurePricingMode: "solo_sala",
            defaultCurrencyCode: DEFAULT_CURRENCY_CODE
        };
    }
}

async function fetchFinanceData() {
    loading.value = true;
    error.value = "";

    try {
        const [reportsResponse, summaryResponse] = await Promise.all([
            getFinanceOperationReports(filters.value),
            getFinanceSummary(filters.value)
        ]);

        reports.value = reportsResponse.data ?? [];
        summary.value = summaryResponse.data ?? {
            ingresosCobrados: 0,
            ingresosPendientes: 0,
            ingresosSala: 0,
            ingresosInsumos: 0,
            ingresosMixtos: 0,
            procedimientosCobrados: 0,
            operacionesExoneradas: 0,
            montoExonerado: 0,
            costoInsumos: 0,
            margenBrutoAproximado: 0,
            cobrosRegistrados: 0,
            rooms: [],
            users: []
        };
        await fetchReservationOptions();
    } catch (requestError) {
        reports.value = [];
        error.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible cargar el modulo financiero.";
    } finally {
        loading.value = false;
    }
}

async function fetchInventory() {
    inventoryLoading.value = true;

    try {
        const response = await getFinanceInventory(inventoryFilters.value);
        inventoryCatalogItems.value = response.data ?? [];
    } catch {
        inventoryCatalogItems.value = [];
    } finally {
        inventoryLoading.value = false;
    }
}

async function fetchInventoryOptions() {
    try {
        const response = await getFinanceInventory();
        inventoryItems.value = response.data ?? [];
    } catch {
        inventoryItems.value = [];
    }
}

async function fetchInventorySummary() {
    inventorySummaryLoading.value = true;

    try {
        const response = await getFinanceInventorySummary({
            from: inventoryReportFilters.value.from,
            to: inventoryReportFilters.value.to,
            branchId: inventoryReportFilters.value.branchId || inventoryFilters.value.branchId
        });
        inventorySummary.value = response.data ?? inventorySummary.value;
    } catch {
        inventorySummary.value = {
            totalItems: 0,
            stockControlledCount: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
            inactiveCount: 0,
            estimatedConsumedCost: 0,
            alerts: [],
            mostUsedItems: []
        };
    } finally {
        inventorySummaryLoading.value = false;
    }
}

async function fetchInventoryMovements() {
    const itemId = Number(inventoryMovementFilters.value.itemId);

    if (!Number.isInteger(itemId) || itemId <= 0) {
        inventoryMovements.value = [];
        return;
    }

    inventoryMovementsLoading.value = true;

    try {
        const response = await getFinanceInventoryMovements(itemId, inventoryMovementFilters.value);
        inventoryMovements.value = response.data ?? [];
    } catch {
        inventoryMovements.value = [];
    } finally {
        inventoryMovementsLoading.value = false;
    }
}

async function fetchInventoryReports() {
    inventoryReportsLoading.value = true;

    try {
        const response = await getFinanceInventoryReports(inventoryReportFilters.value);
        inventoryReports.value = response.data ?? [];
    } catch {
        inventoryReports.value = [];
    } finally {
        inventoryReportsLoading.value = false;
    }
}

function refreshInventoryInsights() {
    return Promise.all([fetchInventorySummary(), fetchInventoryReports()]);
}

function clearFilters() {
    filters.value = {
        from: "",
        to: "",
        patient: "",
        userId: "",
        roomId: "",
        branchId: "",
        paymentStatus: "todos"
    };
    fetchFinanceData();
}

function clearInventoryFilters() {
    inventoryFilters.value = {
        query: "",
        category: "",
        status: "todos",
        branchId: "",
        stockState: "todos",
        scopeType: "todos",
        stockControlled: "todos"
    };
    fetchInventory();
}

function clearInventoryMovementFilters() {
    inventoryMovementFilters.value = {
        itemId: "",
        from: "",
        to: "",
        branchId: "",
        movementType: "todos"
    };
    inventoryMovements.value = [];
}

function clearInventoryReportFilters() {
    inventoryReportFilters.value = {
        from: "",
        to: "",
        branchId: "",
        groupBy: "branch"
    };
    fetchInventorySummary();
    fetchInventoryReports();
}

function openCreateReportModal(reservation = null) {
    reportModalMode.value = "create";
    currentReport.value = reservation
        ? {
              reservationId: reservation.id,
              procedureName: reservation.tipoConsulta ?? reservation.descripcion ?? ""
          }
        : {};
    selectedReservation.value = reservation ? { ...reservation } : null;
    reservationLoading.value = false;
    reservationError.value = "";
    reportModalError.value = "";
    reportModalOpen.value = true;
    fetchReservationOptions();

    if (reservation?.id) {
        loadSelectedReservation(reservation.id, {
            allowFallback: true,
            fallbackReservation: { ...reservation }
        });
    }
}

function openEditReportModal(report) {
    reportModalMode.value = "edit";
    currentReport.value = {
        ...report,
        supplies: report.supplies ?? []
    };
    selectedReservation.value = buildReservationSummaryFromReport(report);
    reservationLoading.value = false;
    reservationError.value = "";
    reportModalError.value = "";
    reportModalOpen.value = true;
    fetchReservationOptions();
    loadSelectedReservation(report.reservationId, {
        allowFallback: true,
        fallbackReservation: buildReservationSummaryFromReport(report)
    });
}

function canEditReport(report) {
    return canWaive.value || report.chargeDecision !== "exonerado";
}

function closeReportModal() {
    reportModalOpen.value = false;
    reportModalError.value = "";
    currentReport.value = {};
    selectedReservation.value = null;
    reservationLoading.value = false;
    reservationError.value = "";
}

function openCreateInventoryModal() {
    inventoryModalMode.value = "create";
    currentInventoryItem.value = {};
    inventoryModalError.value = "";
    inventoryModalOpen.value = true;
}

function openEditInventoryModal(item) {
    inventoryModalMode.value = "edit";
    currentInventoryItem.value = { ...item };
    inventoryModalError.value = "";
    inventoryModalOpen.value = true;
}

function openInventoryMovementsForItem(item) {
    inventoryTab.value = "movimientos";
    inventoryMovementFilters.value = {
        ...inventoryMovementFilters.value,
        itemId: item.id
    };
    fetchInventoryMovements();
}

function closeInventoryModal() {
    inventoryModalOpen.value = false;
    inventoryModalError.value = "";
    currentInventoryItem.value = {};
}

function openMovementModal(item) {
    currentMovementItem.value = { ...item };
    movementModalError.value = "";
    movementModalOpen.value = true;
}

function closeMovementModal() {
    movementModalOpen.value = false;
    movementModalError.value = "";
    currentMovementItem.value = {};
}

function openPaymentModal(report) {
    currentPaymentReport.value = { ...report };
    paymentModalError.value = "";
    paymentModalOpen.value = true;
}

function closePaymentModal() {
    paymentModalOpen.value = false;
    paymentModalError.value = "";
    currentPaymentReport.value = {};
}

function handleReportReservationChange(reservationId) {
    reportModalError.value = "";
    loadSelectedReservation(reservationId);
}

function reportPrimaryActionLabel(report) {
    return report.financialStatus === "pagado" ? "Ver detalle" : "Editar factura";
}

async function handleSaveReport(payload) {
    savingReport.value = true;
    reportModalError.value = "";

    try {
        const response =
            reportModalMode.value === "edit" && currentReport.value.id
                ? await updateFinanceOperationReport(currentReport.value.id, payload)
                : await createFinanceOperationReport(payload);

        feedback.value = response.msg;
        closeReportModal();
        await fetchFinanceData();
    } catch (requestError) {
        reportModalError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible guardar el reporte operativo.";
    } finally {
        savingReport.value = false;
    }
}

async function handleSaveInventoryItem(payload) {
    savingInventory.value = true;
    inventoryModalError.value = "";

    try {
        const response =
            inventoryModalMode.value === "edit" && currentInventoryItem.value.id
                ? await updateFinanceInventoryItem(currentInventoryItem.value.id, payload)
                : await createFinanceInventoryItem(payload);

        feedback.value = response.msg;
        closeInventoryModal();
        await Promise.all([
            fetchInventory(),
            fetchInventoryOptions(),
            fetchInventorySummary(),
            fetchInventoryReports()
        ]);
    } catch (requestError) {
        inventoryModalError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible guardar el insumo.";
    } finally {
        savingInventory.value = false;
    }
}

async function handleSaveInventoryMovement(payload) {
    savingMovement.value = true;
    movementModalError.value = "";

    try {
        const response = await createFinanceInventoryMovement(
            currentMovementItem.value.id,
            payload
        );

        feedback.value = response.msg;
        closeMovementModal();
        await Promise.all([
            fetchInventory(),
            fetchInventoryOptions(),
            fetchInventorySummary(),
            fetchInventoryReports(),
            fetchInventoryMovements()
        ]);
    } catch (requestError) {
        movementModalError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible registrar el movimiento.";
    } finally {
        savingMovement.value = false;
    }
}

async function handleToggleInventoryStatus(item) {
    try {
        const nextStatus = item.estado === "activo" ? "inactivo" : "activo";
        const response = await updateFinanceInventoryItemStatus(item.id, nextStatus);

        feedback.value = response.msg;
        await Promise.all([fetchInventory(), fetchInventoryOptions(), fetchInventorySummary()]);
    } catch (requestError) {
        error.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible cambiar el estado del inventario.";
    }
}

async function handleConfirmPayment(payload) {
    savingPayment.value = true;
    paymentModalError.value = "";

    try {
        const response = await confirmFinanceOperationReportPayment(
            currentPaymentReport.value.id,
            payload
        );

        feedback.value = response.msg;
        closePaymentModal();
        await fetchFinanceData();
    } catch (requestError) {
        paymentModalError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible confirmar el pago.";
    } finally {
        savingPayment.value = false;
    }
}

async function handleDownloadPdf(report) {
    try {
        const response = await getFinanceOperationReportPdf(report.id);
        downloadOperationReportPdf(response.data);
    } catch (requestError) {
        error.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible preparar el PDF del reporte.";
    }
}

function logout() {
    authStore.logout();
    router.push("/login");
}

async function bootstrapFinance() {
    if (!authStore.isHydrated) {
        await authStore.hydrate();
    }

    if (!authStore.isAuthenticated) {
        router.replace("/login");
        return;
    }

    if (!canEnterFinance.value) {
        router.replace("/dashboard");
        return;
    }

    await Promise.all([
        fetchSettings(),
        fetchFiltersSupport(),
        fetchFinanceData(),
        fetchInventory(),
        fetchInventoryOptions(),
        fetchInventorySummary(),
        fetchInventoryReports()
    ]);
}

onMounted(() => {
    bootstrapFinance();
});
</script>

<template>
  <div class="finance-page page-view">
    <div class="finance-shell page-shell">
      <AppNavbar
        :links="navLinks"
        brand-href="/dashboard"
        action-label="Cerrar Sesion"
        :show-profile-icon="true"
        @action="logout"
      />

      <main class="finance-main section-shell">
        <section v-reveal class="finance-hero">
          <div>
            <span class="finance-eyebrow">Finanzas operativas</span>
            <h1>{{ heroTitle }}</h1>
            <p>{{ heroDescription }}</p>
          </div>

          <div class="finance-hero__actions">
            <BaseButton
              v-if="activeTab === 'cobros'"
              @click="openCreateReportModal"
            >
              Emitir Factura
            </BaseButton>
            <BaseButton
              v-else-if="activeTab === 'inventario'"
              @click="openCreateInventoryModal"
            >
              Agregar insumo
            </BaseButton>
            <BaseButton
              v-else
              @click="fetchFinanceData"
            >
              Actualizar resumen
            </BaseButton>
          </div>
        </section>

        <section class="finance-tabs">
          <button
            type="button"
            class="finance-tabs__button"
            :class="{ 'finance-tabs__button--active': activeTab === 'cobros' }"
            @click="activeTab = 'cobros'"
          >
            Facturacion
          </button>
          <button
            type="button"
            class="finance-tabs__button"
            :class="{ 'finance-tabs__button--active': activeTab === 'inventario' }"
            @click="activeTab = 'inventario'"
          >
            Inventario
          </button>
          <button
            type="button"
            class="finance-tabs__button"
            :class="{ 'finance-tabs__button--active': activeTab === 'reportes' }"
            @click="activeTab = 'reportes'"
          >
            Reportes operativos
          </button>
        </section>

        <p v-if="feedback" class="finance-feedback">{{ feedback }}</p>
        <p v-if="error" class="finance-error">{{ error }}</p>

        <template v-if="activeTab === 'cobros'">
          <section class="finance-stats stats-strip">
            <article
              v-for="card in summaryCards"
              :key="card.label"
              v-reveal="{ delay: 50 }"
              class="finance-stat-card"
            >
              <span>{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
            </article>
          </section>

          <section class="finance-tabs finance-tabs--sub">
            <button
              type="button"
              class="finance-tabs__button"
              :class="{ 'finance-tabs__button--active': billingView === 'por_facturar' }"
              @click="billingView = 'por_facturar'"
            >
              Por facturar
            </button>
            <button
              type="button"
              class="finance-tabs__button"
              :class="{ 'finance-tabs__button--active': billingView === 'pendientes' }"
              @click="billingView = 'pendientes'"
            >
              Pendientes de pago
            </button>
            <button
              type="button"
              class="finance-tabs__button"
              :class="{ 'finance-tabs__button--active': billingView === 'pagadas' }"
              @click="billingView = 'pagadas'"
            >
              Pagadas
            </button>
          </section>

          <section class="finance-layout">
            <article v-reveal class="finance-panel">
              <div class="finance-panel__header">
                <div>
                  <span class="finance-panel__eyebrow">Filtros</span>
                  <h2>
                    {{
                      billingView === "por_facturar"
                        ? "Procedimientos listos para facturar"
                        : billingView === "pagadas"
                          ? "Historico de reservas pagadas"
                          : "Cola de cobro pendiente"
                    }}
                  </h2>
                  <p class="finance-panel__copy">
                    Modalidad actual de la cuenta: {{ formatPricingMode(settings.defaultProcedurePricingMode) }}.
                    {{
                      billingView === "por_facturar"
                        ? "Recepcion emite la factura solo una vez por procedimiento y luego el caso cambia de bandeja."
                        : billingView === "pagadas"
                          ? "Aqui vive la lectura que el dueno necesita al cierre del dia o del mes: reservas cobradas, paciente, sala, fecha y monto."
                          : "Estas reservas ya tienen factura emitida, pero todavia no cuentan como cobro realizado."
                    }}
                  </p>
                </div>
              </div>

              <p v-if="hasMixedCurrencies" class="finance-warning">
                Hay facturas en varias monedas dentro de este filtro. Los totales agregados no convierten divisas automaticamente.
              </p>

              <form class="finance-filters" @submit.prevent="fetchFinanceData">
                <BaseInput
                  :model-value="filters.patient"
                  label="Paciente"
                  placeholder="Nombre o telefono"
                  @update:model-value="filters.patient = $event"
                />
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
                <label class="finance-filters__field">
                  <span class="finance-filters__label">Sucursal</span>
                  <select v-model="filters.branchId" class="finance-filters__select">
                    <option value="">Todas</option>
                    <option
                      v-for="branch in branchOptions"
                      :key="branch.id"
                      :value="branch.id"
                    >
                      {{ branch.nombre }}
                    </option>
                  </select>
                </label>
                <label class="finance-filters__field">
                  <span class="finance-filters__label">Usuario</span>
                  <select v-model="filters.userId" class="finance-filters__select">
                    <option value="">Todos</option>
                    <option
                      v-for="user in userOptions"
                      :key="user.id"
                      :value="user.id"
                    >
                      {{ user.nombre }}
                    </option>
                  </select>
                </label>
                <label class="finance-filters__field">
                  <span class="finance-filters__label">Sala</span>
                  <select v-model="filters.roomId" class="finance-filters__select">
                    <option value="">Todas</option>
                    <option
                      v-for="room in roomOptions"
                      :key="room.id"
                      :value="room.id"
                    >
                      {{ room.nombre }}
                    </option>
                  </select>
                </label>
                <label
                  v-if="billingView !== 'por_facturar'"
                  class="finance-filters__field"
                >
                  <span class="finance-filters__label">Estado</span>
                  <select v-model="filters.paymentStatus" class="finance-filters__select">
                    <option value="todos">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                    <option value="anulado">Anulado</option>
                  </select>
                </label>
                <div class="finance-filters__presets">
                  <span class="finance-filters__label">Atajos</span>
                  <div class="finance-filters__preset-actions">
                    <BaseButton size="sm" variant="ghost" @click.prevent="applyDatePreset('today')">
                      Hoy
                    </BaseButton>
                    <BaseButton size="sm" variant="ghost" @click.prevent="applyDatePreset('week')">
                      Semana
                    </BaseButton>
                    <BaseButton size="sm" variant="ghost" @click.prevent="applyDatePreset('month')">
                      Mes
                    </BaseButton>
                  </div>
                </div>
                <div class="finance-filters__actions">
                  <BaseButton variant="ghost" @click.prevent="clearFilters">
                    Limpiar
                  </BaseButton>
                  <BaseButton type="submit">
                    Aplicar filtros
                  </BaseButton>
                </div>
              </form>

              <div class="finance-table">
                <div v-if="loading" class="finance-state">
                  Cargando reportes...
                </div>
                <div
                  v-else-if="billingView === 'por_facturar' && !filteredReservationOptions.length"
                  class="finance-state"
                >
                  No hay procedimientos listos para facturar con esos filtros.
                </div>
                <div
                  v-else-if="billingView !== 'por_facturar' && !displayedReports.length"
                  class="finance-state"
                >
                  No hay reservas en esta bandeja con los filtros actuales.
                </div>
                <table v-else-if="billingView === 'por_facturar'" class="finance-table__table">
                  <thead>
                    <tr>
                      <th>Reserva</th>
                      <th>Paciente</th>
                      <th>Sala</th>
                      <th>Responsable</th>
                      <th>Sucursal</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="reservation in filteredReservationOptions" :key="reservation.id">
                      <td>
                        <strong>{{ reservation.fecha }}</strong>
                        <span class="finance-table__subtext">
                          {{ reservation.horaInicio }} - {{ reservation.horaFin }}
                        </span>
                      </td>
                      <td>
                        <strong>{{ reservation.pacienteNombre }}</strong>
                        <span class="finance-table__subtext">
                          {{ reservation.pacienteTelefono || "Sin telefono" }}
                        </span>
                      </td>
                      <td>{{ reservation.salaNombre }}</td>
                      <td>{{ reservation.usuarioNombre || "Sin responsable" }}</td>
                      <td>{{ reservation.branchName || "Sin sucursal" }}</td>
                      <td class="finance-table__actions-cell">
                        <BaseButton
                          size="sm"
                          @click="openCreateReportModal(reservation)"
                        >
                          Emitir factura
                        </BaseButton>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table v-else class="finance-table__table">
                  <thead>
                    <tr>
                      <th>Reserva</th>
                      <th>Paciente</th>
                      <th>Sala</th>
                      <th>Responsable</th>
                      <th>Modalidad</th>
                      <th>Total</th>
                      <th>Pago</th>
                      <th>{{ billingView === "pagadas" ? "Pagado el" : "Detalle" }}</th>
                      <th>Decision</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="report in displayedReports" :key="report.id">
                      <td>
                        <strong>{{ report.reservationDate }}</strong>
                        <span class="finance-table__subtext">
                          {{ report.reservationStartTime }} - {{ report.reservationEndTime }}
                        </span>
                      </td>
                      <td>
                        <strong>{{ report.patientNameSnapshot }}</strong>
                        <span class="finance-table__subtext">
                          {{ report.patientPhoneSnapshot || "Sin telefono" }}
                        </span>
                      </td>
                      <td>{{ report.roomNameSnapshot }}</td>
                      <td>{{ report.reservationUserName || "Sin responsable" }}</td>
                      <td>
                        <strong>{{ formatPricingMode(report.pricingMode) }}</strong>
                        <span class="finance-table__subtext">
                          {{ report.supplies?.length || 0 }} insumos
                        </span>
                      </td>
                      <td>{{ formatCurrency(report.totalBilledAmount, report.currencyCode) }}</td>
                      <td>
                        <span
                          class="finance-table__badge"
                          :class="`finance-table__badge--${report.financialStatus || report.paymentStatus}`"
                        >
                          {{ report.paymentLabel || formatFinancialStatus(report.financialStatus) }}
                        </span>
                      </td>
                      <td>
                        <span class="finance-table__subtext finance-table__subtext--strong">
                          {{
                            billingView === "pagadas"
                              ? (report.paidAt ? report.paidAt.slice(0, 10) : "Sin fecha")
                              : formatFinancialStatus(report.financialStatus)
                          }}
                        </span>
                      </td>
                      <td>
                        <span
                          class="finance-table__badge"
                          :class="`finance-table__badge--${report.chargeDecision}`"
                        >
                          {{ formatChargeDecision(report.chargeDecision) }}
                        </span>
                      </td>
                      <td class="finance-table__actions-cell">
                        <BaseButton
                          v-if="canEditReport(report)"
                          size="sm"
                          variant="warning"
                          @click="openEditReportModal(report)"
                        >
                          {{ reportPrimaryActionLabel(report) }}
                        </BaseButton>
                        <BaseButton
                          size="sm"
                          variant="ghost"
                          @click="handleDownloadPdf(report)"
                        >
                          Imprimir factura
                        </BaseButton>
                        <BaseButton
                          v-if="report.paymentStatus === 'pendiente' && report.chargeDecision === 'cobrable'"
                          size="sm"
                          @click="openPaymentModal(report)"
                        >
                          Confirmar pago
                        </BaseButton>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        </template>

        <template v-else-if="activeTab === 'inventario'">
          <section class="finance-stats stats-strip">
            <article
              v-for="card in inventorySummaryCards"
              :key="card.label"
              v-reveal="{ delay: 50 }"
              class="finance-stat-card"
            >
              <span>{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
            </article>
          </section>

          <section class="finance-tabs finance-tabs--sub">
            <button
              type="button"
              class="finance-tabs__button"
              :class="{ 'finance-tabs__button--active': inventoryTab === 'catalogo' }"
              @click="inventoryTab = 'catalogo'"
            >
              Catalogo
            </button>
            <button
              type="button"
              class="finance-tabs__button"
              :class="{ 'finance-tabs__button--active': inventoryTab === 'movimientos' }"
              @click="inventoryTab = 'movimientos'"
            >
              Movimientos
            </button>
            <button
              type="button"
              class="finance-tabs__button"
              :class="{ 'finance-tabs__button--active': inventoryTab === 'reportes' }"
              @click="inventoryTab = 'reportes'"
            >
              Reportes
            </button>
          </section>

          <section class="finance-layout">
            <article v-reveal class="finance-panel">
              <template v-if="inventoryTab === 'catalogo'">
                <div class="finance-panel__header">
                  <div>
                    <span class="finance-panel__eyebrow">Catalogo + stock</span>
                    <h2>Inventario clinico por sucursal</h2>
                    <p class="finance-panel__copy">
                      Cada clinica mantiene sus propios insumos y define si solo son referenciales o si manejan existencias reales por sede.
                    </p>
                  </div>
                </div>

                <form class="finance-filters" @submit.prevent="fetchInventory">
                  <BaseInput
                    :model-value="inventoryFilters.query"
                    label="Buscar"
                    placeholder="Nombre, descripcion o categoria"
                    @update:model-value="inventoryFilters.query = $event"
                  />
                  <label class="finance-filters__field">
                    <span class="finance-filters__label">Categoria</span>
                    <select v-model="inventoryFilters.category" class="finance-filters__select">
                      <option value="">Todas</option>
                      <option
                        v-for="category in inventoryCategories"
                        :key="category"
                        :value="category"
                      >
                        {{ category }}
                      </option>
                    </select>
                  </label>
                  <label class="finance-filters__field">
                    <span class="finance-filters__label">Sucursal</span>
                    <select v-model="inventoryFilters.branchId" class="finance-filters__select">
                      <option value="">Todas</option>
                      <option
                        v-for="branch in branchOptions"
                        :key="branch.id"
                        :value="branch.id"
                      >
                        {{ branch.nombre }}
                      </option>
                    </select>
                  </label>
                  <label class="finance-filters__field">
                    <span class="finance-filters__label">Estado</span>
                    <select v-model="inventoryFilters.status" class="finance-filters__select">
                      <option value="todos">Todos</option>
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </label>
                  <label class="finance-filters__field">
                    <span class="finance-filters__label">Stock</span>
                    <select v-model="inventoryFilters.stockState" class="finance-filters__select">
                      <option value="todos">Todos</option>
                      <option value="ok">Disponible</option>
                      <option value="bajo">Stock bajo</option>
                      <option value="agotado">Agotado</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </label>
                  <label class="finance-filters__field">
                    <span class="finance-filters__label">Control real</span>
                    <select v-model="inventoryFilters.stockControlled" class="finance-filters__select">
                      <option value="todos">Todos</option>
                      <option value="si">Con stock</option>
                      <option value="no">Solo referencial</option>
                    </select>
                  </label>
                  <label class="finance-filters__field">
                    <span class="finance-filters__label">Alcance</span>
                    <select v-model="inventoryFilters.scopeType" class="finance-filters__select">
                      <option value="todos">Todos</option>
                      <option value="global">Global</option>
                      <option value="sucursal">Sucursal</option>
                    </select>
                  </label>
                  <div class="finance-filters__actions">
                    <BaseButton variant="ghost" @click.prevent="clearInventoryFilters">
                      Limpiar
                    </BaseButton>
                    <BaseButton type="submit">
                      Aplicar filtros
                    </BaseButton>
                  </div>
                </form>

                <div class="finance-table">
                  <div v-if="inventoryLoading" class="finance-state">
                    Cargando inventario...
                  </div>
                  <div v-else-if="!inventoryCatalogItems.length" class="finance-state">
                    Todavia no hay insumos registrados para los filtros actuales.
                  </div>
                  <table v-else class="finance-table__table finance-table__table--inventory">
                    <thead>
                      <tr>
                        <th>Insumo</th>
                        <th>Alcance</th>
                        <th>Tipo</th>
                        <th>Stock</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in inventoryCatalogItems" :key="item.id">
                        <td>
                          <strong>{{ item.nombre }}</strong>
                          <span class="finance-table__subtext">
                            {{ item.categoria || "General" }} · {{ item.unidad }}
                          </span>
                        </td>
                        <td>
                          <strong>{{ formatInventoryScope(item) }}</strong>
                          <span class="finance-table__subtext">
                            {{ item.controlaStock ? "Con stock real" : "Solo referencial" }}
                          </span>
                        </td>
                        <td>
                          <strong>{{ formatInventoryType(item.tipo) }}</strong>
                          <span class="finance-table__subtext">
                            Costo {{ formatCurrency(item.costoBase) }}
                          </span>
                        </td>
                        <td>
                          <template v-if="item.controlaStock && item.stockByBranch.length">
                            <ul class="finance-stock-list">
                              <li v-for="stockRow in item.stockByBranch" :key="stockRow.id">
                                <strong>{{ stockRow.branchName }}</strong>
                                <span>
                                  {{ stockRow.currentStock }} / minimo {{ stockRow.minimumStock }}
                                </span>
                              </li>
                            </ul>
                          </template>
                          <span v-else-if="item.controlaStock" class="finance-table__subtext">
                            Sin stock configurado
                          </span>
                          <span v-else class="finance-table__subtext">
                            Referencial
                          </span>
                        </td>
                        <td>
                          <span
                            class="finance-table__badge"
                            :class="`finance-table__badge--${item.stockState}`"
                          >
                            {{ formatInventoryStockState(item.stockState) }}
                          </span>
                        </td>
                        <td class="finance-table__actions-cell">
                          <BaseButton size="sm" variant="warning" @click="openEditInventoryModal(item)">
                            Editar
                          </BaseButton>
                          <BaseButton size="sm" variant="ghost" @click="openInventoryMovementsForItem(item)">
                            Movimientos
                          </BaseButton>
                          <BaseButton
                            size="sm"
                            :disabled="!item.controlaStock || item.estado !== 'activo'"
                            @click="openMovementModal(item)"
                          >
                            Registrar mov.
                          </BaseButton>
                          <BaseButton
                            v-if="canWaive"
                            size="sm"
                            variant="ghost"
                            @click="handleToggleInventoryStatus(item)"
                          >
                            {{ item.estado === "activo" ? "Inactivar" : "Activar" }}
                          </BaseButton>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>

              <template v-else-if="inventoryTab === 'movimientos'">
                <div class="finance-panel__header">
                  <div>
                    <span class="finance-panel__eyebrow">Trazabilidad</span>
                    <h2>Movimientos por insumo</h2>
                    <p class="finance-panel__copy">
                      Revisa entradas, salidas, ajustes, devoluciones y consumos automaticos ligados a procedimientos.
                    </p>
                  </div>

                  <BaseButton
                    v-if="selectedMovementItem"
                    :disabled="!selectedMovementItem.controlaStock || selectedMovementItem.estado !== 'activo'"
                    @click="openMovementModal(selectedMovementItem)"
                  >
                    Registrar movimiento
                  </BaseButton>
                </div>

                <form class="finance-filters" @submit.prevent="fetchInventoryMovements">
                  <label class="finance-filters__field">
                    <span class="finance-filters__label">Insumo</span>
                    <select
                      v-model="inventoryMovementFilters.itemId"
                      class="finance-filters__select"
                    >
                      <option value="">Selecciona un insumo</option>
                      <option
                        v-for="item in inventoryItems"
                        :key="item.id"
                        :value="item.id"
                      >
                        {{ item.nombre }}
                      </option>
                    </select>
                  </label>
                  <BaseInput
                    :model-value="inventoryMovementFilters.from"
                    label="Desde"
                    type="date"
                    @update:model-value="inventoryMovementFilters.from = $event"
                  />
                  <BaseInput
                    :model-value="inventoryMovementFilters.to"
                    label="Hasta"
                    type="date"
                    @update:model-value="inventoryMovementFilters.to = $event"
                  />
                  <label class="finance-filters__field">
                    <span class="finance-filters__label">Sucursal</span>
                    <select
                      v-model="inventoryMovementFilters.branchId"
                      class="finance-filters__select"
                    >
                      <option value="">Todas</option>
                      <option
                        v-for="branch in branchOptions"
                        :key="branch.id"
                        :value="branch.id"
                      >
                        {{ branch.nombre }}
                      </option>
                    </select>
                  </label>
                  <label class="finance-filters__field">
                    <span class="finance-filters__label">Tipo</span>
                    <select
                      v-model="inventoryMovementFilters.movementType"
                      class="finance-filters__select"
                    >
                      <option value="todos">Todos</option>
                      <option value="entrada">Entrada</option>
                      <option value="salida">Salida</option>
                      <option value="ajuste">Ajuste</option>
                      <option value="consumo">Consumo</option>
                      <option value="devolucion">Devolucion</option>
                    </select>
                  </label>
                  <div class="finance-filters__actions">
                    <BaseButton variant="ghost" @click.prevent="clearInventoryMovementFilters">
                      Limpiar
                    </BaseButton>
                    <BaseButton type="submit">
                      Ver movimientos
                    </BaseButton>
                  </div>
                </form>

                <div class="finance-table">
                  <div
                    v-if="!inventoryMovementFilters.itemId"
                    class="finance-state"
                  >
                    Selecciona un insumo para revisar sus movimientos.
                  </div>
                  <div v-else-if="inventoryMovementsLoading" class="finance-state">
                    Cargando movimientos...
                  </div>
                  <div v-else-if="!inventoryMovements.length" class="finance-state">
                    No hay movimientos para ese insumo y rango.
                  </div>
                  <table v-else class="finance-table__table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Sucursal</th>
                        <th>Cantidad</th>
                        <th>Antes / despues</th>
                        <th>Usuario</th>
                        <th>Observacion</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="movement in inventoryMovements" :key="movement.id">
                        <td>
                          <strong>{{ movement.createdAt?.slice(0, 10) }}</strong>
                          <span class="finance-table__subtext">
                            {{ movement.createdAt?.slice(11, 16) }}
                          </span>
                        </td>
                        <td>{{ formatMovementType(movement.movementType) }}</td>
                        <td>{{ movement.branchName || "Sin sucursal" }}</td>
                        <td>{{ movement.quantity }}</td>
                        <td>
                          <strong>{{ movement.stockBefore }}</strong>
                          <span class="finance-table__subtext">a {{ movement.stockAfter }}</span>
                        </td>
                        <td>{{ movement.createdByUserName || "Usuario" }}</td>
                        <td>{{ movement.observation || "Sin observacion" }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>

              <template v-else>
                <div class="finance-panel__header">
                  <div>
                    <span class="finance-panel__eyebrow">Lectura operativa</span>
                    <h2>Reportes de consumo</h2>
                    <p class="finance-panel__copy">
                      Mide consumo por sala, sucursal, procedimiento, fecha o usuario a partir de los movimientos reales del inventario.
                    </p>
                  </div>
                </div>

                <form class="finance-filters" @submit.prevent="refreshInventoryInsights">
                  <label class="finance-filters__field">
                    <span class="finance-filters__label">Agrupar por</span>
                    <select
                      v-model="inventoryReportFilters.groupBy"
                      class="finance-filters__select"
                    >
                      <option value="branch">Sucursal</option>
                      <option value="room">Sala</option>
                      <option value="procedure">Procedimiento</option>
                      <option value="date">Fecha</option>
                      <option value="user">Usuario</option>
                    </select>
                  </label>
                  <BaseInput
                    :model-value="inventoryReportFilters.from"
                    label="Desde"
                    type="date"
                    @update:model-value="inventoryReportFilters.from = $event"
                  />
                  <BaseInput
                    :model-value="inventoryReportFilters.to"
                    label="Hasta"
                    type="date"
                    @update:model-value="inventoryReportFilters.to = $event"
                  />
                  <label class="finance-filters__field">
                    <span class="finance-filters__label">Sucursal</span>
                    <select
                      v-model="inventoryReportFilters.branchId"
                      class="finance-filters__select"
                    >
                      <option value="">Todas</option>
                      <option
                        v-for="branch in branchOptions"
                        :key="branch.id"
                        :value="branch.id"
                      >
                        {{ branch.nombre }}
                      </option>
                    </select>
                  </label>
                  <div class="finance-filters__actions">
                    <BaseButton variant="ghost" @click.prevent="clearInventoryReportFilters">
                      Limpiar
                    </BaseButton>
                    <BaseButton type="submit">
                      Actualizar
                    </BaseButton>
                  </div>
                </form>

                <div class="finance-table">
                  <div v-if="inventoryReportsLoading" class="finance-state">
                    Cargando reportes de inventario...
                  </div>
                  <div v-else-if="!inventoryReports.length" class="finance-state">
                    No hay datos de inventario para ese rango.
                  </div>
                  <table v-else class="finance-table__table">
                    <thead>
                      <tr>
                        <th>{{ formatInventoryReportGroup(inventoryReportFilters.groupBy) }}</th>
                        <th>Movimientos</th>
                        <th>Cantidad movida</th>
                        <th>Consumo neto</th>
                        <th>Costo estimado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="report in inventoryReports" :key="report.key">
                        <td>{{ report.label }}</td>
                        <td>{{ report.movementsCount }}</td>
                        <td>{{ report.quantityMoved }}</td>
                        <td>{{ report.netConsumptionQuantity }}</td>
                        <td>{{ formatCurrency(report.estimatedConsumedCost) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </article>

            <aside v-if="inventoryTab === 'reportes'" class="finance-side">
              <article v-reveal="80" class="finance-side__card">
                <span class="finance-panel__eyebrow">Alertas</span>
                <ul class="finance-side__list">
                  <li
                    v-for="alert in inventorySummary.alerts.slice(0, 6)"
                    :key="`alert-${alert.itemId}-${alert.branchId}`"
                  >
                    <strong>{{ alert.itemName }}</strong>
                    <span>
                      {{ alert.branchName }} · {{ alert.currentStock }} / minimo {{ alert.minimumStock }} · {{ alert.state }}
                    </span>
                  </li>
                </ul>
              </article>

              <article v-reveal="120" class="finance-side__card">
                <span class="finance-panel__eyebrow">Mas usados</span>
                <ul class="finance-side__list">
                  <li
                    v-for="item in inventorySummary.mostUsedItems"
                    :key="`top-item-${item.itemId}`"
                  >
                    <strong>{{ item.itemName }}</strong>
                    <span>
                      {{ item.quantityUsed }} usados · {{ formatCurrency(item.costConsumed) }}
                    </span>
                  </li>
                </ul>
              </article>
            </aside>
          </section>
        </template>

        <template v-else>
          <section class="finance-stats stats-strip">
            <article
              v-for="card in summaryCards"
              :key="card.label"
              v-reveal="{ delay: 60 }"
              class="finance-stat-card"
            >
              <span>{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
            </article>
          </section>

          <section class="finance-layout">
            <article v-reveal class="finance-panel">
              <div class="finance-panel__header">
                <div>
                  <span class="finance-panel__eyebrow">Lectura contable</span>
                  <h2>Resumen del periodo filtrado</h2>
                  <p class="finance-panel__copy">
                    Mira por separado lo que entra por sala, lo que entra por insumos, lo exonerado y el margen bruto aproximado del periodo.
                  </p>
                </div>
              </div>

              <div class="finance-operational-grid">
                <article class="finance-operational-card">
                  <span>Ingresos por sala</span>
                  <strong>{{ formatCurrency(summary.ingresosSala) }}</strong>
                </article>
                <article class="finance-operational-card">
                  <span>Ingresos por insumos</span>
                  <strong>{{ formatCurrency(summary.ingresosInsumos) }}</strong>
                </article>
                <article class="finance-operational-card">
                  <span>Cobros registrados</span>
                  <strong>{{ summary.cobrosRegistrados }}</strong>
                </article>
                <article class="finance-operational-card">
                  <span>Procedimientos cobrados</span>
                  <strong>{{ summary.procedimientosCobrados }}</strong>
                </article>
                <article class="finance-operational-card">
                  <span>Operaciones exoneradas</span>
                  <strong>{{ summary.operacionesExoneradas }}</strong>
                </article>
                <article class="finance-operational-card">
                  <span>Costo de insumos</span>
                  <strong>{{ formatCurrency(summary.costoInsumos) }}</strong>
                </article>
              </div>
            </article>

            <aside class="finance-side">
              <article v-reveal="100" class="finance-side__card">
                <span class="finance-panel__eyebrow">Salas</span>
                <ul class="finance-side__list">
                  <li v-for="room in topRooms" :key="`room-${room.roomId}`">
                    <strong>{{ room.roomName }}</strong>
                    <span>{{ room.frequency }} usos · {{ room.hoursUsed.toFixed(1) }} h · {{ formatCurrency(room.capitalGenerated) }}</span>
                  </li>
                </ul>
              </article>

              <article v-reveal="140" class="finance-side__card">
                <span class="finance-panel__eyebrow">Usuarios</span>
                <ul class="finance-side__list">
                  <li v-for="user in topUsers" :key="`user-${user.userId}`">
                    <strong>{{ user.userName }}</strong>
                    <span>{{ formatCurrency(user.capitalGenerated) }}</span>
                  </li>
                </ul>
              </article>
            </aside>
          </section>
        </template>
      </main>

      <AppFooter />
    </div>

    <BaseModal
      :open="reportModalOpen"
      :title="reportModalTitle"
      description="Cierra el procedimiento con monto fijo o insumos ya usados y genera la factura imprimible para firma manual."
      @close="closeReportModal"
    >
      <FinanceChargeForm
        :initial-value="currentReport"
        :reservation-options="reservationOptions"
        :inventory-options="inventoryItems"
        :submitting="savingReport"
        :error-message="reportModalError"
        :mode="reportModalMode"
        :pricing-policy="settings.procedurePricingPolicy"
        :default-pricing-mode="settings.defaultProcedurePricingMode"
        :default-currency-code="settings.defaultCurrencyCode"
        :can-waive="canWaive"
        :selected-reservation="selectedReservation"
        :reservation-loading="reservationLoading"
        :reservation-error="reservationError"
        @reservation-change="handleReportReservationChange"
        @submit="handleSaveReport"
        @cancel="closeReportModal"
      />
    </BaseModal>

    <BaseModal
      :open="inventoryModalOpen"
      :title="inventoryModalTitle"
      description="Agrega o actualiza elementos del catalogo reusable de la clinica."
      @close="closeInventoryModal"
    >
      <InventoryItemForm
        :initial-value="currentInventoryItem"
        :branch-options="branchOptions"
        :submitting="savingInventory"
        :error-message="inventoryModalError"
        :mode="inventoryModalMode"
        @submit="handleSaveInventoryItem"
        @cancel="closeInventoryModal"
      />
    </BaseModal>

    <BaseModal
      :open="movementModalOpen"
      title="Registrar movimiento"
      description="Registra entradas, salidas, ajustes o devoluciones sobre el stock real del insumo."
      @close="closeMovementModal"
    >
      <InventoryMovementForm
        :item="currentMovementItem"
        :branch-options="branchOptions"
        :submitting="savingMovement"
        :error-message="movementModalError"
        @submit="handleSaveInventoryMovement"
        @cancel="closeMovementModal"
      />
    </BaseModal>

    <BaseModal
      :open="paymentModalOpen"
      title="Confirmar pago"
      description="Registra cuando el paciente ya cancelo la factura emitida previamente."
      @close="closePaymentModal"
    >
      <FinancePaymentForm
        :report="currentPaymentReport"
        :submitting="savingPayment"
        :error-message="paymentModalError"
        @submit="handleConfirmPayment"
        @cancel="closePaymentModal"
      />
    </BaseModal>
  </div>
</template>

<style scoped>
.finance-main {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.finance-hero,
.finance-panel,
.finance-side__card,
.finance-tabs {
  border-radius: 26px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: var(--hero-surface);
  box-shadow: 0 28px 60px rgba(16, 38, 44, 0.08);
}

.finance-stat-card {
  border-radius: 26px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  box-shadow: 0 28px 60px rgba(16, 38, 44, 0.08);
}

.finance-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.45rem;
  background: var(--hero-surface-strong);
}

.finance-tabs {
  display: flex;
  gap: 0.75rem;
  padding: 0.8rem;
  overflow-x: auto;
}

.finance-tabs__button {
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: #f7fbfc;
  color: var(--text-soft);
  border-radius: 999px;
  padding: 0.7rem 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: var(--transition-fast);
  white-space: nowrap;
}

.finance-tabs__button--active {
  background: var(--primary);
  color: #fff;
  border-color: transparent;
}

.finance-eyebrow,
.finance-panel__eyebrow {
  display: inline-flex;
  padding: 0.38rem 0.78rem;
  border-radius: 999px;
  background: var(--hero-chip-bg);
  color: var(--primary-dark);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.finance-hero h1,
.finance-panel__header h2 {
  margin: 0.7rem 0 0;
}

.finance-hero p,
.finance-panel__copy {
  margin: 0.55rem 0 0;
  color: var(--text-soft);
}

.finance-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.finance-feedback,
.finance-error,
.finance-warning,
.finance-state {
  margin: 0;
  padding: 0.95rem 1rem;
  border-radius: 18px;
}

.finance-feedback {
  background: #eaf7f3;
  color: var(--primary-dark);
}

.finance-error {
  background: rgba(235, 85, 69, 0.12);
  color: #b8392d;
}

.finance-warning {
  background: rgba(255, 189, 97, 0.14);
  color: #7d4d0b;
}

.finance-state {
  background: rgba(17, 184, 159, 0.08);
  color: var(--text-soft);
}

.finance-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.finance-stat-card {
  padding: 1.1rem 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.finance-stat-card span {
  color: var(--text-soft);
}

.finance-stat-card strong {
  font-size: 1.55rem;
  color: var(--primary-dark);
}

.finance-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.85fr);
  gap: 1rem;
  align-items: start;
}

.finance-panel,
.finance-side__card {
  padding: 1.2rem;
}

.finance-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.finance-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  align-items: end;
}

.finance-filters__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.finance-filters__label {
  font-size: 0.92rem;
  font-weight: 600;
}

.finance-filters__select {
  width: 100%;
  border: 1px solid #bfd4dc;
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
}

.finance-filters__actions {
  display: flex;
  gap: 0.75rem;
}

.finance-filters__presets {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.finance-filters__preset-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.finance-table {
  overflow-x: auto;
  background: #fff;
  border-radius: 8px;
}

.finance-table__table {
  width: 100%;
  min-width: 1060px;
  border-collapse: collapse;
}

.finance-table__table--inventory {
  min-width: 760px;
}

.finance-table th,
.finance-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #e2edf1;
  vertical-align: top;
}

.finance-table th {
  background: #f8fbfc;
}

.finance-table__actions-cell {
  display: flex;
  gap: 0.55rem;
}

.finance-table__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.36rem 0.7rem;
  border-radius: 999px;
  text-transform: capitalize;
}

.finance-table__badge--pendiente {
  background: rgba(242, 159, 56, 0.15);
  color: #9b6112;
}

.finance-table__badge--pagado,
.finance-table__badge--activo,
.finance-table__badge--ok {
  background: rgba(17, 184, 159, 0.14);
  color: var(--primary-dark);
}

.finance-table__badge--anulado,
.finance-table__badge--inactivo,
.finance-table__badge--agotado {
  background: rgba(235, 85, 69, 0.14);
  color: #b8392d;
}

.finance-table__badge--bajo,
.finance-table__badge--referencial {
  background: rgba(242, 159, 56, 0.15);
  color: #9b6112;
}

.finance-table__badge--cobrable {
  background: rgba(74, 118, 242, 0.12);
  color: #2850b8;
}

.finance-table__badge--exonerado {
  background: rgba(134, 93, 219, 0.14);
  color: #5f38b8;
}

.finance-table__subtext {
  display: block;
  margin-top: 0.35rem;
  color: var(--text-soft);
  font-size: 0.86rem;
}

.finance-table__subtext--strong {
  color: var(--text);
  font-weight: 600;
}

.finance-stock-list {
  margin: 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.4rem;
}

.finance-stock-list span {
  display: block;
  color: var(--text-soft);
  font-size: 0.86rem;
}

.finance-side {
  display: grid;
  gap: 1rem;
}

.finance-side__list {
  margin: 0.9rem 0 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.7rem;
  color: var(--text-soft);
}

.finance-side__list strong {
  display: block;
  color: var(--primary-dark);
}

.finance-operational-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.finance-operational-card {
  border: 1px solid rgba(17, 184, 159, 0.12);
  border-radius: 18px;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.86);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.finance-operational-card span {
  color: var(--text-soft);
}

.finance-operational-card strong {
  font-size: 1.45rem;
  color: var(--primary-dark);
}

@media (max-width: 980px) {
  .finance-layout {
    grid-template-columns: 1fr;
  }

  .finance-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .finance-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .finance-filters,
  .finance-operational-grid {
    grid-template-columns: 1fr;
  }

  .finance-hero__actions :deep(.base-button),
  .finance-filters__actions :deep(.base-button),
  .finance-filters__preset-actions :deep(.base-button) {
    width: 100%;
  }

  .finance-filters__actions,
  .finance-filters__preset-actions,
  .finance-table__actions-cell {
    flex-direction: column;
  }

  .finance-stats {
    grid-template-columns: 1fr;
  }
}
</style>

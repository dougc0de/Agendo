<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "../components/base/BaseButton.vue";
import BaseInput from "../components/base/BaseInput.vue";
import BaseModal from "../components/base/BaseModal.vue";
import FinanceChargeForm from "../components/finance/FinanceChargeForm.vue";
import InventoryItemForm from "../components/finance/InventoryItemForm.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import { getAppointments, getPastAppointments } from "../services/appointmentApi.js";
import {
    createFinanceInventoryItem,
    createFinanceOperationReport,
    getFinanceInventory,
    getFinanceOperationReportPdf,
    getFinanceOperationReports,
    getFinanceSummary,
    updateFinanceInventoryItem,
    updateFinanceOperationReport
} from "../services/financeApi.js";
import { getInternalUsers } from "../services/internalUserApi.js";
import { getRooms } from "../services/roomApi.js";
import { getAccountSettings } from "../services/settingsApi.js";
import { buildPrivateNavLinks } from "../shared/privateNavigation.js";
import { canAccessFinance, isAdministrativeUser } from "../shared/roles.js";
import { useAuthStore } from "../stores/authStore.js";
import { downloadOperationReportPdf } from "../utils/operationReportPdf.js";

const router = useRouter();
const authStore = useAuthStore();
const activeTab = ref("cobros");
const reports = ref([]);
const inventoryItems = ref([]);
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
const reportModalOpen = ref(false);
const inventoryModalOpen = ref(false);
const reportModalMode = ref("create");
const inventoryModalMode = ref("create");
const reportModalError = ref("");
const inventoryModalError = ref("");
const savingReport = ref(false);
const savingInventory = ref(false);
const currentReport = ref({});
const currentInventoryItem = ref({});
const userOptions = ref([]);
const roomOptions = ref([]);
const reservationOptions = ref([]);
const settings = ref({
    timeZone: "America/Costa_Rica",
    procedurePricingPolicy: "bloqueado",
    defaultProcedurePricingMode: "solo_sala"
});
const filters = ref({
    from: "",
    to: "",
    patient: "",
    userId: "",
    roomId: "",
    paymentStatus: "todos"
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
            "Recepcion cierra el procedimiento, carga lo usado desde inventario y genera el bill imprimible segun la modalidad definida por la cuenta.",
        inventario:
            "Mantiene un catalogo reusable de hilos, agujas, equipos y cualquier insumo propio de la clinica.",
        reportes:
            "Revisa ingresos por sala, insumos, exoneraciones, costo de materiales y rendimiento por usuario o sala."
    })[activeTab.value] ?? ""
);

const reportModalTitle = computed(() =>
    reportModalMode.value === "edit"
        ? "Editar facturacion procedural"
        : "Registrar facturacion procedural"
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
    }
]);

const topRooms = computed(() => summary.value.rooms?.slice(0, 5) ?? []);
const topUsers = computed(() => summary.value.users?.slice(0, 5) ?? []);

function formatCurrency(value, currencyCode = "CRC") {
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

function formatInventoryStatus(status) {
    return status === "activo" ? "Activo" : "Inactivo";
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
        const [userResponse, roomResponse] = await Promise.all([getInternalUsers(), getRooms()]);

        userOptions.value = userResponse.data ?? [];
        roomOptions.value = roomResponse.data ?? [];
    } catch {
        userOptions.value = [];
        roomOptions.value = [];
    }
}

async function fetchSettings() {
    try {
        const response = await getAccountSettings();
        settings.value = {
            timeZone: response.data?.timeZone ?? "America/Costa_Rica",
            procedurePricingPolicy: response.data?.procedurePricingPolicy ?? "bloqueado",
            defaultProcedurePricingMode:
                response.data?.defaultProcedurePricingMode ?? "solo_sala"
        };
    } catch {
        settings.value = {
            timeZone: "America/Costa_Rica",
            procedurePricingPolicy: "bloqueado",
            defaultProcedurePricingMode: "solo_sala"
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
        const response = await getFinanceInventory();
        inventoryItems.value = response.data ?? [];
    } catch {
        inventoryItems.value = [];
    } finally {
        inventoryLoading.value = false;
    }
}

function clearFilters() {
    filters.value = {
        from: "",
        to: "",
        patient: "",
        userId: "",
        roomId: "",
        paymentStatus: "todos"
    };
    fetchFinanceData();
}

function openCreateReportModal() {
    reportModalMode.value = "create";
    currentReport.value = {};
    reportModalError.value = "";
    reportModalOpen.value = true;
    fetchReservationOptions();
}

function openEditReportModal(report) {
    reportModalMode.value = "edit";
    currentReport.value = {
        ...report,
        supplies: report.supplies ?? []
    };
    reportModalError.value = "";
    reportModalOpen.value = true;
    fetchReservationOptions();
}

function canEditReport(report) {
    return canWaive.value || report.chargeDecision !== "exonerado";
}

function closeReportModal() {
    reportModalOpen.value = false;
    reportModalError.value = "";
    currentReport.value = {};
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

function closeInventoryModal() {
    inventoryModalOpen.value = false;
    inventoryModalError.value = "";
    currentInventoryItem.value = {};
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
        await fetchInventory();
    } catch (requestError) {
        inventoryModalError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible guardar el insumo.";
    } finally {
        savingInventory.value = false;
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
        fetchInventory()
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
              Registrar facturacion
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
          <section class="finance-layout">
            <article v-reveal class="finance-panel">
              <div class="finance-panel__header">
                <div>
                  <span class="finance-panel__eyebrow">Filtros</span>
                  <h2>Facturacion por procedimiento</h2>
                  <p class="finance-panel__copy">
                    Modalidad actual de la cuenta: {{ formatPricingMode(settings.defaultProcedurePricingMode) }}.
                    Recepcion la ejecuta tal como fue definida por administracion.
                  </p>
                </div>
              </div>

              <form class="finance-filters" @submit.prevent="fetchFinanceData">
                <BaseInput
                  :model-value="filters.patient"
                  label="Paciente"
                  placeholder="Nombre del paciente"
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
                <label class="finance-filters__field">
                  <span class="finance-filters__label">Estado</span>
                  <select v-model="filters.paymentStatus" class="finance-filters__select">
                    <option value="todos">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                    <option value="anulado">Anulado</option>
                  </select>
                </label>
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
                <div v-else-if="!reports.length" class="finance-state">
                  No hay reportes para los filtros actuales.
                </div>
                <table v-else class="finance-table__table">
                  <thead>
                    <tr>
                      <th>Reserva</th>
                      <th>Paciente</th>
                      <th>Sala</th>
                      <th>Modalidad</th>
                      <th>Total</th>
                      <th>Cobro</th>
                      <th>Decision</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="report in reports" :key="report.id">
                      <td>
                        <strong>{{ report.reservationDate }}</strong>
                        <span class="finance-table__subtext">
                          {{ report.reservationStartTime }} - {{ report.reservationEndTime }}
                        </span>
                      </td>
                      <td>{{ report.patientNameSnapshot }}</td>
                      <td>{{ report.roomNameSnapshot }}</td>
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
                          :class="`finance-table__badge--${report.paymentStatus}`"
                        >
                          {{ report.paymentStatus }}
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
                          Editar
                        </BaseButton>
                        <BaseButton
                          size="sm"
                          variant="ghost"
                          @click="handleDownloadPdf(report)"
                        >
                          Bill PDF
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
          <section class="finance-layout">
            <article v-reveal class="finance-panel">
              <div class="finance-panel__header">
                <div>
                  <span class="finance-panel__eyebrow">Catalogo reusable</span>
                  <h2>Inventario de insumos y equipo</h2>
                  <p class="finance-panel__copy">
                    Agrega hilos, agujas, paquetes, equipo o cualquier material que la clinica desee reutilizar en sus reportes de operacion.
                  </p>
                </div>
              </div>

              <div class="finance-table">
                <div v-if="inventoryLoading" class="finance-state">
                  Cargando inventario...
                </div>
                <div v-else-if="!inventoryItems.length" class="finance-state">
                  Todavia no hay insumos registrados en inventario.
                </div>
                <table v-else class="finance-table__table finance-table__table--inventory">
                  <thead>
                    <tr>
                      <th>Insumo</th>
                      <th>Categoria</th>
                      <th>Unidad</th>
                      <th>Costo base</th>
                      <th>Precio sugerido</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in inventoryItems" :key="item.id">
                      <td>{{ item.nombre }}</td>
                      <td>{{ item.categoria || "General" }}</td>
                      <td>{{ item.unidad }}</td>
                      <td>{{ formatCurrency(item.costoBase) }}</td>
                      <td>{{ formatCurrency(item.precioSugerido) }}</td>
                      <td>
                        <span
                          class="finance-table__badge"
                          :class="`finance-table__badge--${item.estado}`"
                        >
                          {{ formatInventoryStatus(item.estado) }}
                        </span>
                      </td>
                      <td class="finance-table__actions-cell">
                        <BaseButton size="sm" variant="warning" @click="openEditInventoryModal(item)">
                          Editar
                        </BaseButton>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>
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
      description="Cierra el procedimiento con monto fijo o insumos ya usados y genera el bill imprimible para firma manual."
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
        :can-waive="canWaive"
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
        :submitting="savingInventory"
        :error-message="inventoryModalError"
        :mode="inventoryModalMode"
        @submit="handleSaveInventoryItem"
        @cancel="closeInventoryModal"
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

.finance-table {
  overflow-x: auto;
  background: #fff;
  border-radius: 8px;
}

.finance-table__table {
  width: 100%;
  min-width: 880px;
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
.finance-table__badge--activo {
  background: rgba(17, 184, 159, 0.14);
  color: var(--primary-dark);
}

.finance-table__badge--anulado,
.finance-table__badge--inactivo {
  background: rgba(235, 85, 69, 0.14);
  color: #b8392d;
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
  .finance-filters__actions :deep(.base-button) {
    width: 100%;
  }

  .finance-filters__actions,
  .finance-table__actions-cell {
    flex-direction: column;
  }

  .finance-stats {
    grid-template-columns: 1fr;
  }
}
</style>

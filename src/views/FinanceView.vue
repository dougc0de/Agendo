<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "../components/base/BaseButton.vue";
import BaseInput from "../components/base/BaseInput.vue";
import BaseModal from "../components/base/BaseModal.vue";
import FinanceChargeForm from "../components/finance/FinanceChargeForm.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import { getAppointments, getPastAppointments } from "../services/appointmentApi.js";
import {
    createFinanceCharge,
    getFinanceCharges,
    getFinanceSummary,
    updateFinanceCharge
} from "../services/financeApi.js";
import { getInternalUsers } from "../services/internalUserApi.js";
import { getRooms } from "../services/roomApi.js";
import { buildPrivateNavLinks } from "../shared/privateNavigation.js";
import { canAccessFinance } from "../shared/roles.js";
import { useAuthStore } from "../stores/authStore.js";

const router = useRouter();
const authStore = useAuthStore();
const charges = ref([]);
const summary = ref({
    ingresosCobrados: 0,
    ingresosPendientes: 0,
    procedimientosCobrados: 0,
    rooms: [],
    users: []
});
const loading = ref(false);
const modalOpen = ref(false);
const modalMode = ref("create");
const modalError = ref("");
const saving = ref(false);
const currentCharge = ref({});
const userOptions = ref([]);
const roomOptions = ref([]);
const reservationOptions = ref([]);
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

const modalTitle = computed(() =>
    modalMode.value === "edit" ? "Editar cobro" : "Registrar cobro"
);

const statCards = computed(() => [
    {
        label: "Ingresos cobrados",
        value: formatCurrency(summary.value.ingresosCobrados)
    },
    {
        label: "Pendiente por cobrar",
        value: formatCurrency(summary.value.ingresosPendientes)
    },
    {
        label: "Procedimientos cobrados",
        value: summary.value.procedimientosCobrados
    },
    {
        label: "Cobros registrados",
        value: charges.value.length
    }
]);

const topRooms = computed(() => summary.value.rooms?.slice(0, 5) ?? []);
const topUsers = computed(() => summary.value.users?.slice(0, 5) ?? []);

function formatCurrency(value) {
    return new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency: "CRC",
        maximumFractionDigits: 2
    }).format(Number(value ?? 0));
}

async function fetchReservationOptions() {
    try {
        const [activeResponse, pastResponse, existingChargesResponse] = await Promise.all([
            getAppointments(),
            getPastAppointments(),
            getFinanceCharges()
        ]);
        const existingCharges = existingChargesResponse.data ?? [];
        const usedReservationIds = new Set(
            existingCharges
                .filter((charge) =>
                    modalMode.value === "edit" && currentCharge.value.id
                        ? charge.id !== currentCharge.value.id
                        : true
                )
                .map((charge) => Number(charge.reservationId))
        );

        reservationOptions.value = [
            ...(activeResponse.data ?? []),
            ...(pastResponse.data ?? [])
        ].filter((reservation) => {
            if (reservation.tipoAtencion !== "procedimiento") {
                return false;
            }

            if (
                modalMode.value === "edit" &&
                Number(currentCharge.value.reservationId) === Number(reservation.id)
            ) {
                return true;
            }

            return !usedReservationIds.has(Number(reservation.id));
        });
    } catch {
        reservationOptions.value = [];
    }
}

async function fetchFiltersSupport() {
    try {
        const [userResponse, roomResponse] = await Promise.all([
            getInternalUsers(),
            getRooms()
        ]);

        userOptions.value = userResponse.data ?? [];
        roomOptions.value = roomResponse.data ?? [];
    } catch {
        userOptions.value = [];
        roomOptions.value = [];
    }
}

async function fetchFinanceData() {
    loading.value = true;
    error.value = "";

    try {
        const [chargesResponse, summaryResponse] = await Promise.all([
            getFinanceCharges(filters.value),
            getFinanceSummary(filters.value)
        ]);

        charges.value = chargesResponse.data ?? [];
        summary.value = summaryResponse.data ?? {
            ingresosCobrados: 0,
            ingresosPendientes: 0,
            procedimientosCobrados: 0,
            rooms: [],
            users: []
        };
        await fetchReservationOptions();
    } catch (requestError) {
        charges.value = [];
        summary.value = {
            ingresosCobrados: 0,
            ingresosPendientes: 0,
            procedimientosCobrados: 0,
            rooms: [],
            users: []
        };
        error.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible cargar el modulo financiero.";
    } finally {
        loading.value = false;
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

function openCreateModal() {
    modalMode.value = "create";
    currentCharge.value = {};
    modalError.value = "";
    modalOpen.value = true;
    fetchReservationOptions();
}

function openEditModal(charge) {
    modalMode.value = "edit";
    currentCharge.value = {
        reservationId: charge.reservationId,
        procedureName: charge.procedureName,
        amount: charge.amount,
        currencyCode: charge.currencyCode,
        paymentStatus: charge.paymentStatus,
        paymentMethod: charge.paymentMethod,
        paidAt: charge.paidAt,
        notes: charge.notes,
        id: charge.id
    };
    modalError.value = "";
    modalOpen.value = true;
    fetchReservationOptions();
}

function closeModal() {
    modalOpen.value = false;
    modalError.value = "";
    currentCharge.value = {};
}

async function handleSaveCharge(payload) {
    saving.value = true;
    modalError.value = "";

    try {
        const response =
            modalMode.value === "edit" && currentCharge.value.id
                ? await updateFinanceCharge(currentCharge.value.id, payload)
                : await createFinanceCharge(payload);

        feedback.value = response.msg;
        closeModal();
        await fetchFinanceData();
    } catch (requestError) {
        modalError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible guardar el cobro.";
    } finally {
        saving.value = false;
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

    await Promise.all([fetchFiltersSupport(), fetchFinanceData()]);
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
            <h1>Cobros y rendimiento</h1>
            <p>
              Registra cobros de procedimientos y revisa ingresos, uso de sala y capital generado.
            </p>
          </div>

          <div class="finance-hero__actions">
            <BaseButton @click="openCreateModal">
              Registrar cobro
            </BaseButton>
            <BaseButton variant="ghost" @click="fetchFinanceData">
              Actualizar
            </BaseButton>
          </div>
        </section>

        <section class="finance-stats stats-strip">
          <article
            v-for="card in statCards"
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
                <span class="finance-panel__eyebrow">Filtros</span>
                <h2>Cobros registrados</h2>
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

            <p v-if="feedback" class="finance-feedback">{{ feedback }}</p>
            <p v-if="error" class="finance-error">{{ error }}</p>

            <div class="finance-table">
              <div v-if="loading" class="finance-state">
                Cargando cobros...
              </div>
              <div v-else-if="!charges.length" class="finance-state">
                No hay cobros para los filtros actuales.
              </div>
              <table v-else class="finance-table__table">
                <thead>
                  <tr>
                    <th>Reserva</th>
                    <th>Paciente</th>
                    <th>Sala</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Metodo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="charge in charges" :key="charge.id">
                    <td>{{ charge.reservationDate }}</td>
                    <td>{{ charge.patientNameSnapshot }}</td>
                    <td>{{ charge.roomNameSnapshot }}</td>
                    <td>{{ formatCurrency(charge.amount) }}</td>
                    <td>
                      <span
                        class="finance-table__badge"
                        :class="`finance-table__badge--${charge.paymentStatus}`"
                      >
                        {{ charge.paymentStatus }}
                      </span>
                    </td>
                    <td class="finance-table__capitalize">{{ charge.paymentMethod }}</td>
                    <td class="finance-table__actions-cell">
                      <BaseButton size="sm" variant="warning" @click="openEditModal(charge)">
                        Editar
                      </BaseButton>
                    </td>
                  </tr>
                </tbody>
              </table>
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
      </main>

      <AppFooter />
    </div>

    <BaseModal
      :open="modalOpen"
      :title="modalTitle"
      description="Registra o actualiza el cobro asociado a un procedimiento."
      @close="closeModal"
    >
      <FinanceChargeForm
        :initial-value="currentCharge"
        :reservation-options="reservationOptions"
        :submitting="saving"
        :error-message="modalError"
        :mode="modalMode"
        @submit="handleSaveCharge"
        @cancel="closeModal"
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
.finance-side__card {
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

.finance-hero p {
  margin: 0.55rem 0 0;
  color: var(--text-soft);
}

.finance-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.finance-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
  font-size: 1.7rem;
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

.finance-table {
  overflow-x: auto;
  background: #fff;
  border-radius: 8px;
}

.finance-table__table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
}

.finance-table th,
.finance-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #e2edf1;
}

.finance-table th {
  background: #f8fbfc;
}

.finance-table__actions-cell {
  text-align: center;
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

.finance-table__badge--pagado {
  background: rgba(17, 184, 159, 0.14);
  color: var(--primary-dark);
}

.finance-table__badge--anulado {
  background: rgba(235, 85, 69, 0.14);
  color: #b8392d;
}

.finance-table__capitalize {
  text-transform: capitalize;
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

@media (max-width: 980px) {
  .finance-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .finance-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .finance-filters {
    grid-template-columns: 1fr;
  }

  .finance-hero__actions :deep(.base-button),
  .finance-filters__actions :deep(.base-button) {
    width: 100%;
  }

  .finance-filters__actions {
    flex-direction: column-reverse;
  }
}
</style>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppointmentFilters from "../components/appointments/AppointmentFilters.vue";
import AppointmentForm from "../components/appointments/AppointmentForm.vue";
import AppointmentTable from "../components/appointments/AppointmentTable.vue";
import BaseButton from "../components/base/BaseButton.vue";
import BaseModal from "../components/base/BaseModal.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import { useAppointments } from "../composables/useAppointments.js";
import { useAuthStore } from "../stores/authStore.js";

const router = useRouter();
const authStore = useAuthStore();
const {
    appointments,
    loading,
    saving,
    error,
    totalAppointments,
    pendingAppointments,
    confirmedAppointments,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment
} = useAppointments();

const modalOpen = ref(false);
const modalMode = ref("create");
const modalTitle = computed(() =>
    modalMode.value === "edit" ? "Editar reserva" : "Crear reserva"
);
const currentAppointment = ref({});
const filters = ref({
    search: "",
    status: "todos"
});
const feedback = ref("");
const modalError = ref("");

const dashboardLinks = [
    { label: "Inicio", href: "#dashboard-top" },
    { label: "Dashboard", href: "#dashboard-top" },
    { label: "Reservas", href: "#reservas-panel" }
];

const filteredAppointments = computed(() => {
    const search = filters.value.search.trim().toLowerCase();

    return appointments.value.filter((appointment) => {
        const matchesStatus =
            filters.value.status === "todos" ||
            appointment.estado === filters.value.status;

        const haystack = [
            appointment.descripcion,
            appointment.tipoConsulta,
            `sala ${appointment.salaId}`,
            `paciente ${appointment.pacienteId}`
        ]
            .join(" ")
            .toLowerCase();

        const matchesSearch = !search || haystack.includes(search);

        return matchesStatus && matchesSearch;
    });
});

function openCreateModal() {
    modalMode.value = "create";
    modalError.value = "";
    currentAppointment.value = {
        estado: "pendiente",
        usuarioId: 1,
        pacienteId: 1,
        salaId: 1
    };
    modalOpen.value = true;
}

function openEditModal(appointment) {
    modalMode.value = "edit";
    modalError.value = "";
    currentAppointment.value = {
        ...appointment
    };
    modalOpen.value = true;
}

function closeModal() {
    modalOpen.value = false;
    modalError.value = "";
    currentAppointment.value = {};
}

async function handleSaveAppointment(payload) {
    let result;
    modalError.value = "";

    if (modalMode.value === "edit" && currentAppointment.value.id) {
        result = await updateAppointment(currentAppointment.value.id, payload);
    } else {
        result = await createAppointment(payload);
    }

    if (result.ok) {
        feedback.value = result.msg;
        closeModal();
        return;
    }

    modalError.value = result.msg;
}

async function handleDeleteAppointment(appointment) {
    const accepted = window.confirm(
        `Se eliminara la reserva ${appointment.id}. Deseas continuar?`
    );

    if (!accepted) {
        return;
    }

    const result = await deleteAppointment(appointment.id);
    feedback.value = result.msg;
}

function clearFilters() {
    filters.value = {
        search: "",
        status: "todos"
    };
}

function applyStatusFilter(status) {
    filters.value.status = status;
}

function logout() {
    authStore.logout();
    router.push("/");
}

onMounted(async () => {
    authStore.hydrate();

    if (!authStore.isAuthenticated) {
        router.replace("/");
        return;
    }

    await fetchAppointments();
});
</script>

<template>
  <div class="dashboard-page page-view">
    <div class="dashboard-shell page-shell">
      <AppNavbar
        :links="dashboardLinks"
        action-label="Cerrar Sesion"
        :show-profile-icon="true"
        @action="logout"
      />

      <main id="dashboard-top" class="dashboard-main">
        <aside class="dashboard-sidebar">
          <div class="dashboard-logo-card">
            <div class="dashboard-logo-card__icon">AG</div>
          </div>

          <div class="dashboard-profile-card">
            <small>Perfil activo</small>
            <strong>{{ authStore.user?.displayName || "Usuario" }}</strong>
            <span>{{ authStore.user?.email || "sin correo" }}</span>
          </div>

          <div class="dashboard-actions">
            <BaseButton block @click="openCreateModal">
              Agregar Reserva
            </BaseButton>
            <BaseButton block variant="secondary" @click="fetchAppointments">
              Recargar Reservas
            </BaseButton>
          </div>

          <div class="dashboard-status-panel">
            <button type="button" @click="applyStatusFilter('todos')">Ver Reservas</button>
            <button type="button" @click="applyStatusFilter('pendiente')">Pendientes</button>
            <button type="button" @click="applyStatusFilter('confirmada')">Confirmadas</button>
            <button type="button" @click="applyStatusFilter('cancelada')">Canceladas</button>
          </div>
        </aside>

        <section class="dashboard-content">
          <div class="dashboard-heading">
            <h1>Dashboard - Mis Reservas</h1>
            <p>Gestiona reservas, estados y disponibilidad desde un solo panel.</p>
          </div>

          <div class="dashboard-stats">
            <article class="stat-card">
              <span>Total</span>
              <strong>{{ totalAppointments }}</strong>
            </article>
            <article class="stat-card">
              <span>Pendientes</span>
              <strong>{{ pendingAppointments }}</strong>
            </article>
            <article class="stat-card">
              <span>Confirmadas</span>
              <strong>{{ confirmedAppointments }}</strong>
            </article>
          </div>

          <div id="reservas-panel" class="dashboard-panel">
            <div class="dashboard-panel__header">
              <div>
                <h2>Panel de reservas</h2>
                <p>Usa IDs existentes en MySQL para usuario, paciente y sala.</p>
              </div>
              <BaseButton size="sm" @click="openCreateModal">
                Nueva Reserva
              </BaseButton>
            </div>

            <AppointmentFilters
              :search="filters.search"
              :status="filters.status"
              @update:search="filters.search = $event"
              @update:status="filters.status = $event"
              @clear="clearFilters"
            />

            <p v-if="feedback" class="dashboard-feedback">{{ feedback }}</p>
            <p v-if="error && !modalOpen" class="dashboard-error">{{ error }}</p>

            <AppointmentTable
              :appointments="filteredAppointments"
              :loading="loading"
              @edit="openEditModal"
              @delete="handleDeleteAppointment"
            />
          </div>
        </section>
      </main>

      <AppFooter />
    </div>

    <BaseModal
      :open="modalOpen"
      :title="modalTitle"
      description="Completa la informacion para guardar la reserva."
      @close="closeModal"
    >
      <AppointmentForm
        :initial-value="currentAppointment"
        :mode="modalMode"
        :submitting="saving"
        :error-message="modalError"
        @submit="handleSaveAppointment"
        @cancel="closeModal"
      />
    </BaseModal>
  </div>
</template>

<style scoped>
.dashboard-page {
}

.dashboard-shell {
}

.dashboard-main {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1.5rem;
  padding: 2rem;
}

.dashboard-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dashboard-logo-card,
.dashboard-profile-card,
.dashboard-status-panel,
.dashboard-panel,
.stat-card {
  background: rgba(255, 255, 255, 0.82);
  border-radius: 8px;
}

.dashboard-logo-card {
  min-height: 120px;
  display: grid;
  place-items: center;
}

.dashboard-logo-card__icon {
  width: 88px;
  height: 88px;
  border-radius: 20px;
  background: linear-gradient(135deg, #d9eef8, #f6fbff);
  border: 2px solid rgba(95, 135, 151, 0.22);
  display: grid;
  place-items: center;
  color: var(--primary-dark);
  font-size: 1.55rem;
  font-weight: 700;
}

.dashboard-profile-card {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.dashboard-profile-card small,
.dashboard-profile-card span {
  color: var(--text-soft);
}

.dashboard-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dashboard-status-panel {
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.dashboard-status-panel button {
  border: 1px solid #bfd4dc;
  border-radius: 999px;
  background: #f4f8fa;
  color: var(--text);
  padding: 0.6rem 0.8rem;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 1.3rem;
}

.dashboard-heading h1 {
  margin: 0;
  font-size: 2.2rem;
}

.dashboard-heading p {
  margin: 0.35rem 0 0;
  color: var(--text-soft);
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.stat-card {
  padding: 1rem 1.2rem;
}

.stat-card span {
  display: block;
  color: var(--text-soft);
  margin-bottom: 0.4rem;
}

.stat-card strong {
  font-size: 2rem;
  color: var(--primary-dark);
}

.dashboard-panel {
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dashboard-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.dashboard-panel__header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.dashboard-panel__header p {
  margin: 0.3rem 0 0;
  color: var(--text-soft);
}

.dashboard-feedback,
.dashboard-error {
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 8px;
}

.dashboard-feedback {
  background: rgba(95, 135, 151, 0.14);
  color: var(--primary-dark);
}

.dashboard-error {
  background: rgba(235, 85, 69, 0.14);
  color: #b8392d;
}

@media (max-width: 980px) {
  .dashboard-main,
  .dashboard-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .dashboard-main {
    padding: 1.25rem;
  }

  .dashboard-panel__header {
    flex-direction: column;
  }
}
</style>

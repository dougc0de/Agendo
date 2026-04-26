<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppointmentOutcomeForm from "../components/appointments/AppointmentOutcomeForm.vue";
import AppointmentTable from "../components/appointments/AppointmentTable.vue";
import BaseButton from "../components/base/BaseButton.vue";
import BaseInput from "../components/base/BaseInput.vue";
import BaseModal from "../components/base/BaseModal.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import {
    getPastAppointments,
    updateAppointmentOutcome,
    updateAppointmentStatus
} from "../services/appointmentApi.js";
import { getInternalUsers } from "../services/internalUserApi.js";
import { buildPrivateNavLinks } from "../shared/privateNavigation.js";
import { canViewAllPastReservations } from "../shared/roles.js";
import { useAuthStore } from "../stores/authStore.js";

const router = useRouter();
const authStore = useAuthStore();
const appointments = ref([]);
const userOptions = ref([]);
const loading = ref(false);
const outcomeModalOpen = ref(false);
const outcomeSaving = ref(false);
const outcomeError = ref("");
const selectedAppointment = ref({});
const error = ref("");
const filters = ref({
    patient: "",
    status: "todos",
    from: "",
    to: "",
    userId: ""
});

const navLinks = computed(() =>
    buildPrivateNavLinks({
        membershipRole: authStore.membershipRole,
        userRole: authStore.user?.rol
    })
);

const canFilterByUser = computed(() =>
    canViewAllPastReservations({
        membershipRole: authStore.membershipRole,
        userRole: authStore.user?.rol
    })
);

const statCards = computed(() => [
    {
        label: "Total",
        value: appointments.value.length
    },
    {
        label: "Confirmadas",
        value: appointments.value.filter((appointment) => appointment.estado === "confirmada").length
    },
    {
        label: "Canceladas",
        value: appointments.value.filter((appointment) => appointment.estado === "cancelada").length
    },
    {
        label: "Pendientes",
        value: appointments.value.filter((appointment) => appointment.estado === "pendiente").length
    }
]);

const fullMomentFormatter = new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short"
});

async function fetchPastAppointments() {
    loading.value = true;
    error.value = "";

    try {
        const response = await getPastAppointments(filters.value);
        appointments.value = response.data ?? [];
    } catch (requestError) {
        appointments.value = [];
        error.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible cargar el historial de reservas.";
    } finally {
        loading.value = false;
    }
}

async function fetchUserOptions() {
    if (!canFilterByUser.value) {
        userOptions.value = [];
        return;
    }

    try {
        const response = await getInternalUsers();
        userOptions.value = response.data ?? [];
    } catch {
        userOptions.value = [];
    }
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

function openOutcomeModal(appointment) {
    selectedAppointment.value = {
        ...appointment
    };
    outcomeError.value = "";
    outcomeModalOpen.value = true;
}

function closeOutcomeModal() {
    outcomeModalOpen.value = false;
    outcomeError.value = "";
    selectedAppointment.value = {};
}

async function handleSaveOutcome(payload) {
    if (!selectedAppointment.value?.id) {
        return;
    }

    outcomeSaving.value = true;
    outcomeError.value = "";

    try {
        let latestAppointment = selectedAppointment.value;
        const needsStatusUpdate =
            payload.status !== selectedAppointment.value.estado ||
            (
                payload.status === "cancelada" &&
                payload.cancellationReason !== selectedAppointment.value.cancellationReason
            );

        if (needsStatusUpdate) {
            const statusResponse = await updateAppointmentStatus(
                selectedAppointment.value.id,
                payload.status,
                {
                    cancellationReason: payload.cancellationReason
                }
            );
            latestAppointment = statusResponse.data ?? latestAppointment;
        }

        const shouldSkipOutcomePatch =
            payload.status === "cancelada" && payload.appointmentOutcome === "cancelada";

        if (
            !shouldSkipOutcomePatch &&
            payload.appointmentOutcome !== (latestAppointment.appointmentOutcome ?? "pendiente")
        ) {
            const outcomeResponse = await updateAppointmentOutcome(
                selectedAppointment.value.id,
                {
                    appointmentOutcome: payload.appointmentOutcome,
                    cancellationReason: payload.cancellationReason
                }
            );
            latestAppointment = outcomeResponse.data ?? latestAppointment;
        }

        selectedAppointment.value = latestAppointment;
        await fetchPastAppointments();
        closeOutcomeModal();
    } catch (requestError) {
        outcomeError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible guardar el resultado de la reserva.";
    } finally {
        outcomeSaving.value = false;
    }
}

function clearFilters() {
    filters.value = {
        patient: "",
        status: "todos",
        from: "",
        to: "",
        userId: ""
    };
    fetchPastAppointments();
}

function logout() {
    authStore.logout();
    router.push("/login");
}

async function bootstrapPastAppointments() {
    if (!authStore.isHydrated) {
        await authStore.hydrate();
    }

    if (!authStore.isAuthenticated) {
        router.replace("/login");
        return;
    }

    await Promise.all([fetchPastAppointments(), fetchUserOptions()]);
}

onMounted(() => {
    bootstrapPastAppointments();
});
</script>

<template>
  <div class="past-appointments-page page-view">
    <div class="past-appointments-shell page-shell">
      <AppNavbar
        :links="navLinks"
        brand-href="/dashboard"
        action-label="Cerrar Sesion"
        :show-profile-icon="true"
        @action="logout"
      />

      <main class="past-appointments-main section-shell">
        <section v-reveal class="past-appointments-hero">
          <div>
            <span class="past-appointments-eyebrow">Historial</span>
            <h1>Historial de Reservas</h1>
            <p>
              Consulta lo que ya ocurrio en la cuenta sin mezclarlo con la agenda operativa del dia.
            </p>
          </div>

          <div class="past-appointments-hero__actions">
            <BaseButton variant="ghost" @click="router.push('/appointments')">
              Volver a Reservas
            </BaseButton>
          </div>
        </section>

        <section class="past-appointments-stats stats-strip">
          <article
            v-for="card in statCards"
            :key="card.label"
            v-reveal="{ delay: 60 }"
            class="past-appointments-stat-card"
          >
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </article>
        </section>

        <section class="past-appointments-panel" v-reveal>
          <div class="past-appointments-panel__header">
            <div>
              <span class="past-appointments-panel__eyebrow">Filtros</span>
              <h2>Busqueda por tiempo, paciente y usuario</h2>
            </div>
          </div>

          <form class="past-appointments-filters" @submit.prevent="fetchPastAppointments">
            <BaseInput
              :model-value="filters.patient"
              label="Paciente"
              placeholder="Nombre, telefono o correo"
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
            <label class="past-appointments-filters__field">
              <span class="past-appointments-filters__label">Estado</span>
              <select v-model="filters.status" class="past-appointments-filters__select">
                <option value="todos">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="confirmada">Confirmada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </label>
            <label
              v-if="canFilterByUser"
              class="past-appointments-filters__field"
            >
              <span class="past-appointments-filters__label">Usuario</span>
              <select v-model="filters.userId" class="past-appointments-filters__select">
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

            <div class="past-appointments-filters__actions">
              <BaseButton variant="ghost" @click.prevent="clearFilters">
                Limpiar
              </BaseButton>
              <BaseButton type="submit">
                Aplicar filtros
              </BaseButton>
            </div>
          </form>

          <p v-if="error" class="past-appointments-error">{{ error }}</p>

          <AppointmentTable
            :appointments="appointments"
            :loading="loading"
            :show-actions="true"
            :show-delete-action="false"
            edit-action-label="Cerrar resultado"
            :show-user="canFilterByUser"
            empty-message="No encontramos reservas en el historial con esos filtros."
            @edit="openOutcomeModal"
          />
        </section>
      </main>

      <BaseModal
        :open="outcomeModalOpen"
        title="Cerrar resultado de la reserva"
        @close="closeOutcomeModal"
      >
        <AppointmentOutcomeForm
          :initial-value="selectedAppointment"
          :summary="{
            patientName: selectedAppointment.pacienteNombre,
            dateLabel: formatAppointmentMoment(selectedAppointment),
            roomName: selectedAppointment.salaNombre || `Sala #${selectedAppointment.salaId ?? ''}`,
            typeName: selectedAppointment.tipoConsulta
          }"
          :submitting="outcomeSaving"
          :error-message="outcomeError"
          @submit="handleSaveOutcome"
          @cancel="closeOutcomeModal"
        />
      </BaseModal>

      <AppFooter />
    </div>
  </div>
</template>

<style scoped>
.past-appointments-main {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.past-appointments-hero,
.past-appointments-panel {
  border-radius: 26px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: var(--hero-surface);
  box-shadow: 0 28px 60px rgba(16, 38, 44, 0.08);
}

.past-appointments-stat-card {
  border-radius: 26px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  box-shadow: 0 28px 60px rgba(16, 38, 44, 0.08);
}

.past-appointments-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.45rem;
  background: var(--hero-surface-strong);
}

.past-appointments-eyebrow,
.past-appointments-panel__eyebrow {
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

.past-appointments-hero h1,
.past-appointments-panel__header h2 {
  margin: 0.7rem 0 0;
}

.past-appointments-hero p {
  margin: 0.55rem 0 0;
  color: var(--text-soft);
}

.past-appointments-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.past-appointments-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.past-appointments-stat-card {
  padding: 1.1rem 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.past-appointments-stat-card span {
  color: var(--text-soft);
}

.past-appointments-stat-card strong {
  font-size: 2rem;
  color: var(--primary-dark);
}

.past-appointments-panel {
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.past-appointments-filters {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1rem;
  align-items: end;
}

.past-appointments-filters__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.past-appointments-filters__label {
  font-size: 0.92rem;
  font-weight: 600;
}

.past-appointments-filters__select {
  width: 100%;
  border: 1px solid #bfd4dc;
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
}

.past-appointments-filters__actions {
  display: flex;
  gap: 0.75rem;
  align-items: end;
}

.past-appointments-error {
  margin: 0;
  padding: 0.95rem 1rem;
  border-radius: 18px;
  background: rgba(235, 85, 69, 0.12);
  color: #b8392d;
}

@media (max-width: 1100px) {
  .past-appointments-filters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .past-appointments-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .past-appointments-filters {
    grid-template-columns: 1fr;
  }

  .past-appointments-hero__actions :deep(.base-button),
  .past-appointments-filters__actions :deep(.base-button) {
    width: 100%;
  }

  .past-appointments-filters__actions {
    flex-direction: column-reverse;
  }
}
</style>

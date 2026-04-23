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
import RoomForm from "../components/rooms/RoomForm.vue";
import { useAppointments } from "../composables/useAppointments.js";
import { getBranches } from "../services/branchApi.js";
import { createPatient } from "../services/patientApi.js";
import { createRoom, getRooms } from "../services/roomApi.js";
import { isAdministrativeUser } from "../shared/roles.js";
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

const navLinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Sucursales", href: "/branches" },
    { label: "Reservas", href: "/appointments" },
    { label: "Pacientes", href: "/patients" }
];

const modalOpen = ref(false);
const roomModalOpen = ref(false);
const modalMode = ref("create");
const currentAppointment = ref({});
const rooms = ref([]);
const branches = ref([]);
const feedback = ref("");
const modalError = ref("");
const roomModalError = ref("");
const roomSaving = ref(false);
const pageError = ref("");
const shouldOpenReservationAfterRoomCreate = ref(false);
const filters = ref({
    search: "",
    status: "todos"
});

const fullMomentFormatter = new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short"
});

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

const modalTitle = computed(() =>
    modalMode.value === "edit" ? "Editar reserva" : "Nueva reserva"
);

const isAdminUser = computed(() =>
    isAdministrativeUser({
        membershipRole: authStore.membershipRole,
        userRole: authStore.user?.rol
    })
);

const activeBranchOptions = computed(() =>
    branches.value.filter((branch) => branch.estado === "activa")
);

const roomModalDescription = computed(() => {
    const maxRooms = Number(authStore.subscription?.maxRooms ?? 0);

    if (maxRooms > 0) {
        return `Crea una sala activa para usarla en reservas. Tu plan actual permite hasta ${maxRooms} salas.`;
    }

    return "Crea una sala activa para usarla en reservas.";
});

function isReservableRoom(room) {
    return room?.estado === "activa" && room?.disponibilidad === "disponible";
}

const reservableRooms = computed(() => rooms.value.filter((room) => isReservableRoom(room)));

const appointmentRoomOptions = computed(() => {
    const currentRoomId = Number(currentAppointment.value?.salaId ?? 0) || null;

    return rooms.value.filter((room) => {
        if (isReservableRoom(room)) {
            return true;
        }

        return currentRoomId !== null && Number(room.id) === currentRoomId;
    });
});

const filteredAppointments = computed(() => {
    const searchValue = String(filters.value.search ?? "").trim().toLowerCase();

    return appointments.value.filter((appointment) => {
        const matchesStatus =
            filters.value.status === "todos" ||
            appointment.estado === filters.value.status;

        const haystack = [
            appointment.descripcion,
            appointment.tipoConsulta,
            appointment.salaNombre,
            appointment.pacienteNombre,
            appointment.pacienteCorreo,
            appointment.fecha,
            `sala ${appointment.salaId}`,
            `paciente ${appointment.pacienteId}`
        ]
            .join(" ")
            .toLowerCase();

        return matchesStatus && (!searchValue || haystack.includes(searchValue));
    });
});

const nextVisibleAppointment = computed(() =>
    [...filteredAppointments.value]
        .filter((appointment) => {
            const appointmentDate = toAppointmentDate(appointment);
            return Boolean(appointmentDate && appointmentDate.getTime() >= Date.now());
        })
        .sort((left, right) => {
            const leftDate = toAppointmentDate(left)?.getTime() ?? 0;
            const rightDate = toAppointmentDate(right)?.getTime() ?? 0;
            return leftDate - rightDate;
        })[0] ?? null
);

const canceledAppointments = computed(
    () => appointments.value.filter((appointment) => appointment.estado === "cancelada").length
);

const statCards = computed(() => [
    {
        label: "Total",
        value: totalAppointments.value
    },
    {
        label: "Pendientes",
        value: pendingAppointments.value
    },
    {
        label: "Confirmadas",
        value: confirmedAppointments.value
    },
    {
        label: "Canceladas",
        value: canceledAppointments.value
    }
]);

function openCreateModal() {
    pageError.value = "";
    modalMode.value = "create";
    modalError.value = "";

    if (!reservableRooms.value.length) {
        if (isAdminUser.value) {
            shouldOpenReservationAfterRoomCreate.value = true;
            openCreateRoomModal(
                "Primero crea una sala para poder agendar una reserva en esta cuenta."
            );
        } else {
            pageError.value =
                "Aun no hay salas disponibles. Solicita a un administrador que cree una sala antes de reservar.";
        }

        return;
    }

    currentAppointment.value = {
        estado: "pendiente",
        usuarioId: authStore.user?.id ?? null,
        salaId: reservableRooms.value[0]?.id ?? null
    };
    modalOpen.value = true;
}

function openEditModal(appointment) {
    pageError.value = "";
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

function openCreateRoomModal(message = "") {
    if (!isAdminUser.value) {
        pageError.value = "Solo un administrador puede crear salas.";
        return;
    }

    roomModalError.value = message;
    roomModalOpen.value = true;
}

function closeRoomModal() {
    roomModalOpen.value = false;
    roomModalError.value = "";
    shouldOpenReservationAfterRoomCreate.value = false;
}

async function fetchRooms() {
    try {
        const response = await getRooms();
        rooms.value = response.data ?? [];
    } catch (requestError) {
        rooms.value = [];
        pageError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible cargar las salas.";
    }
}

async function fetchBranches() {
    if (!isAdminUser.value) {
        branches.value = [];
        return;
    }

    try {
        const response = await getBranches();
        branches.value = response.data ?? [];
    } catch (requestError) {
        branches.value = [];
        pageError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible cargar las sucursales.";
    }
}

async function handleSaveAppointment(payload) {
    pageError.value = "";
    modalError.value = "";
    let patientId = Number(payload?.paciente?.pacienteId);
    let createdPatient = null;

    if (payload?.paciente?.mode === "new") {
        try {
            const patientResponse = await createPatient({
                nombre: payload.paciente.nombre,
                telefono: payload.paciente.telefono,
                correo: payload.paciente.correo,
                fechaNacimiento: payload.paciente.fechaNacimiento,
                observaciones: payload.paciente.observaciones,
                tipoProcedimiento: payload.paciente.tipoProcedimiento ?? payload.tipoConsulta
            });

            createdPatient = patientResponse.data ?? null;
            patientId = Number(createdPatient?.id);
        } catch (requestError) {
            modalError.value =
                requestError.response?.msg ||
                requestError.message ||
                "No fue posible crear el paciente.";
            return;
        }
    }

    const appointmentPayload = {
        fecha: payload.fecha,
        horaInicio: payload.horaInicio,
        horaFin: payload.horaFin,
        descripcion: payload.descripcion,
        estado: payload.estado,
        tipoConsulta: payload.tipoConsulta,
        usuarioId: Number(payload.usuarioId || authStore.user?.id || 0) || null,
        pacienteId: patientId,
        salaId: Number(payload.salaId)
    };

    const result =
        modalMode.value === "edit" && currentAppointment.value.id
            ? await updateAppointment(currentAppointment.value.id, appointmentPayload)
            : await createAppointment(appointmentPayload);

    if (result.ok) {
        feedback.value = result.msg;
        closeModal();
        return;
    }

    if (createdPatient) {
        currentAppointment.value = {
            ...currentAppointment.value,
            ...appointmentPayload,
            pacienteId: patientId,
            pacienteNombre: createdPatient.nombre,
            pacienteTelefono: createdPatient.telefono,
            pacienteCorreo: createdPatient.correo
        };
    }

    modalError.value = createdPatient
        ? `${result.msg} El paciente ya fue creado y podras reutilizarlo en el siguiente intento.`
        : result.msg;
}

async function handleCreateRoom(payload) {
    roomSaving.value = true;
    roomModalError.value = "";

    try {
        const response = await createRoom(payload);
        const createdRoom = response.data ?? null;
        const shouldResumeReservation = shouldOpenReservationAfterRoomCreate.value;

        roomModalOpen.value = false;
        roomModalError.value = "";
        shouldOpenReservationAfterRoomCreate.value = false;
        pageError.value = "";
        feedback.value = response.msg;

        await Promise.all([fetchRooms(), fetchBranches()]);

        if (shouldResumeReservation) {
            modalMode.value = "create";
            modalError.value = "";
            currentAppointment.value = {
                estado: "pendiente",
                usuarioId: authStore.user?.id ?? null,
                salaId: createdRoom?.id ?? reservableRooms.value[0]?.id ?? null
            };
            modalOpen.value = true;
        }
    } catch (requestError) {
        roomModalError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible crear la sala.";
    } finally {
        roomSaving.value = false;
    }
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

function logout() {
    authStore.logout();
    router.push("/login");
}

async function bootstrapAppointments() {
    pageError.value = "";

    if (!authStore.isHydrated) {
        await authStore.hydrate();
    }

    if (!authStore.isAuthenticated) {
        router.replace("/login");
        return;
    }

    await Promise.all([fetchAppointments(), fetchRooms(), fetchBranches()]);
}

onMounted(() => {
    bootstrapAppointments();
});
</script>

<template>
  <div class="appointments-view page-view">
    <div class="appointments-shell page-shell">
      <AppNavbar
        :links="navLinks"
        brand-href="/dashboard"
        action-label="Cerrar Sesion"
        :show-profile-icon="true"
        @action="logout"
      />

      <main class="appointments-main section-shell">
        <section v-reveal class="appointments-hero">
          <div>
            <span class="appointments-eyebrow">Operacion diaria</span>
            <h1>Reservas y disponibilidad</h1>
            <p>
              Crea, filtra, edita y elimina reservas sin salir del mismo flujo. Si hace
              falta, puedes registrar al paciente desde el modal.
            </p>
          </div>

          <div class="appointments-hero__actions">
            <BaseButton @click="openCreateModal">
              Agendar reserva
            </BaseButton>
            <BaseButton
              v-if="isAdminUser"
              variant="ghost"
              @click="openCreateRoomModal()"
            >
              Crear sala
            </BaseButton>
            <BaseButton variant="ghost" @click="fetchAppointments">
              Actualizar datos
            </BaseButton>
          </div>
        </section>

        <section class="appointments-stats stats-strip">
          <article
            v-for="card in statCards"
            :key="card.label"
            v-reveal="{ delay: 60 }"
            class="appointments-stat-card"
          >
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </article>
        </section>

        <section class="appointments-layout">
          <div class="appointments-content">
            <article v-reveal class="appointments-panel">
              <div class="appointments-panel__header">
                <div>
                  <span class="appointments-panel__eyebrow">Panel principal</span>
                  <h2>Agenda de la cuenta</h2>
                  <p>Usa los filtros para localizar una reserva antes de editarla.</p>
                </div>
              </div>

              <AppointmentFilters
                :search="filters.search"
                :status="filters.status"
                @update:search="filters.search = $event"
                @update:status="filters.status = $event"
                @clear="clearFilters"
              />

              <p v-if="feedback" class="appointments-feedback">{{ feedback }}</p>
              <p
                v-if="pageError && !modalOpen && !roomModalOpen"
                class="appointments-error"
              >
                {{ pageError }}
              </p>
              <p v-if="error && !modalOpen" class="appointments-error">{{ error }}</p>

              <AppointmentTable
                :appointments="filteredAppointments"
                :loading="loading"
                @edit="openEditModal"
                @delete="handleDeleteAppointment"
              />
            </article>
          </div>

          <aside class="appointments-side">
            <article v-reveal="100" class="appointments-side__card">
              <span class="appointments-panel__eyebrow">Proxima visible</span>
              <template v-if="nextVisibleAppointment">
                <h3>{{ nextVisibleAppointment.pacienteNombre || `Paciente #${nextVisibleAppointment.pacienteId}` }}</h3>
                <p>{{ formatAppointmentMoment(nextVisibleAppointment) }}</p>
                <div class="appointments-side__meta">
                  <span>{{ nextVisibleAppointment.salaNombre || `Sala #${nextVisibleAppointment.salaId}` }}</span>
                  <span>{{ nextVisibleAppointment.tipoConsulta }}</span>
                  <span>{{ nextVisibleAppointment.estado }}</span>
                </div>
              </template>
              <template v-else>
                <h3>No hay reservas futuras con los filtros actuales</h3>
                <p>Prueba limpiando filtros o crea una nueva reserva.</p>
              </template>
            </article>

            <article v-reveal="140" class="appointments-side__card">
              <span class="appointments-panel__eyebrow">Guia rapida</span>
              <ul class="appointments-side__list">
                <li>Busca al paciente primero si ya existe en la cuenta.</li>
                <li>Crea el paciente dentro del modal solo cuando haga falta.</li>
                <li>La sala se elige desde un dropdown, ya no con IDs manuales.</li>
                <li v-if="isAdminUser">Solo admin puede crear salas nuevas dentro de la cuenta.</li>
                <li v-else>Si no hay salas disponibles, solicita apoyo a un administrador.</li>
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
      description="Completa la informacion para guardar la reserva."
      @close="closeModal"
    >
      <AppointmentForm
        :initial-value="currentAppointment"
        :submitting="saving"
        :mode="modalMode"
        :error-message="modalError"
        :current-user-id="authStore.user?.id ?? 0"
        :rooms="appointmentRoomOptions"
        @submit="handleSaveAppointment"
        @cancel="closeModal"
      />
    </BaseModal>

    <BaseModal
      :open="roomModalOpen"
      title="Crear sala"
      :description="roomModalDescription"
      @close="closeRoomModal"
    >
      <RoomForm
        :branch-options="activeBranchOptions"
        :submitting="roomSaving"
        :error-message="roomModalError"
        @submit="handleCreateRoom"
        @cancel="closeRoomModal"
      />
    </BaseModal>
  </div>
</template>

<style scoped>
.appointments-main {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.appointments-hero,
.appointments-stat-card,
.appointments-panel,
.appointments-side__card {
  border-radius: 26px;
  border: 1px solid rgba(47, 110, 240, 0.12);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(245, 250, 255, 0.92));
  box-shadow: 0 28px 60px rgba(16, 38, 44, 0.08);
}

.appointments-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.45rem;
  background:
    radial-gradient(circle at top left, rgba(16, 135, 154, 0.12), transparent 42%),
    radial-gradient(circle at top right, rgba(47, 110, 240, 0.09), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(244, 249, 255, 0.92));
}

.appointments-eyebrow,
.appointments-panel__eyebrow {
  display: inline-flex;
  padding: 0.38rem 0.78rem;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(16, 135, 154, 0.12), rgba(47, 110, 240, 0.12));
  color: var(--primary-dark);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.appointments-hero h1,
.appointments-panel__header h2,
.appointments-side__card h3 {
  margin: 0.7rem 0 0;
}

.appointments-hero p,
.appointments-panel__header p,
.appointments-side__card p {
  margin: 0.55rem 0 0;
  color: var(--text-soft);
}

.appointments-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  justify-content: flex-end;
}

.appointments-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.appointments-stat-card {
  padding: 1.1rem 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.appointments-stat-card span,
.appointments-stat-card small {
  color: var(--text-soft);
}

.appointments-stat-card strong {
  font-size: 2rem;
  color: var(--primary-dark);
}

.appointments-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.85fr);
  gap: 1rem;
  align-items: start;
}

.appointments-content {
  min-width: 0;
}

.appointments-panel,
.appointments-side__card {
  padding: 1.2rem;
}

.appointments-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.appointments-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.appointments-feedback,
.appointments-error {
  margin: 0;
  padding: 0.95rem 1rem;
  border-radius: 18px;
}

.appointments-feedback {
  background: linear-gradient(135deg, rgba(16, 135, 154, 0.1), rgba(47, 110, 240, 0.08));
  color: var(--primary-dark);
}

.appointments-error {
  background: rgba(235, 85, 69, 0.12);
  color: #b8392d;
}

.appointments-side {
  display: grid;
  gap: 1rem;
}

.appointments-side__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.9rem;
}

.appointments-side__meta span {
  padding: 0.45rem 0.72rem;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(243, 248, 251, 0.94));
  border: 1px solid rgba(47, 110, 240, 0.1);
  color: var(--text-soft);
}

.appointments-side__list {
  margin: 0.9rem 0 0;
  padding-left: 1rem;
  color: var(--text-soft);
  display: grid;
  gap: 0.7rem;
}

@media (max-width: 980px) {
  .appointments-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .appointments-hero,
  .appointments-panel__header {
    flex-direction: column;
    align-items: stretch;
  }

  .appointments-hero__actions {
    width: 100%;
    justify-content: stretch;
  }

  .appointments-hero__actions :deep(.base-button) {
    width: 100%;
  }
}
</style>

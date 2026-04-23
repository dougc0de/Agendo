<script setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "../components/base/BaseButton.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import { useAppointments } from "../composables/useAppointments.js";
import { getPlanDefinition } from "../shared/plans.js";
import { isAdministrativeUser } from "../shared/roles.js";
import { useAuthStore } from "../stores/authStore.js";

const router = useRouter();
const authStore = useAuthStore();
const {
    appointments,
    loading,
    error,
    totalAppointments,
    pendingAppointments,
    confirmedAppointments,
    fetchAppointments
} = useAppointments();

const dashboardLinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Sucursales", href: "/branches" },
    { label: "Reservas", href: "/appointments" },
    { label: "Pacientes", href: "/patients" }
];

const fullMomentFormatter = new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short"
});

const shortDateFormatter = new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short"
});

const workspaceName = computed(() => authStore.workspace?.nombre ?? "Cuenta AGENDO");
const planDefinition = computed(
    () => getPlanDefinition(authStore.subscription?.planCode) ?? null
);
const isAdminUser = computed(() =>
    isAdministrativeUser({
        membershipRole: authStore.membershipRole,
        userRole: authStore.user?.rol
    })
);

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
    return Number.isNaN(date.getTime())
        ? "Sin fecha"
        : shortDateFormatter.format(date);
}

const todayAppointments = computed(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    return appointments.value.filter((appointment) => {
        const appointmentDate = toAppointmentDate(appointment);

        if (!appointmentDate) {
            return false;
        }

        return (
            appointmentDate.getFullYear() === year &&
            appointmentDate.getMonth() === month &&
            appointmentDate.getDate() === day
        );
    }).length;
});

const nextSevenDaysAppointments = computed(() => {
    const now = new Date();
    const limit = new Date(now);
    limit.setDate(limit.getDate() + 7);

    return appointments.value.filter((appointment) => {
        const appointmentDate = toAppointmentDate(appointment);

        return Boolean(
            appointmentDate &&
            appointmentDate.getTime() >= now.getTime() &&
            appointmentDate.getTime() <= limit.getTime()
        );
    }).length;
});

const upcomingAppointments = computed(() =>
    [...appointments.value]
        .filter((appointment) => {
            const appointmentDate = toAppointmentDate(appointment);
            return Boolean(appointmentDate && appointmentDate.getTime() >= Date.now());
        })
        .sort((left, right) => {
            const leftDate = toAppointmentDate(left)?.getTime() ?? 0;
            const rightDate = toAppointmentDate(right)?.getTime() ?? 0;
            return leftDate - rightDate;
        })
        .slice(0, 5)
);

const recentAppointments = computed(() =>
    [...appointments.value]
        .sort((left, right) => {
            const leftDate = toAppointmentDate(left)?.getTime() ?? 0;
            const rightDate = toAppointmentDate(right)?.getTime() ?? 0;
            return rightDate - leftDate;
        })
        .slice(0, 5)
);

const nextAppointment = computed(() => upcomingAppointments.value[0] ?? null);

const statCards = computed(() => [
    {
        label: "Reservas totales",
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
        label: "Esta semana",
        value: nextSevenDaysAppointments.value
    }
]);

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

    await fetchAppointments();
}

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
              Administra salas, pacientes y reservas con una vista ejecutiva pensada para
              tomar decisiones rapidas.
            </p>

            <div class="dashboard-hero__actions">
              <BaseButton @click="router.push('/appointments')">
                Abrir modulo de reservas
              </BaseButton>
              <BaseButton variant="ghost" @click="router.push('/patients')">
                Gestionar pacientes
              </BaseButton>
            </div>
          </div>

          <div class="dashboard-hero__side">
            <article v-reveal="140" class="dashboard-highlight-card">
              <p class="dashboard-panel__eyebrow">Siguiente reserva</p>

              <template v-if="nextAppointment">
                <strong>{{ nextAppointment.pacienteNombre || `Paciente #${nextAppointment.pacienteId}` }}</strong>
                <p>{{ formatAppointmentMoment(nextAppointment) }}</p>
                <div class="dashboard-highlight-card__meta">
                  <span>{{ nextAppointment.salaNombre || `Sala #${nextAppointment.salaId}` }}</span>
                  <span>{{ nextAppointment.tipoConsulta }}</span>
                  <span class="status-badge" :class="`status-badge--${nextAppointment.estado}`">
                    {{ nextAppointment.estado }}
                  </span>
                </div>
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
                <span>{{ authStore.subscription?.maxUsers ?? "-" }} usuarios</span>
                <span>{{ authStore.subscription?.maxRooms ?? "-" }} salas</span>
                <span>{{ authStore.subscription?.maxReservationsPerMonth ?? "-" }} reservas/mes</span>
              </div>
              <p class="dashboard-plan-card__date">
                Trial o periodo actual: {{ formatDate(authStore.subscription?.trialEndsAt || authStore.subscription?.currentPeriodEndsAt) }}
              </p>
            </article>
          </div>
        </section>

        <section class="dashboard-stats stats-strip">
          <article
            v-for="card in statCards"
            :key="card.label"
            v-reveal="{ delay: 60 }"
            class="dashboard-stat-card"
          >
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </article>
        </section>

        <section class="dashboard-grid">
          <article v-reveal class="dashboard-panel dashboard-panel--wide">
            <div class="dashboard-panel__heading">
              <div>
                <p class="dashboard-panel__eyebrow">Agenda</p>
                <h2>Proximas reservas</h2>
              </div>
              <BaseButton size="sm" variant="ghost" @click="fetchAppointments">
                Actualizar
              </BaseButton>
            </div>

            <p v-if="loading" class="dashboard-state">
              Cargando agenda...
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
                <div>
                  <strong>{{ appointment.pacienteNombre || `Paciente #${appointment.pacienteId}` }}</strong>
                  <p>{{ appointment.descripcion || "Reserva sin descripcion adicional." }}</p>
                </div>
                <div class="dashboard-appointment-item__meta">
                  <span>{{ formatAppointmentMoment(appointment) }}</span>
                  <span>{{ appointment.salaNombre || `Sala #${appointment.salaId}` }}</span>
                </div>
              </li>
            </ul>
            <p v-else class="dashboard-state">
              No hay reservas futuras registradas todavia.
            </p>
          </article>

          <article v-reveal="120" class="dashboard-panel dashboard-panel--wide">
            <div class="dashboard-panel__heading">
              <div>
                <p class="dashboard-panel__eyebrow">Actividad</p>
                <h2>Ultimos movimientos</h2>
              </div>
            </div>

            <ul v-if="recentAppointments.length" class="dashboard-history-list">
              <li
                v-for="appointment in recentAppointments"
                :key="`recent-${appointment.id}`"
                class="dashboard-history-item"
              >
                <div class="dashboard-history-item__date">
                  <strong>{{ shortDateFormatter.format(toAppointmentDate(appointment) || new Date()) }}</strong>
                </div>
                <div>
                  <strong>{{ appointment.tipoConsulta }}</strong>
                  <p>{{ appointment.pacienteNombre || `Paciente #${appointment.pacienteId}` }}</p>
                </div>
                <span class="status-badge" :class="`status-badge--${appointment.estado}`">
                  {{ appointment.estado }}
                </span>
              </li>
            </ul>
            <p v-else class="dashboard-state">
              Aun no hay actividad para mostrar.
            </p>
          </article>
        </section>
      </main>

      <AppFooter />
    </div>
  </div>
</template>

<style scoped>
.dashboard-main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dashboard-hero,
.dashboard-stat-card,
.dashboard-panel {
  border: 1px solid rgba(47, 110, 240, 0.12);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(245, 250, 255, 0.92));
  box-shadow: 0 28px 60px rgba(16, 38, 44, 0.08);
  backdrop-filter: blur(10px);
}

.dashboard-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.95fr);
  gap: 1.25rem;
  padding: 1.5rem;
  background:
    radial-gradient(circle at top left, rgba(16, 135, 154, 0.14), transparent 42%),
    radial-gradient(circle at top right, rgba(47, 110, 240, 0.1), transparent 38%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(244, 249, 255, 0.9));
}

.dashboard-hero__copy {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dashboard-eyebrow,
.dashboard-panel__eyebrow {
  display: inline-flex;
  align-self: flex-start;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(16, 135, 154, 0.12), rgba(47, 110, 240, 0.12));
  color: var(--primary-dark);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.dashboard-hero__copy h1,
.dashboard-panel__heading h2 {
  margin: 0;
}

.dashboard-hero__copy h1 {
  font-size: clamp(2.2rem, 4vw, 3.4rem);
  line-height: 0.98;
  max-width: 11ch;
}

.dashboard-hero__copy p {
  margin: 0;
  max-width: 56ch;
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
  border-radius: 22px;
  padding: 1.2rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(241, 248, 252, 0.92));
  border: 1px solid rgba(47, 110, 240, 0.1);
}

.dashboard-highlight-card strong,
.dashboard-plan-card strong {
  display: block;
  font-size: 1.2rem;
  color: var(--primary-dark);
}

.dashboard-highlight-card p,
.dashboard-plan-card p {
  margin: 0.5rem 0 0;
  color: var(--text-soft);
}

.dashboard-highlight-card__meta,
.dashboard-plan-card__limits {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.85rem;
}

.dashboard-highlight-card__meta span,
.dashboard-plan-card__limits span {
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 249, 252, 0.94));
  border: 1px solid rgba(47, 110, 240, 0.08);
  color: var(--text-soft);
}

.dashboard-plan-card__status {
  text-transform: capitalize;
}

.dashboard-plan-card__date {
  font-size: 0.92rem;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.dashboard-stat-card {
  padding: 1.15rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.dashboard-stat-card span,
.dashboard-stat-card small {
  color: var(--text-soft);
}

.dashboard-stat-card strong {
  font-size: 2rem;
  color: var(--primary-dark);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.9fr);
  gap: 1rem;
}

.dashboard-panel {
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dashboard-panel--wide {
  min-width: 0;
}

.dashboard-panel__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.dashboard-state {
  margin: 0;
  padding: 1rem;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(243, 248, 251, 0.94));
  color: var(--text-soft);
}

.dashboard-state--error {
  background: rgba(235, 85, 69, 0.12);
  color: #b8392d;
}

.dashboard-appointment-list,
.dashboard-history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.dashboard-appointment-item,
.dashboard-history-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(243, 248, 251, 0.94));
  border: 1px solid rgba(47, 110, 240, 0.1);
}

.dashboard-appointment-item strong,
.dashboard-history-item strong {
  color: var(--primary-dark);
}

.dashboard-appointment-item p,
.dashboard-history-item p {
  margin: 0.3rem 0 0;
  color: var(--text-soft);
}

.dashboard-appointment-item__meta {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  text-align: right;
  color: var(--text-soft);
  font-size: 0.92rem;
}

.dashboard-history-item {
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.dashboard-history-item__date {
  min-width: 80px;
  text-align: center;
  padding: 0.75rem 0.9rem;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(16, 135, 154, 0.1), rgba(47, 110, 240, 0.12));
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.38rem 0.72rem;
  border-radius: 999px;
  font-size: 0.84rem;
  text-transform: capitalize;
  white-space: nowrap;
}

.status-badge--pendiente {
  background: rgba(242, 159, 56, 0.16);
  color: #9b6112;
}

.status-badge--confirmada {
  background: linear-gradient(135deg, rgba(16, 135, 154, 0.14), rgba(47, 110, 240, 0.12));
  color: var(--secondary-dark);
}

.status-badge--cancelada {
  background: rgba(235, 85, 69, 0.14);
  color: #b8392d;
}

@media (max-width: 980px) {
  .dashboard-hero,
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .dashboard-hero,
  .dashboard-panel,
  .dashboard-stat-card {
    border-radius: 22px;
  }

  .dashboard-hero__actions {
    width: 100%;
  }

  .dashboard-hero__actions :deep(.base-button) {
    width: 100%;
  }

  .dashboard-panel__heading,
  .dashboard-appointment-item,
  .dashboard-history-item {
    grid-template-columns: 1fr;
  }

  .dashboard-appointment-item__meta {
    text-align: left;
  }

  .dashboard-history-item__date {
    width: fit-content;
  }
}
</style>

<script setup>
import { computed } from "vue";
import { formatLongDayLabel } from "../../utils/appointmentCalendar.js";

const props = defineProps({
    dateKey: {
        type: String,
        default: ""
    },
    appointments: {
        type: Array,
        default: () => []
    },
    summary: {
        type: Object,
        default: () => ({})
    },
    title: {
        type: String,
        default: "Detalle del dia"
    }
});

const emit = defineEmits(["close", "open-appointment"]);

const timeStatusLabels = {
    pasada: "Ya paso",
    en_curso: "En curso",
    proxima_hoy: "Viene hoy",
    programada: "Programada"
};

const headerLabel = computed(() => formatLongDayLabel(props.dateKey));
</script>

<template>
  <section class="appointment-day-panel">
    <div class="appointment-day-panel__header">
      <div>
        <span class="appointment-day-panel__eyebrow">{{ props.title }}</span>
        <h3>{{ headerLabel }}</h3>
      </div>

      <button type="button" class="appointment-day-panel__close" @click="emit('close')">
        Cerrar
      </button>
    </div>

    <div class="appointment-day-panel__stats">
      <span>Total: <strong>{{ props.summary?.total ?? props.appointments.length }}</strong></span>
      <span>Confirmadas: <strong>{{ props.summary?.confirmed ?? 0 }}</strong></span>
      <span>Pendientes: <strong>{{ props.summary?.pending ?? 0 }}</strong></span>
    </div>

    <div v-if="props.appointments.length" class="appointment-day-panel__list">
      <button
        v-for="appointment in props.appointments"
        :key="appointment.id"
        type="button"
        class="appointment-day-panel__item"
        @click="emit('open-appointment', appointment)"
      >
        <div class="appointment-day-panel__item-main">
          <div class="appointment-day-panel__item-order">
            <span class="appointment-day-panel__time">
              {{ appointment.horaInicio }} - {{ appointment.horaFin }}
            </span>
            <span class="appointment-day-panel__chip appointment-day-panel__chip--room">
              {{ appointment.salaNombre || `Sala #${appointment.salaId}` }}
            </span>
            <span class="appointment-day-panel__chip appointment-day-panel__chip--type">
              {{ appointment.tipoConsulta }}
            </span>
          </div>

          <div>
            <strong>{{ appointment.pacienteNombre || `Paciente #${appointment.pacienteId}` }}</strong>
            <p>{{ appointment.descripcion || "Reserva operativa del dia." }}</p>
          </div>

          <div class="appointment-day-panel__meta">
            <span
              class="appointment-day-panel__chip"
              :class="`appointment-day-panel__chip--${appointment.estado}`"
            >
              {{ appointment.estado }}
            </span>
            <span
              class="appointment-day-panel__chip"
              :class="`appointment-day-panel__chip--time-${appointment.timeStatus}`"
            >
              {{ timeStatusLabels[appointment.timeStatus] ?? "Programada" }}
            </span>
          </div>
        </div>
      </button>
    </div>

    <p v-else class="appointment-day-panel__empty">
      No hay reservas para esta fecha.
    </p>
  </section>
</template>

<style scoped>
.appointment-day-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.appointment-day-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.appointment-day-panel__eyebrow {
  display: inline-flex;
  padding: 0.35rem 0.72rem;
  border-radius: 999px;
  background: var(--hero-chip-bg);
  color: var(--primary-dark);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.appointment-day-panel__header h3 {
  margin: 0.65rem 0 0;
  color: var(--primary-dark);
  text-transform: capitalize;
}

.appointment-day-panel__close {
  border: none;
  background: transparent;
  color: var(--primary-dark);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.appointment-day-panel__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.appointment-day-panel__stats span {
  padding: 0.42rem 0.7rem;
  border-radius: 999px;
  background: var(--hero-surface-alt);
  border: 1px solid rgba(17, 184, 159, 0.12);
  color: var(--text-soft);
}

.appointment-day-panel__stats strong {
  color: var(--primary-dark);
}

.appointment-day-panel__list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.appointment-day-panel__item {
  border: 1px solid rgba(17, 184, 159, 0.12);
  border-radius: 20px;
  background: #fff;
  padding: 1rem;
  text-align: left;
  cursor: pointer;
  box-shadow: inset 4px 0 0 rgba(17, 184, 159, 0.18);
}

.appointment-day-panel__item-main {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.appointment-day-panel__item-order {
  display: flex;
  flex-wrap: wrap;
  gap: 0.48rem;
}

.appointment-day-panel__time {
  display: inline-flex;
  color: var(--text-soft);
  font-size: 0.82rem;
  margin-bottom: 0.32rem;
}

.appointment-day-panel__item strong {
  display: block;
  color: var(--primary-dark);
}

.appointment-day-panel__item p {
  margin: 0.3rem 0 0;
  color: var(--text-soft);
}

.appointment-day-panel__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.48rem;
}

.appointment-day-panel__chip {
  display: inline-flex;
  align-items: center;
  padding: 0.38rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  background: var(--hero-surface-alt);
  color: var(--text-soft);
}

.appointment-day-panel__chip--room {
  border: 1px solid rgba(17, 184, 159, 0.1);
}

.appointment-day-panel__chip--type {
  background: #edf5fb;
  color: var(--primary-dark);
}

.appointment-day-panel__chip--pendiente {
  background: rgba(242, 159, 56, 0.16);
  color: #9b6112;
}

.appointment-day-panel__chip--confirmada {
  background: rgba(17, 184, 159, 0.14);
  color: var(--secondary-dark);
}

.appointment-day-panel__chip--cancelada {
  background: rgba(235, 85, 69, 0.14);
  color: #b8392d;
}

.appointment-day-panel__chip--time-pasada {
  background: #eef2f4;
  color: #5c7384;
}

.appointment-day-panel__chip--time-en_curso {
  background: #e7faf2;
  color: #0a7d6f;
}

.appointment-day-panel__chip--time-proxima_hoy {
  background: #edf4ff;
  color: #1f5078;
}

.appointment-day-panel__chip--time-programada {
  background: #fff4ec;
  color: #b5622e;
}

.appointment-day-panel__empty {
  margin: 0;
  padding: 1rem;
  border-radius: 18px;
  background: var(--hero-surface-alt);
  color: var(--text-soft);
}
</style>

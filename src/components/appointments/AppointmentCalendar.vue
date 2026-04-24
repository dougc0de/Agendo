<script setup>
import { computed } from "vue";
import BaseButton from "../base/BaseButton.vue";
import {
    WEEKDAY_LABELS,
    formatLongDayLabel,
    formatMonthLabel,
    formatShortDayLabel,
    getDayTone,
    getMonthGrid,
    getWeekDays,
    isDateInMonth,
    isSameDateKey,
    mapSummaryByDate,
    groupAppointmentsByDate
} from "../../utils/appointmentCalendar.js";

const props = defineProps({
    scale: {
        type: String,
        default: "month"
    },
    activeDate: {
        type: String,
        default: ""
    },
    summaryByDate: {
        type: Array,
        default: () => []
    },
    items: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    },
    error: {
        type: String,
        default: ""
    }
});

const emit = defineEmits([
    "navigate",
    "today",
    "change-scale",
    "select-date",
    "select-appointment",
    "refresh"
]);

const summaryMap = computed(() => mapSummaryByDate(props.summaryByDate));
const appointmentsByDate = computed(() => groupAppointmentsByDate(props.items));
const monthWeeks = computed(() => getMonthGrid(props.activeDate));
const weekDays = computed(() => getWeekDays(props.activeDate));

const toolbarLabel = computed(() => {
    if (props.scale === "day") {
        return formatLongDayLabel(props.activeDate);
    }

    if (props.scale === "week") {
        const firstDay = weekDays.value[0];
        const lastDay = weekDays.value[weekDays.value.length - 1];
        return `${formatShortDayLabel(firstDay)} - ${formatShortDayLabel(lastDay)}`;
    }

    return formatMonthLabel(props.activeDate);
});

function countLabel(summary) {
    if (!summary?.total) {
        return "Sin reservas";
    }

    return summary.total === 1 ? "1 reserva" : `${summary.total} reservas`;
}
</script>

<template>
  <section class="appointment-calendar">
    <div class="appointment-calendar__toolbar">
      <div class="appointment-calendar__toolbar-left">
        <div class="appointment-calendar__nav">
          <BaseButton size="sm" variant="ghost" @click="emit('navigate', -1)">
            Anterior
          </BaseButton>
          <BaseButton size="sm" variant="ghost" @click="emit('today')">
            Hoy
          </BaseButton>
          <BaseButton size="sm" variant="ghost" @click="emit('navigate', 1)">
            Siguiente
          </BaseButton>
        </div>
        <div class="appointment-calendar__heading">
          <span class="appointment-calendar__eyebrow">Calendario operativo</span>
          <strong>{{ toolbarLabel }}</strong>
        </div>
      </div>

      <div class="appointment-calendar__toolbar-right">
        <div class="appointment-calendar__scale-switch">
          <button
            type="button"
            class="appointment-calendar__scale-button"
            :class="{ 'is-active': props.scale === 'month' }"
            @click="emit('change-scale', 'month')"
          >
            Mes
          </button>
          <button
            type="button"
            class="appointment-calendar__scale-button"
            :class="{ 'is-active': props.scale === 'week' }"
            @click="emit('change-scale', 'week')"
          >
            Semana
          </button>
          <button
            type="button"
            class="appointment-calendar__scale-button"
            :class="{ 'is-active': props.scale === 'day' }"
            @click="emit('change-scale', 'day')"
          >
            Dia
          </button>
        </div>

        <BaseButton size="sm" variant="ghost" @click="emit('refresh')">
          Actualizar
        </BaseButton>
      </div>
    </div>

    <p v-if="props.loading" class="appointment-calendar__state">
      Cargando calendario...
    </p>
    <p v-else-if="props.error" class="appointment-calendar__state appointment-calendar__state--error">
      {{ props.error }}
    </p>

    <div v-else-if="props.scale === 'month'" class="appointment-calendar__month">
      <div class="appointment-calendar__weekday-row">
        <span v-for="weekday in WEEKDAY_LABELS" :key="weekday">
          {{ weekday }}
        </span>
      </div>

      <div
        v-for="(week, weekIndex) in monthWeeks"
        :key="`week-${weekIndex}`"
        class="appointment-calendar__month-row"
      >
        <button
          v-for="dateKey in week"
          :key="dateKey"
          type="button"
          class="appointment-calendar__day-cell"
          :class="[
            `appointment-calendar__day-cell--${getDayTone(summaryMap[dateKey])}`,
            {
              'is-muted': !isDateInMonth(dateKey, props.activeDate),
              'is-selected': isSameDateKey(dateKey, props.activeDate)
            }
          ]"
          @click="emit('select-date', dateKey)"
        >
          <span class="appointment-calendar__day-number">
            {{ dateKey.slice(-2) }}
          </span>
          <strong v-if="summaryMap[dateKey]?.total">{{ summaryMap[dateKey].total }}</strong>
          <small>{{ countLabel(summaryMap[dateKey]) }}</small>
        </button>
      </div>
    </div>

    <div v-else-if="props.scale === 'week'" class="appointment-calendar__week">
      <article
        v-for="dateKey in weekDays"
        :key="dateKey"
        class="appointment-calendar__week-day"
      >
        <button
          type="button"
          class="appointment-calendar__week-header"
          :class="{ 'is-selected': isSameDateKey(dateKey, props.activeDate) }"
          @click="emit('select-date', dateKey)"
        >
          <span>{{ formatShortDayLabel(dateKey) }}</span>
          <strong>{{ summaryMap[dateKey]?.total ?? 0 }}</strong>
        </button>

        <div v-if="appointmentsByDate[dateKey]?.length" class="appointment-calendar__week-cards">
          <button
            v-for="appointment in appointmentsByDate[dateKey]"
            :key="appointment.id"
            type="button"
            class="appointment-calendar__appointment-card"
            @click="emit('select-appointment', appointment)"
          >
            <span>{{ appointment.horaInicio }} - {{ appointment.horaFin }}</span>
            <strong>{{ appointment.pacienteNombre || `Paciente #${appointment.pacienteId}` }}</strong>
            <small>{{ appointment.salaNombre || `Sala #${appointment.salaId}` }}</small>
          </button>
        </div>

        <button
          v-else
          type="button"
          class="appointment-calendar__week-empty"
          @click="emit('select-date', dateKey)"
        >
          Sin reservas
        </button>
      </article>
    </div>

    <div v-else class="appointment-calendar__day-mode">
      <div class="appointment-calendar__day-header">
        <button
          type="button"
          class="appointment-calendar__day-summary"
          @click="emit('select-date', props.activeDate)"
        >
          <span>{{ formatLongDayLabel(props.activeDate) }}</span>
          <strong>{{ summaryMap[props.activeDate]?.total ?? 0 }} reservas</strong>
        </button>
      </div>

      <div v-if="appointmentsByDate[props.activeDate]?.length" class="appointment-calendar__day-list">
        <button
          v-for="appointment in appointmentsByDate[props.activeDate]"
          :key="appointment.id"
          type="button"
          class="appointment-calendar__day-item"
          @click="emit('select-appointment', appointment)"
        >
          <div>
            <span>{{ appointment.horaInicio }} - {{ appointment.horaFin }}</span>
            <strong>{{ appointment.pacienteNombre || `Paciente #${appointment.pacienteId}` }}</strong>
          </div>
          <small>{{ appointment.tipoConsulta }}</small>
        </button>
      </div>

      <button
        v-else
        type="button"
        class="appointment-calendar__week-empty"
        @click="emit('select-date', props.activeDate)"
      >
        No hay reservas para esta fecha
      </button>
    </div>
  </section>
</template>

<style scoped>
.appointment-calendar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.appointment-calendar__toolbar {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.appointment-calendar__toolbar-left,
.appointment-calendar__toolbar-right {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  align-items: center;
}

.appointment-calendar__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.appointment-calendar__heading {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.appointment-calendar__heading strong {
  font-size: 1.12rem;
  color: var(--primary-dark);
  text-transform: capitalize;
}

.appointment-calendar__eyebrow {
  color: var(--text-soft);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
}

.appointment-calendar__scale-switch {
  display: inline-flex;
  padding: 0.24rem;
  border-radius: 999px;
  background: var(--hero-surface-alt);
  border: 1px solid rgba(17, 184, 159, 0.12);
}

.appointment-calendar__scale-button {
  border: none;
  background: transparent;
  color: var(--text-soft);
  font: inherit;
  font-weight: 600;
  padding: 0.48rem 0.8rem;
  border-radius: 999px;
  cursor: pointer;
}

.appointment-calendar__scale-button.is-active {
  background: linear-gradient(135deg, rgba(17, 47, 71, 0.96), rgba(31, 80, 120, 0.92));
  color: #fff;
}

.appointment-calendar__state {
  margin: 0;
  padding: 1rem;
  border-radius: 18px;
  background: var(--hero-surface-alt);
  color: var(--text-soft);
}

.appointment-calendar__state--error {
  background: rgba(235, 85, 69, 0.12);
  color: #b8392d;
}

.appointment-calendar__weekday-row,
.appointment-calendar__month-row {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.55rem;
}

.appointment-calendar__weekday-row span {
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  text-align: center;
}

.appointment-calendar__month {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.appointment-calendar__day-cell {
  min-height: 106px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  border-radius: 20px;
  background: #fff;
  padding: 0.7rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3rem;
  cursor: pointer;
  text-align: left;
}

.appointment-calendar__day-cell strong {
  font-size: 1.2rem;
  color: var(--primary-dark);
}

.appointment-calendar__day-cell small {
  color: var(--text-soft);
  font-size: 0.78rem;
}

.appointment-calendar__day-number {
  font-weight: 700;
  color: var(--text);
}

.appointment-calendar__day-cell.is-muted {
  opacity: 0.58;
}

.appointment-calendar__day-cell.is-selected,
.appointment-calendar__week-header.is-selected {
  box-shadow: 0 0 0 2px rgba(17, 184, 159, 0.24);
}

.appointment-calendar__day-cell--empty {
  background: #fff;
}

.appointment-calendar__day-cell--in-progress {
  background: #eefbf7;
}

.appointment-calendar__day-cell--pending {
  background: #fff5ea;
}

.appointment-calendar__day-cell--confirmed,
.appointment-calendar__day-cell--scheduled {
  background: #f1f8fc;
}

.appointment-calendar__day-cell--cancelled {
  background: #fff1ef;
}

.appointment-calendar__week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.8rem;
}

.appointment-calendar__week-day {
  min-width: 0;
  border: 1px solid rgba(17, 184, 159, 0.12);
  border-radius: 22px;
  background: #fff;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.appointment-calendar__week-header,
.appointment-calendar__day-summary {
  border: none;
  background: var(--hero-surface-alt);
  border-radius: 16px;
  padding: 0.85rem;
  text-align: left;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: center;
  cursor: pointer;
  color: var(--text);
}

.appointment-calendar__week-header strong,
.appointment-calendar__day-summary strong {
  color: var(--primary-dark);
}

.appointment-calendar__week-cards,
.appointment-calendar__day-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.appointment-calendar__appointment-card,
.appointment-calendar__day-item,
.appointment-calendar__week-empty {
  width: 100%;
  border: 1px solid rgba(17, 184, 159, 0.12);
  border-radius: 16px;
  background: #f8fbfc;
  padding: 0.78rem 0.82rem;
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  text-align: left;
  cursor: pointer;
  color: var(--text);
}

.appointment-calendar__appointment-card span,
.appointment-calendar__day-item span {
  color: var(--text-soft);
  font-size: 0.82rem;
}

.appointment-calendar__appointment-card strong,
.appointment-calendar__day-item strong {
  color: var(--primary-dark);
}

.appointment-calendar__appointment-card small,
.appointment-calendar__day-item small {
  color: var(--text-soft);
}

.appointment-calendar__day-mode {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

@media (max-width: 1100px) {
  .appointment-calendar__week {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .appointment-calendar__toolbar {
    flex-direction: column;
  }

  .appointment-calendar__toolbar-left,
  .appointment-calendar__toolbar-right {
    width: 100%;
    justify-content: space-between;
  }

  .appointment-calendar__toolbar-right {
    flex-direction: column;
    align-items: stretch;
  }

  .appointment-calendar__scale-switch {
    width: 100%;
    justify-content: space-between;
  }

  .appointment-calendar__scale-button {
    flex: 1;
  }

  .appointment-calendar__weekday-row span {
    font-size: 0.7rem;
  }

  .appointment-calendar__month-row,
  .appointment-calendar__weekday-row {
    gap: 0.3rem;
  }

  .appointment-calendar__day-cell {
    min-height: 76px;
    padding: 0.45rem;
    border-radius: 14px;
  }

  .appointment-calendar__day-cell strong {
    font-size: 0.96rem;
  }

  .appointment-calendar__day-cell small {
    font-size: 0.68rem;
    line-height: 1.15;
  }

  .appointment-calendar__week {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup>
import BaseButton from "../base/BaseButton.vue";

const props = defineProps({
    appointments: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    },
    showActions: {
        type: Boolean,
        default: true
    },
    showUser: {
        type: Boolean,
        default: false
    },
    showOutcome: {
        type: Boolean,
        default: true
    },
    showEditAction: {
        type: Boolean,
        default: true
    },
    showDeleteAction: {
        type: Boolean,
        default: true
    },
    editActionLabel: {
        type: String,
        default: "Editar"
    },
    deleteActionLabel: {
        type: String,
        default: "Eliminar"
    },
    emptyMessage: {
        type: String,
        default: "No hay reservas registradas todavia."
    }
});

defineEmits(["edit", "delete"]);

function appointmentTimeRange(appointment) {
    return `${appointment.horaInicio} - ${appointment.horaFin}`;
}

function formatOutcome(outcome) {
    return (
        {
            pendiente: "Pendiente",
            atendida: "Atendida",
            no_show: "No-show",
            cancelada: "Cancelada"
        }[outcome] ?? outcome ?? "Pendiente"
    );
}
</script>

<template>
  <div class="appointment-table">
    <div v-if="props.loading" class="appointment-table__state">
      Cargando reservas...
    </div>

    <div v-else-if="!props.appointments.length" class="appointment-table__state">
      {{ props.emptyMessage }}
    </div>

    <div v-else class="appointment-table__content">
      <div class="appointment-table__cards">
        <article
          v-for="appointment in props.appointments"
          :key="`card-${appointment.id}`"
          class="appointment-table__card"
        >
          <div class="appointment-table__card-order">
            <span class="appointment-table__chip appointment-table__chip--time">
              {{ appointment.fecha }}
            </span>
            <span class="appointment-table__chip appointment-table__chip--time">
              {{ appointmentTimeRange(appointment) }}
            </span>
            <span class="appointment-table__chip">
              {{ appointment.salaNombre || `Sala #${appointment.salaId}` }}
            </span>
          </div>

          <strong>{{ appointment.pacienteNombre || `Paciente #${appointment.pacienteId}` }}</strong>
          <p>{{ appointment.tipoConsulta }}</p>

          <div class="appointment-table__card-meta">
            <span v-if="props.showUser">
              {{ appointment.usuarioNombre || `Usuario #${appointment.usuarioId}` }}
            </span>
            <span
              v-if="props.showOutcome"
              class="appointment-table__badge appointment-table__badge--outcome"
              :class="`appointment-table__badge--outcome-${appointment.appointmentOutcome || 'pendiente'}`"
            >
              {{ formatOutcome(appointment.appointmentOutcome) }}
            </span>
            <span
              class="appointment-table__badge"
              :class="`appointment-table__badge--${appointment.estado}`"
            >
              {{ appointment.estado }}
            </span>
          </div>

          <div v-if="props.showActions" class="appointment-table__card-actions">
            <BaseButton
              v-if="props.showEditAction"
              size="sm"
              variant="warning"
              @click="$emit('edit', appointment)"
            >
              {{ props.editActionLabel }}
            </BaseButton>
            <BaseButton
              v-if="props.showDeleteAction"
              size="sm"
              variant="danger"
              @click="$emit('delete', appointment)"
            >
              {{ props.deleteActionLabel }}
            </BaseButton>
          </div>
        </article>
      </div>

      <div class="appointment-table__scroll">
        <table class="appointment-table__table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Fecha</th>
              <th>Sala</th>
              <th>Tiempo de reserva</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th v-if="props.showOutcome">Resultado</th>
              <th v-if="props.showUser">Usuario</th>
              <th v-if="props.showActions">Opciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="appointment in props.appointments" :key="appointment.id">
              <td>{{ appointment.pacienteNombre || `Paciente #${appointment.pacienteId}` }}</td>
              <td>{{ appointment.fecha }}</td>
              <td>{{ appointment.salaNombre || `Sala #${appointment.salaId}` }}</td>
              <td>{{ appointmentTimeRange(appointment) }}</td>
              <td>{{ appointment.tipoConsulta }}</td>
              <td>
                <span
                  class="appointment-table__badge"
                  :class="`appointment-table__badge--${appointment.estado}`"
                >
                  {{ appointment.estado }}
                </span>
              </td>
              <td v-if="props.showOutcome">
                <span
                  class="appointment-table__badge appointment-table__badge--outcome"
                  :class="`appointment-table__badge--outcome-${appointment.appointmentOutcome || 'pendiente'}`"
                >
                  {{ formatOutcome(appointment.appointmentOutcome) }}
                </span>
              </td>
              <td v-if="props.showUser">{{ appointment.usuarioNombre || `Usuario #${appointment.usuarioId}` }}</td>
              <td v-if="props.showActions" class="appointment-table__actions-cell">
                <div class="appointment-table__actions">
                  <BaseButton
                    v-if="props.showEditAction"
                    size="sm"
                    variant="warning"
                    @click="$emit('edit', appointment)"
                  >
                    {{ props.editActionLabel }}
                  </BaseButton>
                  <BaseButton
                    v-if="props.showDeleteAction"
                    size="sm"
                    variant="danger"
                    @click="$emit('delete', appointment)"
                  >
                    {{ props.deleteActionLabel }}
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.appointment-table {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.appointment-table__content {
  display: flex;
  flex-direction: column;
}

.appointment-table__state {
  padding: 2rem 1.2rem;
  text-align: center;
  color: var(--text-soft);
}

.appointment-table__cards {
  display: none;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem;
}

.appointment-table__card {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem;
  border-radius: 18px;
  background: #f9fcfd;
  border: 1px solid rgba(17, 184, 159, 0.12);
  box-shadow: inset 4px 0 0 rgba(17, 184, 159, 0.16);
}

.appointment-table__card strong {
  color: var(--primary-dark);
}

.appointment-table__card p {
  margin: 0;
  color: var(--text-soft);
}

.appointment-table__card-order,
.appointment-table__card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
}

.appointment-table__card-meta {
  justify-content: space-between;
}

.appointment-table__card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.appointment-table__chip {
  display: inline-flex;
  align-items: center;
  padding: 0.38rem 0.68rem;
  border-radius: 999px;
  background: #f4f8fa;
  border: 1px solid rgba(17, 184, 159, 0.1);
  color: var(--text-soft);
  font-size: 0.84rem;
}

.appointment-table__chip--time {
  background: #edf5fb;
  color: var(--primary-dark);
}

.appointment-table__scroll {
  overflow-x: auto;
}

.appointment-table__table {
  width: 100%;
  border-collapse: collapse;
}

.appointment-table th,
.appointment-table td {
  padding: 1rem 1rem;
  text-align: left;
  border-bottom: 1px solid #e2edf1;
  vertical-align: middle;
}

.appointment-table th {
  color: var(--text);
  font-size: 0.95rem;
  background: #f8fbfc;
}

.appointment-table__badge {
  display: inline-block;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  font-size: 0.82rem;
  text-transform: capitalize;
}

.appointment-table__badge--pendiente {
  background: rgba(242, 159, 56, 0.15);
  color: #9b6112;
}

.appointment-table__badge--confirmada {
  background: rgba(17, 184, 159, 0.16);
  color: var(--primary-dark);
}

.appointment-table__badge--cancelada {
  background: rgba(235, 85, 69, 0.14);
  color: #b8392d;
}

.appointment-table__badge--outcome {
  margin-inline-end: 0.35rem;
}

.appointment-table__badge--outcome-pendiente {
  background: rgba(151, 169, 181, 0.18);
  color: #50616d;
}

.appointment-table__badge--outcome-atendida {
  background: rgba(17, 184, 159, 0.16);
  color: var(--primary-dark);
}

.appointment-table__badge--outcome-no_show {
  background: rgba(242, 159, 56, 0.18);
  color: #9b6112;
}

.appointment-table__badge--outcome-cancelada {
  background: rgba(235, 85, 69, 0.14);
  color: #b8392d;
}

.appointment-table__actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  width: max-content;
  margin: 0 auto;
}

.appointment-table__actions-cell {
  text-align: center;
}

@media (max-width: 920px) {
  .appointment-table__table {
    min-width: 780px;
  }
}

@media (max-width: 760px) {
  .appointment-table__cards {
    display: flex;
  }

  .appointment-table__scroll {
    display: none;
  }

  .appointment-table__card-actions :deep(.base-button) {
    flex: 1 1 160px;
  }
}
</style>

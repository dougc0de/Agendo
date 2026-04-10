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
    }
});

defineEmits(["edit", "delete"]);

function appointmentTimeRange(appointment) {
    return `${appointment.horaInicio} - ${appointment.horaFin}`;
}
</script>

<template>
  <div class="appointment-table">
    <div v-if="props.loading" class="appointment-table__state">
      Cargando reservas...
    </div>

    <div v-else-if="!props.appointments.length" class="appointment-table__state">
      No hay reservas registradas todavia.
    </div>

    <table v-else class="appointment-table__table">
      <thead>
        <tr>
          <th>Sala</th>
          <th>Fecha</th>
          <th>Tiempo de reserva</th>
          <th>Paciente</th>
          <th>Tipo</th>
          <th>Estado</th>
          <th>Opciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="appointment in props.appointments" :key="appointment.id">
          <td>{{ `Sala #${appointment.salaId}` }}</td>
          <td>{{ appointment.fecha }}</td>
          <td>{{ appointmentTimeRange(appointment) }}</td>
          <td>{{ `Paciente #${appointment.pacienteId}` }}</td>
          <td>{{ appointment.tipoConsulta }}</td>
          <td>
            <span
              class="appointment-table__badge"
              :class="`appointment-table__badge--${appointment.estado}`"
            >
              {{ appointment.estado }}
            </span>
          </td>
          <td>
            <div class="appointment-table__actions">
              <BaseButton size="sm" variant="warning" @click="$emit('edit', appointment)">
                Editar
              </BaseButton>
              <BaseButton size="sm" variant="danger" @click="$emit('delete', appointment)">
                Eliminar
              </BaseButton>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.appointment-table {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.appointment-table__state {
  padding: 2rem 1.2rem;
  text-align: center;
  color: var(--text-soft);
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
  background: rgba(95, 135, 151, 0.16);
  color: var(--primary-dark);
}

.appointment-table__badge--cancelada {
  background: rgba(235, 85, 69, 0.14);
  color: #b8392d;
}

.appointment-table__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

@media (max-width: 920px) {
  .appointment-table {
    overflow-x: auto;
  }

  .appointment-table__table {
    min-width: 780px;
  }
}
</style>

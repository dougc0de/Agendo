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
        default: false
    },
    showPayment: {
        type: Boolean,
        default: false
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

const timeStatusLabels = {
    pasada: "Ya paso",
    en_curso: "En curso",
    proxima_hoy: "Viene hoy",
    programada: "Programada"
};

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

function formatPaymentLabel(appointment) {
    return appointment.paymentLabel || "No pagado";
}

function formatPaymentDetail(appointment) {
    return appointment.paymentDetailLabel || appointment.financialStatus || null;
}

function paymentBadgeClass(appointment) {
    return `appointment-table__badge--payment-${appointment.financialStatus || "sin_factura"}`;
}

function formatTimeStatusLabel(appointment) {
    return timeStatusLabels[appointment?.timeStatus] ?? null;
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
          <div class="appointment-table__card-header">
            <div class="appointment-table__card-order">
              <span class="appointment-table__chip appointment-table__chip--date">
                {{ appointment.fecha }}
              </span>
              <span class="appointment-table__chip appointment-table__chip--time">
                {{ appointmentTimeRange(appointment) }}
              </span>
            </div>

            <div class="appointment-table__card-meta">
              <span
                class="appointment-table__badge"
                :class="`appointment-table__badge--${appointment.estado}`"
              >
                {{ appointment.estado }}
              </span>
              <span
                v-if="props.showOutcome"
                class="appointment-table__badge appointment-table__badge--outcome"
                :class="`appointment-table__badge--outcome-${appointment.appointmentOutcome || 'pendiente'}`"
              >
                {{ formatOutcome(appointment.appointmentOutcome) }}
              </span>
              <span
                v-if="props.showPayment"
                class="appointment-table__badge appointment-table__badge--payment"
                :class="paymentBadgeClass(appointment)"
              >
                {{ formatPaymentLabel(appointment) }}
              </span>
            </div>
          </div>

          <div class="appointment-table__card-identity">
            <strong>{{ appointment.pacienteNombre || `Paciente #${appointment.pacienteId}` }}</strong>
            <p>{{ appointment.descripcion || "Reserva lista para atencion." }}</p>
          </div>

          <div class="appointment-table__card-grid">
            <div class="appointment-table__data-point">
              <span>Procedimiento</span>
              <strong>{{ appointment.tipoConsulta || "Sin detalle" }}</strong>
            </div>
            <div class="appointment-table__data-point">
              <span>Sala</span>
              <strong>{{ appointment.salaNombre || `Sala #${appointment.salaId}` }}</strong>
            </div>
            <div v-if="props.showUser" class="appointment-table__data-point">
              <span>Responsable</span>
              <strong>{{ appointment.usuarioNombre || `Usuario #${appointment.usuarioId}` }}</strong>
            </div>
            <div v-if="props.showPayment" class="appointment-table__data-point">
              <span>Cobro</span>
              <strong>{{ formatPaymentLabel(appointment) }}</strong>
              <small v-if="formatPaymentDetail(appointment)">
                {{ formatPaymentDetail(appointment) }}
              </small>
            </div>
            <div v-if="formatTimeStatusLabel(appointment)" class="appointment-table__data-point">
              <span>Momento</span>
              <strong>{{ formatTimeStatusLabel(appointment) }}</strong>
            </div>
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
              <th>Fecha</th>
              <th>Hora</th>
              <th>Paciente</th>
              <th>Procedimiento</th>
              <th>Sala</th>
              <th>Estado</th>
              <th v-if="props.showPayment">Cobro</th>
              <th v-if="props.showOutcome">Resultado</th>
              <th v-if="props.showUser">Responsable</th>
              <th v-if="props.showActions">Opciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="appointment in props.appointments" :key="appointment.id">
              <td>{{ appointment.fecha }}</td>
              <td>
                <strong>{{ appointmentTimeRange(appointment) }}</strong>
                <small v-if="formatTimeStatusLabel(appointment)">
                  {{ formatTimeStatusLabel(appointment) }}
                </small>
              </td>
              <td>
                <strong>{{ appointment.pacienteNombre || `Paciente #${appointment.pacienteId}` }}</strong>
                <small>{{ appointment.descripcion || "Reserva operativa." }}</small>
              </td>
              <td>{{ appointment.tipoConsulta || "Sin detalle" }}</td>
              <td>{{ appointment.salaNombre || `Sala #${appointment.salaId}` }}</td>
              <td>
                <div class="appointment-table__status-stack">
                  <span
                    class="appointment-table__badge"
                    :class="`appointment-table__badge--${appointment.estado}`"
                  >
                    {{ appointment.estado }}
                  </span>
                </div>
              </td>
              <td v-if="props.showPayment">
                <div class="appointment-table__payment">
                  <span
                    class="appointment-table__badge appointment-table__badge--payment"
                    :class="paymentBadgeClass(appointment)"
                  >
                    {{ formatPaymentLabel(appointment) }}
                  </span>
                  <small v-if="formatPaymentDetail(appointment)">
                    {{ formatPaymentDetail(appointment) }}
                  </small>
                </div>
              </td>
              <td v-if="props.showOutcome">
                <span
                  class="appointment-table__badge appointment-table__badge--outcome"
                  :class="`appointment-table__badge--outcome-${appointment.appointmentOutcome || 'pendiente'}`"
                >
                  {{ formatOutcome(appointment.appointmentOutcome) }}
                </span>
              </td>
              <td v-if="props.showUser">
                {{ appointment.usuarioNombre || `Usuario #${appointment.usuarioId}` }}
              </td>
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
  border-radius: 24px;
  border: 1px solid rgba(17, 184, 159, 0.12);
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
  gap: 1rem;
  padding: 1rem;
}

.appointment-table__card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border-radius: 22px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbfc 100%);
  border: 1px solid rgba(17, 184, 159, 0.14);
  box-shadow: 0 16px 32px rgba(16, 38, 44, 0.06);
}

.appointment-table__card-header,
.appointment-table__card-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.85rem;
}

.appointment-table__card-identity {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.appointment-table__card strong,
.appointment-table__data-point strong {
  color: var(--primary-dark);
}

.appointment-table__card p {
  margin: 0;
  color: var(--text-soft);
}

.appointment-table__card-order,
.appointment-table__card-meta,
.appointment-table__status-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
}

.appointment-table__card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
  padding: 0.95rem 0;
  border-top: 1px solid #e1ecef;
  border-bottom: 1px solid #e1ecef;
}

.appointment-table__data-point {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
  min-width: 0;
}

.appointment-table__data-point span,
.appointment-table__data-point small {
  color: var(--text-soft);
  font-size: 0.82rem;
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

.appointment-table__chip--date {
  background: #f4f7f9;
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

.appointment-table th:not(:last-child),
.appointment-table td:not(:last-child) {
  border-inline-end: 1px solid #eef4f6;
}

.appointment-table th {
  color: var(--text);
  font-size: 0.95rem;
  background: #f8fbfc;
  white-space: nowrap;
}

.appointment-table tbody tr {
  transition: background-color 160ms ease;
}

.appointment-table tbody tr:hover {
  background: #fbfdfe;
}

.appointment-table td strong {
  display: block;
  color: var(--primary-dark);
}

.appointment-table td small {
  display: block;
  margin-top: 0.3rem;
  color: var(--text-soft);
  font-size: 0.82rem;
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

.appointment-table__payment {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.appointment-table__payment small {
  color: var(--text-soft);
  text-transform: capitalize;
}

.appointment-table__badge--payment-pagado {
  background: rgba(17, 184, 159, 0.16);
  color: var(--primary-dark);
}

.appointment-table__badge--payment-pendiente,
.appointment-table__badge--payment-sin_factura {
  background: rgba(242, 159, 56, 0.15);
  color: #9b6112;
}

.appointment-table__badge--payment-anulado,
.appointment-table__badge--payment-exonerado {
  background: rgba(235, 85, 69, 0.14);
  color: #b8392d;
}

@media (max-width: 920px) {
  .appointment-table__table {
    min-width: 920px;
  }
}

@media (max-width: 760px) {
  .appointment-table__cards {
    display: flex;
  }

  .appointment-table__scroll {
    display: none;
  }

  .appointment-table__card-header,
  .appointment-table__card-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .appointment-table__card-grid {
    grid-template-columns: 1fr;
  }

  .appointment-table__card-actions :deep(.base-button) {
    width: 100%;
  }
}
</style>

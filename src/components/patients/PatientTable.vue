<script setup>
const props = defineProps({
    patients: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    },
    emptyMessage: {
        type: String,
        default: "No hay pacientes para mostrar."
    }
});

const createdAtFormatter = new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric"
});

function formatDate(value) {
    if (!value) {
        return "Sin fecha";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Sin fecha"
        : createdAtFormatter.format(date);
}
</script>

<template>
  <div class="patient-table">
    <div v-if="props.loading" class="patient-table__state">
      Buscando pacientes...
    </div>

    <div v-else-if="!props.patients.length" class="patient-table__state">
      {{ props.emptyMessage }}
    </div>

    <div v-else class="patient-table__content">
      <div class="patient-table__cards">
        <article
          v-for="patient in props.patients"
          :key="`card-${patient.id}`"
          class="patient-table__card"
        >
          <div class="patient-table__card-top">
            <strong>{{ patient.nombre }}</strong>
            <span class="patient-table__badge">
              {{ patient.estado || "activo" }}
            </span>
          </div>
          <p>{{ patient.tipoProcedimiento || "Sin procedimiento principal" }}</p>
          <div class="patient-table__chips">
            <span>{{ patient.telefono || "Sin telefono" }}</span>
            <span>{{ patient.correo || "Sin correo" }}</span>
            <span>{{ formatDate(patient.createdAt) }}</span>
          </div>
        </article>
      </div>

      <div class="patient-table__scroll">
        <table class="patient-table__table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Telefono</th>
              <th>Correo</th>
              <th>Procedimiento</th>
              <th>Estado</th>
              <th>Creado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="patient in props.patients" :key="patient.id">
              <td>
                <strong>{{ patient.nombre }}</strong>
              </td>
              <td>{{ patient.telefono || "Sin telefono" }}</td>
              <td>{{ patient.correo || "Sin correo" }}</td>
              <td>{{ patient.tipoProcedimiento || "Sin procedimiento" }}</td>
              <td>
                <span class="patient-table__badge">
                  {{ patient.estado || "activo" }}
                </span>
              </td>
              <td>{{ formatDate(patient.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.patient-table {
  border-radius: 22px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(111, 145, 153, 0.14);
}

.patient-table__state {
  padding: 2rem 1.2rem;
  text-align: center;
  color: var(--text-soft);
}

.patient-table__content {
  display: flex;
  flex-direction: column;
}

.patient-table__cards {
  display: none;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem;
}

.patient-table__card {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1rem;
  border-radius: 18px;
  background: #f9fcfd;
  border: 1px solid rgba(111, 145, 153, 0.14);
}

.patient-table__card-top {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
  justify-content: space-between;
}

.patient-table__card p {
  margin: 0;
  color: var(--text-soft);
}

.patient-table__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.patient-table__chips span {
  padding: 0.38rem 0.68rem;
  border-radius: 999px;
  background: #f2f7f8;
  border: 1px solid rgba(17, 184, 159, 0.1);
  color: var(--text-soft);
  font-size: 0.84rem;
}

.patient-table__scroll {
  overflow-x: auto;
}

.patient-table__table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
}

.patient-table th,
.patient-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(111, 145, 153, 0.12);
}

.patient-table th {
  background: rgba(247, 251, 252, 0.9);
  color: var(--text);
  font-size: 0.94rem;
}

.patient-table td {
  color: var(--text-soft);
}

.patient-table td strong {
  color: var(--primary-dark);
}

.patient-table__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: rgba(47, 122, 134, 0.12);
  color: var(--primary-dark);
  text-transform: capitalize;
}

@media (max-width: 760px) {
  .patient-table__cards {
    display: flex;
  }

  .patient-table__scroll {
    display: none;
  }
}
</style>

<script setup>
import BaseButton from "../base/BaseButton.vue";

const props = defineProps({
    branches: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    },
    emptyMessage: {
        type: String,
        default: "No hay sucursales para mostrar."
    },
    changingStatusId: {
        type: Number,
        default: null
    }
});

const emit = defineEmits(["edit", "toggle-status"]);
</script>

<template>
  <div class="branch-table">
    <div v-if="props.loading" class="branch-table__state">
      Cargando sucursales...
    </div>

    <div v-else-if="!props.branches.length" class="branch-table__state">
      {{ props.emptyMessage }}
    </div>

    <div v-else class="branch-table__scroll">
      <table class="branch-table__table">
        <thead>
          <tr>
            <th>Sucursal</th>
            <th>Contacto</th>
            <th>Salas</th>
            <th>Usuarios</th>
            <th>Estado</th>
            <th>Opciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="branch in props.branches" :key="branch.id">
            <td>
              <div class="branch-table__identity">
                <strong>{{ branch.nombre }}</strong>
                <span>{{ branch.codigo }}</span>
                <small>{{ branch.direccion || "Sin direccion registrada" }}</small>
              </div>
            </td>
            <td>{{ branch.telefono || "Sin telefono" }}</td>
            <td>
              <div class="branch-table__metrics">
                <span>{{ branch.roomsCount }} total</span>
                <small>{{ branch.activeRoomsCount }} activas</small>
              </div>
            </td>
            <td>
              <div class="branch-table__metrics">
                <span>{{ branch.usersCount }} total</span>
                <small>{{ branch.activeUsersCount }} activos</small>
              </div>
            </td>
            <td>
              <span
                class="branch-table__badge"
                :class="{
                  'branch-table__badge--inactive': branch.estado === 'inactiva'
                }"
              >
                {{ branch.estado }}
              </span>
            </td>
            <td>
              <div class="branch-table__actions actions-stack">
                <BaseButton size="sm" variant="ghost" @click="emit('edit', branch)">
                  Editar
                </BaseButton>
                <BaseButton
                  size="sm"
                  :variant="branch.estado === 'activa' ? 'warning' : 'secondary'"
                  :disabled="props.changingStatusId === branch.id"
                  @click="emit('toggle-status', branch)"
                >
                  {{
                    props.changingStatusId === branch.id
                      ? "Actualizando..."
                      : branch.estado === "activa"
                        ? "Desactivar"
                        : "Activar"
                  }}
                </BaseButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.branch-table {
  border-radius: 22px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(111, 145, 153, 0.14);
}

.branch-table__state {
  padding: 2rem 1.2rem;
  text-align: center;
  color: var(--text-soft);
}

.branch-table__scroll {
  overflow-x: auto;
}

.branch-table__table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
}

.branch-table th,
.branch-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(111, 145, 153, 0.12);
  vertical-align: top;
}

.branch-table th {
  background: rgba(247, 251, 252, 0.9);
  color: var(--text);
  font-size: 0.94rem;
}

.branch-table td {
  color: var(--text-soft);
}

.branch-table__identity {
  display: grid;
  gap: 0.2rem;
}

.branch-table__identity strong {
  color: var(--primary-dark);
}

.branch-table__identity span {
  color: var(--primary);
  font-weight: 700;
  text-transform: lowercase;
}

.branch-table__metrics {
  display: grid;
  gap: 0.15rem;
}

.branch-table__metrics span {
  color: var(--primary-dark);
  font-weight: 700;
}

.branch-table__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: rgba(63, 155, 109, 0.12);
  color: #2c7a52;
  text-transform: capitalize;
}

.branch-table__badge--inactive {
  background: rgba(235, 85, 69, 0.12);
  color: #b8392d;
}

.branch-table__actions {
  min-width: 120px;
}
</style>

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
    },
    showActions: {
        type: Boolean,
        default: true
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

    <div v-else class="branch-table__content">
      <div class="branch-table__cards">
        <article
          v-for="branch in props.branches"
          :key="`card-${branch.id}`"
          class="branch-table__card"
        >
          <div class="branch-table__card-top">
            <div class="branch-table__identity">
              <strong>{{ branch.nombre }}</strong>
              <span>{{ branch.codigo }}</span>
              <small>{{ branch.direccion || "Sin direccion registrada" }}</small>
            </div>
            <span
              class="branch-table__badge"
              :class="{ 'branch-table__badge--inactive': branch.estado === 'inactiva' }"
            >
              {{ branch.estado }}
            </span>
          </div>

          <div class="branch-table__chips">
            <span>{{ branch.telefono || "Sin telefono" }}</span>
            <span>{{ branch.roomsCount }} salas</span>
            <span>{{ branch.usersCount }} usuarios</span>
          </div>

          <div v-if="props.showActions" class="branch-table__actions branch-table__actions--card">
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
        </article>
      </div>

      <div class="branch-table__scroll">
        <table class="branch-table__table">
          <thead>
            <tr>
              <th>Sucursal</th>
              <th>Contacto</th>
              <th>Salas</th>
              <th>Usuarios</th>
              <th>Estado</th>
              <th v-if="props.showActions">Opciones</th>
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
              <td v-if="props.showActions">
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

.branch-table__content {
  display: flex;
  flex-direction: column;
}

.branch-table__cards {
  display: none;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem;
}

.branch-table__card {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem;
  border-radius: 18px;
  background: #f9fcfd;
  border: 1px solid rgba(111, 145, 153, 0.14);
}

.branch-table__card-top {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  justify-content: space-between;
}

.branch-table__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.branch-table__chips span {
  padding: 0.38rem 0.68rem;
  border-radius: 999px;
  background: #f2f7f8;
  border: 1px solid rgba(17, 184, 159, 0.1);
  color: var(--text-soft);
  font-size: 0.84rem;
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

.branch-table__actions--card {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

@media (max-width: 760px) {
  .branch-table__cards {
    display: flex;
  }

  .branch-table__scroll {
    display: none;
  }

  .branch-table__actions--card :deep(.base-button) {
    flex: 1 1 160px;
  }
}
</style>

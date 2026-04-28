<script setup>
import BaseButton from "../base/BaseButton.vue";
import BaseInput from "../base/BaseInput.vue";

const props = defineProps({
    search: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        default: "todos"
    },
    scope: {
        type: String,
        default: "clinica"
    },
    showSearch: {
        type: Boolean,
        default: true
    },
    showStatus: {
        type: Boolean,
        default: true
    },
    showScope: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(["update:search", "update:status", "update:scope", "clear"]);
</script>

<template>
  <div class="filters">
    <BaseInput
      v-if="props.showSearch"
      :model-value="props.search"
      label="Buscar"
      placeholder="Sala, paciente, tipo o descripcion"
      @update:model-value="emit('update:search', $event)"
    />

    <label v-if="props.showStatus" class="filters__group">
      <span class="filters__label">Estado</span>
      <select
        class="filters__select"
        :value="props.status"
        @change="emit('update:status', $event.target.value)"
      >
        <option value="todos">Todos</option>
        <option value="pendiente">Pendiente</option>
        <option value="confirmada">Confirmada</option>
        <option value="cancelada">Cancelada</option>
      </select>
    </label>

    <label v-if="props.showScope" class="filters__group">
      <span class="filters__label">Vista</span>
      <div class="filters__scope-switch" role="group" aria-label="Filtro de reservas del doctor">
        <button
          type="button"
          class="filters__scope-button"
          :class="{ 'is-active': props.scope === 'mis_reservas' }"
          @click="emit('update:scope', 'mis_reservas')"
        >
          Mis reservas
        </button>
        <button
          type="button"
          class="filters__scope-button"
          :class="{ 'is-active': props.scope === 'clinica' }"
          @click="emit('update:scope', 'clinica')"
        >
          Reservas de la clinica
        </button>
      </div>
    </label>

    <div class="filters__actions">
      <BaseButton variant="ghost" @click="emit('clear')">
        Limpiar
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr)) auto;
  gap: 1rem;
  align-items: end;
}

.filters__group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.filters__label {
  font-size: 0.92rem;
  font-weight: 600;
}

.filters__select {
  width: 100%;
  border: 1px solid #bfd4dc;
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
}

.filters__scope-switch {
  display: inline-flex;
  width: 100%;
  padding: 0.24rem;
  border-radius: 16px;
  background: var(--hero-surface-alt);
  border: 1px solid rgba(17, 184, 159, 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.filters__scope-button {
  flex: 1 1 0;
  border: none;
  background: transparent;
  color: var(--text-soft);
  font: inherit;
  font-weight: 700;
  padding: 0.78rem 0.9rem;
  border-radius: 12px;
  cursor: pointer;
}

.filters__scope-button.is-active {
  background: linear-gradient(135deg, rgba(17, 47, 71, 0.96), rgba(31, 80, 120, 0.92));
  color: #fff;
  box-shadow: 0 10px 22px rgba(17, 47, 71, 0.18);
}

.filters__actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 760px) {
  .filters {
    grid-template-columns: 1fr;
  }

  .filters__actions {
    justify-content: stretch;
  }
}
</style>

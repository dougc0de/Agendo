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
    }
});

const emit = defineEmits(["update:search", "update:status", "clear"]);
</script>

<template>
  <div class="filters">
    <BaseInput
      :model-value="props.search"
      label="Buscar"
      placeholder="Sala, paciente, tipo o descripcion"
      @update:model-value="emit('update:search', $event)"
    />

    <label class="filters__group">
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
  grid-template-columns: minmax(220px, 1fr) 180px auto;
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
  background: #fff;
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
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

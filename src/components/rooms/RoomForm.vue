<script setup>
import { reactive, watch } from "vue";
import BaseButton from "../base/BaseButton.vue";
import BaseInput from "../base/BaseInput.vue";

const props = defineProps({
    initialValue: {
        type: Object,
        default: () => ({})
    },
    branchOptions: {
        type: Array,
        default: () => []
    },
    submitting: {
        type: Boolean,
        default: false
    },
    errorMessage: {
        type: String,
        default: ""
    }
});

const emit = defineEmits(["submit", "cancel"]);

function defaultBranchId() {
    return props.branchOptions[0]?.id ?? null;
}

function createDefaultForm() {
    return {
        nombre: "",
        tipo: "",
        descripcion: "",
        capacidad: 1,
        sucursalId: defaultBranchId()
    };
}

const form = reactive(createDefaultForm());

function syncForm() {
    Object.assign(form, createDefaultForm(), props.initialValue ?? {});

    if (!Number.isInteger(Number(form.sucursalId)) || Number(form.sucursalId) <= 0) {
        form.sucursalId = defaultBranchId();
    }
}

watch(() => props.initialValue, syncForm, { deep: true, immediate: true });

watch(
    () => props.branchOptions,
    () => {
        if (!Number.isInteger(Number(form.sucursalId)) || Number(form.sucursalId) <= 0) {
            form.sucursalId = defaultBranchId();
        }
    },
    { deep: true, immediate: true }
);

function handleSubmit() {
    emit("submit", {
        nombre: String(form.nombre ?? "").trim(),
        tipo: String(form.tipo ?? "").trim(),
        descripcion: String(form.descripcion ?? "").trim(),
        capacidad: Number(form.capacidad),
        sucursalId: Number(form.sucursalId)
    });
}
</script>

<template>
  <form class="room-form" @submit.prevent="handleSubmit">
    <div class="room-form__grid">
      <BaseInput
        :model-value="form.nombre"
        label="Nombre de la sala"
        placeholder="Ej. Sala de consulta 1"
        :required="true"
        @update:model-value="form.nombre = $event"
      />

      <BaseInput
        :model-value="form.tipo"
        label="Tipo"
        placeholder="Consulta, procedimientos, control..."
        :required="true"
        @update:model-value="form.tipo = $event"
      />

      <BaseInput
        :model-value="form.capacidad"
        label="Capacidad"
        type="number"
        min="1"
        :required="true"
        @update:model-value="form.capacidad = $event"
      />

      <label class="room-form__field">
        <span class="room-form__label">
          Sucursal
          <span class="room-form__required">*</span>
        </span>
        <select
          v-model="form.sucursalId"
          class="room-form__select"
          :disabled="!props.branchOptions.length"
        >
          <option :value="null" disabled>
            {{ props.branchOptions.length ? "Selecciona una sucursal" : "No hay sucursales disponibles" }}
          </option>
          <option
            v-for="branch in props.branchOptions"
            :key="branch.id"
            :value="branch.id"
          >
            {{ branch.nombre }}
          </option>
        </select>
      </label>
    </div>

    <BaseInput
      :model-value="form.descripcion"
      label="Descripcion"
      as="textarea"
      :rows="3"
      placeholder="Describe el uso principal de la sala."
      :required="true"
      @update:model-value="form.descripcion = $event"
    />

    <p class="room-form__helper">
      La sala se creara activa y disponible para el dropdown de reservas.
    </p>

    <p v-if="props.errorMessage" class="room-form__error">
      {{ props.errorMessage }}
    </p>

    <div class="room-form__actions">
      <BaseButton variant="ghost" @click.prevent="emit('cancel')">
        Cancelar
      </BaseButton>
      <BaseButton type="submit" :disabled="props.submitting || !props.branchOptions.length">
        Crear sala
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.room-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.room-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.room-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.room-form__label {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text);
}

.room-form__required {
  color: #c83d32;
}

.room-form__select {
  width: 100%;
  border: 2px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
  transition: all var(--transition-fast);
  font-size: 1rem;
  box-shadow: var(--shadow);
}

.room-form__select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.15), var(--shadow-hover);
}

.room-form__helper {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.92rem;
}

.room-form__error {
  margin: 0;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  background: rgba(235, 85, 69, 0.14);
  border: 1px solid rgba(235, 85, 69, 0.22);
  color: #b8392d;
}

.room-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 760px) {
  .room-form__grid {
    grid-template-columns: 1fr;
  }

  .room-form__actions {
    flex-direction: column-reverse;
  }
}
</style>

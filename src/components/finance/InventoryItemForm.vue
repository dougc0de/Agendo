<script setup>
import { reactive, watch } from "vue";
import BaseButton from "../base/BaseButton.vue";
import BaseInput from "../base/BaseInput.vue";

const props = defineProps({
    initialValue: {
        type: Object,
        default: () => ({})
    },
    submitting: {
        type: Boolean,
        default: false
    },
    errorMessage: {
        type: String,
        default: ""
    },
    mode: {
        type: String,
        default: "create"
    }
});

const emit = defineEmits(["submit", "cancel"]);

function createDefaultForm() {
    return {
        nombre: "",
        categoria: "",
        unidad: "unidad",
        costoBase: "",
        precioSugerido: "",
        estado: "activo"
    };
}

const form = reactive(createDefaultForm());

watch(
    () => props.initialValue,
    (value) => {
        Object.assign(form, createDefaultForm(), value ?? {});
    },
    { deep: true, immediate: true }
);

function handleSubmit() {
    emit("submit", {
        nombre: form.nombre,
        categoria: form.categoria,
        unidad: form.unidad,
        costoBase: Number(form.costoBase),
        precioSugerido: Number(form.precioSugerido),
        estado: form.estado
    });
}
</script>

<template>
  <form class="inventory-item-form" @submit.prevent="handleSubmit">
    <div class="inventory-item-form__grid">
      <BaseInput
        :model-value="form.nombre"
        label="Nombre del insumo"
        placeholder="Ej. Hilo absorbible"
        :required="true"
        @update:model-value="form.nombre = $event"
      />
      <BaseInput
        :model-value="form.categoria"
        label="Categoria"
        placeholder="Ej. Suturas"
        @update:model-value="form.categoria = $event"
      />
      <BaseInput
        :model-value="form.unidad"
        label="Unidad"
        placeholder="Ej. unidad, caja, paquete"
        :required="true"
        @update:model-value="form.unidad = $event"
      />
      <BaseInput
        :model-value="form.costoBase"
        label="Costo base"
        type="number"
        min="0"
        step="0.01"
        :required="true"
        @update:model-value="form.costoBase = $event"
      />
      <BaseInput
        :model-value="form.precioSugerido"
        label="Precio sugerido"
        type="number"
        min="0"
        step="0.01"
        :required="true"
        @update:model-value="form.precioSugerido = $event"
      />
      <label class="inventory-item-form__field">
        <span class="inventory-item-form__label">Estado</span>
        <select v-model="form.estado" class="inventory-item-form__select">
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </label>
    </div>

    <p v-if="props.errorMessage" class="inventory-item-form__error">
      {{ props.errorMessage }}
    </p>

    <div class="inventory-item-form__actions">
      <BaseButton variant="ghost" @click.prevent="emit('cancel')">
        Cancelar
      </BaseButton>
      <BaseButton type="submit" :disabled="props.submitting">
        {{ props.mode === "edit" ? "Guardar insumo" : "Agregar insumo" }}
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.inventory-item-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.inventory-item-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.inventory-item-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.inventory-item-form__label {
  font-size: 0.92rem;
  font-weight: 600;
}

.inventory-item-form__select {
  width: 100%;
  border: 1px solid #bfd4dc;
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
}

.inventory-item-form__error {
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 18px;
  background: rgba(235, 85, 69, 0.12);
  border: 1px solid rgba(235, 85, 69, 0.2);
  color: #b8392d;
}

.inventory-item-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 760px) {
  .inventory-item-form__grid {
    grid-template-columns: 1fr;
  }

  .inventory-item-form__actions {
    flex-direction: column-reverse;
  }
}
</style>

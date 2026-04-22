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
        codigo: "",
        direccion: "",
        telefono: ""
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
        nombre: String(form.nombre ?? "").trim(),
        codigo: String(form.codigo ?? "").trim(),
        direccion: String(form.direccion ?? "").trim() || null,
        telefono: String(form.telefono ?? "").trim() || null
    });
}
</script>

<template>
  <form class="branch-form" @submit.prevent="handleSubmit">
    <div class="branch-form__grid">
      <BaseInput
        :model-value="form.nombre"
        label="Nombre de sucursal"
        placeholder="Sucursal Escazu"
        :required="true"
        @update:model-value="form.nombre = $event"
      />
      <BaseInput
        :model-value="form.codigo"
        label="Codigo"
        placeholder="escazu"
        :required="true"
        @update:model-value="form.codigo = $event"
      />
      <BaseInput
        :model-value="form.direccion"
        label="Direccion"
        placeholder="San Jose, Escazu"
        @update:model-value="form.direccion = $event"
      />
      <BaseInput
        :model-value="form.telefono"
        label="Telefono"
        placeholder="8888-1111"
        @update:model-value="form.telefono = $event"
      />
    </div>

    <p v-if="props.errorMessage" class="branch-form__error">
      {{ props.errorMessage }}
    </p>

    <div class="branch-form__actions">
      <BaseButton variant="ghost" @click.prevent="emit('cancel')">
        Cancelar
      </BaseButton>
      <BaseButton type="submit" :disabled="props.submitting">
        {{ props.submitting ? "Guardando..." : props.mode === "edit" ? "Guardar cambios" : "Crear sucursal" }}
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.branch-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.branch-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem 1rem;
}

.branch-form__error {
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 18px;
  background: rgba(235, 85, 69, 0.12);
  border: 1px solid rgba(235, 85, 69, 0.2);
  color: #b8392d;
}

.branch-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 760px) {
  .branch-form__grid {
    grid-template-columns: 1fr;
  }

  .branch-form__actions {
    flex-direction: column-reverse;
  }
}
</style>

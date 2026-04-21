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
    }
});

const emit = defineEmits(["submit", "cancel"]);

function createDefaultForm() {
    return {
        nombre: "",
        telefono: "",
        correo: "",
        fechaNacimiento: "",
        tipoProcedimiento: "",
        observaciones: ""
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
        telefono: String(form.telefono ?? "").trim(),
        correo: String(form.correo ?? "").trim() || null,
        fechaNacimiento: String(form.fechaNacimiento ?? "").trim() || null,
        tipoProcedimiento: String(form.tipoProcedimiento ?? "").trim() || null,
        observaciones: String(form.observaciones ?? "").trim() || null
    });
}
</script>

<template>
  <form class="patient-form" @submit.prevent="handleSubmit">
    <div class="patient-form__grid">
      <BaseInput
        :model-value="form.nombre"
        label="Nombre completo"
        placeholder="Nombre del paciente"
        :required="true"
        @update:model-value="form.nombre = $event"
      />
      <BaseInput
        :model-value="form.telefono"
        label="Telefono"
        placeholder="8888-9999"
        :required="true"
        @update:model-value="form.telefono = $event"
      />
      <BaseInput
        :model-value="form.correo"
        label="Correo"
        placeholder="correo@ejemplo.com"
        @update:model-value="form.correo = $event"
      />
      <BaseInput
        :model-value="form.fechaNacimiento"
        label="Fecha de nacimiento"
        type="date"
        @update:model-value="form.fechaNacimiento = $event"
      />
      <BaseInput
        :model-value="form.tipoProcedimiento"
        label="Procedimiento principal"
        placeholder="Ej. Consulta general"
        @update:model-value="form.tipoProcedimiento = $event"
      />
      <BaseInput
        :model-value="form.observaciones"
        label="Observaciones"
        as="textarea"
        :rows="3"
        placeholder="Dato util para futuras reservas"
        @update:model-value="form.observaciones = $event"
      />
    </div>

    <p v-if="props.errorMessage" class="patient-form__error">
      {{ props.errorMessage }}
    </p>

    <div class="patient-form__actions">
      <BaseButton variant="ghost" @click.prevent="emit('cancel')">
        Cancelar
      </BaseButton>
      <BaseButton type="submit" :disabled="props.submitting">
        {{ props.submitting ? "Guardando..." : "Guardar paciente" }}
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.patient-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.patient-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem 1rem;
}

.patient-form__error {
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 18px;
  background: rgba(235, 85, 69, 0.12);
  border: 1px solid rgba(235, 85, 69, 0.2);
  color: #b8392d;
}

.patient-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 760px) {
  .patient-form__grid {
    grid-template-columns: 1fr;
  }

  .patient-form__actions {
    flex-direction: column-reverse;
  }
}
</style>

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
    mode: {
        type: String,
        default: "create"
    }
});

const emit = defineEmits(["submit", "cancel"]);

function createDefaultForm() {
    return {
        fecha: "",
        horaInicio: "",
        horaFin: "",
        descripcion: "",
        estado: "pendiente",
        tipoConsulta: "",
        usuarioId: 1,
        pacienteId: 1,
        salaId: 1
    };
}

const form = reactive(createDefaultForm());

function syncForm() {
    Object.assign(form, createDefaultForm(), props.initialValue ?? {});
}

watch(() => props.initialValue, syncForm, { deep: true, immediate: true });

function handleSubmit() {
    emit("submit", {
        fecha: form.fecha,
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        descripcion: form.descripcion,
        estado: form.estado,
        tipoConsulta: form.tipoConsulta,
        usuarioId: Number(form.usuarioId),
        pacienteId: Number(form.pacienteId),
        salaId: Number(form.salaId)
    });
}
</script>

<template>
  <form class="appointment-form" @submit.prevent="handleSubmit">
    <div class="appointment-form__grid">
      <BaseInput
        :model-value="form.salaId"
        label="ID de sala"
        type="number"
        min="1"
        @update:model-value="form.salaId = $event"
      />
      <BaseInput
        :model-value="form.usuarioId"
        label="ID de usuario"
        type="number"
        min="1"
        @update:model-value="form.usuarioId = $event"
      />
      <BaseInput
        :model-value="form.pacienteId"
        label="ID de paciente"
        type="number"
        min="1"
        @update:model-value="form.pacienteId = $event"
      />
      <BaseInput
        :model-value="form.fecha"
        label="Fecha"
        type="date"
        @update:model-value="form.fecha = $event"
      />
      <BaseInput
        :model-value="form.horaInicio"
        label="Hora de inicio"
        type="time"
        @update:model-value="form.horaInicio = $event"
      />
      <BaseInput
        :model-value="form.horaFin"
        label="Hora de fin"
        type="time"
        @update:model-value="form.horaFin = $event"
      />
      <BaseInput
        :model-value="form.tipoConsulta"
        label="Tipo de procedimiento"
        placeholder="Ej. Circuncision"
        @update:model-value="form.tipoConsulta = $event"
      />

      <label class="appointment-form__field">
        <span class="appointment-form__label">Estado</span>
        <select
          v-model="form.estado"
          class="appointment-form__select"
        >
          <option value="pendiente">Pendiente</option>
          <option value="confirmada">Confirmada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </label>
    </div>

    <BaseInput
      :model-value="form.descripcion"
      label="Descripcion"
      as="textarea"
      placeholder="Agrega una nota breve sobre la reserva."
      @update:model-value="form.descripcion = $event"
    />

    <p class="appointment-form__helper">
      Usa IDs reales existentes en MySQL para sala, usuario y paciente.
    </p>

    <div class="appointment-form__actions">
      <BaseButton variant="ghost" @click.prevent="emit('cancel')">
        Cancelar
      </BaseButton>
      <BaseButton type="submit" :disabled="props.submitting">
        {{ props.mode === "edit" ? "Guardar cambios" : "Crear reserva" }}
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.appointment-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.appointment-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.appointment-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.appointment-form__label {
  font-size: 0.92rem;
  font-weight: 600;
}

.appointment-form__select {
  width: 100%;
  border: 1px solid #bfd4dc;
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
}

.appointment-form__helper {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.9rem;
}

.appointment-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 760px) {
  .appointment-form__grid {
    grid-template-columns: 1fr;
  }

  .appointment-form__actions {
    flex-direction: column-reverse;
  }
}
</style>

<script setup>
import { reactive, watch } from "vue";
import BaseButton from "../base/BaseButton.vue";
import BaseInput from "../base/BaseInput.vue";

const props = defineProps({
    initialValue: {
        type: Object,
        default: () => ({})
    },
    summary: {
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
        status: "pendiente",
        appointmentOutcome: "pendiente",
        cancellationReason: ""
    };
}

const form = reactive(createDefaultForm());
const validationError = reactive({
    message: ""
});

function syncForm() {
    Object.assign(form, createDefaultForm(), {
        status: props.initialValue?.estado ?? "pendiente",
        appointmentOutcome: props.initialValue?.appointmentOutcome ?? "pendiente",
        cancellationReason: props.initialValue?.cancellationReason ?? ""
    });
    validationError.message = "";
}

watch(() => props.initialValue, syncForm, {
    deep: true,
    immediate: true
});

watch(
    () => form.status,
    (nextStatus) => {
        if (nextStatus === "cancelada") {
            form.appointmentOutcome = "cancelada";
            return;
        }

        if (form.appointmentOutcome === "cancelada") {
            form.appointmentOutcome = "pendiente";
        }
    }
);

watch(
    () => form.appointmentOutcome,
    (nextOutcome) => {
        if (nextOutcome === "cancelada") {
            form.status = "cancelada";
        }
    }
);

function handleSubmit() {
    validationError.message = "";

    if (
        (form.status === "cancelada" || form.appointmentOutcome === "cancelada") &&
        !String(form.cancellationReason ?? "").trim()
    ) {
        validationError.message = "Debes indicar el motivo de la cancelacion.";
        return;
    }

    emit("submit", {
        status: form.status,
        appointmentOutcome: form.appointmentOutcome,
        cancellationReason: String(form.cancellationReason ?? "").trim() || null
    });
}
</script>

<template>
  <form class="appointment-outcome-form" @submit.prevent="handleSubmit">
    <div class="appointment-outcome-form__summary">
      <strong>{{ props.summary?.patientName || "Reserva seleccionada" }}</strong>
      <p>
        {{ props.summary?.dateLabel || "Sin fecha" }}
        <span v-if="props.summary?.roomName">· {{ props.summary.roomName }}</span>
      </p>
      <small>{{ props.summary?.typeName || "Sin tipo registrado" }}</small>
    </div>

    <div class="appointment-outcome-form__grid">
      <label class="appointment-outcome-form__field">
        <span class="appointment-outcome-form__label">Estado de la reserva</span>
        <select v-model="form.status" class="appointment-outcome-form__select">
          <option value="pendiente">Pendiente</option>
          <option value="confirmada">Confirmada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </label>

      <label class="appointment-outcome-form__field">
        <span class="appointment-outcome-form__label">Resultado operativo</span>
        <select v-model="form.appointmentOutcome" class="appointment-outcome-form__select">
          <option value="pendiente">Pendiente</option>
          <option value="atendida">Atendida</option>
          <option value="no_show">No-show</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </label>
    </div>

    <BaseInput
      v-if="form.status === 'cancelada' || form.appointmentOutcome === 'cancelada'"
      :model-value="form.cancellationReason"
      label="Motivo de la cancelacion"
      as="textarea"
      :rows="3"
      placeholder="Ej. paciente reprogramo o el procedimiento se suspendio"
      @update:model-value="form.cancellationReason = $event"
    />

    <p class="appointment-outcome-form__hint">
      Este cierre alimenta los KPI de no-show, cancelacion y productividad operativa.
    </p>
    <p v-if="validationError.message" class="appointment-outcome-form__error">
      {{ validationError.message }}
    </p>
    <p v-else-if="props.errorMessage" class="appointment-outcome-form__error">
      {{ props.errorMessage }}
    </p>

    <div class="appointment-outcome-form__actions">
      <BaseButton type="button" variant="ghost" @click="$emit('cancel')">
        Cerrar
      </BaseButton>
      <BaseButton type="submit" :disabled="props.submitting">
        {{ props.submitting ? "Guardando..." : "Guardar resultado" }}
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.appointment-outcome-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.appointment-outcome-form__summary {
  padding: 1rem;
  border-radius: 8px;
  background: #f6fbfc;
  border: 1px solid rgba(17, 184, 159, 0.12);
}

.appointment-outcome-form__summary strong,
.appointment-outcome-form__summary p,
.appointment-outcome-form__summary small {
  display: block;
}

.appointment-outcome-form__summary p,
.appointment-outcome-form__summary small {
  margin: 0.3rem 0 0;
  color: var(--text-soft);
}

.appointment-outcome-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.appointment-outcome-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.appointment-outcome-form__label {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text);
}

.appointment-outcome-form__select {
  width: 100%;
  border: 2px solid var(--border);
  border-radius: var(--border-radius);
  background: var(--surface);
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
  transition: all var(--transition-fast);
  font-size: 1rem;
  box-shadow: var(--shadow);
}

.appointment-outcome-form__hint {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.94rem;
}

.appointment-outcome-form__error {
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 8px;
  background: rgba(235, 85, 69, 0.12);
  color: #b8392d;
}

.appointment-outcome-form__actions {
  display: flex;
  justify-content: end;
  gap: 0.75rem;
}

@media (max-width: 760px) {
  .appointment-outcome-form__grid {
    grid-template-columns: 1fr;
  }

  .appointment-outcome-form__actions {
    flex-direction: column-reverse;
  }

  .appointment-outcome-form__actions :deep(.base-button) {
    width: 100%;
  }
}
</style>

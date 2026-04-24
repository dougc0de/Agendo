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

const emit = defineEmits(["submit"]);

function createDefaultForm() {
    return {
        consultationDurationMinutes: 30,
        procedureDurationMinutes: 60,
        consultationOpenTime: "08:00",
        consultationCloseTime: "17:00",
        consultationNoClosing: false,
        procedureOpenTime: "08:00",
        procedureCloseTime: "17:00",
        procedureNoClosing: false,
        timeZone: "America/Costa_Rica"
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
        consultationDurationMinutes: Number(form.consultationDurationMinutes),
        procedureDurationMinutes: Number(form.procedureDurationMinutes),
        consultationOpenTime: form.consultationOpenTime,
        consultationCloseTime: form.consultationNoClosing ? null : form.consultationCloseTime,
        consultationNoClosing: Boolean(form.consultationNoClosing),
        procedureOpenTime: form.procedureOpenTime,
        procedureCloseTime: form.procedureNoClosing ? null : form.procedureCloseTime,
        procedureNoClosing: Boolean(form.procedureNoClosing),
        timeZone: form.timeZone
    });
}
</script>

<template>
  <form class="account-settings-form" @submit.prevent="handleSubmit">
    <div class="account-settings-form__section">
      <div class="account-settings-form__section-header">
        <h3>Consulta</h3>
        <p>Define la duracion base y el horario operativo para consultas.</p>
      </div>

      <div class="account-settings-form__grid">
        <BaseInput
          :model-value="form.consultationDurationMinutes"
          label="Duracion base de consultas"
          type="number"
          min="5"
          max="480"
          placeholder="30"
          :required="true"
          @update:model-value="form.consultationDurationMinutes = $event"
        />
        <BaseInput
          :model-value="form.consultationOpenTime"
          label="Hora de apertura"
          type="time"
          :required="true"
          @update:model-value="form.consultationOpenTime = $event"
        />
        <BaseInput
          :model-value="form.consultationCloseTime"
          label="Hora de cierre"
          type="time"
          :disabled="form.consultationNoClosing"
          :required="!form.consultationNoClosing"
          @update:model-value="form.consultationCloseTime = $event"
        />
        <label class="account-settings-form__checkbox">
          <input
            v-model="form.consultationNoClosing"
            type="checkbox"
          >
          <span>Sin cierre para consultas</span>
        </label>
      </div>
    </div>

    <div class="account-settings-form__section">
      <div class="account-settings-form__section-header">
        <h3>Procedimiento</h3>
        <p>Configura un horario distinto cuando los procedimientos requieren otra operacion.</p>
      </div>

      <div class="account-settings-form__grid">
        <BaseInput
          :model-value="form.procedureDurationMinutes"
          label="Duracion base de procedimientos"
          type="number"
          min="5"
          max="480"
          placeholder="60"
          :required="true"
          @update:model-value="form.procedureDurationMinutes = $event"
        />
        <BaseInput
          :model-value="form.procedureOpenTime"
          label="Hora de apertura"
          type="time"
          :required="true"
          @update:model-value="form.procedureOpenTime = $event"
        />
        <BaseInput
          :model-value="form.procedureCloseTime"
          label="Hora de cierre"
          type="time"
          :disabled="form.procedureNoClosing"
          :required="!form.procedureNoClosing"
          @update:model-value="form.procedureCloseTime = $event"
        />
        <label class="account-settings-form__checkbox">
          <input
            v-model="form.procedureNoClosing"
            type="checkbox"
          >
          <span>Sin cierre para procedimientos</span>
        </label>
      </div>
    </div>

    <div class="account-settings-form__section">
      <div class="account-settings-form__section-header">
        <h3>Zona horaria</h3>
        <p>Se usa para decidir que reservas ya pasaron y para los cierres mensuales.</p>
      </div>

      <label class="account-settings-form__field">
        <span class="account-settings-form__label">Zona horaria</span>
        <select
          v-model="form.timeZone"
          class="account-settings-form__select"
        >
          <option value="America/Costa_Rica">America/Costa_Rica</option>
          <option value="America/Guatemala">America/Guatemala</option>
          <option value="America/Mexico_City">America/Mexico_City</option>
          <option value="America/Panama">America/Panama</option>
          <option value="America/Bogota">America/Bogota</option>
        </select>
      </label>
    </div>

    <div class="account-settings-form__tips">
      <p>Las reservas activas se calculan segun la hora final y la zona horaria de la cuenta.</p>
      <p>Si activas "sin cierre", la atencion solo respetara la hora de apertura en ese mismo dia.</p>
    </div>

    <p v-if="props.errorMessage" class="account-settings-form__error">
      {{ props.errorMessage }}
    </p>

    <div class="account-settings-form__actions">
      <BaseButton type="submit" :disabled="props.submitting">
        {{ props.submitting ? "Guardando..." : "Guardar configuracion" }}
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.account-settings-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.account-settings-form__section {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem;
  border-radius: 18px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: rgba(255, 255, 255, 0.8);
}

.account-settings-form__section-header h3 {
  margin: 0;
  color: var(--primary-dark);
}

.account-settings-form__section-header p {
  margin: 0.35rem 0 0;
  color: var(--text-soft);
}

.account-settings-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.account-settings-form__field,
.account-settings-form__checkbox {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.account-settings-form__checkbox {
  justify-content: end;
  border: 1px solid #dce8ed;
  border-radius: 8px;
  background: #f8fbfc;
  padding: 0.85rem 0.9rem;
}

.account-settings-form__checkbox input {
  width: 1rem;
  height: 1rem;
}

.account-settings-form__checkbox span {
  color: var(--text-soft);
  font-size: 0.92rem;
}

.account-settings-form__label {
  font-size: 0.92rem;
  font-weight: 600;
}

.account-settings-form__select {
  width: 100%;
  border: 1px solid #bfd4dc;
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
}

.account-settings-form__tips {
  display: grid;
  gap: 0.45rem;
  padding: 1rem;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(241, 248, 251, 0.92));
  border: 1px solid rgba(17, 184, 159, 0.12);
}

.account-settings-form__tips p {
  margin: 0;
  color: var(--text-soft);
}

.account-settings-form__error {
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 18px;
  background: rgba(235, 85, 69, 0.12);
  border: 1px solid rgba(235, 85, 69, 0.2);
  color: #b8392d;
}

.account-settings-form__actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 760px) {
  .account-settings-form__grid {
    grid-template-columns: 1fr;
  }

  .account-settings-form__actions :deep(.base-button) {
    width: 100%;
  }
}
</style>

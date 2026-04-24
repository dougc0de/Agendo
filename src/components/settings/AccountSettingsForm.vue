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
        procedureDurationMinutes: 60
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
        procedureDurationMinutes: Number(form.procedureDurationMinutes)
    });
}
</script>

<template>
  <form class="account-settings-form" @submit.prevent="handleSubmit">
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
        :model-value="form.procedureDurationMinutes"
        label="Duracion base de procedimientos"
        type="number"
        min="5"
        max="480"
        placeholder="60"
        :required="true"
        @update:model-value="form.procedureDurationMinutes = $event"
      />
    </div>

    <div class="account-settings-form__tips">
      <p>Define en minutos la duracion estandar para consultas y procedimientos.</p>
      <p>En reservas, estos valores se pueden aplicar con un clic sobre la hora de inicio.</p>
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

.account-settings-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
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

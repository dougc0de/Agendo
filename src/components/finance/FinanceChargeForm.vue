<script setup>
import { reactive, watch } from "vue";
import BaseButton from "../base/BaseButton.vue";
import BaseInput from "../base/BaseInput.vue";

const props = defineProps({
    initialValue: {
        type: Object,
        default: () => ({})
    },
    reservationOptions: {
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
    },
    mode: {
        type: String,
        default: "create"
    }
});

const emit = defineEmits(["submit", "cancel"]);

function createDefaultForm() {
    return {
        reservationId: null,
        procedureName: "",
        amount: "",
        currencyCode: "CRC",
        paymentStatus: "pendiente",
        paymentMethod: "otro",
        paidAt: "",
        notes: ""
    };
}

const form = reactive(createDefaultForm());

watch(
    () => props.initialValue,
    (value) => {
        Object.assign(form, createDefaultForm(), value ?? {});

        if (!form.reservationId && props.reservationOptions.length) {
            form.reservationId = props.reservationOptions[0].id;
        }

        if (form.paidAt) {
            form.paidAt = String(form.paidAt).slice(0, 16);
        }
    },
    { deep: true, immediate: true }
);

watch(
    () => props.reservationOptions,
    (value) => {
        if (!form.reservationId && value.length) {
            form.reservationId = value[0].id;
        }
    },
    { deep: true, immediate: true }
);

function handleSubmit() {
    emit("submit", {
        reservationId: Number(form.reservationId),
        procedureName: form.procedureName,
        amount: Number(form.amount),
        currencyCode: form.currencyCode,
        paymentStatus: form.paymentStatus,
        paymentMethod: form.paymentMethod,
        paidAt: form.paidAt || null,
        notes: form.notes
    });
}
</script>

<template>
  <form class="finance-charge-form" @submit.prevent="handleSubmit">
    <label class="finance-charge-form__field">
      <span class="finance-charge-form__label">Reserva procedural</span>
      <select
        v-model="form.reservationId"
        class="finance-charge-form__select"
        :disabled="props.mode === 'edit'"
      >
        <option
          v-for="reservation in props.reservationOptions"
          :key="reservation.id"
          :value="reservation.id"
        >
          {{ reservation.fecha }} · {{ reservation.pacienteNombre || `Paciente #${reservation.pacienteId}` }} · {{ reservation.tipoConsulta }}
        </option>
      </select>
    </label>

    <div class="finance-charge-form__grid">
      <BaseInput
        :model-value="form.procedureName"
        label="Nombre del procedimiento"
        placeholder="Ej. Cirugia menor"
        :required="true"
        @update:model-value="form.procedureName = $event"
      />
      <BaseInput
        :model-value="form.amount"
        label="Monto"
        type="number"
        min="0"
        step="0.01"
        :required="true"
        @update:model-value="form.amount = $event"
      />
      <label class="finance-charge-form__field">
        <span class="finance-charge-form__label">Moneda</span>
        <select v-model="form.currencyCode" class="finance-charge-form__select">
          <option value="CRC">CRC</option>
          <option value="USD">USD</option>
        </select>
      </label>
      <label class="finance-charge-form__field">
        <span class="finance-charge-form__label">Estado del cobro</span>
        <select v-model="form.paymentStatus" class="finance-charge-form__select">
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
          <option value="anulado">Anulado</option>
        </select>
      </label>
      <label class="finance-charge-form__field">
        <span class="finance-charge-form__label">Metodo de pago</span>
        <select v-model="form.paymentMethod" class="finance-charge-form__select">
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="transferencia">Transferencia</option>
          <option value="otro">Otro</option>
        </select>
      </label>
      <BaseInput
        :model-value="form.paidAt"
        label="Fecha y hora de pago"
        type="datetime-local"
        :disabled="form.paymentStatus !== 'pagado'"
        @update:model-value="form.paidAt = $event"
      />
    </div>

    <BaseInput
      :model-value="form.notes"
      label="Notas"
      as="textarea"
      :rows="3"
      placeholder="Dato contable o administrativo"
      @update:model-value="form.notes = $event"
    />

    <p v-if="props.errorMessage" class="finance-charge-form__error">
      {{ props.errorMessage }}
    </p>

    <div class="finance-charge-form__actions">
      <BaseButton variant="ghost" @click.prevent="emit('cancel')">
        Cancelar
      </BaseButton>
      <BaseButton type="submit" :disabled="props.submitting">
        {{ props.mode === "edit" ? "Guardar cobro" : "Registrar cobro" }}
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.finance-charge-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.finance-charge-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.finance-charge-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.finance-charge-form__label {
  font-size: 0.92rem;
  font-weight: 600;
}

.finance-charge-form__select {
  width: 100%;
  border: 1px solid #bfd4dc;
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
}

.finance-charge-form__error {
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 18px;
  background: rgba(235, 85, 69, 0.12);
  border: 1px solid rgba(235, 85, 69, 0.2);
  color: #b8392d;
}

.finance-charge-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 760px) {
  .finance-charge-form__grid {
    grid-template-columns: 1fr;
  }

  .finance-charge-form__actions {
    flex-direction: column-reverse;
  }
}
</style>

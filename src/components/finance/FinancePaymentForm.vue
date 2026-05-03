<script setup>
import { reactive, watch } from "vue";
import BaseButton from "../base/BaseButton.vue";
import BaseInput from "../base/BaseInput.vue";

const props = defineProps({
    report: {
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

function getLocalNowValue() {
    const date = new Date();
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
}

function createDefaultForm() {
    return {
        paymentMethod: "efectivo",
        amount: "",
        paidAt: getLocalNowValue(),
        notes: ""
    };
}

function formatCurrency(value, currencyCode = "CRC") {
    return new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 2
    }).format(Number(value ?? 0));
}

const form = reactive(createDefaultForm());

watch(
    () => props.report,
    (value) => {
        const outstandingAmount = Number(
            value?.outstandingAmount ?? value?.totalBilledAmount ?? 0
        );

        Object.assign(form, createDefaultForm(), {
            paymentMethod: value?.paymentMethod || "efectivo",
            amount: outstandingAmount > 0 ? outstandingAmount : "",
            paidAt: getLocalNowValue(),
            notes: ""
        });
    },
    { deep: true, immediate: true }
);

function handleSubmit() {
    emit("submit", {
        paymentMethod: form.paymentMethod,
        amount: form.amount,
        paidAt: form.paidAt,
        notes: form.notes
    });
}
</script>

<template>
  <form class="finance-payment-form" @submit.prevent="handleSubmit">
    <div class="finance-payment-form__summary">
      <strong>{{ props.report?.patientNameSnapshot || "Paciente sin nombre" }}</strong>
      <span>
        {{ props.report?.reservationDate || "Sin fecha" }} ·
        {{ props.report?.roomNameSnapshot || "Sala sin nombre" }}
      </span>
      <span v-if="props.report?.totalBilledAmount !== undefined">
        Total: {{ formatCurrency(props.report?.totalBilledAmount, props.report?.currencyCode || "CRC") }}
      </span>
      <span v-if="props.report?.paidAmount !== undefined">
        Abonado: {{ formatCurrency(props.report?.paidAmount, props.report?.currencyCode || "CRC") }}
      </span>
      <span v-if="props.report?.outstandingAmount !== undefined">
        Saldo pendiente: {{ formatCurrency(props.report?.outstandingAmount, props.report?.currencyCode || "CRC") }}
      </span>
    </div>

    <div class="finance-payment-form__grid">
      <BaseInput
        :model-value="form.amount"
        label="Monto del abono"
        type="number"
        min="0.01"
        :max="props.report?.outstandingAmount || undefined"
        step="0.01"
        :required="true"
        @update:model-value="form.amount = $event"
      />

      <label class="finance-payment-form__field">
        <span class="finance-payment-form__label">Metodo de pago</span>
        <select v-model="form.paymentMethod" class="finance-payment-form__select">
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
        :required="true"
        @update:model-value="form.paidAt = $event"
      />
    </div>

    <BaseInput
      :model-value="form.notes"
      label="Nota del pago"
      as="textarea"
      :rows="3"
      placeholder="Ej. Primer abono recibido en caja"
      @update:model-value="form.notes = $event"
    />

    <p v-if="props.errorMessage" class="finance-payment-form__error">
      {{ props.errorMessage }}
    </p>

    <div class="finance-payment-form__actions">
      <BaseButton variant="ghost" @click.prevent="emit('cancel')">
        Cancelar
      </BaseButton>
      <BaseButton type="submit" :disabled="props.submitting">
        {{ props.report?.financialStatus === "parcial" ? "Registrar remanente" : "Registrar abono" }}
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.finance-payment-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.finance-payment-form__summary {
  display: grid;
  gap: 0.3rem;
  padding: 0.95rem 1rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(17, 184, 159, 0.12);
}

.finance-payment-form__summary strong {
  color: var(--primary-dark);
}

.finance-payment-form__summary span {
  color: var(--text-soft);
}

.finance-payment-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.finance-payment-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.finance-payment-form__label {
  font-size: 0.92rem;
  font-weight: 600;
}

.finance-payment-form__select {
  width: 100%;
  border: 1px solid #bfd4dc;
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
}

.finance-payment-form__error {
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 16px;
  background: rgba(235, 85, 69, 0.12);
  border: 1px solid rgba(235, 85, 69, 0.2);
  color: #b8392d;
}

.finance-payment-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 760px) {
  .finance-payment-form__grid {
    grid-template-columns: 1fr;
  }

  .finance-payment-form__actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

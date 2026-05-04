<script setup>
import { reactive, watch } from "vue";
import BaseButton from "../base/BaseButton.vue";
import BaseInput from "../base/BaseInput.vue";
import { DEFAULT_CURRENCY_CODE, LATAM_CURRENCY_OPTIONS } from "../../shared/currencies.js";

const props = defineProps({
    initialValue: {
        type: Object,
        default: () => ({})
    },
    branches: {
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

function createDefaultForm() {
    return {
        branchId: "",
        name: "",
        description: "",
        category: "consulta",
        appointmentTypeHint: "consulta",
        basePrice: 0,
        currencyCode: DEFAULT_CURRENCY_CODE,
        taxBehavior: "no_aplica",
        taxRate: 0,
        estimatedDurationMinutes: "",
        requiresPatient: true,
        requiresProfessional: false,
        requiresRoom: false,
        requiresInventory: false,
        reservable: false,
        billableWithoutReservation: true,
        packageEligible: false,
        visibleToReception: true,
        administrativeOnly: false,
        state: "activo"
    };
}

const form = reactive(createDefaultForm());

watch(
    () => props.initialValue,
    (value) => {
        Object.assign(form, createDefaultForm(), value ?? {}, {
            branchId: value?.branchId ?? "",
            estimatedDurationMinutes: value?.estimatedDurationMinutes ?? ""
        });
    },
    { deep: true, immediate: true }
);

function handleSubmit() {
    emit("submit", {
        branchId: form.branchId || null,
        name: form.name,
        description: form.description,
        category: form.category,
        appointmentTypeHint: form.appointmentTypeHint,
        basePrice: Number(form.basePrice),
        currencyCode: form.currencyCode,
        taxBehavior: form.taxBehavior,
        taxRate: Number(form.taxRate || 0),
        estimatedDurationMinutes:
            form.estimatedDurationMinutes === "" ? null : Number(form.estimatedDurationMinutes),
        requiresPatient: Boolean(form.requiresPatient),
        requiresProfessional: Boolean(form.requiresProfessional),
        requiresRoom: Boolean(form.requiresRoom),
        requiresInventory: Boolean(form.requiresInventory),
        reservable: Boolean(form.reservable),
        billableWithoutReservation: Boolean(form.billableWithoutReservation),
        packageEligible: Boolean(form.packageEligible),
        visibleToReception: Boolean(form.visibleToReception),
        administrativeOnly: Boolean(form.administrativeOnly),
        state: form.state
    });
}
</script>

<template>
  <form class="finance-billable-item-form" @submit.prevent="handleSubmit">
    <div class="finance-billable-item-form__grid">
      <BaseInput
        :model-value="form.name"
        label="Nombre"
        placeholder="Ej. Consulta general"
        :required="true"
        @update:model-value="form.name = $event"
      />
      <BaseInput
        :model-value="form.category"
        label="Categoria"
        placeholder="consulta, documento, producto..."
        :required="true"
        @update:model-value="form.category = $event"
      />

      <label class="finance-billable-item-form__field">
        <span class="finance-billable-item-form__label">Sucursal</span>
        <select v-model="form.branchId" class="finance-billable-item-form__select">
          <option value="">Global para la cuenta</option>
          <option
            v-for="branch in props.branches"
            :key="branch.id"
            :value="branch.id"
          >
            {{ branch.nombre }}
          </option>
        </select>
      </label>

      <label class="finance-billable-item-form__field">
        <span class="finance-billable-item-form__label">Sugerencia para agenda</span>
        <select v-model="form.appointmentTypeHint" class="finance-billable-item-form__select">
          <option value="consulta">Consulta</option>
          <option value="procedimiento">Procedimiento</option>
          <option value="otro">Otro</option>
        </select>
      </label>

      <BaseInput
        :model-value="form.basePrice"
        label="Precio base"
        type="number"
        min="0"
        step="0.01"
        :required="true"
        @update:model-value="form.basePrice = $event"
      />

      <label class="finance-billable-item-form__field">
        <span class="finance-billable-item-form__label">Moneda</span>
        <select v-model="form.currencyCode" class="finance-billable-item-form__select">
          <option
            v-for="currency in LATAM_CURRENCY_OPTIONS"
            :key="currency.code"
            :value="currency.code"
          >
            {{ currency.label }}
          </option>
        </select>
      </label>

      <label class="finance-billable-item-form__field">
        <span class="finance-billable-item-form__label">Impuestos</span>
        <select v-model="form.taxBehavior" class="finance-billable-item-form__select">
          <option value="no_aplica">No aplica</option>
          <option value="incluido">Incluido en precio</option>
          <option value="excluido">Se suma encima</option>
        </select>
      </label>

      <BaseInput
        :model-value="form.taxRate"
        label="Tasa de impuesto"
        type="number"
        min="0"
        max="100"
        step="0.01"
        :disabled="form.taxBehavior === 'no_aplica'"
        @update:model-value="form.taxRate = $event"
      />

      <BaseInput
        :model-value="form.estimatedDurationMinutes"
        label="Duracion estimada"
        type="number"
        min="5"
        max="480"
        placeholder="Opcional"
        @update:model-value="form.estimatedDurationMinutes = $event"
      />
    </div>

    <BaseInput
      :model-value="form.description"
      label="Descripcion"
      as="textarea"
      :rows="3"
      placeholder="Describe en que consiste este servicio o cargo."
      @update:model-value="form.description = $event"
    />

    <div class="finance-billable-item-form__checkbox-grid">
      <label class="finance-billable-item-form__checkbox">
        <input v-model="form.reservable" type="checkbox">
        <span>Se puede agendar</span>
      </label>
      <label class="finance-billable-item-form__checkbox">
        <input v-model="form.billableWithoutReservation" type="checkbox">
        <span>Se puede cobrar sin reserva</span>
      </label>
      <label class="finance-billable-item-form__checkbox">
        <input v-model="form.requiresPatient" type="checkbox">
        <span>Requiere paciente</span>
      </label>
      <label class="finance-billable-item-form__checkbox">
        <input v-model="form.requiresProfessional" type="checkbox">
        <span>Requiere profesional</span>
      </label>
      <label class="finance-billable-item-form__checkbox">
        <input v-model="form.requiresRoom" type="checkbox">
        <span>Requiere sala</span>
      </label>
      <label class="finance-billable-item-form__checkbox">
        <input v-model="form.requiresInventory" type="checkbox">
        <span>Requiere inventario</span>
      </label>
      <label class="finance-billable-item-form__checkbox">
        <input v-model="form.visibleToReception" type="checkbox">
        <span>Visible para recepcion</span>
      </label>
      <label class="finance-billable-item-form__checkbox">
        <input v-model="form.administrativeOnly" type="checkbox">
        <span>Solo administrativo</span>
      </label>
      <label class="finance-billable-item-form__checkbox">
        <input v-model="form.packageEligible" type="checkbox">
        <span>Puede entrar en paquete</span>
      </label>
    </div>

    <label class="finance-billable-item-form__field">
      <span class="finance-billable-item-form__label">Estado</span>
      <select v-model="form.state" class="finance-billable-item-form__select">
        <option value="activo">Activo</option>
        <option value="inactivo">Inactivo</option>
      </select>
    </label>

    <p v-if="props.errorMessage" class="finance-billable-item-form__error">
      {{ props.errorMessage }}
    </p>

    <div class="finance-billable-item-form__actions">
      <BaseButton variant="ghost" @click.prevent="emit('cancel')">
        Cancelar
      </BaseButton>
      <BaseButton type="submit" :disabled="props.submitting">
        {{ props.submitting ? "Guardando..." : "Guardar item" }}
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.finance-billable-item-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.finance-billable-item-form__grid,
.finance-billable-item-form__checkbox-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.finance-billable-item-form__field,
.finance-billable-item-form__checkbox {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.finance-billable-item-form__checkbox {
  justify-content: end;
  padding: 0.9rem;
  border-radius: 14px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: rgba(255, 255, 255, 0.82);
}

.finance-billable-item-form__label {
  font-size: 0.92rem;
  font-weight: 600;
}

.finance-billable-item-form__select {
  width: 100%;
  border: 1px solid #bfd4dc;
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
}

.finance-billable-item-form__error {
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 16px;
  background: rgba(235, 85, 69, 0.12);
  border: 1px solid rgba(235, 85, 69, 0.2);
  color: #b8392d;
}

.finance-billable-item-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 760px) {
  .finance-billable-item-form__grid,
  .finance-billable-item-form__checkbox-grid {
    grid-template-columns: 1fr;
  }

  .finance-billable-item-form__actions {
    flex-direction: column;
  }
}
</style>

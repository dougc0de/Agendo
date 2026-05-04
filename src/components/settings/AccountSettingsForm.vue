<script setup>
import { reactive, watch } from "vue";
import BaseButton from "../base/BaseButton.vue";
import BaseInput from "../base/BaseInput.vue";
import {
    DEFAULT_CURRENCY_CODE,
    LATAM_CURRENCY_OPTIONS
} from "../../shared/currencies.js";

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
        consultationDurationEnabled: false,
        consultationDurationMinutes: 30,
        procedureDurationEnabled: false,
        procedureDurationMinutes: 60,
        procedureTurnoverEnabled: false,
        procedureTurnoverMinutes: 15,
        consultationOpenTime: "08:00",
        consultationCloseTime: "17:00",
        consultationNoClosing: false,
        procedureOpenTime: "08:00",
        procedureCloseTime: "17:00",
        procedureNoClosing: false,
        timeZone: "America/Costa_Rica",
        procedurePricingPolicy: "bloqueado",
        defaultProcedurePricingMode: "solo_sala",
        defaultCurrencyCode: DEFAULT_CURRENCY_CODE,
        documentMode: "comprobante_simple",
        taxesEnabled: false,
        noShowPolicy: "informativo",
        lateCancellationPolicy: "informativa",
        allowReceptionManualCharges: true,
        capabilityConfig: {
            financeEnabled: true,
            inventoryEnabled: false,
            billableCatalogEnabled: true,
            manualBillingEnabled: false,
            partialPaymentsEnabled: false,
            packagesEnabled: false,
            membershipsEnabled: false,
            rentalsEnabled: false,
            commissionsEnabled: false,
            depositsEnabled: false,
            penaltiesEnabled: false,
            whatsappEnabled: false
        }
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
        consultationDurationEnabled: true,
        consultationDurationMinutes: Number(form.consultationDurationMinutes),
        procedureDurationEnabled: true,
        procedureDurationMinutes: Number(form.procedureDurationMinutes),
        procedureTurnoverEnabled: Boolean(form.procedureTurnoverEnabled),
        procedureTurnoverMinutes: Number(form.procedureTurnoverMinutes),
        consultationOpenTime: form.consultationOpenTime,
        consultationCloseTime: form.consultationNoClosing ? null : form.consultationCloseTime,
        consultationNoClosing: Boolean(form.consultationNoClosing),
        procedureOpenTime: form.procedureOpenTime,
        procedureCloseTime: form.procedureNoClosing ? null : form.procedureCloseTime,
        procedureNoClosing: Boolean(form.procedureNoClosing),
        timeZone: form.timeZone,
        procedurePricingPolicy: form.procedurePricingPolicy,
        defaultProcedurePricingMode: form.defaultProcedurePricingMode,
        defaultCurrencyCode: form.defaultCurrencyCode,
        documentMode: form.documentMode,
        taxesEnabled: Boolean(form.taxesEnabled),
        noShowPolicy: form.noShowPolicy,
        lateCancellationPolicy: form.lateCancellationPolicy,
        allowReceptionManualCharges: Boolean(form.allowReceptionManualCharges),
        capabilityConfig: {
            financeEnabled: Boolean(form.capabilityConfig.financeEnabled),
            inventoryEnabled: Boolean(form.capabilityConfig.inventoryEnabled),
            billableCatalogEnabled: Boolean(form.capabilityConfig.billableCatalogEnabled),
            manualBillingEnabled: Boolean(form.capabilityConfig.manualBillingEnabled),
            partialPaymentsEnabled: Boolean(form.capabilityConfig.partialPaymentsEnabled),
            packagesEnabled: Boolean(form.capabilityConfig.packagesEnabled),
            membershipsEnabled: Boolean(form.capabilityConfig.membershipsEnabled),
            rentalsEnabled: Boolean(form.capabilityConfig.rentalsEnabled),
            commissionsEnabled: Boolean(form.capabilityConfig.commissionsEnabled),
            depositsEnabled: Boolean(form.capabilityConfig.depositsEnabled),
            penaltiesEnabled: Boolean(form.capabilityConfig.penaltiesEnabled),
            whatsappEnabled: Boolean(form.capabilityConfig.whatsappEnabled)
        }
    });
}
</script>

<template>
  <form class="account-settings-form" @submit.prevent="handleSubmit">
    <div class="account-settings-form__section">
      <div class="account-settings-form__section-header">
        <h3>Consulta</h3>
        <p>Define el tiempo base que tu clinica suele usar como referencia para consultas y la ventana operativa del servicio.</p>
      </div>

      <div class="account-settings-form__grid">
        <BaseInput
          :model-value="form.consultationDurationMinutes"
          label="Tiempo de referencia de consultas"
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
        <p>Configura el tiempo base de referencia y si la sala debe reservar minutos extra de preparacion o limpieza despues de cada procedimiento.</p>
      </div>

      <div class="account-settings-form__grid">
        <BaseInput
          :model-value="form.procedureDurationMinutes"
          label="Tiempo de referencia de procedimientos"
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
        <label class="account-settings-form__checkbox">
          <input
            v-model="form.procedureTurnoverEnabled"
            type="checkbox"
          >
          <span>Aplicar tiempo entre procedimientos por uso de sala</span>
        </label>
        <BaseInput
          :model-value="form.procedureTurnoverMinutes"
          label="Minutos de separacion despues del procedimiento"
          type="number"
          min="5"
          max="480"
          placeholder="15"
          :required="form.procedureTurnoverEnabled"
          :disabled="!form.procedureTurnoverEnabled"
          @update:model-value="form.procedureTurnoverMinutes = $event"
        />
        <label class="account-settings-form__field">
          <span class="account-settings-form__label">Politica procedural</span>
          <select
            v-model="form.procedurePricingPolicy"
            class="account-settings-form__select"
            disabled
          >
            <option value="bloqueado">Modalidad bloqueada por cuenta</option>
          </select>
        </label>
        <label class="account-settings-form__field">
          <span class="account-settings-form__label">Modalidad aplicada a procedimientos</span>
          <select
            v-model="form.defaultProcedurePricingMode"
            class="account-settings-form__select"
          >
            <option value="solo_sala">Solo uso de sala</option>
            <option value="solo_insumos">Solo insumos o equipo usado</option>
            <option value="sala_mas_insumos">Sala mas insumos</option>
          </select>
        </label>
      </div>
    </div>

    <div class="account-settings-form__section">
      <div class="account-settings-form__section-header">
        <h3>Moneda base</h3>
        <p>La cuenta define una moneda principal para sus facturas, pero cada caso puede ajustarse si la clinica lo necesita.</p>
      </div>

      <label class="account-settings-form__field">
        <span class="account-settings-form__label">Moneda por defecto</span>
        <select
          v-model="form.defaultCurrencyCode"
          class="account-settings-form__select"
        >
          <option
            v-for="currency in LATAM_CURRENCY_OPTIONS"
            :key="currency.code"
            :value="currency.code"
          >
            {{ currency.label }}
          </option>
        </select>
      </label>
    </div>

    <div class="account-settings-form__section">
      <div class="account-settings-form__section-header">
        <h3>Capacidades de la cuenta</h3>
        <p>Activa o desactiva capas del producto segun el modelo operativo real de la clinica.</p>
      </div>

      <div class="account-settings-form__grid">
        <label class="account-settings-form__checkbox">
          <input v-model="form.capabilityConfig.financeEnabled" type="checkbox">
          <span>Finanzas activas</span>
        </label>
        <label class="account-settings-form__checkbox">
          <input v-model="form.capabilityConfig.billableCatalogEnabled" type="checkbox">
          <span>Catalogo facturable activo</span>
        </label>
        <label class="account-settings-form__checkbox">
          <input v-model="form.capabilityConfig.manualBillingEnabled" type="checkbox">
          <span>Cobros sin reserva</span>
        </label>
        <label class="account-settings-form__checkbox">
          <input v-model="form.capabilityConfig.partialPaymentsEnabled" type="checkbox">
          <span>Pagos parciales y remanentes</span>
        </label>
        <label class="account-settings-form__checkbox">
          <input v-model="form.capabilityConfig.depositsEnabled" type="checkbox">
          <span>Depositos y anticipos</span>
        </label>
        <label class="account-settings-form__checkbox">
          <input v-model="form.capabilityConfig.penaltiesEnabled" type="checkbox">
          <span>Penalidades operativas</span>
        </label>
        <label class="account-settings-form__checkbox">
          <input v-model="form.capabilityConfig.inventoryEnabled" type="checkbox">
          <span>Inventario operativo</span>
        </label>
        <label class="account-settings-form__checkbox">
          <input v-model="form.capabilityConfig.packagesEnabled" type="checkbox">
          <span>Paquetes</span>
        </label>
        <label class="account-settings-form__checkbox">
          <input v-model="form.capabilityConfig.membershipsEnabled" type="checkbox">
          <span>Membresias</span>
        </label>
        <label class="account-settings-form__checkbox">
          <input v-model="form.capabilityConfig.rentalsEnabled" type="checkbox">
          <span>Alquiler de consultorios</span>
        </label>
        <label class="account-settings-form__checkbox">
          <input v-model="form.capabilityConfig.commissionsEnabled" type="checkbox">
          <span>Comisiones</span>
        </label>
        <label class="account-settings-form__checkbox">
          <input v-model="form.capabilityConfig.whatsappEnabled" type="checkbox">
          <span>WhatsApp operativo</span>
        </label>
      </div>
    </div>

    <div class="account-settings-form__section">
      <div class="account-settings-form__section-header">
        <h3>Politicas de cobro</h3>
        <p>Estas reglas gobiernan comprobantes, impuestos y decisiones operativas del cobro.</p>
      </div>

      <div class="account-settings-form__grid">
        <label class="account-settings-form__field">
          <span class="account-settings-form__label">Modo de comprobante</span>
          <select
            v-model="form.documentMode"
            class="account-settings-form__select"
          >
            <option value="comprobante_simple">Comprobante simple</option>
            <option value="prefactura">Prefactura</option>
          </select>
        </label>
        <label class="account-settings-form__field">
          <span class="account-settings-form__label">Politica de no-show</span>
          <select
            v-model="form.noShowPolicy"
            class="account-settings-form__select"
          >
            <option value="informativo">Solo informar</option>
            <option value="penalidad_manual">Penalidad manual</option>
          </select>
        </label>
        <label class="account-settings-form__field">
          <span class="account-settings-form__label">Cancelacion tardia</span>
          <select
            v-model="form.lateCancellationPolicy"
            class="account-settings-form__select"
          >
            <option value="informativa">Solo informar</option>
            <option value="penalidad_manual">Penalidad manual</option>
          </select>
        </label>
        <label class="account-settings-form__checkbox">
          <input
            v-model="form.taxesEnabled"
            type="checkbox"
          >
          <span>Permitir impuestos opcionales</span>
        </label>
        <label class="account-settings-form__checkbox">
          <input
            v-model="form.allowReceptionManualCharges"
            type="checkbox"
          >
          <span>Recepcion puede emitir cobros manuales</span>
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
      <p>Los tiempos de referencia ayudan a estandarizar la agenda, pero el doctor aun puede ajustar la duracion real al reservar.</p>
      <p>Si activas la separacion entre procedimientos, la sala quedara bloqueada esos minutos antes de permitir la siguiente reserva.</p>
      <p>La recepcion ejecuta la modalidad procedural definida aqui y luego genera la factura imprimible desde Finanzas.</p>
      <p>Si una factura usa una moneda distinta a la base de la cuenta, recepcion puede ajustarla manualmente para ese caso.</p>
      <p>Las capacidades que no correspondan al plan comercial pueden quedar visibles aqui, pero el backend las restringe segun el plan de la cuenta.</p>
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
  background: var(--surface);
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

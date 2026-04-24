<script setup>
import { computed, reactive, watch } from "vue";
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
    inventoryOptions: {
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
    },
    defaultPricingMode: {
        type: String,
        default: "solo_sala"
    },
    pricingPolicy: {
        type: String,
        default: "bloqueado"
    },
    canWaive: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(["submit", "cancel"]);

function createDefaultSupply() {
    return {
        inventoryItemId: "",
        quantity: 1,
        unitCost: 0,
        unitPrice: 0,
        notes: ""
    };
}

function createDefaultForm() {
    return {
        reservationId: null,
        procedureName: "",
        pricingMode: props.defaultPricingMode || "solo_sala",
        roomChargeAmount: 0,
        currencyCode: "CRC",
        paymentStatus: "pendiente",
        paymentMethod: "otro",
        paidAt: "",
        notes: "",
        chargeDecision: "cobrable",
        waiverReason: "",
        supplies: []
    };
}

const form = reactive(createDefaultForm());

const pricingModeLabels = {
    solo_sala: "Solo uso de sala",
    solo_insumos: "Solo insumos o equipo usado",
    sala_mas_insumos: "Sala mas insumos"
};

const isPricingModeLocked = computed(() => props.pricingPolicy === "bloqueado");
const activePricingModeLabel = computed(
    () => pricingModeLabels[form.pricingMode] ?? form.pricingMode
);
const shouldShowRoomCharge = computed(() => form.pricingMode !== "solo_insumos");
const shouldShowSupplies = computed(() => form.pricingMode !== "solo_sala");
const suppliesTotal = computed(() =>
    form.supplies.reduce(
        (sum, supply) => sum + Number(supply.quantity || 0) * Number(supply.unitPrice || 0),
        0
    )
);
const grandTotal = computed(() =>
    Number(form.roomChargeAmount || 0) + Number(suppliesTotal.value || 0)
);

function syncIncomingValue(value) {
    Object.assign(form, createDefaultForm(), {
        ...value,
        pricingMode:
            value?.pricingMode ??
            value?.pricing_mode ??
            props.defaultPricingMode ??
            "solo_sala",
        roomChargeAmount:
            value?.roomChargeAmount ??
            value?.room_charge_amount ??
            value?.amount ??
            0,
        chargeDecision: value?.chargeDecision ?? value?.charge_decision ?? "cobrable",
        waiverReason: value?.waiverReason ?? value?.waiver_reason ?? "",
        supplies: (value?.supplies ?? []).map((supply) => ({
            inventoryItemId: supply.inventoryItemId ?? supply.inventory_item_id ?? "",
            quantity: supply.quantity ?? 1,
            unitCost: supply.unitCost ?? supply.unit_cost ?? 0,
            unitPrice: supply.unitPrice ?? supply.unit_price ?? 0,
            notes: supply.notes ?? ""
        }))
    });

    if (!form.reservationId && props.reservationOptions.length) {
        form.reservationId = props.reservationOptions[0].id;
    }

    if (form.paidAt) {
        form.paidAt = String(form.paidAt).slice(0, 16);
    }
}

watch(
    () => props.initialValue,
    (value) => {
        syncIncomingValue(value ?? {});
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

watch(
    () => props.defaultPricingMode,
    (value) => {
        if (props.mode === "create" && !props.initialValue?.id) {
            form.pricingMode = value || "solo_sala";
        }
    }
);

watch(
    () => form.chargeDecision,
    (value) => {
        if (value === "exonerado") {
            form.paymentStatus = "anulado";
            form.paidAt = "";
        }
    }
);

watch(
    () => form.paymentStatus,
    (value) => {
        if (value !== "pagado") {
            form.paidAt = "";
        }
    }
);

function findInventoryItem(itemId) {
    return props.inventoryOptions.find((item) => Number(item.id) === Number(itemId));
}

function addSupplyLine() {
    form.supplies.push(createDefaultSupply());
}

function removeSupplyLine(index) {
    form.supplies.splice(index, 1);
}

function handleSupplyItemChange(index) {
    const supply = form.supplies[index];
    const inventoryItem = findInventoryItem(supply.inventoryItemId);

    if (!inventoryItem) {
        return;
    }

    if (!Number(supply.unitCost)) {
        supply.unitCost = inventoryItem.costoBase ?? 0;
    }

    if (!Number(supply.unitPrice)) {
        supply.unitPrice = inventoryItem.precioSugerido ?? 0;
    }
}

function formatReservationLabel(reservation) {
    return `${
        reservation.pacienteNombre || `Paciente #${reservation.pacienteId}`
    } · ${reservation.fecha} · ${reservation.salaNombre || `Sala #${reservation.salaId}`} · ${
        reservation.tipoConsulta
    }`;
}

function handleSubmit() {
    emit("submit", {
        reservationId: Number(form.reservationId),
        procedureName: form.procedureName,
        pricingMode: form.pricingMode,
        roomChargeAmount: Number(form.roomChargeAmount || 0),
        currencyCode: form.currencyCode,
        paymentStatus: form.paymentStatus,
        paymentMethod: form.paymentMethod,
        paidAt: form.paidAt || null,
        notes: form.notes,
        chargeDecision: form.chargeDecision,
        waiverReason: form.chargeDecision === "exonerado" ? form.waiverReason : null,
        supplies: shouldShowSupplies.value
            ? form.supplies
                  .filter((supply) => Number(supply.inventoryItemId) > 0)
                  .map((supply) => ({
                      inventoryItemId: Number(supply.inventoryItemId),
                      quantity: Number(supply.quantity || 0),
                      unitCost: Number(supply.unitCost || 0),
                      unitPrice: Number(supply.unitPrice || 0),
                      notes: supply.notes
                  }))
            : []
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
        :disabled="props.mode === 'edit' || !props.reservationOptions.length"
      >
        <option :value="null" disabled>
          {{ props.reservationOptions.length ? "Selecciona un procedimiento" : "No hay procedimientos listos para facturar" }}
        </option>
        <option
          v-for="reservation in props.reservationOptions"
          :key="reservation.id"
          :value="reservation.id"
        >
          {{ formatReservationLabel(reservation) }}
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
      <div class="finance-charge-form__field">
        <span class="finance-charge-form__label">Modalidad aplicada</span>
        <div v-if="isPricingModeLocked" class="finance-charge-form__policy-card">
          <strong>{{ activePricingModeLabel }}</strong>
          <p>La cuenta define esta modalidad desde Configuraciones y recepcion solo registra el cierre del caso.</p>
        </div>
        <select v-else v-model="form.pricingMode" class="finance-charge-form__select">
          <option
            v-for="(label, key) in pricingModeLabels"
            :key="key"
            :value="key"
          >
            {{ label }}
          </option>
        </select>
      </div>
      <BaseInput
        v-if="shouldShowRoomCharge"
        :model-value="form.roomChargeAmount"
        label="Monto por uso de sala"
        type="number"
        min="0"
        step="0.01"
        :required="form.pricingMode !== 'solo_insumos'"
        @update:model-value="form.roomChargeAmount = $event"
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
        <select
          v-model="form.paymentStatus"
          class="finance-charge-form__select"
          :disabled="form.chargeDecision === 'exonerado'"
        >
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
        :disabled="form.paymentStatus !== 'pagado' || form.chargeDecision === 'exonerado'"
        @update:model-value="form.paidAt = $event"
      />
      <label
        v-if="props.canWaive"
        class="finance-charge-form__field"
      >
        <span class="finance-charge-form__label">Decision del caso</span>
        <select v-model="form.chargeDecision" class="finance-charge-form__select">
          <option value="cobrable">Cobrable</option>
          <option value="exonerado">Exonerado</option>
        </select>
      </label>
    </div>

    <BaseInput
      v-if="props.canWaive && form.chargeDecision === 'exonerado'"
      :model-value="form.waiverReason"
      label="Motivo de exoneracion"
      as="textarea"
      :rows="3"
      placeholder="Autorizado por direccion medica..."
      :required="true"
      @update:model-value="form.waiverReason = $event"
    />

    <section v-if="shouldShowSupplies" class="finance-charge-form__supplies">
      <div class="finance-charge-form__supplies-header">
        <div>
          <h3>Equipo e insumos usados</h3>
          <p>Selecciona desde inventario lo que recepcion recibio como consumo real del procedimiento.</p>
        </div>
        <BaseButton
          variant="ghost"
          type="button"
          @click="addSupplyLine"
        >
          Agregar insumo
        </BaseButton>
      </div>

      <div v-if="!props.inventoryOptions.length" class="finance-charge-form__state">
        No hay insumos cargados en inventario todavia.
      </div>

      <div
        v-for="(supply, index) in form.supplies"
        :key="`supply-${index}`"
        class="finance-charge-form__supply-card"
      >
        <div class="finance-charge-form__supply-grid">
          <label class="finance-charge-form__field">
            <span class="finance-charge-form__label">Insumo</span>
            <select
              v-model="supply.inventoryItemId"
              class="finance-charge-form__select"
              @change="handleSupplyItemChange(index)"
            >
              <option value="">Selecciona un insumo</option>
              <option
                v-for="item in props.inventoryOptions"
                :key="item.id"
                :value="item.id"
              >
                {{ item.nombre }} · {{ item.categoria || "General" }}
              </option>
            </select>
          </label>
          <BaseInput
            :model-value="supply.quantity"
            label="Cantidad"
            type="number"
            min="0.01"
            step="0.01"
            @update:model-value="supply.quantity = $event"
          />
          <BaseInput
            :model-value="supply.unitCost"
            label="Costo unitario"
            type="number"
            min="0"
            step="0.01"
            @update:model-value="supply.unitCost = $event"
          />
          <BaseInput
            :model-value="supply.unitPrice"
            label="Precio unitario"
            type="number"
            min="0"
            step="0.01"
            @update:model-value="supply.unitPrice = $event"
          />
        </div>

        <BaseInput
          :model-value="supply.notes"
          label="Nota del insumo"
          placeholder="Ej. 2 paquetes de sutura"
          @update:model-value="supply.notes = $event"
        />

        <div class="finance-charge-form__supply-footer">
          <span>
            Subtotal:
            {{
              new Intl.NumberFormat("es-CR", {
                  style: "currency",
                  currency: form.currencyCode,
                  maximumFractionDigits: 2
              }).format(Number(supply.quantity || 0) * Number(supply.unitPrice || 0))
            }}
          </span>
          <BaseButton
            variant="ghost"
            type="button"
            @click="removeSupplyLine(index)"
          >
            Quitar
          </BaseButton>
        </div>
      </div>
    </section>

    <div class="finance-charge-form__totals">
      <div class="finance-charge-form__total-card">
        <span>Total insumos</span>
        <strong>
          {{
            new Intl.NumberFormat("es-CR", {
                style: "currency",
                currency: form.currencyCode,
                maximumFractionDigits: 2
            }).format(suppliesTotal)
          }}
        </strong>
      </div>
      <div class="finance-charge-form__total-card">
        <span>Total estimado</span>
        <strong>
          {{
            new Intl.NumberFormat("es-CR", {
                style: "currency",
                currency: form.currencyCode,
                maximumFractionDigits: 2
            }).format(grandTotal)
          }}
        </strong>
      </div>
    </div>

    <BaseInput
      :model-value="form.notes"
      label="Observaciones para el bill"
      as="textarea"
      :rows="3"
      placeholder="Observacion administrativa o detalle para impresion"
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
        {{ props.mode === "edit" ? "Guardar facturacion" : "Registrar facturacion" }}
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

.finance-charge-form__grid,
.finance-charge-form__supply-grid {
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

.finance-charge-form__policy-card {
  display: grid;
  gap: 0.35rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(17, 184, 159, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.86);
}

.finance-charge-form__policy-card strong {
  color: var(--primary-dark);
}

.finance-charge-form__policy-card p {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.9rem;
}

.finance-charge-form__supplies,
.finance-charge-form__total-card,
.finance-charge-form__supply-card {
  border: 1px solid rgba(17, 184, 159, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.86);
}

.finance-charge-form__supplies,
.finance-charge-form__supply-card {
  padding: 1rem;
}

.finance-charge-form__supplies {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.finance-charge-form__supplies-header,
.finance-charge-form__supply-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.finance-charge-form__supplies-header h3,
.finance-charge-form__supplies-header p {
  margin: 0;
}

.finance-charge-form__supplies-header p {
  color: var(--text-soft);
  margin-top: 0.35rem;
}

.finance-charge-form__supply-card {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.finance-charge-form__totals {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.finance-charge-form__total-card {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.finance-charge-form__total-card span {
  color: var(--text-soft);
}

.finance-charge-form__total-card strong {
  color: var(--primary-dark);
  font-size: 1.2rem;
}

.finance-charge-form__state,
.finance-charge-form__error {
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 18px;
}

.finance-charge-form__state {
  background: rgba(17, 184, 159, 0.08);
  color: var(--text-soft);
}

.finance-charge-form__error {
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
  .finance-charge-form__grid,
  .finance-charge-form__supply-grid,
  .finance-charge-form__totals {
    grid-template-columns: 1fr;
  }

  .finance-charge-form__supplies-header,
  .finance-charge-form__supply-footer,
  .finance-charge-form__actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

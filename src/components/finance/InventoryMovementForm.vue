<script setup>
import { computed, reactive, watch } from "vue";
import BaseButton from "../base/BaseButton.vue";
import BaseInput from "../base/BaseInput.vue";

const props = defineProps({
    item: {
        type: Object,
        default: () => ({})
    },
    branchOptions: {
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
        movementType: "entrada",
        branchId: "",
        quantity: 1,
        targetStock: 0,
        unitCostReference: 0,
        observation: ""
    };
}

const form = reactive(createDefaultForm());

watch(
    () => props.item,
    (item) => {
        const firstStockRow = item?.stockByBranch?.[0] ?? null;

        Object.assign(form, createDefaultForm(), {
            branchId: item?.branchId ?? firstStockRow?.branchId ?? "",
            unitCostReference: item?.costoBase ?? 0,
            targetStock: firstStockRow?.currentStock ?? 0
        });
    },
    { deep: true, immediate: true }
);

const isAdjustment = computed(() => form.movementType === "ajuste");

const availableBranchOptions = computed(() => {
    if (props.item?.scopeType === "sucursal" && Number(props.item?.branchId) > 0) {
        return props.branchOptions.filter(
            (branch) => Number(branch.id) === Number(props.item.branchId)
        );
    }

    return props.branchOptions.filter((branch) => branch.estado === "activa");
});

function handleSubmit() {
    emit("submit", {
        movementType: form.movementType,
        branchId: Number(form.branchId),
        quantity: Number(form.quantity || 0),
        targetStock: Number(form.targetStock || 0),
        unitCostReference: Number(form.unitCostReference || 0),
        observation: form.observation
    });
}
</script>

<template>
  <form class="inventory-movement-form" @submit.prevent="handleSubmit">
    <div class="inventory-movement-form__summary">
      <strong>{{ props.item?.nombre || "Insumo" }}</strong>
      <span>
        {{ props.item?.categoria || "General" }} · {{ props.item?.unidad || "unidad" }}
      </span>
    </div>

    <div class="inventory-movement-form__grid">
      <label class="inventory-movement-form__field">
        <span class="inventory-movement-form__label">Tipo de movimiento</span>
        <select v-model="form.movementType" class="inventory-movement-form__select">
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
          <option value="ajuste">Ajuste manual</option>
          <option value="devolucion">Devolucion</option>
        </select>
      </label>

      <label class="inventory-movement-form__field">
        <span class="inventory-movement-form__label">Sucursal</span>
        <select
          v-model="form.branchId"
          class="inventory-movement-form__select"
          :disabled="props.item?.scopeType === 'sucursal'"
        >
          <option value="" disabled>Selecciona una sucursal</option>
          <option
            v-for="branch in availableBranchOptions"
            :key="branch.id"
            :value="branch.id"
          >
            {{ branch.nombre }}
          </option>
        </select>
      </label>

      <BaseInput
        v-if="!isAdjustment"
        :model-value="form.quantity"
        label="Cantidad"
        type="number"
        min="0.01"
        step="0.01"
        :disabled="props.submitting"
        @update:model-value="form.quantity = $event"
      />

      <BaseInput
        v-else
        :model-value="form.targetStock"
        label="Stock final deseado"
        type="number"
        min="0"
        step="0.01"
        :disabled="props.submitting"
        @update:model-value="form.targetStock = $event"
      />

      <BaseInput
        :model-value="form.unitCostReference"
        label="Costo referencial"
        type="number"
        min="0"
        step="0.01"
        :disabled="props.submitting"
        @update:model-value="form.unitCostReference = $event"
      />
    </div>

    <BaseInput
      :model-value="form.observation"
      label="Observacion"
      as="textarea"
      :rows="3"
      :required="isAdjustment"
      :disabled="props.submitting"
      :placeholder="
        isAdjustment
          ? 'Ej. Conteo fisico al cierre de turno'
          : 'Motivo opcional del movimiento'
      "
      @update:model-value="form.observation = $event"
    />

    <p v-if="props.errorMessage" class="inventory-movement-form__error">
      {{ props.errorMessage }}
    </p>

    <div class="inventory-movement-form__actions">
      <BaseButton variant="ghost" @click.prevent="emit('cancel')">
        Cancelar
      </BaseButton>
      <BaseButton type="submit" :disabled="props.submitting">
        Registrar movimiento
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.inventory-movement-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.inventory-movement-form__summary {
  display: grid;
  gap: 0.3rem;
  padding: 0.95rem 1rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(17, 184, 159, 0.12);
}

.inventory-movement-form__summary span {
  color: var(--text-soft);
}

.inventory-movement-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.inventory-movement-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.inventory-movement-form__label {
  font-size: 0.92rem;
  font-weight: 600;
}

.inventory-movement-form__select {
  width: 100%;
  border: 1px solid #bfd4dc;
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
}

.inventory-movement-form__error {
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 8px;
  background: rgba(235, 85, 69, 0.12);
  border: 1px solid rgba(235, 85, 69, 0.2);
  color: #b8392d;
}

.inventory-movement-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 760px) {
  .inventory-movement-form__grid {
    grid-template-columns: 1fr;
  }

  .inventory-movement-form__actions {
    flex-direction: column-reverse;
  }
}
</style>

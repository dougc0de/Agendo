<script setup>
import { computed, reactive, watch } from "vue";
import BaseButton from "../base/BaseButton.vue";
import BaseInput from "../base/BaseInput.vue";
import InventoryBranchStockEditor from "./InventoryBranchStockEditor.vue";

const props = defineProps({
    initialValue: {
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
    },
    mode: {
        type: String,
        default: "create"
    }
});

const emit = defineEmits(["submit", "cancel"]);

function createDefaultForm() {
    return {
        nombre: "",
        descripcion: "",
        categoria: "",
        tipo: "desechable",
        unidad: "unidad",
        costoBase: 0,
        precioSugerido: 0,
        scopeType: "global",
        branchId: "",
        controlaStock: false,
        allowNegativeStock: false,
        estado: "activo",
        stockByBranch: [],
        stockAdjustmentReason: ""
    };
}

function normalizeStockRows(stockRows = []) {
    if (!Array.isArray(stockRows)) {
        return [];
    }

    return stockRows.map((stockRow) => ({
        branchId: stockRow.branchId ?? "",
        currentStock: stockRow.currentStock ?? 0,
        minimumStock: stockRow.minimumStock ?? 0
    }));
}

const form = reactive(createDefaultForm());
let initialStockSnapshot = "[]";

function buildStockSnapshot(stockRows = []) {
    return JSON.stringify(
        stockRows.map((stockRow) => ({
            branchId: Number(stockRow.branchId) || 0,
            currentStock: Number(stockRow.currentStock || 0),
            minimumStock: Number(stockRow.minimumStock || 0)
        }))
    );
}

watch(
    () => props.initialValue,
    (value) => {
        const nextForm = createDefaultForm();

        Object.assign(nextForm, {
            ...value,
            controlaStock: Boolean(value?.controlaStock),
            allowNegativeStock: Boolean(value?.allowNegativeStock),
            stockByBranch: normalizeStockRows(value?.stockByBranch ?? []),
            branchId: value?.branchId ?? ""
        });

        Object.assign(form, nextForm);
        form.stockByBranch = nextForm.stockByBranch;
        initialStockSnapshot = buildStockSnapshot(nextForm.stockByBranch);
    },
    { deep: true, immediate: true }
);

watch(
    () => form.scopeType,
    (scopeType) => {
        if (scopeType !== "sucursal") {
            return;
        }

        if (!form.branchId && props.branchOptions.length) {
            const firstBranch = props.branchOptions.find((branch) => branch.estado === "activa");
            form.branchId = firstBranch?.id ?? "";
        }

        form.stockByBranch = form.controlaStock
            ? [
                  form.stockByBranch[0] ?? {
                      branchId: form.branchId || "",
                      currentStock: 0,
                      minimumStock: 0
                  }
              ].map((stockRow) => ({
                  ...stockRow,
                  branchId: form.branchId || stockRow.branchId || ""
              }))
            : [];
    }
);

watch(
    () => form.branchId,
    (branchId) => {
        if (form.scopeType !== "sucursal" || !form.controlaStock) {
            return;
        }

        if (!form.stockByBranch.length) {
            form.stockByBranch = [
                {
                    branchId: branchId || "",
                    currentStock: 0,
                    minimumStock: 0
                }
            ];
            return;
        }

        form.stockByBranch = [
            {
                ...form.stockByBranch[0],
                branchId: branchId || ""
            }
        ];
    }
);

watch(
    () => form.controlaStock,
    (controlaStock) => {
        if (!controlaStock) {
            form.allowNegativeStock = false;
            form.stockByBranch = [];
            form.stockAdjustmentReason = "";
            return;
        }

        if (form.scopeType === "sucursal") {
            form.stockByBranch = [
                form.stockByBranch[0] ?? {
                    branchId: form.branchId || "",
                    currentStock: 0,
                    minimumStock: 0
                }
            ];
        }
    }
);

const activeBranchOptions = computed(() =>
    props.branchOptions.filter((branch) => branch.estado === "activa")
);

const hasStockAdjustments = computed(
    () => buildStockSnapshot(form.stockByBranch) !== initialStockSnapshot
);

function handleSubmit() {
    emit("submit", {
        nombre: form.nombre,
        descripcion: form.descripcion,
        categoria: form.categoria,
        tipo: form.tipo,
        unidad: form.unidad,
        costoBase: Number(form.costoBase || 0),
        precioSugerido: Number(form.precioSugerido || 0),
        scopeType: form.scopeType,
        branchId: form.scopeType === "sucursal" ? Number(form.branchId || 0) : null,
        controlaStock: Boolean(form.controlaStock),
        allowNegativeStock: Boolean(form.controlaStock && form.allowNegativeStock),
        estado: form.estado,
        stockByBranch: form.controlaStock
            ? form.stockByBranch.map((stockRow) => ({
                  branchId: Number(stockRow.branchId || 0),
                  currentStock: Number(stockRow.currentStock || 0),
                  minimumStock: Number(stockRow.minimumStock || 0)
              }))
            : [],
        stockAdjustmentReason:
            props.mode === "edit" && hasStockAdjustments.value
                ? form.stockAdjustmentReason
                : null
    });
}
</script>

<template>
  <form class="inventory-item-form" @submit.prevent="handleSubmit">
    <div class="inventory-item-form__grid">
      <BaseInput
        :model-value="form.nombre"
        label="Nombre del insumo"
        placeholder="Ej. Hilo absorbible"
        :required="true"
        :disabled="props.submitting"
        @update:model-value="form.nombre = $event"
      />

      <BaseInput
        :model-value="form.categoria"
        label="Categoria"
        placeholder="Ej. Suturas"
        :disabled="props.submitting"
        @update:model-value="form.categoria = $event"
      />

      <BaseInput
        :model-value="form.descripcion"
        label="Descripcion"
        placeholder="Detalle breve del insumo"
        :disabled="props.submitting"
        @update:model-value="form.descripcion = $event"
      />

      <label class="inventory-item-form__field">
        <span class="inventory-item-form__label">Tipo</span>
        <select v-model="form.tipo" class="inventory-item-form__select">
          <option value="desechable">Desechable</option>
          <option value="reusable">Reusable</option>
        </select>
      </label>

      <BaseInput
        :model-value="form.unidad"
        label="Unidad"
        placeholder="Ej. unidad, caja, paquete"
        :required="true"
        :disabled="props.submitting"
        @update:model-value="form.unidad = $event"
      />

      <BaseInput
        :model-value="form.costoBase"
        label="Costo unitario"
        type="number"
        min="0"
        step="0.01"
        :required="true"
        :disabled="props.submitting"
        @update:model-value="form.costoBase = $event"
      />

      <BaseInput
        :model-value="form.precioSugerido"
        label="Precio sugerido"
        type="number"
        min="0"
        step="0.01"
        :required="true"
        :disabled="props.submitting"
        @update:model-value="form.precioSugerido = $event"
      />

      <label class="inventory-item-form__field">
        <span class="inventory-item-form__label">Estado</span>
        <select v-model="form.estado" class="inventory-item-form__select">
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </label>

      <label class="inventory-item-form__field">
        <span class="inventory-item-form__label">Alcance del insumo</span>
        <select v-model="form.scopeType" class="inventory-item-form__select">
          <option value="global">Global para la cuenta</option>
          <option value="sucursal">Propio de una sucursal</option>
        </select>
      </label>

      <label
        v-if="form.scopeType === 'sucursal'"
        class="inventory-item-form__field"
      >
        <span class="inventory-item-form__label">Sucursal asociada</span>
        <select v-model="form.branchId" class="inventory-item-form__select">
          <option value="" disabled>Selecciona una sucursal</option>
          <option
            v-for="branch in activeBranchOptions"
            :key="branch.id"
            :value="branch.id"
          >
            {{ branch.nombre }}
          </option>
        </select>
      </label>
    </div>

    <div class="inventory-item-form__toggles">
      <label class="inventory-item-form__toggle">
        <input v-model="form.controlaStock" type="checkbox">
        <span>Controlar stock real</span>
      </label>

      <label
        v-if="form.controlaStock"
        class="inventory-item-form__toggle"
      >
        <input v-model="form.allowNegativeStock" type="checkbox">
        <span>Permitir stock negativo</span>
      </label>
    </div>

    <InventoryBranchStockEditor
      v-if="form.controlaStock"
      v-model="form.stockByBranch"
      :branch-options="activeBranchOptions"
      :scope-type="form.scopeType"
      :item-branch-id="form.branchId"
      :disabled="props.submitting"
    />

    <BaseInput
      v-if="props.mode === 'edit' && form.controlaStock && hasStockAdjustments"
      :model-value="form.stockAdjustmentReason"
      label="Motivo del ajuste de stock"
      as="textarea"
      :rows="3"
      :required="true"
      :disabled="props.submitting"
      placeholder="Ej. Conteo fisico o correccion de existencias"
      @update:model-value="form.stockAdjustmentReason = $event"
    />

    <p v-if="props.errorMessage" class="inventory-item-form__error">
      {{ props.errorMessage }}
    </p>

    <div class="inventory-item-form__actions">
      <BaseButton variant="ghost" @click.prevent="emit('cancel')">
        Cancelar
      </BaseButton>
      <BaseButton type="submit" :disabled="props.submitting">
        {{ props.mode === "edit" ? "Guardar insumo" : "Agregar insumo" }}
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.inventory-item-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.inventory-item-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.inventory-item-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.inventory-item-form__label {
  font-size: 0.92rem;
  font-weight: 600;
}

.inventory-item-form__select {
  width: 100%;
  border: 1px solid #bfd4dc;
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
}

.inventory-item-form__toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.inventory-item-form__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: rgba(255, 255, 255, 0.82);
}

.inventory-item-form__error {
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 8px;
  background: rgba(235, 85, 69, 0.12);
  border: 1px solid rgba(235, 85, 69, 0.2);
  color: #b8392d;
}

.inventory-item-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 760px) {
  .inventory-item-form__grid {
    grid-template-columns: 1fr;
  }

  .inventory-item-form__actions {
    flex-direction: column-reverse;
  }
}
</style>

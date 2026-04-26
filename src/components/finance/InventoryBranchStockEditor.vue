<script setup>
import { computed, ref, watch } from "vue";
import BaseButton from "../base/BaseButton.vue";
import BaseInput from "../base/BaseInput.vue";

const props = defineProps({
    modelValue: {
        type: Array,
        default: () => []
    },
    branchOptions: {
        type: Array,
        default: () => []
    },
    scopeType: {
        type: String,
        default: "global"
    },
    itemBranchId: {
        type: [Number, String, null],
        default: null
    },
    disabled: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(["update:modelValue"]);

function createRow(branchId = "") {
    return {
        branchId,
        currentStock: 0,
        minimumStock: 0
    };
}

const rows = ref([]);

function normalizeRows(value = []) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((row) => ({
        branchId: row.branchId ?? "",
        currentStock: row.currentStock ?? 0,
        minimumStock: row.minimumStock ?? 0
    }));
}

watch(
    () => props.modelValue,
    (value) => {
        rows.value = normalizeRows(value);
    },
    { deep: true, immediate: true }
);

watch(
    () => [props.scopeType, props.itemBranchId],
    ([scopeType, itemBranchId]) => {
        if (scopeType !== "sucursal") {
            return;
        }

        const normalizedBranchId = Number(itemBranchId) > 0 ? Number(itemBranchId) : "";
        const firstRow = rows.value[0] ?? createRow(normalizedBranchId);
        firstRow.branchId = normalizedBranchId;
        rows.value = [firstRow];
        emit("update:modelValue", rows.value);
    }
);

const availableBranchOptions = computed(() =>
    props.branchOptions.filter((branch) => branch.estado === "activa")
);

function syncRows() {
    emit(
        "update:modelValue",
        rows.value.map((row) => ({
            branchId: Number(row.branchId) || "",
            currentStock: Number(row.currentStock || 0),
            minimumStock: Number(row.minimumStock || 0)
        }))
    );
}

function addRow() {
    rows.value.push(createRow(""));
    syncRows();
}

function removeRow(index) {
    rows.value.splice(index, 1);
    syncRows();
}
</script>

<template>
  <section class="inventory-branch-editor">
    <div class="inventory-branch-editor__header">
      <div>
        <h3>Stock por sucursal</h3>
        <p>
          Define existencias y stock minimo por sede para este insumo.
        </p>
      </div>

      <BaseButton
        v-if="props.scopeType === 'global'"
        type="button"
        variant="ghost"
        :disabled="props.disabled"
        @click="addRow"
      >
        Agregar sucursal
      </BaseButton>
    </div>

    <div v-if="!rows.length" class="inventory-branch-editor__empty">
      Aun no hay existencias configuradas para este insumo.
    </div>

    <div
      v-for="(row, index) in rows"
      :key="`stock-row-${index}`"
      class="inventory-branch-editor__row"
    >
      <label class="inventory-branch-editor__field">
        <span class="inventory-branch-editor__label">Sucursal</span>
        <select
          v-model="row.branchId"
          class="inventory-branch-editor__select"
          :disabled="props.disabled || props.scopeType === 'sucursal'"
          @change="syncRows"
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
        :model-value="row.currentStock"
        label="Stock actual"
        type="number"
        min="0"
        step="0.01"
        :disabled="props.disabled"
        @update:model-value="row.currentStock = $event; syncRows()"
      />

      <BaseInput
        :model-value="row.minimumStock"
        label="Stock minimo"
        type="number"
        min="0"
        step="0.01"
        :disabled="props.disabled"
        @update:model-value="row.minimumStock = $event; syncRows()"
      />

      <div class="inventory-branch-editor__actions">
        <BaseButton
          v-if="props.scopeType === 'global'"
          type="button"
          variant="ghost"
          :disabled="props.disabled"
          @click="removeRow(index)"
        >
          Quitar
        </BaseButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.inventory-branch-editor {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.inventory-branch-editor__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
}

.inventory-branch-editor__header h3 {
  margin: 0;
}

.inventory-branch-editor__header p {
  margin: 0.35rem 0 0;
  color: var(--text-soft);
}

.inventory-branch-editor__empty {
  padding: 0.95rem 1rem;
  border: 1px dashed rgba(17, 184, 159, 0.28);
  border-radius: 8px;
  color: var(--text-soft);
  background: rgba(255, 255, 255, 0.8);
}

.inventory-branch-editor__row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr auto;
  gap: 0.9rem;
  padding: 0.95rem;
  border-radius: 8px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: rgba(255, 255, 255, 0.82);
}

.inventory-branch-editor__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.inventory-branch-editor__label {
  font-size: 0.92rem;
  font-weight: 600;
}

.inventory-branch-editor__select {
  width: 100%;
  border: 1px solid #bfd4dc;
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
}

.inventory-branch-editor__actions {
  display: flex;
  align-items: end;
}

@media (max-width: 760px) {
  .inventory-branch-editor__header,
  .inventory-branch-editor__row {
    grid-template-columns: 1fr;
  }

  .inventory-branch-editor__header {
    align-items: stretch;
  }

  .inventory-branch-editor__actions {
    justify-content: flex-end;
  }
}
</style>

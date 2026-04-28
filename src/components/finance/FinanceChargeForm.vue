<script setup>
import { computed, reactive, ref, watch } from "vue";
import BaseButton from "../base/BaseButton.vue";
import BaseInput from "../base/BaseInput.vue";
import {
    DEFAULT_CURRENCY_CODE,
    LATAM_CURRENCY_OPTIONS
} from "../../shared/currencies.js";
import InventorySearchEngine from "../../services/InventorySearchEngine.js";

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
    defaultCurrencyCode: {
        type: String,
        default: DEFAULT_CURRENCY_CODE
    },
    pricingPolicy: {
        type: String,
        default: "bloqueado"
    },
    canWaive: {
        type: Boolean,
        default: false
    },
    selectedReservation: {
        type: Object,
        default: null
    },
    reservationOptionsLoading: {
        type: Boolean,
        default: false
    },
    reservationOptionsError: {
        type: String,
        default: ""
    },
    reservationLoading: {
        type: Boolean,
        default: false
    },
    reservationError: {
        type: String,
        default: ""
    }
});

const emit = defineEmits(["submit", "cancel", "reservation-change"]);
const inventorySearchEngine = new InventorySearchEngine();
const lastAutoProcedureName = ref("");
const clientError = ref("");

function createDefaultSupply() {
    return {
        inventoryItemId: "",
        searchQuery: "",
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
        currencyCode: props.defaultCurrencyCode || DEFAULT_CURRENCY_CODE,
        paymentStatus: "pendiente",
        paymentMethod: null,
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
const displayPaymentStatus = computed(() => {
    if (form.chargeDecision === "exonerado") {
        return "anulado";
    }

    return form.paymentStatus || "pendiente";
});
const showCurrencyReminder = computed(
    () => form.currencyCode !== (props.defaultCurrencyCode || DEFAULT_CURRENCY_CODE)
);
const suppliesTotal = computed(() =>
    form.supplies.reduce(
        (sum, supply) => sum + Number(supply.quantity || 0) * Number(supply.unitPrice || 0),
        0
    )
);
const grandTotal = computed(() =>
    Number(form.roomChargeAmount || 0) + Number(suppliesTotal.value || 0)
);
const hasReservationContext = computed(
    () =>
        Boolean(props.selectedReservation) &&
        Number(form.reservationId) > 0 &&
        Number(props.selectedReservation?.id ?? form.reservationId) === Number(form.reservationId)
);
const hasReservationFallbackWarning = computed(
    () => Boolean(props.reservationError) && hasReservationContext.value
);
const reservationSelectPlaceholder = computed(() => {
    if (props.reservationOptionsLoading) {
        return "Cargando reservas facturables";
    }

    if (props.reservationOptionsError) {
        return "No fue posible cargar las reservas";
    }

    if (!props.reservationOptions.length) {
        return "No hay procedimientos confirmados sin factura";
    }

    return "Selecciona una reserva procedural";
});
const canEditChargeDetails = computed(() => {
    if (!hasReservationContext.value) {
        return false;
    }

    if (props.mode === "edit") {
        return true;
    }

    return !props.reservationLoading && !props.reservationError;
});
const canSubmit = computed(() => {
    if (props.submitting || props.reservationLoading) {
        return false;
    }

    if (!Number(form.reservationId) || !hasReservationContext.value) {
        return false;
    }

    if (props.mode !== "edit" && props.reservationError) {
        return false;
    }

    return true;
});
const reservationSummaryItems = computed(() => {
    if (!props.selectedReservation) {
        return [];
    }

    return [
        {
            label: "Paciente",
            value: props.selectedReservation.pacienteNombre || "Paciente sin nombre"
        },
        {
            label: "Fecha y hora",
            value: `${props.selectedReservation.fecha || "Sin fecha"} · ${
                props.selectedReservation.horaInicio || "--:--"
            } - ${props.selectedReservation.horaFin || "--:--"}`
        },
        {
            label: "Sala",
            value: props.selectedReservation.salaNombre || "Sala sin nombre"
        },
        {
            label: "Sucursal",
            value: props.selectedReservation.branchName || "Sucursal sin definir"
        },
        {
            label: "Tipo de atencion",
            value: props.selectedReservation.tipoAtencion || "procedimiento"
        },
        {
            label: "Procedimiento sugerido",
            value:
                props.selectedReservation.tipoConsulta ||
                props.selectedReservation.descripcion ||
                "Sin detalle"
        },
        {
            label: "Estado de la reserva",
            value: props.selectedReservation.estado || "Sin estado"
        }
    ];
});

function buildSuggestedProcedureName(reservation) {
    return reservation?.tipoConsulta || reservation?.descripcion || "";
}

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
            searchQuery: supply.itemNameSnapshot ?? supply.item_name_snapshot ?? "",
            quantity: supply.quantity ?? 1,
            unitCost: supply.unitCost ?? supply.unit_cost ?? 0,
            unitPrice: supply.unitPrice ?? supply.unit_price ?? 0,
            notes: supply.notes ?? ""
        }))
    });

    lastAutoProcedureName.value = "";

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
    () => props.defaultPricingMode,
    (value) => {
        if (props.mode === "create" && !props.initialValue?.id) {
            form.pricingMode = value || "solo_sala";
        }
    }
);

watch(
    () => props.inventoryOptions,
    (value) => {
        inventorySearchEngine.setItems(value ?? []);
    },
    { deep: true, immediate: true }
);

watch(
    () => props.defaultCurrencyCode,
    (value) => {
        if (props.mode === "create" && !props.initialValue?.id) {
            form.currencyCode = value || DEFAULT_CURRENCY_CODE;
        }
    }
);

watch(
    () => props.selectedReservation,
    (value) => {
        if (props.mode === "edit" && props.initialValue?.id) {
            return;
        }

        if (!value) {
            if (form.procedureName === lastAutoProcedureName.value) {
                form.procedureName = "";
            }

            lastAutoProcedureName.value = "";
            return;
        }

        const suggestedProcedureName = buildSuggestedProcedureName(value);

        if (!suggestedProcedureName) {
            return;
        }

        if (!form.procedureName || form.procedureName === lastAutoProcedureName.value) {
            form.procedureName = suggestedProcedureName;
            lastAutoProcedureName.value = suggestedProcedureName;
        }
    },
    { deep: true, immediate: true }
);

function findInventoryItem(itemId) {
    return props.inventoryOptions.find((item) => Number(item.id) === Number(itemId));
}

function addSupplyLine() {
    if (!canEditChargeDetails.value) {
        return;
    }

    clientError.value = "";
    form.supplies.push(createDefaultSupply());
}

function removeSupplyLine(index) {
    if (!canEditChargeDetails.value) {
        return;
    }

    clientError.value = "";
    form.supplies.splice(index, 1);
}

function applyInventoryItemToSupply(supply, inventoryItem) {
    if (!supply || !inventoryItem) {
        return;
    }

    clientError.value = "";
    supply.inventoryItemId = inventoryItem.id;
    supply.searchQuery = inventoryItem.nombre ?? "";
    supply.unitCost = inventoryItem.costoBase ?? 0;
    supply.unitPrice = inventoryItem.precioSugerido ?? 0;
}

function handleSupplySearchInput(index, value) {
    if (!canEditChargeDetails.value) {
        return;
    }

    const supply = form.supplies[index];

    if (!supply) {
        return;
    }

    supply.searchQuery = value;

    const selectedItem = findInventoryItem(supply.inventoryItemId);
    const normalizedQuery = String(value ?? "").trim().toLowerCase();

    if (
        selectedItem &&
        normalizedQuery !== String(selectedItem.nombre ?? "").trim().toLowerCase()
    ) {
        supply.inventoryItemId = "";
    }
}

function selectInventoryItem(index, inventoryItem) {
    if (!canEditChargeDetails.value) {
        return;
    }

    const supply = form.supplies[index];
    applyInventoryItemToSupply(supply, inventoryItem);
}

function clearInventoryItem(index) {
    if (!canEditChargeDetails.value) {
        return;
    }

    clientError.value = "";
    const supply = form.supplies[index];

    if (!supply) {
        return;
    }

    Object.assign(supply, createDefaultSupply());
}

function getReservationBranchId() {
    const branchId = Number(props.selectedReservation?.branchId);
    return Number.isInteger(branchId) && branchId > 0 ? branchId : null;
}

function getStockRowForReservation(item) {
    const reservationBranchId = getReservationBranchId();

    if (!reservationBranchId || !item?.controlaStock) {
        return null;
    }

    return (
        item.stockByBranch?.find(
            (stockRow) => Number(stockRow.branchId) === Number(reservationBranchId)
        ) ?? null
    );
}

function getInventoryAvailability(item) {
    if (!item) {
        return {
            available: false,
            label: "Selecciona un insumo valido"
        };
    }

    const reservationBranchId = getReservationBranchId();

    if (item.scopeType === "sucursal") {
        if (!reservationBranchId) {
            return {
                available: false,
                label: "La reserva no tiene sucursal asociada"
            };
        }

        if (Number(item.branchId) !== Number(reservationBranchId)) {
            return {
                available: false,
                label: "Disponible solo en otra sucursal"
            };
        }
    }

    if (!item.controlaStock) {
        return {
            available: true,
            label: "Insumo referencial sin control de stock"
        };
    }

    const stockRow = getStockRowForReservation(item);

    if (!stockRow) {
        return {
            available: false,
            label: "Sin stock configurado en esta sucursal"
        };
    }

    if (stockRow.currentStock <= 0 && !item.allowNegativeStock) {
        return {
            available: false,
            label: "Sin existencias disponibles",
            stockRow
        };
    }

    return {
        available: true,
        label:
            stockRow.currentStock > 0
                ? `Disponible: ${stockRow.currentStock} ${item.unidad}${
                      stockRow.isLowStock ? " · stock bajo" : ""
                  }`
                : "Permitido con stock negativo",
        stockRow
    };
}

function getVisibleInventoryOptions(searchQuery, selectedItemId) {
    return inventorySearchEngine
        .search(searchQuery, {
        selectedItemId,
        activeOnly: true
        })
        .filter((item) => {
            if (item.scopeType !== "sucursal") {
                return true;
            }

            const reservationBranchId = getReservationBranchId();

            return !reservationBranchId || Number(item.branchId) === Number(reservationBranchId);
        });
}

function getSelectedInventoryItem(supply) {
    return findInventoryItem(supply.inventoryItemId);
}

function shouldShowInventorySuggestions(supply) {
    const query = String(supply?.searchQuery ?? "").trim().toLowerCase();
    const selectedItem = getSelectedInventoryItem(supply);

    if (!query) {
        return false;
    }

    if (
        selectedItem &&
        query === String(selectedItem.nombre ?? "").trim().toLowerCase()
    ) {
        return false;
    }

    return true;
}

function formatReservationLabel(reservation) {
    return `${
        reservation.pacienteNombre || `Paciente #${reservation.pacienteId}`
    } · ${reservation.fecha} · ${reservation.salaNombre || `Sala #${reservation.salaId}`} · ${
        reservation.tipoConsulta
    }`;
}

function handleReservationSelection() {
    clientError.value = "";
    if (form.procedureName === lastAutoProcedureName.value) {
        form.procedureName = "";
        lastAutoProcedureName.value = "";
    }

    emit(
        "reservation-change",
        Number(form.reservationId) > 0 ? Number(form.reservationId) : null
    );
}

function getInitialSupplyQuantity(itemId) {
    return (props.initialValue?.supplies ?? [])
        .filter(
            (supply) =>
                Number(supply.inventoryItemId ?? supply.inventory_item_id) === Number(itemId)
        )
        .reduce((sum, supply) => sum + Number(supply.quantity ?? 0), 0);
}

function handleSubmit() {
    if (!canSubmit.value) {
        return;
    }

    clientError.value = "";

    if (shouldShowSupplies.value) {
        const groupedSupplies = form.supplies
            .filter((supply) => Number(supply.inventoryItemId) > 0)
            .reduce((map, supply) => {
                const itemId = Number(supply.inventoryItemId);

                if (!map.has(itemId)) {
                    map.set(itemId, 0);
                }

                map.set(itemId, map.get(itemId) + Number(supply.quantity || 0));
                return map;
            }, new Map());

        for (const [itemId, quantity] of groupedSupplies.entries()) {
            const item = findInventoryItem(itemId);
            const availability = getInventoryAvailability(item);

            if (!availability.available) {
                clientError.value = `El insumo ${item?.nombre ?? `#${itemId}`} no puede usarse en esta reserva: ${availability.label}.`;
                return;
            }

            if (item?.controlaStock && !item.allowNegativeStock) {
                const availableStock = Number(availability.stockRow?.currentStock ?? 0);
                const initialQuantity = getInitialSupplyQuantity(itemId);
                const allowedQuantity = availableStock + initialQuantity;

                if (Number(quantity) > allowedQuantity) {
                    clientError.value = `El insumo ${item.nombre} solo tiene ${availableStock} ${item.unidad} disponibles en esta sucursal.`;
                    return;
                }
            }
        }
    }

    emit("submit", {
        reservationId: Number(form.reservationId),
        procedureName: form.procedureName,
        pricingMode: form.pricingMode,
        roomChargeAmount: Number(form.roomChargeAmount || 0),
        currencyCode: form.currencyCode,
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
        :disabled="props.mode === 'edit' || props.reservationOptionsLoading || !props.reservationOptions.length"
        @change="handleReservationSelection"
      >
        <option :value="null" disabled>
          {{ reservationSelectPlaceholder }}
        </option>
        <option
          v-for="reservation in props.reservationOptions"
          :key="reservation.id"
          :value="reservation.id"
        >
          {{ formatReservationLabel(reservation) }}
        </option>
      </select>
      <span class="finance-charge-form__helper">
        Solo se muestran procedimientos confirmados sin factura emitida.
      </span>
    </label>

    <div
      v-if="!form.reservationId && props.reservationOptionsLoading"
      class="finance-charge-form__state"
    >
      Cargando reservas facturables...
    </div>
    <p
      v-else-if="!form.reservationId && props.reservationOptionsError"
      class="finance-charge-form__error"
    >
      {{ props.reservationOptionsError }}
    </p>
    <div
      v-else-if="!form.reservationId && !props.reservationOptions.length"
      class="finance-charge-form__state"
    >
      No hay procedimientos confirmados sin factura emitida en este momento.
    </div>
    <div v-else-if="!form.reservationId" class="finance-charge-form__state">
      Selecciona una reserva procedural para cargar el contexto de la factura.
    </div>
    <div v-else-if="props.reservationLoading" class="finance-charge-form__state">
      Cargando reserva...
    </div>
    <p
      v-else-if="props.reservationError && !hasReservationFallbackWarning"
      class="finance-charge-form__error"
    >
      {{ props.reservationError }}
    </p>
    <p
      v-else-if="hasReservationFallbackWarning"
      class="finance-charge-form__warning"
    >
      {{ props.reservationError }}
    </p>

    <section
      v-if="hasReservationContext"
      class="finance-charge-form__reservation-card"
    >
      <div class="finance-charge-form__reservation-header">
        <div>
          <span class="finance-charge-form__reservation-eyebrow">Reserva seleccionada</span>
          <h3>Contexto clinico de la factura</h3>
        </div>
      </div>

      <div class="finance-charge-form__reservation-grid">
        <article
          v-for="item in reservationSummaryItems"
          :key="item.label"
          class="finance-charge-form__reservation-item"
        >
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </div>
    </section>

    <div class="finance-charge-form__grid">
      <BaseInput
        :model-value="form.procedureName"
        label="Nombre del procedimiento"
        placeholder="Ej. Cirugia menor"
        :required="true"
        :disabled="!canEditChargeDetails"
        @update:model-value="form.procedureName = $event"
      />
      <div class="finance-charge-form__field">
        <span class="finance-charge-form__label">Modalidad aplicada</span>
        <div v-if="isPricingModeLocked" class="finance-charge-form__policy-card">
          <strong>{{ activePricingModeLabel }}</strong>
          <p>La cuenta define esta modalidad desde Configuraciones y recepcion solo registra el cierre del caso.</p>
        </div>
        <select
          v-else
          v-model="form.pricingMode"
          class="finance-charge-form__select"
          :disabled="!canEditChargeDetails"
        >
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
        :disabled="!canEditChargeDetails"
        @update:model-value="form.roomChargeAmount = $event"
      />
      <label class="finance-charge-form__field">
        <span class="finance-charge-form__label">Moneda</span>
        <select
          v-model="form.currencyCode"
          class="finance-charge-form__select"
          :disabled="!canEditChargeDetails"
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
      <div class="finance-charge-form__field">
        <span class="finance-charge-form__label">Estado de la factura</span>
        <div class="finance-charge-form__policy-card">
          <strong>{{ displayPaymentStatus }}</strong>
          <p>
            {{
              displayPaymentStatus === "pagado"
                ? "El pago ya fue confirmado en recepcion."
                : displayPaymentStatus === "anulado"
                  ? "Este caso quedo anulado por decision administrativa."
                  : "La factura se emite primero y el pago se confirma despues."
            }}
          </p>
        </div>
      </div>
      <label
        v-if="props.canWaive"
        class="finance-charge-form__field"
      >
        <span class="finance-charge-form__label">Decision del caso</span>
        <select
          v-model="form.chargeDecision"
          class="finance-charge-form__select"
          :disabled="!canEditChargeDetails"
        >
          <option value="cobrable">Cobrable</option>
          <option value="exonerado">Exonerado</option>
        </select>
      </label>
    </div>

    <p v-if="showCurrencyReminder" class="finance-charge-form__hint">
      Esta operacion usa una moneda distinta a la base de la cuenta. Ajusta los montos manualmente porque AGENDO no convierte divisas automaticamente.
    </p>

    <BaseInput
      v-if="props.canWaive && form.chargeDecision === 'exonerado'"
      :model-value="form.waiverReason"
      label="Motivo de exoneracion"
      as="textarea"
      :rows="3"
      placeholder="Autorizado por direccion medica..."
      :required="true"
      :disabled="!canEditChargeDetails"
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
          :disabled="!canEditChargeDetails"
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
          <div class="finance-charge-form__field finance-charge-form__inventory-field">
            <BaseInput
              :model-value="supply.searchQuery"
              label="Buscar en inventario"
              placeholder="Escribe hilos, agujas, paquetes..."
              :disabled="!canEditChargeDetails"
              @update:model-value="handleSupplySearchInput(index, $event)"
            />

            <div
              v-if="getSelectedInventoryItem(supply)"
              class="finance-charge-form__selected-item"
            >
              <div>
                <strong>{{ getSelectedInventoryItem(supply)?.nombre }}</strong>
                <span>
                  {{ getSelectedInventoryItem(supply)?.categoria || "General" }} ·
                  {{ getSelectedInventoryItem(supply)?.unidad }}
                </span>
                <span class="finance-charge-form__selected-item-stock">
                  {{ getInventoryAvailability(getSelectedInventoryItem(supply)).label }}
                </span>
              </div>

              <BaseButton
                type="button"
                size="sm"
                variant="ghost"
                :disabled="!canEditChargeDetails"
                @click="clearInventoryItem(index)"
              >
                Cambiar
              </BaseButton>
            </div>

            <div
              v-if="shouldShowInventorySuggestions(supply)"
              class="finance-charge-form__inventory-results"
            >
              <button
                v-for="item in getVisibleInventoryOptions(supply.searchQuery, supply.inventoryItemId)"
                :key="item.id"
                type="button"
                class="finance-charge-form__inventory-result"
                :disabled="!canEditChargeDetails || !getInventoryAvailability(item).available"
                @click="selectInventoryItem(index, item)"
              >
                <strong>{{ item.nombre }}</strong>
                <span>{{ item.categoria || "General" }} · {{ item.unidad }}</span>
                <small>{{ getInventoryAvailability(item).label }}</small>
              </button>

              <p
                v-if="!getVisibleInventoryOptions(supply.searchQuery, supply.inventoryItemId).length"
                class="finance-charge-form__inventory-empty"
              >
                No encontramos coincidencias con esa busqueda.
              </p>
            </div>
          </div>
          <BaseInput
            :model-value="supply.quantity"
            label="Cantidad"
            type="number"
            min="0.01"
            step="0.01"
            :disabled="!canEditChargeDetails"
            @update:model-value="supply.quantity = $event"
          />
          <BaseInput
            :model-value="supply.unitCost"
            label="Costo unitario"
            type="number"
            min="0"
            step="0.01"
            :disabled="!canEditChargeDetails"
            @update:model-value="supply.unitCost = $event"
          />
          <BaseInput
            :model-value="supply.unitPrice"
            label="Precio unitario"
            type="number"
            min="0"
            step="0.01"
            :disabled="!canEditChargeDetails"
            @update:model-value="supply.unitPrice = $event"
          />
        </div>

        <BaseInput
          :model-value="supply.notes"
          label="Nota del insumo"
          placeholder="Ej. 2 paquetes de sutura"
          :disabled="!canEditChargeDetails"
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
            :disabled="!canEditChargeDetails"
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
      label="Observaciones de la factura"
      as="textarea"
      :rows="3"
      placeholder="Observacion administrativa o detalle para impresion"
      :disabled="!canEditChargeDetails"
      @update:model-value="form.notes = $event"
    />

    <p v-if="clientError || props.errorMessage" class="finance-charge-form__error">
      {{ clientError || props.errorMessage }}
    </p>

    <div class="finance-charge-form__actions">
      <BaseButton variant="ghost" @click.prevent="emit('cancel')">
        Cancelar
      </BaseButton>
      <BaseButton type="submit" :disabled="!canSubmit">
        {{ props.mode === "edit" ? "Guardar Factura" : "Emitir Factura" }}
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
.finance-charge-form__supply-grid,
.finance-charge-form__reservation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.finance-charge-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.finance-charge-form__inventory-field {
  grid-column: 1 / -1;
}

.finance-charge-form__label {
  font-size: 0.92rem;
  font-weight: 600;
}

.finance-charge-form__helper {
  color: var(--text-soft);
  font-size: 0.84rem;
  line-height: 1.4;
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

.finance-charge-form__policy-card,
.finance-charge-form__reservation-card {
  display: grid;
  gap: 0.35rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(17, 184, 159, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.86);
}

.finance-charge-form__policy-card strong,
.finance-charge-form__reservation-item strong {
  color: var(--primary-dark);
}

.finance-charge-form__policy-card p {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.9rem;
}

.finance-charge-form__reservation-header h3 {
  margin: 0.35rem 0 0;
}

.finance-charge-form__reservation-eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 0.32rem 0.72rem;
  border-radius: 999px;
  background: var(--hero-chip-bg);
  color: var(--primary-dark);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.finance-charge-form__reservation-item {
  border-radius: 14px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: rgba(248, 252, 253, 0.92);
  padding: 0.85rem 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.finance-charge-form__reservation-item span {
  color: var(--text-soft);
  font-size: 0.86rem;
}

.finance-charge-form__selected-item,
.finance-charge-form__inventory-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.85rem 0.95rem;
  border-radius: 12px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: rgba(255, 255, 255, 0.92);
}

.finance-charge-form__selected-item strong,
.finance-charge-form__inventory-result strong {
  color: var(--primary-dark);
}

.finance-charge-form__selected-item span,
.finance-charge-form__inventory-result span {
  display: block;
  margin-top: 0.18rem;
  color: var(--text-soft);
  text-align: left;
}

.finance-charge-form__selected-item-stock,
.finance-charge-form__inventory-result small {
  display: block;
  margin-top: 0.22rem;
  color: var(--primary-dark);
  font-size: 0.82rem;
}

.finance-charge-form__inventory-results {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.finance-charge-form__inventory-result {
  cursor: pointer;
  text-align: left;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.finance-charge-form__inventory-result:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.finance-charge-form__inventory-result:hover,
.finance-charge-form__inventory-result:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(17, 184, 159, 0.3);
  box-shadow: 0 14px 28px rgba(16, 38, 44, 0.08);
}

.finance-charge-form__inventory-empty {
  margin: 0;
  padding: 0.85rem 0.95rem;
  border-radius: 12px;
  background: rgba(17, 184, 159, 0.08);
  color: var(--text-soft);
}

.finance-charge-form__hint {
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 14px;
  background: rgba(255, 189, 97, 0.14);
  border: 1px solid rgba(255, 189, 97, 0.28);
  color: #7d4d0b;
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
.finance-charge-form__error,
.finance-charge-form__warning {
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 18px;
}

.finance-charge-form__state {
  background: rgba(17, 184, 159, 0.08);
  color: var(--text-soft);
}

.finance-charge-form__warning {
  background: rgba(255, 189, 97, 0.14);
  border: 1px solid rgba(255, 189, 97, 0.2);
  color: #7d4d0b;
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
  .finance-charge-form__totals,
  .finance-charge-form__reservation-grid {
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

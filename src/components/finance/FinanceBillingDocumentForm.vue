<script setup>
import { computed, reactive, ref, watch } from "vue";
import BaseButton from "../base/BaseButton.vue";
import BaseInput from "../base/BaseInput.vue";
import { searchPatients } from "../../services/patientApi.js";
import { DEFAULT_CURRENCY_CODE, LATAM_CURRENCY_OPTIONS } from "../../shared/currencies.js";

const props = defineProps({
    initialValue: {
        type: Object,
        default: () => ({})
    },
    reservationOptions: {
        type: Array,
        default: () => []
    },
    billableItemOptions: {
        type: Array,
        default: () => []
    },
    branchOptions: {
        type: Array,
        default: () => []
    },
    roomOptions: {
        type: Array,
        default: () => []
    },
    userOptions: {
        type: Array,
        default: () => []
    },
    defaultCurrencyCode: {
        type: String,
        default: DEFAULT_CURRENCY_CODE
    },
    defaultDocumentType: {
        type: String,
        default: "comprobante_simple"
    },
    canWaive: {
        type: Boolean,
        default: false
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
        reservationId: "",
        billableItemId: "",
        patientId: "",
        professionalUserId: "",
        roomId: "",
        branchId: "",
        quantity: 1,
        unitPrice: 0,
        currencyCode: props.defaultCurrencyCode || DEFAULT_CURRENCY_CODE,
        documentType: props.defaultDocumentType || "comprobante_simple",
        chargeDecision: "cobrable",
        notes: ""
    };
}

const form = reactive(createDefaultForm());
const patientSearch = ref("");
const patientResults = ref([]);
const patientSearching = ref(false);
const patientSearchError = ref("");
const selectedPatient = ref(null);
let patientSearchTimeout = null;
let patientSearchRequest = 0;

const selectedReservation = computed(
    () =>
        props.reservationOptions.find(
            (reservation) => Number(reservation.id) === Number(form.reservationId)
        ) ?? null
);

const selectedBillableItem = computed(
    () =>
        props.billableItemOptions.find(
            (item) => Number(item.id) === Number(form.billableItemId)
        ) ?? null
);

watch(
    () => props.initialValue,
    (value) => {
        Object.assign(form, createDefaultForm(), value ?? {}, {
            reservationId: value?.reservationId ?? "",
            billableItemId: value?.billableItemId ?? "",
            patientId: value?.patientId ?? "",
            professionalUserId: value?.professionalUserId ?? "",
            roomId: value?.roomId ?? "",
            branchId: value?.branchId ?? "",
            quantity: Number(value?.quantity ?? 1) || 1,
            unitPrice: Number(value?.unitPrice ?? 0) || 0,
            currencyCode: value?.currencyCode ?? props.defaultCurrencyCode ?? DEFAULT_CURRENCY_CODE,
            documentType: value?.documentType ?? props.defaultDocumentType ?? "comprobante_simple",
            chargeDecision: value?.chargeDecision ?? "cobrable",
            notes: value?.notes ?? ""
        });

        if (value?.patientId && value?.patientNameSnapshot) {
            selectedPatient.value = {
                id: value.patientId,
                nombre: value.patientNameSnapshot,
                telefono: value.patientPhoneSnapshot ?? "",
                correo: value.patientEmailSnapshot ?? ""
            };
            patientSearch.value = value.patientNameSnapshot;
        } else {
            selectedPatient.value = null;
            patientSearch.value = "";
        }
    },
    { deep: true, immediate: true }
);

watch(
    selectedReservation,
    (reservation) => {
        if (!reservation) {
            return;
        }

        form.patientId = reservation.pacienteId ?? "";
        form.professionalUserId = reservation.usuarioId ?? "";
        form.roomId = reservation.salaId ?? "";
        form.branchId = reservation.branchId ?? "";
        selectedPatient.value = reservation.pacienteId
            ? {
                  id: reservation.pacienteId,
                  nombre: reservation.pacienteNombre ?? "Paciente",
                  telefono: reservation.pacienteTelefono ?? "",
                  correo: reservation.pacienteCorreo ?? ""
              }
            : null;
        patientSearch.value = selectedPatient.value?.nombre ?? "";

        if (reservation.billableItemId) {
            form.billableItemId = reservation.billableItemId;
        }
    },
    { deep: true, immediate: true }
);

watch(
    selectedBillableItem,
    (item) => {
        if (!item) {
            return;
        }

        form.unitPrice = Number(item.basePrice ?? 0);
        form.currencyCode = item.currencyCode ?? props.defaultCurrencyCode ?? DEFAULT_CURRENCY_CODE;
    },
    { deep: true, immediate: true }
);

watch(patientSearch, (value) => {
    if (selectedReservation.value || selectedPatient.value) {
        return;
    }

    if (patientSearchTimeout) {
        window.clearTimeout(patientSearchTimeout);
        patientSearchTimeout = null;
    }

    patientResults.value = [];
    patientSearchError.value = "";

    const query = String(value ?? "").trim();

    if (query.length < 2) {
        patientSearching.value = false;
        return;
    }

    patientSearchTimeout = window.setTimeout(async () => {
        const requestId = ++patientSearchRequest;
        patientSearching.value = true;

        try {
            const response = await searchPatients(query);

            if (requestId !== patientSearchRequest) {
                return;
            }

            patientResults.value = response.data ?? [];
        } catch (error) {
            if (requestId !== patientSearchRequest) {
                return;
            }

            patientSearchError.value =
                error.response?.msg || error.message || "No fue posible buscar pacientes.";
        } finally {
            if (requestId === patientSearchRequest) {
                patientSearching.value = false;
            }
        }
    }, 250);
});

function selectPatient(patient) {
    selectedPatient.value = patient;
    patientSearch.value = patient.nombre ?? "";
    form.patientId = patient.id;
    patientResults.value = [];
}

function clearPatient() {
    selectedPatient.value = null;
    patientSearch.value = "";
    form.patientId = "";
}

function handleSubmit() {
    emit("submit", {
        reservationId: form.reservationId || null,
        billableItemId: Number(form.billableItemId),
        patientId: form.patientId || null,
        professionalUserId: form.professionalUserId || null,
        roomId: form.roomId || null,
        branchId: form.branchId || null,
        quantity: Number(form.quantity || 1),
        unitPrice: Number(form.unitPrice || 0),
        currencyCode: form.currencyCode,
        documentType: form.documentType,
        chargeDecision: props.canWaive ? form.chargeDecision : "cobrable",
        notes: form.notes
    });
}
</script>

<template>
  <form class="finance-billing-document-form" @submit.prevent="handleSubmit">
    <div class="finance-billing-document-form__grid">
      <label class="finance-billing-document-form__field">
        <span class="finance-billing-document-form__label">Vincular a reserva</span>
        <select v-model="form.reservationId" class="finance-billing-document-form__select">
          <option value="">Sin reserva</option>
          <option
            v-for="reservation in props.reservationOptions"
            :key="reservation.id"
            :value="reservation.id"
          >
            {{ reservation.fecha }} · {{ reservation.pacienteNombre }} · {{ reservation.tipoConsulta || reservation.descripcion || "Reserva" }}
          </option>
        </select>
      </label>

      <label class="finance-billing-document-form__field">
        <span class="finance-billing-document-form__label">Item facturable</span>
        <select v-model="form.billableItemId" class="finance-billing-document-form__select">
          <option value="" disabled>Selecciona un item</option>
          <option
            v-for="item in props.billableItemOptions"
            :key="item.id"
            :value="item.id"
          >
            {{ item.name }} · {{ item.category }}
          </option>
        </select>
      </label>

      <BaseInput
        :model-value="form.quantity"
        label="Cantidad"
        type="number"
        min="1"
        step="1"
        :required="true"
        @update:model-value="form.quantity = $event"
      />

      <BaseInput
        :model-value="form.unitPrice"
        label="Precio unitario"
        type="number"
        min="0"
        step="0.01"
        :required="true"
        @update:model-value="form.unitPrice = $event"
      />

      <label class="finance-billing-document-form__field">
        <span class="finance-billing-document-form__label">Moneda</span>
        <select v-model="form.currencyCode" class="finance-billing-document-form__select">
          <option
            v-for="currency in LATAM_CURRENCY_OPTIONS"
            :key="currency.code"
            :value="currency.code"
          >
            {{ currency.label }}
          </option>
        </select>
      </label>

      <label class="finance-billing-document-form__field">
        <span class="finance-billing-document-form__label">Tipo de comprobante</span>
        <select v-model="form.documentType" class="finance-billing-document-form__select">
          <option value="comprobante_simple">Comprobante simple</option>
          <option value="prefactura">Prefactura</option>
        </select>
      </label>
    </div>

    <div v-if="selectedReservation" class="finance-billing-document-form__reservation-card">
      <strong>{{ selectedReservation.pacienteNombre || "Paciente sin nombre" }}</strong>
      <span>
        {{ selectedReservation.fecha }} ·
        {{ selectedReservation.horaInicio }} - {{ selectedReservation.horaFin }}
      </span>
      <span>
        {{ selectedReservation.salaNombre || "Sin sala" }} ·
        {{ selectedReservation.usuarioNombre || "Sin responsable" }}
      </span>
    </div>

    <div class="finance-billing-document-form__patient-block">
      <div v-if="selectedPatient" class="finance-billing-document-form__patient-card">
        <strong>{{ selectedPatient.nombre }}</strong>
        <span v-if="selectedPatient.telefono">Telefono: {{ selectedPatient.telefono }}</span>
        <span v-if="selectedPatient.correo">Correo: {{ selectedPatient.correo }}</span>
        <BaseButton
          v-if="!selectedReservation"
          type="button"
          size="sm"
          variant="ghost"
          @click="clearPatient"
        >
          Cambiar paciente
        </BaseButton>
      </div>

      <template v-else>
        <BaseInput
          :model-value="patientSearch"
          label="Buscar paciente"
          placeholder="Nombre, telefono o correo"
          @update:model-value="patientSearch = $event"
        />
        <p v-if="patientSearching" class="finance-billing-document-form__search-state">
          Buscando pacientes...
        </p>
        <p
          v-else-if="patientSearchError"
          class="finance-billing-document-form__search-state finance-billing-document-form__search-state--error"
        >
          {{ patientSearchError }}
        </p>
        <ul
          v-else-if="patientResults.length"
          class="finance-billing-document-form__patient-results"
        >
          <li v-for="patient in patientResults" :key="patient.id">
            <button
              type="button"
              class="finance-billing-document-form__patient-result"
              @click="selectPatient(patient)"
            >
              <strong>{{ patient.nombre }}</strong>
              <span v-if="patient.telefono">Telefono: {{ patient.telefono }}</span>
              <span v-if="patient.correo">Correo: {{ patient.correo }}</span>
            </button>
          </li>
        </ul>
      </template>
    </div>

    <div v-if="!selectedReservation" class="finance-billing-document-form__grid">
      <label class="finance-billing-document-form__field">
        <span class="finance-billing-document-form__label">Sucursal</span>
        <select v-model="form.branchId" class="finance-billing-document-form__select">
          <option value="">Sin sucursal</option>
          <option
            v-for="branch in props.branchOptions"
            :key="branch.id"
            :value="branch.id"
          >
            {{ branch.nombre }}
          </option>
        </select>
      </label>

      <label class="finance-billing-document-form__field">
        <span class="finance-billing-document-form__label">Sala</span>
        <select v-model="form.roomId" class="finance-billing-document-form__select">
          <option value="">Sin sala</option>
          <option
            v-for="room in props.roomOptions"
            :key="room.id"
            :value="room.id"
          >
            {{ room.nombre }}
          </option>
        </select>
      </label>

      <label class="finance-billing-document-form__field">
        <span class="finance-billing-document-form__label">Profesional</span>
        <select v-model="form.professionalUserId" class="finance-billing-document-form__select">
          <option value="">Sin profesional</option>
          <option
            v-for="user in props.userOptions"
            :key="user.id"
            :value="user.id"
          >
            {{ user.nombre }}
          </option>
        </select>
      </label>

      <label
        v-if="props.canWaive"
        class="finance-billing-document-form__field"
      >
        <span class="finance-billing-document-form__label">Decision</span>
        <select v-model="form.chargeDecision" class="finance-billing-document-form__select">
          <option value="cobrable">Cobrable</option>
          <option value="exonerado">Exonerado</option>
        </select>
      </label>
    </div>

    <BaseInput
      :model-value="form.notes"
      label="Notas"
      as="textarea"
      :rows="3"
      placeholder="Observaciones administrativas del comprobante"
      @update:model-value="form.notes = $event"
    />

    <p v-if="props.errorMessage" class="finance-billing-document-form__error">
      {{ props.errorMessage }}
    </p>

    <div class="finance-billing-document-form__actions">
      <BaseButton variant="ghost" @click.prevent="emit('cancel')">
        Cancelar
      </BaseButton>
      <BaseButton type="submit" :disabled="props.submitting">
        {{ props.submitting ? "Guardando..." : "Emitir comprobante" }}
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.finance-billing-document-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.finance-billing-document-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.finance-billing-document-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.finance-billing-document-form__label {
  font-size: 0.92rem;
  font-weight: 600;
}

.finance-billing-document-form__select {
  width: 100%;
  border: 1px solid #bfd4dc;
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
}

.finance-billing-document-form__reservation-card,
.finance-billing-document-form__patient-card {
  display: grid;
  gap: 0.3rem;
  padding: 0.95rem 1rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(17, 184, 159, 0.12);
}

.finance-billing-document-form__patient-results {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}

.finance-billing-document-form__patient-result {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-align: left;
  border: 1px solid rgba(18, 49, 63, 0.12);
  border-radius: 12px;
  padding: 0.8rem 0.9rem;
  background: #fff;
  cursor: pointer;
}

.finance-billing-document-form__search-state {
  margin: 0;
  color: var(--text-soft);
}

.finance-billing-document-form__search-state--error,
.finance-billing-document-form__error {
  color: #b8392d;
}

.finance-billing-document-form__error {
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 16px;
  background: rgba(235, 85, 69, 0.12);
  border: 1px solid rgba(235, 85, 69, 0.2);
}

.finance-billing-document-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 760px) {
  .finance-billing-document-form__grid {
    grid-template-columns: 1fr;
  }

  .finance-billing-document-form__actions {
    flex-direction: column;
  }
}
</style>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import BaseButton from "../base/BaseButton.vue";
import BaseInput from "../base/BaseInput.vue";
import { searchPatients } from "../../services/patientApi.js";

const props = defineProps({
    initialValue: {
        type: Object,
        default: () => ({})
    },
    submitting: {
        type: Boolean,
        default: false
    },
    mode: {
        type: String,
        default: "create"
    },
    errorMessage: {
        type: String,
        default: ""
    },
    currentUserId: {
        type: Number,
        default: 0
    },
    currentUserName: {
        type: String,
        default: ""
    },
    isDoctorActor: {
        type: Boolean,
        default: false
    },
    canAssignDoctor: {
        type: Boolean,
        default: false
    },
    doctorOptions: {
        type: Array,
        default: () => []
    },
    doctorOptionsLoading: {
        type: Boolean,
        default: false
    },
    doctorOptionsError: {
        type: String,
        default: ""
    },
    rooms: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(["submit", "cancel"]);

function createDefaultForm() {
    return {
        fecha: "",
        horaInicio: "",
        horaFin: "",
        descripcion: "",
        estado: "pendiente",
        tipoAtencion: "consulta",
        tipoConsulta: "",
        usuarioId: props.isDoctorActor ? Number(props.currentUserId) || null : null,
        salaId: null
    };
}

function createDefaultNewPatient() {
    return {
        nombre: "",
        telefono: "",
        correo: "",
        fechaNacimiento: "",
        observaciones: "",
        tipoProcedimiento: ""
    };
}

function mapInitialPatient(value) {
    const pacienteId = Number(value?.pacienteId);

    if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
        return null;
    }

    return {
        id: pacienteId,
        nombre: value?.pacienteNombre ?? `Paciente #${pacienteId}`,
        telefono: value?.pacienteTelefono ?? "",
        correo: value?.pacienteCorreo ?? ""
    };
}

const form = reactive(createDefaultForm());
const newPatient = reactive(createDefaultNewPatient());
const patientMode = ref("existing");
const patientSearch = ref("");
const patientResults = ref([]);
const patientSearching = ref(false);
const patientSearchError = ref("");
const patientValidationError = ref("");
const formValidationError = ref("");
const selectedPatient = ref(null);
const selectedRoom = computed(
    () =>
        props.rooms.find((room) => Number(room.id) === Number(form.salaId)) ?? null
);
const filteredDoctorOptions = computed(() => {
    if (!props.canAssignDoctor) {
        return [];
    }

    const roomBranchId =
        Number(selectedRoom.value?.sucursalId ?? selectedRoom.value?.sucursal_id ?? 0) || null;

    return props.doctorOptions.filter((doctor) => {
        const doctorBranchId = Number(doctor.sucursalId ?? 0) || null;
        return doctorBranchId === roomBranchId;
    });
});
const selectedDoctorOption = computed(
    () =>
        props.doctorOptions.find((doctor) => Number(doctor.id) === Number(form.usuarioId)) ?? null
);
const doctorSelectionDisabled = computed(
    () =>
        props.doctorOptionsLoading ||
        Boolean(props.doctorOptionsError) ||
        !selectedRoom.value ||
        !filteredDoctorOptions.value.length
);
const doctorFieldPlaceholder = computed(() => {
    if (props.doctorOptionsLoading) {
        return "Cargando doctores";
    }

    if (!selectedRoom.value) {
        return "Selecciona primero una sala";
    }

    if (props.doctorOptionsError) {
        return "No fue posible cargar doctores";
    }

    if (!filteredDoctorOptions.value.length) {
        return "No hay doctores activos en esta sucursal";
    }

    return "Selecciona un doctor responsable";
});
const doctorReadOnlyName = computed(
    () =>
        props.initialValue?.usuarioNombre ||
        selectedDoctorOption.value?.nombre ||
        props.currentUserName ||
        "Responsable sin nombre"
);
const doctorFieldHelper = computed(() => {
    if (props.isDoctorActor) {
        return "Esta reserva quedara a tu nombre como responsable.";
    }

    if (props.doctorOptionsError) {
        return props.doctorOptionsError;
    }

    if (props.canAssignDoctor && selectedRoom.value && !filteredDoctorOptions.value.length) {
        return "No hay doctores activos disponibles en la sucursal de esta sala.";
    }

    if (props.canAssignDoctor) {
        return "Debes adjudicar la reserva a un doctor activo de la misma sucursal de la sala.";
    }

    return "";
});

let patientSearchTimeout = null;
let patientSearchRequest = 0;

function clearPatientSearchTimer() {
    if (patientSearchTimeout) {
        window.clearTimeout(patientSearchTimeout);
        patientSearchTimeout = null;
    }
}

function resolveDefaultRoomId() {
    return Number(props.rooms[0]?.id ?? 0) || null;
}

function hasValidRoomId(value) {
    const roomId = Number(value);
    return Number.isInteger(roomId) && roomId > 0;
}

function resetPatientState() {
    clearPatientSearchTimer();
    patientResults.value = [];
    patientSearching.value = false;
    patientSearchError.value = "";
    patientValidationError.value = "";
    Object.assign(newPatient, createDefaultNewPatient());

    const initialPatient = mapInitialPatient(props.initialValue);
    selectedPatient.value = initialPatient;
    patientMode.value = "existing";
    patientSearch.value = initialPatient?.nombre ?? "";
}

function syncForm() {
    Object.assign(form, createDefaultForm(), props.initialValue ?? {});

    if (props.isDoctorActor && !props.initialValue?.id) {
        form.usuarioId = Number(props.currentUserId) || null;
    } else if (!Number.isInteger(Number(form.usuarioId)) || Number(form.usuarioId) <= 0) {
        form.usuarioId = null;
    }

    if (!hasValidRoomId(form.salaId)) {
        form.salaId = resolveDefaultRoomId();
    }

    formValidationError.value = "";
    resetPatientState();
}

watch(() => props.initialValue, syncForm, { deep: true, immediate: true });

watch(
    () => props.currentUserId,
    (value) => {
        if (props.isDoctorActor && !props.initialValue?.id) {
            form.usuarioId = Number(value) || null;
        }
    }
);

watch(
    () => form.tipoConsulta,
    (value) => {
        if (!newPatient.tipoProcedimiento) {
            newPatient.tipoProcedimiento = value ?? "";
        }
    }
);

watch(
    () => props.rooms,
    () => {
        if (!hasValidRoomId(form.salaId)) {
            form.salaId = resolveDefaultRoomId();
        }
    },
    { deep: true, immediate: true }
);

watch(
    [selectedRoom, filteredDoctorOptions, () => props.canAssignDoctor],
    ([room, doctorOptions, canAssignDoctorValue]) => {
        if (!canAssignDoctorValue || !room) {
            return;
        }

        const currentDoctorId = Number(form.usuarioId) || null;

        if (!currentDoctorId) {
            return;
        }

        if (!doctorOptions.some((doctor) => Number(doctor.id) === currentDoctorId)) {
            form.usuarioId = null;
        }
    },
    { immediate: true }
);

watch(patientSearch, (value) => {
    clearPatientSearchTimer();
    patientResults.value = [];
    patientSearchError.value = "";

    if (patientMode.value !== "existing" || selectedPatient.value) {
        return;
    }

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

onBeforeUnmount(() => {
    clearPatientSearchTimer();
});

function selectPatient(patient) {
    selectedPatient.value = {
        id: Number(patient.id),
        nombre: patient.nombre,
        telefono: patient.telefono ?? "",
        correo: patient.correo ?? ""
    };
    patientSearch.value = patient.nombre;
    patientResults.value = [];
    patientSearchError.value = "";
    patientValidationError.value = "";
}

function clearSelectedPatient() {
    selectedPatient.value = null;
    patientSearch.value = "";
    patientResults.value = [];
    patientSearchError.value = "";
    patientValidationError.value = "";
}

function startNewPatientFlow() {
    const canPrefillFromSearch = !selectedPatient.value;
    patientMode.value = "new";
    patientValidationError.value = "";
    patientSearchError.value = "";
    patientResults.value = [];

    if (canPrefillFromSearch && !newPatient.nombre) {
        const rawSearch = patientSearch.value.trim();
        const looksLikeEmail = rawSearch.includes("@");
        const looksLikePhone = /^[+\d\s()-]+$/.test(rawSearch) && rawSearch.length >= 6;

        if (rawSearch && !looksLikeEmail && !looksLikePhone) {
            newPatient.nombre = rawSearch;
        }
    }

    if (!newPatient.tipoProcedimiento) {
        newPatient.tipoProcedimiento = form.tipoConsulta ?? "";
    }

    selectedPatient.value = null;
}

function useExistingPatientFlow() {
    patientMode.value = "existing";
    patientValidationError.value = "";
    patientSearchError.value = "";
    patientResults.value = [];

    if (!selectedPatient.value) {
        patientSearch.value = "";
    }
}

function buildPatientPayload() {
    if (patientMode.value === "existing") {
        const pacienteId = Number(selectedPatient.value?.id);

        if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
            patientValidationError.value = "Selecciona un paciente existente o crea uno nuevo.";
            return null;
        }

        return {
            mode: "existing",
            pacienteId
        };
    }

    const nombre = String(newPatient.nombre ?? "").trim();
    const telefono = String(newPatient.telefono ?? "").trim();
    const correo = String(newPatient.correo ?? "").trim();
    const fechaNacimiento = String(newPatient.fechaNacimiento ?? "").trim();
    const observaciones = String(newPatient.observaciones ?? "").trim();
    const tipoProcedimiento = String(newPatient.tipoProcedimiento ?? "").trim();

    if (!nombre) {
        patientValidationError.value = "El nombre del paciente es obligatorio.";
        return null;
    }

    if (!telefono) {
        patientValidationError.value = "El telefono del paciente es obligatorio.";
        return null;
    }

    return {
        mode: "new",
        nombre,
        telefono,
        correo: correo || null,
        fechaNacimiento: fechaNacimiento || null,
        observaciones: observaciones || null,
        tipoProcedimiento: tipoProcedimiento || form.tipoConsulta || null
    };
}

function handleSubmit() {
    formValidationError.value = "";
    patientValidationError.value = "";

    if (!props.rooms.length) {
        formValidationError.value =
            "Aun no hay salas disponibles para reservar en esta cuenta.";
        return;
    }

    if (!hasValidRoomId(form.salaId)) {
        formValidationError.value =
            "Selecciona una sala disponible antes de guardar la reserva.";
        return;
    }

    if (props.canAssignDoctor) {
        if (props.doctorOptionsLoading) {
            formValidationError.value = "Espera a que cargue la lista de doctores disponibles.";
            return;
        }

        if (props.doctorOptionsError) {
            formValidationError.value = props.doctorOptionsError;
            return;
        }

        if (!selectedRoom.value) {
            formValidationError.value = "Selecciona una sala antes de adjudicar un doctor.";
            return;
        }

        if (!filteredDoctorOptions.value.length) {
            formValidationError.value =
                "No hay doctores activos disponibles en la sucursal de esta sala.";
            return;
        }

        if (
            !filteredDoctorOptions.value.some(
                (doctor) => Number(doctor.id) === Number(form.usuarioId)
            )
        ) {
            formValidationError.value =
                "Selecciona un doctor responsable para esta reserva.";
            return;
        }
    } else if (props.isDoctorActor) {
        form.usuarioId = Number(props.currentUserId) || null;
    }

    const paciente = buildPatientPayload();

    if (!paciente) {
        return;
    }

    emit("submit", {
        fecha: form.fecha,
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        descripcion: form.descripcion,
        estado: form.estado,
        tipoAtencion: form.tipoAtencion,
        tipoConsulta: form.tipoConsulta,
        usuarioId: Number(form.usuarioId || 0) || null,
        salaId: Number(form.salaId),
        paciente
    });
}
</script>

<template>
  <form class="appointment-form" @submit.prevent="handleSubmit">
    <div class="appointment-form__grid">
      <label class="appointment-form__field appointment-form__field--compact">
        <span class="appointment-form__label">
          Sala
          <span class="appointment-form__required">*</span>
        </span>
        <select
          v-model="form.salaId"
          class="appointment-form__select"
          :disabled="!props.rooms.length"
        >
          <option :value="null" disabled>
            {{ props.rooms.length ? "Selecciona una sala" : "No hay salas disponibles" }}
          </option>
          <option
            v-for="room in props.rooms"
            :key="room.id"
            :value="room.id"
          >
            {{ room.nombre }} · {{ room.tipo }} · {{ room.sucursalNombre || "Sucursal sin nombre" }}
          </option>
        </select>
      </label>
      <label
        v-if="props.canAssignDoctor"
        class="appointment-form__field appointment-form__field--compact"
      >
        <span class="appointment-form__label">
          Doctor responsable
          <span class="appointment-form__required">*</span>
        </span>
        <select
          v-model="form.usuarioId"
          class="appointment-form__select"
          :disabled="doctorSelectionDisabled"
        >
          <option :value="null" disabled>
            {{ doctorFieldPlaceholder }}
          </option>
          <option
            v-for="doctor in filteredDoctorOptions"
            :key="doctor.id"
            :value="doctor.id"
          >
            {{ doctor.nombre }} · {{ doctor.sucursalNombre || "Sucursal sin nombre" }}
          </option>
        </select>
        <span class="appointment-form__helper" :class="{ 'appointment-form__helper--error': props.doctorOptionsError }">
          {{ doctorFieldHelper }}
        </span>
      </label>
      <div
        v-else-if="props.isDoctorActor"
        class="appointment-form__field appointment-form__field--compact"
      >
        <span class="appointment-form__label">Responsable</span>
        <div class="appointment-form__readonly-card">
          <strong>{{ doctorReadOnlyName }}</strong>
          <span>{{ doctorFieldHelper }}</span>
        </div>
      </div>
      <BaseInput
        :model-value="form.fecha"
        label="Fecha"
        type="date"
        :required="true"
        @update:model-value="form.fecha = $event"
      />
      <BaseInput
        :model-value="form.horaInicio"
        label="Hora de inicio"
        type="time"
        :required="true"
        @update:model-value="form.horaInicio = $event"
      />
      <BaseInput
        :model-value="form.horaFin"
        label="Hora de fin"
        type="time"
        :required="true"
        @update:model-value="form.horaFin = $event"
      />
      <label class="appointment-form__field appointment-form__field--compact">
        <span class="appointment-form__label">
          Tipo de atencion
          <span class="appointment-form__required">*</span>
        </span>
        <select
          v-model="form.tipoAtencion"
          class="appointment-form__select"
        >
          <option value="consulta">Consulta</option>
          <option value="procedimiento">Procedimiento</option>
        </select>
      </label>
      <BaseInput
        :model-value="form.tipoConsulta"
        label="Nombre de la atencion"
        placeholder="Ej. Consulta general o procedimiento menor"
        :required="true"
        @update:model-value="form.tipoConsulta = $event"
      />

      <label class="appointment-form__field appointment-form__field--compact">
        <span class="appointment-form__label">
          Estado
          <span class="appointment-form__required">*</span>
        </span>
        <select
          v-model="form.estado"
          class="appointment-form__select"
        >
          <option value="pendiente">Pendiente</option>
          <option value="confirmada">Confirmada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </label>
    </div>

    <p v-if="!props.rooms.length" class="appointment-form__helper">
      No hay salas listas para reservar todavia. Un administrador debe crear al menos una.
    </p>

    <section class="appointment-form__patient-panel">
      <div class="appointment-form__patient-header">
        <div>
          <h3>Paciente</h3>
          <p>Selecciona un paciente existente o crea uno nuevo sin salir de la reserva.</p>
        </div>

        <BaseButton
          v-if="patientMode === 'existing'"
          type="button"
          size="sm"
          variant="ghost"
          @click="startNewPatientFlow"
        >
          + Crear paciente nuevo
        </BaseButton>

        <BaseButton
          v-else
          type="button"
          size="sm"
          variant="ghost"
          @click="useExistingPatientFlow"
        >
          Buscar existente
        </BaseButton>
      </div>

      <div v-if="patientMode === 'existing'" class="appointment-form__patient-body">
        <div v-if="selectedPatient" class="appointment-form__patient-card">
          <div class="appointment-form__patient-card-copy">
            <strong>{{ selectedPatient.nombre }}</strong>
            <span v-if="selectedPatient.telefono">Telefono: {{ selectedPatient.telefono }}</span>
            <span v-if="selectedPatient.correo">Correo: {{ selectedPatient.correo }}</span>
            <span v-if="!selectedPatient.telefono && !selectedPatient.correo">
              Paciente seleccionado para esta reserva.
            </span>
          </div>

          <div class="appointment-form__patient-card-actions">
            <BaseButton
              type="button"
              size="sm"
              variant="ghost"
              @click="clearSelectedPatient"
            >
              Cambiar paciente
            </BaseButton>
            <BaseButton
              type="button"
              size="sm"
              variant="ghost"
              @click="startNewPatientFlow"
            >
              Crear nuevo
            </BaseButton>
          </div>
        </div>

        <template v-else>
          <BaseInput
            :model-value="patientSearch"
            label="Buscar paciente"
            placeholder="Nombre, telefono o correo"
            :required="true"
            @update:model-value="patientSearch = $event"
          />

          <p class="appointment-form__helper">
            Escribe al menos 2 caracteres para buscar en pacientes existentes.
          </p>

          <p v-if="patientSearching" class="appointment-form__search-state">
            Buscando pacientes...
          </p>

          <p v-else-if="patientSearchError" class="appointment-form__search-state appointment-form__search-state--error">
            {{ patientSearchError }}
          </p>

          <ul
            v-else-if="patientResults.length"
            class="appointment-form__patient-results"
          >
            <li v-for="patient in patientResults" :key="patient.id">
              <button
                type="button"
                class="appointment-form__patient-result"
                @click="selectPatient(patient)"
              >
                <strong>{{ patient.nombre }}</strong>
                <span v-if="patient.telefono">Telefono: {{ patient.telefono }}</span>
                <span v-if="patient.correo">Correo: {{ patient.correo }}</span>
              </button>
            </li>
          </ul>

          <p
            v-else-if="patientSearch.trim().length >= 2"
            class="appointment-form__search-state"
          >
            No encontramos coincidencias. Puedes crear el paciente nuevo desde aqui.
          </p>
        </template>
      </div>

      <div v-else class="appointment-form__patient-body">
        <div class="appointment-form__patient-grid">
          <BaseInput
            :model-value="newPatient.nombre"
            label="Nombre del paciente"
            placeholder="Nombre completo"
            :required="true"
            @update:model-value="newPatient.nombre = $event"
          />
          <BaseInput
            :model-value="newPatient.telefono"
            label="Telefono"
            placeholder="8888-8888"
            :required="true"
            @update:model-value="newPatient.telefono = $event"
          />
          <BaseInput
            :model-value="newPatient.correo"
            label="Correo"
            placeholder="correo@ejemplo.com"
            @update:model-value="newPatient.correo = $event"
          />
          <BaseInput
            :model-value="newPatient.fechaNacimiento"
            label="Fecha de nacimiento"
            type="date"
            @update:model-value="newPatient.fechaNacimiento = $event"
          />
        </div>

        <div class="appointment-form__patient-grid appointment-form__patient-grid--secondary">
          <BaseInput
            :model-value="newPatient.tipoProcedimiento"
            label="Procedimiento principal"
            placeholder="Se completara con el tipo de consulta si lo dejas vacio"
            @update:model-value="newPatient.tipoProcedimiento = $event"
          />
          <BaseInput
            :model-value="newPatient.observaciones"
            label="Observaciones del paciente"
            as="textarea"
            :rows="2"
            placeholder="Dato util para esta atencion"
            @update:model-value="newPatient.observaciones = $event"
          />
        </div>

        <p class="appointment-form__helper">
          El paciente se registrara como activo y podra reutilizarse en reservas futuras.
        </p>
      </div>

      <p v-if="patientValidationError" class="appointment-form__error">
        {{ patientValidationError }}
      </p>
    </section>

    <div class="appointment-form__footer-grid">
      <BaseInput
        :model-value="form.descripcion"
        label="Descripcion"
        as="textarea"
        :rows="3"
        :required="true"
        placeholder="Agrega una nota breve sobre la reserva."
        @update:model-value="form.descripcion = $event"
      />

      <div class="appointment-form__summary">
        <p class="appointment-form__helper">
          Los campos con <span class="appointment-form__required">*</span> son obligatorios.
        </p>
        <p class="appointment-form__helper">
          Busca un paciente existente o crea uno nuevo antes de guardar la reserva.
        </p>
        <p class="appointment-form__helper">
          {{
            props.isDoctorActor
              ? "Esta reserva quedara a tu nombre como responsable."
              : props.canAssignDoctor
                ? "Debes adjudicar la reserva a un doctor activo de la misma sucursal de la sala."
                : "Verifica que la reserva tenga un responsable doctor correcto antes de guardarla."
          }}
        </p>
      </div>
    </div>

    <p v-if="formValidationError" class="appointment-form__error">
      {{ formValidationError }}
    </p>

    <p v-if="props.errorMessage" class="appointment-form__error">
      {{ props.errorMessage }}
    </p>

    <div class="appointment-form__actions">
      <BaseButton variant="ghost" @click.prevent="emit('cancel')">
        Cancelar
      </BaseButton>
      <BaseButton type="submit" :disabled="props.submitting">
        {{ props.mode === "edit" ? "Guardar cambios" : "Crear reserva" }}
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.appointment-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.appointment-form__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem 1rem;
}

.appointment-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.appointment-form__field--compact {
  min-width: 0;
}

.appointment-form__label {
  font-size: 0.92rem;
  font-weight: 600;
}

.appointment-form__required {
  color: #c83d32;
}

.appointment-form__select {
  width: 100%;
  border: 1px solid #bfd4dc;
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
}

.appointment-form__readonly-card {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  padding: 0.85rem 0.95rem;
  border-radius: 8px;
  background: var(--hero-surface-alt);
  border: 1px solid rgba(17, 184, 159, 0.18);
}

.appointment-form__readonly-card strong {
  color: var(--primary-dark);
}

.appointment-form__readonly-card span {
  color: var(--text-soft);
  font-size: 0.9rem;
}

.appointment-form__patient-panel {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1rem;
  border: 1px solid #d9e7ec;
  border-radius: 8px;
  background: #fbfdfe;
}

.appointment-form__patient-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.appointment-form__patient-header h3 {
  margin: 0;
  font-size: 1.05rem;
}

.appointment-form__patient-header p {
  margin: 0.35rem 0 0;
  color: var(--text-soft);
  font-size: 0.92rem;
}

.appointment-form__patient-body {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.appointment-form__patient-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1rem;
  border-radius: 8px;
  background: var(--hero-surface-alt);
  border: 1px solid rgba(17, 184, 159, 0.18);
}

.appointment-form__patient-card-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.appointment-form__patient-card-copy strong {
  color: var(--primary-dark);
}

.appointment-form__patient-card-copy span {
  color: var(--text-soft);
  font-size: 0.9rem;
}

.appointment-form__patient-card-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.appointment-form__patient-results {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.appointment-form__patient-result {
  width: 100%;
  border: 1px solid #dbe8ed;
  border-radius: 8px;
  background: #fff;
  padding: 0.85rem 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  text-align: left;
  color: var(--text);
  cursor: pointer;
}

.appointment-form__patient-result strong {
  color: var(--primary-dark);
}

.appointment-form__patient-result span {
  color: var(--text-soft);
  font-size: 0.9rem;
}

.appointment-form__patient-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem 1rem;
}

.appointment-form__patient-grid--secondary {
  align-items: start;
}

.appointment-form__search-state {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.9rem;
}

.appointment-form__search-state--error {
  color: #b8392d;
}

.appointment-form__footer-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(220px, 0.9fr);
  gap: 1rem;
  align-items: start;
}

.appointment-form__summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.9rem 1rem;
  border-radius: 8px;
  background: #f4f8fa;
}

.appointment-form__helper {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.9rem;
}

.appointment-form__helper--error {
  color: #b8392d;
}

.appointment-form__error {
  margin: 0;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  background: rgba(235, 85, 69, 0.14);
  border: 1px solid rgba(235, 85, 69, 0.22);
  color: #b8392d;
  font-size: 0.92rem;
}

.appointment-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 980px) {
  .appointment-form__grid,
  .appointment-form__footer-grid,
  .appointment-form__patient-grid {
    grid-template-columns: 1fr 1fr;
  }

  .appointment-form__footer-grid > :first-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .appointment-form__grid,
  .appointment-form__footer-grid,
  .appointment-form__patient-grid {
    grid-template-columns: 1fr;
  }

  .appointment-form__patient-header,
  .appointment-form__patient-card {
    flex-direction: column;
    align-items: stretch;
  }

  .appointment-form__patient-card-actions {
    justify-content: flex-start;
  }

  .appointment-form__actions {
    flex-direction: column-reverse;
  }
}
</style>

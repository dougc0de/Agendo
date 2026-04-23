<script setup>
import { reactive } from "vue";
import BaseButton from "../base/BaseButton.vue";
import BaseInput from "../base/BaseInput.vue";
import { getPublicSignupPlans } from "../../shared/plans.js";

const props = defineProps({
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
const plans = getPublicSignupPlans();

const form = reactive({
    ownerNombre: "",
    ownerCorreo: "",
    ownerContrasena: "",
    clinicNombre: "",
    clinicDireccion: "",
    clinicTelefono: "",
    clinicHoraApertura: "08:00",
    clinicHoraCierre: "17:00",
    clinicDiasLaborales: "lunes,martes,miercoles,jueves,viernes",
    planCode: "basic"
});

function selectPlan(planCode) {
    form.planCode = planCode;
}

function handleSubmit() {
    emit("submit", {
        owner: {
            nombre: form.ownerNombre,
            correo: form.ownerCorreo,
            contrasena: form.ownerContrasena
        },
        clinic: {
            nombre: form.clinicNombre,
            direccion: form.clinicDireccion,
            telefono: form.clinicTelefono,
            horaApertura: form.clinicHoraApertura,
            horaCierre: form.clinicHoraCierre,
            diasLaborales: form.clinicDiasLaborales
        },
        planCode: form.planCode
    });
}
</script>

<template>
  <form class="signup-form" @submit.prevent="handleSubmit">
    <section class="signup-form__section">
      <div class="signup-form__section-heading">
        <h2>Crear cuenta</h2>
        <p>Registra tu clinica, elige tu plan y entra directo al dashboard.</p>
      </div>

      <div class="signup-form__grid">
        <BaseInput
          :model-value="form.ownerNombre"
          label="Nombre del propietario"
          placeholder="Tu nombre"
          :required="true"
          @update:model-value="form.ownerNombre = $event"
        />
        <BaseInput
          :model-value="form.ownerCorreo"
          label="Correo de acceso"
          placeholder="owner@clinica.com"
          :required="true"
          @update:model-value="form.ownerCorreo = $event"
        />
        <BaseInput
          :model-value="form.ownerContrasena"
          label="Contrasena"
          type="password"
          placeholder="Crea una contrasena"
          :required="true"
          @update:model-value="form.ownerContrasena = $event"
        />
      </div>
    </section>

    <section class="signup-form__section">
      <div class="signup-form__section-heading">
        <h3>Datos de la clinica</h3>
        <p>Usaremos esta informacion para crear tu cuenta inicial.</p>
      </div>

      <div class="signup-form__grid">
        <BaseInput
          :model-value="form.clinicNombre"
          label="Nombre de la clinica"
          placeholder="Clinica Central"
          :required="true"
          @update:model-value="form.clinicNombre = $event"
        />
        <BaseInput
          :model-value="form.clinicTelefono"
          label="Telefono"
          placeholder="8888-9999"
          :required="true"
          @update:model-value="form.clinicTelefono = $event"
        />
        <BaseInput
          :model-value="form.clinicDireccion"
          label="Direccion"
          placeholder="Direccion principal"
          :required="true"
          @update:model-value="form.clinicDireccion = $event"
        />
        <BaseInput
          :model-value="form.clinicHoraApertura"
          label="Hora de apertura"
          type="time"
          :required="true"
          @update:model-value="form.clinicHoraApertura = $event"
        />
        <BaseInput
          :model-value="form.clinicHoraCierre"
          label="Hora de cierre"
          type="time"
          :required="true"
          @update:model-value="form.clinicHoraCierre = $event"
        />
        <BaseInput
          :model-value="form.clinicDiasLaborales"
          label="Dias laborales"
          placeholder="lunes,martes,miercoles,jueves,viernes"
          :required="true"
          @update:model-value="form.clinicDiasLaborales = $event"
        />
      </div>
    </section>

    <section class="signup-form__section">
      <div class="signup-form__section-heading">
        <h3>Elige tu plan</h3>
        <p>Enterprise quedara para venta asistida; aqui eliges Basico o Premium.</p>
      </div>

      <div class="signup-form__plans">
        <button
          v-for="plan in plans"
          :key="plan.code"
          type="button"
          class="signup-form__plan"
          :class="{ 'signup-form__plan--active': form.planCode === plan.code }"
          @click="selectPlan(plan.code)"
        >
          <strong>{{ plan.name }}</strong>
          <span>{{ plan.description }}</span>
          <small>{{ plan.priceLabel }}</small>
          <ul class="signup-form__plan-meta">
            <li>{{ plan.maxUsers }} usuarios</li>
            <li>{{ plan.maxRooms }} salas</li>
            <li>{{ plan.maxReservationsPerMonth }} reservas por mes</li>
          </ul>
        </button>
      </div>
    </section>

    <p v-if="props.errorMessage" class="signup-form__error">
      {{ props.errorMessage }}
    </p>

    <div class="signup-form__actions">
      <BaseButton type="submit" block :disabled="props.submitting">
        {{ props.submitting ? "Creando cuenta..." : "Crear cuenta y entrar" }}
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.signup-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.signup-form__section {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.signup-form__section-heading h2,
.signup-form__section-heading h3 {
  margin: 0;
}

.signup-form__section-heading p {
  margin: 0.35rem 0 0;
  color: var(--text-soft);
}

.signup-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem 1rem;
}

.signup-form__plans {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.signup-form__plan {
  width: 100%;
  border: 1px solid #d6e3e8;
  border-radius: 8px;
  background: #fff;
  padding: 1rem;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  cursor: pointer;
}

.signup-form__plan--active {
  border-color: var(--primary);
  background: rgba(95, 135, 151, 0.08);
  box-shadow: 0 0 0 2px rgba(95, 135, 151, 0.12);
}

.signup-form__plan strong {
  color: var(--primary-dark);
  font-size: 1rem;
}

.signup-form__plan span,
.signup-form__plan small {
  color: var(--text-soft);
}

.signup-form__plan-meta {
  margin: 0.2rem 0 0;
  padding-left: 1rem;
  color: var(--text-soft);
}

.signup-form__error {
  margin: 0;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  background: rgba(235, 85, 69, 0.14);
  border: 1px solid rgba(235, 85, 69, 0.22);
  color: #b8392d;
}

@media (max-width: 760px) {
  .signup-form__grid,
  .signup-form__plans {
    grid-template-columns: 1fr;
  }
}
</style>

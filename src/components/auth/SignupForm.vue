<script setup>
import { computed, reactive, watch } from "vue";
import BaseButton from "../base/BaseButton.vue";
import BaseInput from "../base/BaseInput.vue";
import { usePricingSelection } from "../../composables/usePricingSelection.js";
import {
    DEFAULT_SIGNUP_PLAN_CODE,
    WHATSAPP_ADDON_CODE,
    getPublicSignupPlans,
    isPublicSignupPlan
} from "../../shared/pricingCatalog.js";

const props = defineProps({
    submitting: {
        type: Boolean,
        default: false
    },
    errorMessage: {
        type: String,
        default: ""
    },
    initialPlanCode: {
        type: String,
        default: DEFAULT_SIGNUP_PLAN_CODE
    },
    initialAddonCode: {
        type: String,
        default: ""
    },
    addonInterestMessage: {
        type: String,
        default: ""
    }
});

const emit = defineEmits(["submit"]);
const plans = getPublicSignupPlans();
const {
    addonEnabled,
    estimatedTotalLabel,
    isAddonAvailable,
    selectPlan,
    selectedAddon,
    selectedPlan,
    selectedPlanCode,
    selection,
    setAddonEnabled,
    toggleAddon
} = usePricingSelection(
    isPublicSignupPlan(props.initialPlanCode)
        ? props.initialPlanCode
        : DEFAULT_SIGNUP_PLAN_CODE,
    {
        addonEnabled: props.initialAddonCode === WHATSAPP_ADDON_CODE,
        selectionSource: "signup"
    }
);

const form = reactive({
    ownerNombre: "",
    ownerCorreo: "",
    ownerContrasena: "",
    clinicNombre: "",
    clinicDireccion: "",
    clinicTelefono: "",
    clinicHoraApertura: "08:00",
    clinicHoraCierre: "17:00",
    clinicDiasLaborales: "lunes,martes,miercoles,jueves,viernes"
});

const addonAvailabilityMessage = computed(() => {
    if (!selectedPlan.value) {
        return "";
    }

    if (selectedPlan.value.code === "basic") {
        return "WhatsApp no esta disponible en Basico. Se habilita desde Premium.";
    }

    if (selectedPlan.value.code === "enterprise") {
        return "Puedes activarlo desde esta seleccion o trabajarlo despues dentro del onboarding asistido.";
    }

    return "Disponible para Premium cuando la recepcion ya necesita bajar llamadas repetitivas y mover mejor sus citas.";
});

const selectionHighlights = computed(() => {
    if (!selectedPlan.value) {
        return [];
    }

    return [
        selectedPlan.value.featureSummary.operations,
        selectedPlan.value.featureSummary.finances,
        selectedPlan.value.featureSummary.inventory,
        selectedPlan.value.featureSummary.reporting
    ];
});

const selectionSummaryLines = computed(() => {
    if (!selectedPlan.value) {
        return [];
    }

    const lines = [
        `${selectedPlan.value.trialDays} dias de trial`,
        selectedPlan.value.code === "enterprise"
            ? "Capacidad ampliada para usuarios, salas y reservas"
            : `${selectedPlan.value.maxUsers} usuarios, ${selectedPlan.value.maxRooms} salas y ${selectedPlan.value.maxReservationsPerMonth} reservas por mes`,
        selectedPlan.value.upgradeValue
    ];

    if (selection.value.addonEnabled && selectedAddon.value) {
        lines.push(
            `${selectedAddon.value.includedMessages} mensajes incluidos y USD ${selectedAddon.value.overagePricePerMessage} por mensaje adicional`
        );
    }

    return lines;
});

watch(
    () => props.initialPlanCode,
    (nextPlanCode) => {
        selectPlan(
            isPublicSignupPlan(nextPlanCode)
                ? nextPlanCode
                : DEFAULT_SIGNUP_PLAN_CODE
        );
    },
    { immediate: true }
);

watch(
    () => props.initialAddonCode,
    (nextAddonCode) => {
        setAddonEnabled(nextAddonCode === WHATSAPP_ADDON_CODE);
    },
    { immediate: true }
);

function handleAddonToggle() {
    if (!isAddonAvailable.value) {
        setAddonEnabled(false);
        return;
    }

    toggleAddon();
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
        planCode: selectedPlanCode.value,
        selectedAddonCodes: [...selection.value.addonCodes],
        commercialSelection: {
            planCode: selectedPlanCode.value,
            addonCodes: [...selection.value.addonCodes],
            billingInterval: selection.value.billingInterval,
            currencyCode: selection.value.currencyCode,
            trialDays: selection.value.trialDays,
            estimatedMonthlyTotal: selection.value.estimatedMonthlyTotal,
            estimatedMonthlyStartingTotal: selection.value.estimatedMonthlyStartingTotal,
            selectionSource: selection.value.selectionSource
        }
    });
}
</script>

<template>
  <form class="signup-form" @submit.prevent="handleSubmit">
    <section class="signup-form__section">
      <div class="signup-form__section-heading">
        <span class="signup-form__step">Paso 1</span>
        <h2>Crea el acceso principal de tu clinica</h2>
        <p>
          Este usuario entra como propietario de la cuenta para que puedas empezar la
          prueba con control administrativo completo.
        </p>
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
          placeholder="Crea una contrasena segura"
          :required="true"
          @update:model-value="form.ownerContrasena = $event"
        />
      </div>
    </section>

    <section class="signup-form__section">
      <div class="signup-form__section-heading">
        <span class="signup-form__step">Paso 2</span>
        <h3>Datos base de la clinica</h3>
        <p>
          Con esta informacion creamos la cuenta, la sucursal principal y la
          configuracion operativa inicial.
        </p>
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
        <span class="signup-form__step">Paso 3</span>
        <h3>Elige la forma en que quieres crecer con AGENDO</h3>
        <p>
          Basico ordena la operacion central. Premium suma finanzas e inventario.
          Enterprise empuja escala, lectura ejecutiva y acompanamiento.
        </p>
      </div>

      <p v-if="props.addonInterestMessage" class="signup-form__addon-note">
        {{ props.addonInterestMessage }}
      </p>

      <div class="signup-form__plans">
        <button
          v-for="plan in plans"
          :key="plan.code"
          type="button"
          class="signup-form__plan"
          :class="{ 'signup-form__plan--active': selectedPlanCode === plan.code }"
          @click="selectPlan(plan.code)"
        >
          <div class="signup-form__plan-top">
            <strong>{{ plan.name }}</strong>
            <span>{{ plan.priceLabel }}</span>
          </div>

          <p>{{ plan.description }}</p>

          <small>{{ plan.formattedMonthlyPrice }} · {{ plan.trialDays }} dias de trial</small>

          <ul class="signup-form__plan-meta">
            <li>{{ plan.code === "enterprise" ? "Capacidad ampliada" : `${plan.maxUsers} usuarios` }}</li>
            <li>{{ plan.code === "enterprise" ? "Capacidad ampliada" : `${plan.maxRooms} salas` }}</li>
            <li>
              {{ plan.code === "enterprise" ? "Capacidad ampliada" : `${plan.maxReservationsPerMonth} reservas por mes` }}
            </li>
          </ul>
        </button>
      </div>

      <div class="signup-form__selection-card">
        <div class="signup-form__selection-copy">
          <span class="signup-form__selection-label">Tu seleccion actual</span>
          <h4>{{ selectedPlan?.name }}</h4>
          <p>{{ selectedPlan?.headline }}</p>

          <ul class="signup-form__selection-summary">
            <li v-for="line in selectionSummaryLines" :key="line">
              {{ line }}
            </li>
          </ul>

          <div class="signup-form__value-grid">
            <article
              v-for="(highlight, index) in selectionHighlights"
              :key="`${selectedPlanCode}-${index}`"
            >
              <span>{{ index === 0 ? "Operacion" : index === 1 ? "Finanzas" : index === 2 ? "Inventario" : "Lectura" }}</span>
              <p>{{ highlight }}</p>
            </article>
          </div>
        </div>

        <div class="signup-form__selection-details">
          <div>
            <h4>Lo que incluye</h4>
            <ul class="signup-form__feature-list">
              <li v-for="feature in selectedPlan?.includedFeatures ?? []" :key="feature">
                {{ feature }}
              </li>
            </ul>
          </div>

          <div v-if="selectedPlan?.excludedFeatures?.length">
            <h4>No entra en este plan</h4>
            <ul class="signup-form__feature-list signup-form__feature-list--muted">
              <li v-for="feature in selectedPlan?.excludedFeatures ?? []" :key="feature">
                {{ feature }}
              </li>
            </ul>
          </div>
        </div>

        <div class="signup-form__addon-card">
          <div class="signup-form__addon-top">
            <div>
              <h4>{{ selectedAddon?.name }}</h4>
              <p>
                Confirma citas, procesa cancelaciones, recibe solicitudes de
                reprogramacion y resuelve consultas basicas sin sumar mas carga a
                recepcion.
              </p>
            </div>

            <button
              type="button"
              class="signup-form__addon-toggle"
              :class="{
                'signup-form__addon-toggle--active': selection.addonEnabled,
                'signup-form__addon-toggle--disabled': !isAddonAvailable
              }"
              :aria-pressed="selection.addonEnabled ? 'true' : 'false'"
              :disabled="!isAddonAvailable"
              @click="handleAddonToggle"
            >
              <span></span>
            </button>
          </div>

          <div class="signup-form__addon-meta">
            <strong>USD {{ selectedAddon?.monthlyPrice }}/mes</strong>
            <span>
              Incluye {{ selectedAddon?.includedMessages }} mensajes y luego cobra
              USD {{ selectedAddon?.overagePricePerMessage }} por mensaje enviado o recibido.
            </span>
          </div>

          <ul class="signup-form__feature-list">
            <li v-for="capability in selectedAddon?.capabilities ?? []" :key="capability">
              {{ capability }}
            </li>
          </ul>

          <p class="signup-form__addon-hint">
            {{ addonAvailabilityMessage }}
          </p>
        </div>

        <div class="signup-form__total-card">
          <span>Total mensual estimado</span>
          <strong>{{ estimatedTotalLabel }}</strong>
          <p>
            La compra automatica todavia no se activa aqui. Tu seleccion queda lista
            para trial y preparada para la futura capa de suscripcion.
          </p>
        </div>
      </div>
    </section>

    <p v-if="props.errorMessage" class="signup-form__error">
      {{ props.errorMessage }}
    </p>

    <div class="signup-form__actions">
      <BaseButton type="submit" block :disabled="props.submitting">
        {{ props.submitting ? "Creando cuenta..." : "Crear cuenta y empezar prueba" }}
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
.signup-form__section-heading h3,
.signup-form__selection-copy h4,
.signup-form__selection-details h4,
.signup-form__addon-card h4 {
  margin: 0;
}

.signup-form__step,
.signup-form__selection-label {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: var(--hero-chip-bg);
  color: var(--primary-dark);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.signup-form__section-heading p,
.signup-form__selection-copy p,
.signup-form__addon-card p,
.signup-form__total-card p {
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.signup-form__plan,
.signup-form__selection-card,
.signup-form__addon-card,
.signup-form__total-card {
  border: 1px solid rgba(17, 184, 159, 0.14);
  border-radius: 16px;
  background: var(--hero-surface);
}

.signup-form__plan {
  width: 100%;
  padding: 1rem;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  cursor: pointer;
}

.signup-form__plan--active {
  border-color: rgba(17, 184, 159, 0.34);
  background: var(--hero-surface-alt);
  box-shadow: 0 0 0 2px rgba(17, 184, 159, 0.12);
}

.signup-form__plan-top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.signup-form__plan strong,
.signup-form__selection-copy h4,
.signup-form__selection-details h4,
.signup-form__addon-card h4,
.signup-form__total-card strong {
  color: var(--primary-dark);
}

.signup-form__plan span,
.signup-form__plan small {
  color: var(--text-soft);
}

.signup-form__plan p {
  margin: 0;
  color: var(--text);
}

.signup-form__plan-meta,
.signup-form__selection-summary,
.signup-form__feature-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.45rem;
}

.signup-form__plan-meta li,
.signup-form__selection-summary li,
.signup-form__feature-list li {
  position: relative;
  padding-left: 1rem;
  color: var(--text-soft);
}

.signup-form__plan-meta li::before,
.signup-form__selection-summary li::before,
.signup-form__feature-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.5rem;
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--secondary), var(--accent));
}

.signup-form__selection-card {
  margin-top: 0.25rem;
  padding: 1rem;
  display: grid;
  gap: 1rem;
}

.signup-form__value-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.95rem;
}

.signup-form__value-grid article {
  padding: 0.9rem;
  border-radius: 14px;
  background: var(--hero-surface-alt);
}

.signup-form__value-grid span,
.signup-form__total-card span {
  display: block;
  color: var(--primary-dark);
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.signup-form__value-grid p {
  margin: 0.35rem 0 0;
  color: var(--text-soft);
}

.signup-form__selection-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.signup-form__feature-list {
  margin-top: 0.75rem;
}

.signup-form__feature-list li {
  color: var(--text);
}

.signup-form__feature-list--muted li {
  color: var(--text-soft);
}

.signup-form__addon-card {
  padding: 1rem;
  display: grid;
  gap: 0.9rem;
}

.signup-form__addon-top {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.signup-form__addon-toggle {
  width: 64px;
  height: 36px;
  border: none;
  border-radius: 999px;
  padding: 4px;
  background: rgba(111, 145, 153, 0.28);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
}

.signup-form__addon-toggle span {
  display: block;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 10px 18px rgba(17, 47, 71, 0.16);
  transition: transform var(--transition-fast);
}

.signup-form__addon-toggle--active {
  background: linear-gradient(135deg, var(--primary-dark), var(--secondary));
}

.signup-form__addon-toggle--active span {
  transform: translateX(28px);
}

.signup-form__addon-toggle--disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.signup-form__addon-meta {
  display: grid;
  gap: 0.3rem;
}

.signup-form__addon-meta span,
.signup-form__addon-hint {
  color: var(--text-soft);
}

.signup-form__total-card {
  padding: 1rem;
}

.signup-form__total-card strong {
  display: block;
  margin-top: 0.25rem;
  font-size: 1.8rem;
  line-height: 1;
}

.signup-form__error {
  margin: 0;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  background: rgba(235, 85, 69, 0.14);
  border: 1px solid rgba(235, 85, 69, 0.22);
  color: #b8392d;
}

.signup-form__addon-note {
  margin: 0;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: rgba(17, 184, 159, 0.12);
  border: 1px solid rgba(17, 184, 159, 0.18);
  color: var(--primary-dark);
}

@media (max-width: 980px) {
  .signup-form__plans,
  .signup-form__selection-details,
  .signup-form__value-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .signup-form__grid {
    grid-template-columns: 1fr;
  }

  .signup-form__addon-top {
    flex-direction: column;
  }
}
</style>

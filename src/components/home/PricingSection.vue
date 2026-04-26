<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "../base/BaseButton.vue";
import { usePricingSelection } from "../../composables/usePricingSelection.js";
import {
    DEFAULT_PRICING_PLAN_CODE,
    WHATSAPP_ADDON_CODE,
    buildPricingSelection,
    buildSignupQuery,
    canPlanUseAddon,
    getPublicPlans
} from "../../shared/pricingCatalog.js";

const props = defineProps({
    embedMode: {
        type: String,
        default: "home"
    },
    showFaq: {
        type: Boolean,
        default: true
    },
    showFinalCta: {
        type: Boolean,
        default: true
    }
});

const router = useRouter();
const plans = getPublicPlans();
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
} = usePricingSelection(DEFAULT_PRICING_PLAN_CODE, {
    selectionSource: "pricing"
});

const comparisonRows = computed(() => [
    {
        label: "Operacion diaria",
        values: plans.map((plan) => plan.featureSummary.operations)
    },
    {
        label: "Finanzas operativas",
        values: plans.map((plan) => plan.featureSummary.finances)
    },
    {
        label: "Inventario y consumos",
        values: plans.map((plan) => plan.featureSummary.inventory)
    },
    {
        label: "Reportes y lectura",
        values: plans.map((plan) => plan.featureSummary.reporting)
    },
    {
        label: "WhatsApp",
        values: plans.map((plan) => plan.featureSummary.whatsapp)
    },
    {
        label: "Usuarios",
        values: plans.map((plan) =>
            plan.code === "enterprise" ? "Capacidad ampliada" : `${plan.maxUsers}`
        )
    },
    {
        label: "Salas",
        values: plans.map((plan) =>
            plan.code === "enterprise" ? "Capacidad ampliada" : `${plan.maxRooms}`
        )
    },
    {
        label: "Reservas por mes",
        values: plans.map((plan) =>
            plan.code === "enterprise"
                ? "Capacidad ampliada"
                : `${plan.maxReservationsPerMonth}`
        )
    },
    {
        label: "Trial",
        values: plans.map((plan) => `${plan.trialDays} dias`)
    }
]);

const addonAvailabilityMessage = computed(() => {
    if (!selectedPlan.value) {
        return "";
    }

    if (selectedPlan.value.code === "basic") {
        return "Este add-on se habilita desde Premium porque Basico cuida la operacion central sin sumar otra capa de automatizacion.";
    }

    if (selectedPlan.value.code === "enterprise") {
        return "Puedes activarlo desde el inicio o dejarlo como parte de una configuracion mas negociada.";
    }

    return "Activalo cuando recepcion ya necesite quitarse confirmaciones repetitivas, cancelaciones y consultas basicas de cita.";
});

const selectionSummaryLines = computed(() => {
    if (!selectedPlan.value) {
        return [];
    }

    const lines = [
        `${selectedPlan.value.trialDays} dias de trial`,
        `${selectedPlan.value.maxUsers === 9999 ? "Capacidad ampliada" : `${selectedPlan.value.maxUsers} usuarios`} y ${selectedPlan.value.maxRooms === 9999 ? "capacidad ampliada" : `${selectedPlan.value.maxRooms} salas`}`,
        selectedPlan.value.upgradeValue
    ];

    if (selection.value.addonEnabled && selectedAddon.value) {
        lines.push(
            `${selectedAddon.value.includedMessages} mensajes incluidos y USD ${selectedAddon.value.overagePricePerMessage} por mensaje adicional`
        );
    }

    return lines;
});

const primaryActionLabel = computed(() => selectedPlan.value?.ctaLabel ?? "Empezar");

const faqItems = [
    {
        question: "Que cambia realmente entre Basico y Premium?",
        answer:
            "Basico ordena la operacion diaria. Premium suma finanzas, facturacion procedural, inventario y reportes para que la clinica no solo trabaje mejor, sino que tambien cierre y lea mejor el negocio."
    },
    {
        question: "Cuando vale la pena activar WhatsApp?",
        answer:
            "Cuando la clinica ya mueve mas citas por dia y recepcion necesita bajar llamadas repetitivas, confirmaciones manuales y solicitudes simples de reprogramacion."
    },
    {
        question: "Enterprise tambien entra por signup?",
        answer:
            "Si. Puedes iniciar tu prueba desde signup y luego trabajar el onboarding asistido, la configuracion mas negociada y el alcance de crecimiento con el equipo."
    }
];

function isSelectedPlan(planCode) {
    return selectedPlanCode.value === planCode;
}

function selectPlanCard(planCode) {
    selectPlan(planCode);
}

function buildSelectionForPlan(planCode) {
    const shouldKeepAddon =
        addonEnabled.value && canPlanUseAddon(planCode, WHATSAPP_ADDON_CODE);

    return buildPricingSelection(planCode, shouldKeepAddon, "pricing");
}

function routeFromSelection(nextSelection) {
    router.push({
        path: "/signup",
        query: buildSignupQuery(nextSelection)
    });
}

function handlePlanCta(planCode) {
    routeFromSelection(buildSelectionForPlan(planCode));
}

function handlePrimaryCta() {
    routeFromSelection(selection.value);
}

function handleAddonToggle() {
    if (!isAddonAvailable.value) {
        setAddonEnabled(false);
        return;
    }

    toggleAddon();
}
</script>

<template>
  <section
    id="precios"
    v-reveal
    class="pricing-section section-block section-shell"
    :class="`pricing-section--${props.embedMode}`"
  >
    <div class="pricing-section__header section-heading">
      <span class="section-label">Precios</span>
      <h2>Planes claros para clinicas que quieren ordenar recepcion, operacion y control del negocio</h2>
      <p>
        Basico resuelve la operacion central. Premium suma finanzas e inventario para
        cerrar mejor la clinica. Enterprise toma todo eso y lo empuja hacia mas escala,
        lectura ejecutiva y acompanamiento.
      </p>
    </div>

    <div class="pricing-section__grid">
      <div class="pricing-plans">
        <article
          v-for="plan in plans"
          :key="plan.code"
          v-reveal="{ delay: 70 }"
          class="pricing-plan"
          :class="{
            'pricing-plan--selected': isSelectedPlan(plan.code),
            'pricing-plan--popular': plan.isPopular
          }"
          role="button"
          tabindex="0"
          @click="selectPlanCard(plan.code)"
          @keydown.enter.prevent="selectPlanCard(plan.code)"
          @keydown.space.prevent="selectPlanCard(plan.code)"
        >
          <div class="pricing-plan__eyebrow">
            <span
              class="pricing-plan__badge"
              :class="{ 'pricing-plan__badge--popular': plan.isPopular }"
            >
              {{ plan.isPopular ? "Mas recomendado" : plan.priceLabel }}
            </span>
            <span class="pricing-plan__audience">{{ plan.name }}</span>
          </div>

          <div class="pricing-plan__price">
            <strong>{{ plan.formattedMonthlyPrice }}</strong>
            <span>{{ plan.idealFor }}</span>
          </div>

          <p class="pricing-plan__headline">
            {{ plan.headline }}
          </p>

          <ul class="pricing-plan__meta">
            <li>{{ plan.code === "enterprise" ? "Capacidad ampliada" : `${plan.maxUsers} usuarios` }}</li>
            <li>{{ plan.code === "enterprise" ? "Capacidad ampliada" : `${plan.maxRooms} salas` }}</li>
            <li>
              {{ plan.code === "enterprise" ? "Capacidad ampliada" : `${plan.maxReservationsPerMonth} reservas por mes` }}
            </li>
            <li>{{ plan.trialDays }} dias de trial</li>
          </ul>

          <div class="pricing-plan__feature-groups">
            <div>
              <h3>Incluye</h3>
              <ul class="pricing-plan__benefits">
                <li v-for="benefit in plan.benefits" :key="benefit">
                  {{ benefit }}
                </li>
              </ul>
            </div>

            <div v-if="plan.excludedFeatures.length" class="pricing-plan__excludes">
              <h3>No incluye</h3>
              <ul class="pricing-plan__excludes-list">
                <li v-for="feature in plan.excludedFeatures.slice(0, 3)" :key="feature">
                  {{ feature }}
                </li>
              </ul>
            </div>
          </div>

          <p class="pricing-plan__availability">
            {{ plan.addonAvailabilityLabel }}
          </p>

          <BaseButton
            block
            :variant="plan.isPopular ? 'primary' : 'ghost'"
            @click.stop="handlePlanCta(plan.code)"
          >
            {{ plan.ctaLabel }}
          </BaseButton>
        </article>
      </div>

      <aside v-reveal="100" class="pricing-summary">
        <span class="pricing-summary__label">Tu seleccion actual</span>
        <h3>{{ selectedPlan?.name }}</h3>
        <p>
          {{ selectedPlan?.description }}
        </p>

        <div class="pricing-summary__total">
          <span>Total mensual estimado</span>
          <strong>{{ estimatedTotalLabel }}</strong>
        </div>

        <ul class="pricing-summary__notes">
          <li v-for="line in selectionSummaryLines" :key="line">
            {{ line }}
          </li>
        </ul>

        <div class="pricing-summary__addon-line">
          <span>
            {{ selectedAddon?.name }}
          </span>
          <strong>
            {{ selection.addonEnabled ? `+ USD ${selectedAddon?.monthlyPrice}` : "Opcional" }}
          </strong>
        </div>

        <BaseButton block size="lg" @click="handlePrimaryCta">
          {{ primaryActionLabel }}
        </BaseButton>
      </aside>
    </div>

    <div v-reveal="130" class="pricing-compare">
      <div class="pricing-compare__header">
        <h3>Que se lleva cada plan</h3>
        <p>
          La diferencia no esta en romper la operacion base. Esta en cuanto control,
          cierre y lectura del negocio gana la clinica cuando sube de plan.
        </p>
      </div>

      <div class="pricing-compare__table" role="table" aria-label="Comparativa de planes">
        <div class="pricing-compare__row pricing-compare__row--head" role="row">
          <span role="columnheader">Valor</span>
          <span role="columnheader">Basico</span>
          <span role="columnheader">Premium</span>
          <span role="columnheader">Enterprise</span>
        </div>
        <div
          v-for="row in comparisonRows"
          :key="row.label"
          class="pricing-compare__row"
          role="row"
        >
          <span class="pricing-compare__label" role="rowheader">{{ row.label }}</span>
          <span
            v-for="(value, index) in row.values"
            :key="`${row.label}-${index}`"
            role="cell"
          >
            {{ value }}
          </span>
        </div>
      </div>
    </div>

    <div v-reveal="160" class="pricing-addon">
      <div class="pricing-addon__copy">
        <span class="pricing-addon__label">Add-on opcional</span>
        <h3>Asistente Operativo de Citas por WhatsApp</h3>
        <p>
          Pensado para clinicas que quieren confirmar citas, procesar cancelaciones,
          recibir solicitudes de reprogramacion y responder consultas basicas sin cargar
          mas a recepcion.
        </p>

        <ul class="pricing-addon__capabilities">
          <li v-for="capability in selectedAddon?.capabilities ?? []" :key="capability">
            {{ capability }}
          </li>
        </ul>
      </div>

      <div class="pricing-addon__controls">
        <div class="pricing-addon__toggle-row">
          <div>
            <strong>{{ selectedAddon?.name }}</strong>
            <p>USD {{ selectedAddon?.monthlyPrice }}/mes por cuenta</p>
          </div>

          <button
            type="button"
            class="pricing-addon__toggle"
            :class="{
              'pricing-addon__toggle--active': selection.addonEnabled,
              'pricing-addon__toggle--disabled': !isAddonAvailable
            }"
            :aria-pressed="selection.addonEnabled ? 'true' : 'false'"
            :disabled="!isAddonAvailable"
            @click="handleAddonToggle"
          >
            <span></span>
          </button>
        </div>

        <div class="pricing-addon__meter">
          <span>Incluye {{ selectedAddon?.includedMessages }} mensajes al mes</span>
          <strong>USD {{ selectedAddon?.overagePricePerMessage }} por mensaje enviado o recibido adicional</strong>
        </div>

        <p class="pricing-addon__hint">
          {{ addonAvailabilityMessage }}
        </p>
      </div>
    </div>

    <div v-if="props.showFinalCta" v-reveal="190" class="pricing-cta">
      <div>
        <h3>Empieza con una operacion clara y sube de plan cuando ya necesites cerrar y leer mejor la clinica</h3>
        <p>
          La idea no es quitarte herramientas absurdamente. Es dejarte trabajar bien
          desde el primer plan y mostrarte con claridad cuando ya vale la pena sumar
          finanzas, inventario, KPIs y WhatsApp.
        </p>
      </div>

      <BaseButton size="lg" @click="handlePrimaryCta">
        {{ primaryActionLabel }}
      </BaseButton>
    </div>

    <div v-if="props.showFaq" v-reveal="220" class="pricing-faq">
      <article v-for="item in faqItems" :key="item.question" class="pricing-faq__item">
        <h3>{{ item.question }}</h3>
        <p>{{ item.answer }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.pricing-section {
  margin-top: 1rem;
  background: rgba(245, 250, 251, 0.92);
}

.pricing-section__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.55fr);
  gap: 1.5rem;
  align-items: start;
}

.pricing-plans {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.pricing-plan,
.pricing-summary,
.pricing-compare,
.pricing-addon,
.pricing-cta,
.pricing-faq__item {
  border-radius: 24px;
  border: 1px solid rgba(111, 145, 153, 0.14);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: var(--shadow);
}

.pricing-plan {
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
}

.pricing-plan:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-hover);
}

.pricing-plan--selected {
  border-color: rgba(17, 184, 159, 0.32);
  box-shadow:
    0 0 0 2px rgba(17, 184, 159, 0.12),
    var(--shadow-hover);
}

.pricing-plan--popular {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(242, 247, 248, 0.96));
}

.pricing-plan__eyebrow {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.pricing-plan__badge {
  display: inline-flex;
  align-items: center;
  padding: 0.38rem 0.7rem;
  border-radius: 999px;
  background: rgba(17, 184, 159, 0.12);
  color: var(--primary-dark);
  font-size: 0.8rem;
  font-weight: 700;
}

.pricing-plan__badge--popular {
  background: rgba(255, 143, 90, 0.14);
  color: var(--accent-dark);
}

.pricing-plan__audience {
  color: var(--text-soft);
  font-size: 0.88rem;
  font-weight: 600;
}

.pricing-plan__price strong,
.pricing-summary__total strong {
  display: block;
  font-size: clamp(1.7rem, 3vw, 2.4rem);
  line-height: 1;
  color: var(--primary-dark);
}

.pricing-plan__price span {
  display: block;
  margin-top: 0.45rem;
  color: var(--text-soft);
}

.pricing-plan__headline,
.pricing-summary p,
.pricing-compare__header p,
.pricing-addon__copy p,
.pricing-addon__hint,
.pricing-cta p,
.pricing-faq__item p {
  margin: 0;
  color: var(--text-soft);
}

.pricing-plan__meta,
.pricing-plan__benefits,
.pricing-summary__notes,
.pricing-addon__capabilities,
.pricing-plan__excludes-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.55rem;
}

.pricing-plan__meta li,
.pricing-plan__benefits li,
.pricing-summary__notes li,
.pricing-addon__capabilities li,
.pricing-plan__excludes-list li {
  position: relative;
  padding-left: 1.1rem;
  color: var(--text);
}

.pricing-plan__meta li::before,
.pricing-plan__benefits li::before,
.pricing-summary__notes li::before,
.pricing-addon__capabilities li::before,
.pricing-plan__excludes-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55rem;
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--secondary), var(--accent));
}

.pricing-plan__feature-groups {
  display: grid;
  gap: 0.9rem;
}

.pricing-plan__feature-groups h3,
.pricing-plan__excludes h3 {
  margin: 0 0 0.45rem;
  font-size: 0.92rem;
  color: var(--primary-dark);
}

.pricing-plan__availability {
  margin: auto 0 0;
  color: var(--text-soft);
  font-size: 0.92rem;
}

.pricing-summary {
  padding: 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 108px;
}

.pricing-summary__label,
.pricing-addon__label {
  display: inline-flex;
  align-self: flex-start;
  padding: 0.38rem 0.72rem;
  border-radius: 999px;
  background: rgba(17, 47, 71, 0.08);
  color: var(--primary-dark);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pricing-summary h3,
.pricing-compare__header h3,
.pricing-addon__copy h3,
.pricing-cta h3,
.pricing-faq__item h3 {
  margin: 0;
  color: var(--text);
}

.pricing-summary__total {
  padding: 1rem;
  border-radius: 20px;
  background: var(--hero-surface-alt);
}

.pricing-summary__total span,
.pricing-addon__meter span {
  display: block;
  color: var(--text-soft);
  font-size: 0.92rem;
}

.pricing-summary__addon-line {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 0.95rem 0;
  border-top: 1px solid rgba(111, 145, 153, 0.12);
  border-bottom: 1px solid rgba(111, 145, 153, 0.12);
}

.pricing-summary__addon-line strong,
.pricing-addon__meter strong {
  color: var(--primary-dark);
}

.pricing-compare {
  margin-top: 1.5rem;
  padding: 1.35rem;
  overflow-x: auto;
}

.pricing-compare__header {
  margin-bottom: 1rem;
}

.pricing-compare__table {
  display: grid;
  gap: 0.75rem;
  min-width: 760px;
}

.pricing-compare__row {
  display: grid;
  grid-template-columns: minmax(180px, 0.9fr) repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  align-items: start;
  padding: 0.8rem 0.95rem;
  border-radius: 16px;
  background: var(--hero-surface-alt);
}

.pricing-compare__row--head {
  background: rgba(17, 47, 71, 0.08);
  color: var(--primary-dark);
  font-weight: 700;
}

.pricing-compare__label {
  color: var(--text);
  font-weight: 600;
}

.pricing-addon {
  margin-top: 1.5rem;
  padding: 1.4rem;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
  gap: 1.25rem;
  align-items: start;
}

.pricing-addon__copy {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.pricing-addon__controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border-radius: 22px;
  background: var(--hero-surface-alt);
}

.pricing-addon__toggle-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.pricing-addon__toggle-row p {
  margin: 0.25rem 0 0;
  color: var(--text-soft);
}

.pricing-addon__toggle {
  width: 64px;
  height: 36px;
  border: none;
  border-radius: 999px;
  padding: 4px;
  background: rgba(111, 145, 153, 0.28);
  cursor: pointer;
  position: relative;
}

.pricing-addon__toggle span {
  display: block;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 10px 18px rgba(17, 47, 71, 0.16);
  transition: transform var(--transition-fast);
}

.pricing-addon__toggle--active {
  background: linear-gradient(135deg, var(--primary-dark), var(--secondary));
}

.pricing-addon__toggle--active span {
  transform: translateX(28px);
}

.pricing-addon__toggle--disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.pricing-addon__meter {
  padding: 0.95rem 1rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
}

.pricing-cta {
  margin-top: 1.5rem;
  padding: 1.45rem;
  display: flex;
  justify-content: space-between;
  gap: 1.25rem;
  align-items: center;
}

.pricing-faq {
  margin-top: 1.5rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.pricing-faq__item {
  padding: 1.2rem;
}

@media (max-width: 1080px) {
  .pricing-section__grid,
  .pricing-plans,
  .pricing-addon,
  .pricing-faq {
    grid-template-columns: 1fr;
  }

  .pricing-summary {
    position: static;
  }
}

@media (max-width: 760px) {
  .pricing-addon__toggle-row,
  .pricing-cta {
    flex-direction: column;
    align-items: flex-start;
  }

  .pricing-cta :deep(.base-button) {
    width: 100%;
  }
}
</style>

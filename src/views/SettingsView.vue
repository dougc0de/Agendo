<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AccountSettingsForm from "../components/settings/AccountSettingsForm.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import { getAccountSettings, updateAccountSettings } from "../services/settingsApi.js";
import { buildPrivateNavLinks } from "../shared/privateNavigation.js";
import { DEFAULT_CURRENCY_CODE, getCurrencyLabel } from "../shared/currencies.js";
import { isAdministrativeUser } from "../shared/roles.js";
import { useAuthStore } from "../stores/authStore.js";

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const feedback = ref("");
const settings = ref({
    consultationDurationEnabled: false,
    consultationDurationMinutes: 30,
    procedureDurationEnabled: false,
    procedureDurationMinutes: 60,
    procedureTurnoverEnabled: false,
    procedureTurnoverMinutes: 15,
    consultationOpenTime: "08:00",
    consultationCloseTime: "17:00",
    consultationNoClosing: false,
    procedureOpenTime: "08:00",
    procedureCloseTime: "17:00",
    procedureNoClosing: false,
    timeZone: "America/Costa_Rica",
    procedurePricingPolicy: "bloqueado",
    defaultProcedurePricingMode: "solo_sala",
    defaultCurrencyCode: DEFAULT_CURRENCY_CODE,
    documentMode: "comprobante_simple",
    taxesEnabled: false,
    noShowPolicy: "informativo",
    lateCancellationPolicy: "informativa",
    allowReceptionManualCharges: true,
    capabilityConfig: {
        financeEnabled: true,
        inventoryEnabled: false,
        billableCatalogEnabled: true,
        manualBillingEnabled: false,
        partialPaymentsEnabled: false,
        packagesEnabled: false,
        membershipsEnabled: false,
        rentalsEnabled: false,
        commissionsEnabled: false,
        depositsEnabled: false,
        penaltiesEnabled: false,
        whatsappEnabled: false
    },
    capabilities: {
        billableCatalogMode: "simple"
    }
});

const isAdminUser = computed(() =>
    isAdministrativeUser({
        membershipRole: authStore.membershipRole,
        userRole: authStore.user?.rol
    })
);

const navLinks = computed(() =>
    buildPrivateNavLinks({
        membershipRole: authStore.membershipRole,
        userRole: authStore.user?.rol
    })
);

function formatPricingMode(mode) {
    return (
        {
            solo_sala: "Solo sala",
            solo_insumos: "Solo insumos",
            sala_mas_insumos: "Sala + insumos"
        }[mode] ?? mode
    );
}

const statCards = computed(() => [
    {
        label: "Consultas",
        value: `${Number(settings.value.consultationDurationMinutes ?? 30)} min base`
    },
    {
        label: "Procedimientos",
        value: `${Number(settings.value.procedureDurationMinutes ?? 60)} min base`
    },
    {
        label: "Separacion de sala",
        value: settings.value.procedureTurnoverEnabled
            ? `${Number(settings.value.procedureTurnoverMinutes ?? 15)} min activos`
            : "Sin separacion extra"
    },
    {
        label: "Horario consulta",
        value: settings.value.consultationNoClosing
            ? `Desde ${settings.value.consultationOpenTime ?? "08:00"}`
            : `${settings.value.consultationOpenTime ?? "08:00"} - ${settings.value.consultationCloseTime ?? "17:00"}`
    },
    {
        label: "Moneda base",
        value: getCurrencyLabel(settings.value.defaultCurrencyCode)
    },
    {
        label: "Facturacion procedural",
        value: `${formatPricingMode(settings.value.defaultProcedurePricingMode)} · bloqueada`
    },
    {
        label: "Catalogo facturable",
        value: settings.value.capabilityConfig?.billableCatalogEnabled ? "Activo" : "Inactivo"
    },
    {
        label: "Cobro manual",
        value: settings.value.capabilityConfig?.manualBillingEnabled
            ? "Habilitado"
            : "Solo con reserva"
    }
]);

function normalizeSettingsPayload(data = {}) {
    return {
        consultationDurationEnabled: Boolean(data.consultationDurationEnabled),
        consultationDurationMinutes: Number(data.consultationDurationMinutes ?? 30) || 30,
        procedureDurationEnabled: Boolean(data.procedureDurationEnabled),
        procedureDurationMinutes: Number(data.procedureDurationMinutes ?? 60) || 60,
        procedureTurnoverEnabled: Boolean(data.procedureTurnoverEnabled),
        procedureTurnoverMinutes: Number(data.procedureTurnoverMinutes ?? 15) || 15,
        consultationOpenTime: data.consultationOpenTime ?? "08:00",
        consultationCloseTime: data.consultationCloseTime ?? "17:00",
        consultationNoClosing: Boolean(data.consultationNoClosing),
        procedureOpenTime: data.procedureOpenTime ?? "08:00",
        procedureCloseTime: data.procedureCloseTime ?? "17:00",
        procedureNoClosing: Boolean(data.procedureNoClosing),
        timeZone: data.timeZone ?? "America/Costa_Rica",
        procedurePricingPolicy: data.procedurePricingPolicy ?? "bloqueado",
        defaultProcedurePricingMode: data.defaultProcedurePricingMode ?? "solo_sala",
        defaultCurrencyCode: data.defaultCurrencyCode ?? DEFAULT_CURRENCY_CODE,
        documentMode: data.documentMode ?? "comprobante_simple",
        taxesEnabled: Boolean(data.taxesEnabled),
        noShowPolicy: data.noShowPolicy ?? "informativo",
        lateCancellationPolicy: data.lateCancellationPolicy ?? "informativa",
        allowReceptionManualCharges: Boolean(data.allowReceptionManualCharges),
        capabilityConfig: {
            financeEnabled: Boolean(data.capabilityConfig?.financeEnabled ?? true),
            inventoryEnabled: Boolean(data.capabilityConfig?.inventoryEnabled),
            billableCatalogEnabled: Boolean(
                data.capabilityConfig?.billableCatalogEnabled ?? true
            ),
            manualBillingEnabled: Boolean(data.capabilityConfig?.manualBillingEnabled),
            partialPaymentsEnabled: Boolean(data.capabilityConfig?.partialPaymentsEnabled),
            packagesEnabled: Boolean(data.capabilityConfig?.packagesEnabled),
            membershipsEnabled: Boolean(data.capabilityConfig?.membershipsEnabled),
            rentalsEnabled: Boolean(data.capabilityConfig?.rentalsEnabled),
            commissionsEnabled: Boolean(data.capabilityConfig?.commissionsEnabled),
            depositsEnabled: Boolean(data.capabilityConfig?.depositsEnabled),
            penaltiesEnabled: Boolean(data.capabilityConfig?.penaltiesEnabled),
            whatsappEnabled: Boolean(data.capabilityConfig?.whatsappEnabled)
        },
        capabilities: {
            ...data.capabilities
        }
    };
}

async function fetchSettings() {
    loading.value = true;
    error.value = "";

    try {
        const response = await getAccountSettings();
        settings.value = normalizeSettingsPayload(response.data ?? {});
    } catch (requestError) {
        error.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible cargar la configuracion.";
        settings.value = normalizeSettingsPayload();
    } finally {
        loading.value = false;
    }
}

async function handleSaveSettings(payload) {
    saving.value = true;
    error.value = "";
    feedback.value = "";

    try {
        const response = await updateAccountSettings(payload);
        settings.value = normalizeSettingsPayload(response.data ?? {});
        feedback.value = response.msg;
    } catch (requestError) {
        error.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible guardar la configuracion.";
    } finally {
        saving.value = false;
    }
}

function logout() {
    authStore.logout();
    router.push("/login");
}

async function bootstrapSettings() {
    if (!authStore.isHydrated) {
        await authStore.hydrate();
    }

    if (!authStore.isAuthenticated) {
        router.replace("/login");
        return;
    }

    if (!isAdminUser.value) {
        router.replace("/dashboard");
        return;
    }

    await fetchSettings();
}

onMounted(() => {
    bootstrapSettings();
});
</script>

<template>
  <div class="settings-page page-view">
    <div class="settings-shell page-shell">
      <AppNavbar
        :links="navLinks"
        brand-href="/dashboard"
        action-label="Cerrar Sesion"
        :show-profile-icon="true"
        @action="logout"
      />

      <main class="settings-main section-shell">
        <section v-reveal class="settings-hero">
            <div>
              <span class="settings-eyebrow">Control administrativo</span>
              <h1>Configuraciones de atencion</h1>
              <p>
              Define tiempos base, ventanas operativas, separacion entre procedimientos, moneda base y la modalidad procedural que ejecutara recepcion.
              </p>
            </div>
        </section>

        <nav v-reveal="40" class="settings-admin-switch">
          <RouterLink to="/settings" class="settings-admin-switch__link settings-admin-switch__link--active">
            Configuraciones
          </RouterLink>
          <RouterLink to="/users" class="settings-admin-switch__link">
            Usuarios
          </RouterLink>
        </nav>

        <section class="settings-stats stats-strip">
          <article
            v-for="card in statCards"
            :key="card.label"
            v-reveal="{ delay: 60 }"
            class="settings-stat-card"
          >
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </article>
        </section>

        <section class="settings-layout">
          <article v-reveal class="settings-panel">
            <div class="settings-panel__header">
              <div>
                <span class="settings-panel__eyebrow">Fuente operativa</span>
                <h2>Agenda de la cuenta</h2>
                <p>Estas reglas controlan el horario de atencion, los tiempos base de agenda, la separacion de sala entre procedimientos y la forma en que se factura cada procedimiento.</p>
              </div>
            </div>

            <p v-if="feedback" class="settings-feedback">{{ feedback }}</p>
            <p v-if="error" class="settings-error">{{ error }}</p>
            <p v-if="loading && !error" class="settings-state">Cargando configuracion...</p>

            <AccountSettingsForm
              v-else
              :initial-value="settings"
              :submitting="saving"
              error-message=""
              @submit="handleSaveSettings"
            />
          </article>
        </section>
      </main>

      <AppFooter />
    </div>
  </div>
</template>

<style scoped>
.settings-main {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.settings-hero,
.settings-panel {
  border-radius: 26px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: var(--hero-surface);
  box-shadow: 0 28px 60px rgba(16, 38, 44, 0.08);
}

.settings-stat-card {
  border-radius: 26px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  box-shadow: 0 28px 60px rgba(16, 38, 44, 0.08);
}

.settings-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.45rem;
  background: var(--hero-surface-strong);
}

.settings-eyebrow,
.settings-panel__eyebrow {
  display: inline-flex;
  padding: 0.38rem 0.78rem;
  border-radius: 999px;
  background: var(--hero-chip-bg);
  color: var(--primary-dark);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.settings-hero h1,
.settings-panel__header h2 {
  margin: 0.7rem 0 0;
}

.settings-hero p,
.settings-panel__header p {
  margin: 0.55rem 0 0;
  color: var(--text-soft);
}

.settings-admin-switch {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.settings-admin-switch__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.7rem;
  padding: 0.65rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(17, 184, 159, 0.14);
  background: var(--hero-surface);
  color: var(--text-soft);
  font-weight: 700;
}

.settings-admin-switch__link--active {
  background: var(--primary-dark);
  color: #fff;
  border-color: transparent;
}

.settings-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.settings-stat-card {
  padding: 1.1rem 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.settings-stat-card span {
  color: var(--text-soft);
}

.settings-stat-card strong {
  font-size: 2rem;
  color: var(--primary-dark);
}

.settings-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.settings-panel {
  padding: 1.2rem;
}

.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.settings-feedback,
.settings-error,
.settings-state {
  margin: 0;
  padding: 0.95rem 1rem;
  border-radius: 18px;
}

.settings-feedback {
  background: #eaf7f3;
  color: var(--primary-dark);
}

.settings-error {
  background: rgba(235, 85, 69, 0.12);
  color: #b8392d;
}

.settings-state {
  background: rgba(17, 184, 159, 0.08);
  color: var(--text-soft);
}

@media (max-width: 760px) {
  .settings-hero,
  .settings-panel__header {
    flex-direction: column;
    align-items: stretch;
  }

  .settings-admin-switch {
    width: 100%;
  }

  .settings-admin-switch__link {
    flex: 1 1 180px;
  }
}
</style>

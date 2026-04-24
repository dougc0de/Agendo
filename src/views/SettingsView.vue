<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AccountSettingsForm from "../components/settings/AccountSettingsForm.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import BaseButton from "../components/base/BaseButton.vue";
import { getAccountSettings, updateAccountSettings } from "../services/settingsApi.js";
import { buildPrivateNavLinks } from "../shared/privateNavigation.js";
import { isAdministrativeUser } from "../shared/roles.js";
import { useAuthStore } from "../stores/authStore.js";

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const feedback = ref("");
const settings = ref({
    consultationDurationMinutes: 30,
    procedureDurationMinutes: 60
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

const statCards = computed(() => [
    {
        label: "Consultas",
        value: `${Number(settings.value.consultationDurationMinutes ?? 30)} min`
    },
    {
        label: "Procedimientos",
        value: `${Number(settings.value.procedureDurationMinutes ?? 60)} min`
    },
    {
        label: "Diferencia",
        value: `${Math.max(
            0,
            Number(settings.value.procedureDurationMinutes ?? 60) -
                Number(settings.value.consultationDurationMinutes ?? 30)
        )} min`
    }
]);

async function fetchSettings() {
    loading.value = true;
    error.value = "";

    try {
        const response = await getAccountSettings();
        settings.value = {
            consultationDurationMinutes:
                Number(response.data?.consultationDurationMinutes ?? 30) || 30,
            procedureDurationMinutes:
                Number(response.data?.procedureDurationMinutes ?? 60) || 60
        };
    } catch (requestError) {
        error.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible cargar la configuracion.";
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
        settings.value = {
            consultationDurationMinutes:
                Number(response.data?.consultationDurationMinutes ?? 30) || 30,
            procedureDurationMinutes:
                Number(response.data?.procedureDurationMinutes ?? 60) || 60
        };
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
              Ajusta la duracion base de consultas y procedimientos para que el equipo
              reserve mas rapido y con menos friccion.
            </p>
          </div>

          <div class="settings-hero__actions">
            <BaseButton variant="ghost" @click="fetchSettings">
              Recargar configuracion
            </BaseButton>
          </div>
        </section>

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
                <span class="settings-panel__eyebrow">Duraciones base</span>
                <h2>Tiempo estandar por tipo de atencion</h2>
                <p>Estos valores se aplican desde el modal de reservas con un clic.</p>
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

          <aside class="settings-side">
            <article v-reveal="100" class="settings-side__card">
              <span class="settings-panel__eyebrow">Uso recomendado</span>
              <h3>Consultas cortas, procedimientos mas largos</h3>
              <p>
                Mantener una base distinta ayuda a reservar mejor sin obligar al equipo a
                calcular todo manualmente cada vez.
              </p>
            </article>

            <article v-reveal="140" class="settings-side__card">
              <span class="settings-panel__eyebrow">Acceso</span>
              <ul class="settings-side__list">
                <li>Solo el admin puede cambiar esta configuracion.</li>
                <li>Doctores y staff siguen aprovechando estos tiempos al reservar.</li>
                <li>Siempre puedes ajustar la hora final manualmente si un caso lo requiere.</li>
              </ul>
            </article>
          </aside>
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
.settings-panel,
.settings-side__card {
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
.settings-panel__header h2,
.settings-side__card h3 {
  margin: 0.7rem 0 0;
}

.settings-hero p,
.settings-panel__header p,
.settings-side__card p {
  margin: 0.55rem 0 0;
  color: var(--text-soft);
}

.settings-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.85fr);
  gap: 1rem;
  align-items: start;
}

.settings-panel,
.settings-side__card {
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
  background: linear-gradient(135deg, rgba(17, 184, 159, 0.1), rgba(255, 143, 90, 0.08));
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

.settings-side {
  display: grid;
  gap: 1rem;
}

.settings-side__list {
  margin: 0.9rem 0 0;
  padding-left: 1rem;
  color: var(--text-soft);
  display: grid;
  gap: 0.7rem;
}

@media (max-width: 980px) {
  .settings-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .settings-hero,
  .settings-panel__header {
    flex-direction: column;
    align-items: stretch;
  }

  .settings-hero__actions :deep(.base-button) {
    width: 100%;
  }
}
</style>

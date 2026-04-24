<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "../components/base/BaseButton.vue";
import BaseInput from "../components/base/BaseInput.vue";
import BaseModal from "../components/base/BaseModal.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import PatientForm from "../components/patients/PatientForm.vue";
import PatientTable from "../components/patients/PatientTable.vue";
import { createPatient, searchPatients } from "../services/patientApi.js";
import { buildPrivateNavLinks } from "../shared/privateNavigation.js";
import { useAuthStore } from "../stores/authStore.js";

const router = useRouter();
const authStore = useAuthStore();

const navLinks = computed(() =>
    buildPrivateNavLinks({
        membershipRole: authStore.membershipRole,
        userRole: authStore.user?.rol
    })
);

const searchValue = ref("");
const patients = ref([]);
const searching = ref(false);
const searchedOnce = ref(false);
const searchError = ref("");
const feedback = ref("");
const latestPatient = ref(null);
const modalOpen = ref(false);
const createError = ref("");
const creating = ref(false);

const summaryCards = computed(() => [
    {
        label: "Resultados",
        value: searchedOnce.value ? patients.value.length : "--"
    },
    {
        label: "Ultimo alta",
        value: latestPatient.value?.nombre ?? "Sin registro nuevo"
    },
    {
        label: "Cuenta",
        value: authStore.workspace?.nombre ?? "Cuenta AGENDO"
    }
]);

async function performSearch() {
    searchedOnce.value = true;
    searchError.value = "";
    feedback.value = "";

    const term = String(searchValue.value ?? "").trim();

    if (term.length < 2) {
        patients.value = [];
        searchError.value = "Escribe al menos 2 caracteres para buscar pacientes.";
        return;
    }

    searching.value = true;

    try {
        const response = await searchPatients(term);
        patients.value = response.data ?? [];
    } catch (requestError) {
        patients.value = [];
        searchError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible buscar pacientes.";
    } finally {
        searching.value = false;
    }
}

async function handleCreatePatient(payload) {
    creating.value = true;
    createError.value = "";

    try {
        const response = await createPatient(payload);
        latestPatient.value = response.data ?? null;
        feedback.value = response.msg;
        modalOpen.value = false;

        if (payload.nombre) {
            searchValue.value = payload.nombre;
            await performSearch();
        }
    } catch (requestError) {
        createError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible crear el paciente.";
    } finally {
        creating.value = false;
    }
}

function logout() {
    authStore.logout();
    router.push("/login");
}

async function bootstrapPatients() {
    if (!authStore.isHydrated) {
        await authStore.hydrate();
    }

    if (!authStore.isAuthenticated) {
        router.replace("/login");
    }
}

onMounted(() => {
    bootstrapPatients();
});
</script>

<template>
  <div class="patients-page page-view">
    <div class="patients-shell page-shell">
      <AppNavbar
        :links="navLinks"
        brand-href="/dashboard"
        action-label="Cerrar Sesion"
        :show-profile-icon="true"
        @action="logout"
      />

      <main class="patients-main section-shell">
        <section v-reveal class="patients-hero">
          <div>
            <span class="patients-eyebrow">Base de pacientes</span>
            <h1>Busqueda y alta rapida</h1>
            <p>
              Localiza pacientes por nombre, telefono o correo. Cuando no existan, puedes
              registrarlos en el mismo flujo.
            </p>
          </div>

          <div class="patients-hero__actions">
            <BaseButton @click="modalOpen = true">
              Registrar paciente
            </BaseButton>
          </div>
        </section>

        <section class="patients-stats stats-strip">
          <article
            v-for="card in summaryCards"
            :key="card.label"
            v-reveal="{ delay: 60 }"
            class="patients-stat-card"
          >
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </article>
        </section>

        <section class="patients-layout">
          <article v-reveal class="patients-panel">
            <div class="patients-panel__header">
              <div>
                <span class="patients-panel__eyebrow">Busqueda</span>
                <h2>Explorar pacientes de la cuenta</h2>
                <p>La busqueda se ejecuta sobre nombre, telefono y correo.</p>
              </div>
            </div>

            <form class="patients-search" @submit.prevent="performSearch">
              <BaseInput
                :model-value="searchValue"
                label="Buscar paciente"
                placeholder="Ej. Ana, 8888-9999 o correo@ejemplo.com"
                :required="true"
                @update:model-value="searchValue = $event"
              />
              <BaseButton type="submit">
                Buscar
              </BaseButton>
            </form>

            <p v-if="feedback" class="patients-feedback">{{ feedback }}</p>
            <p v-if="searchError" class="patients-error">{{ searchError }}</p>

            <PatientTable
              :patients="patients"
              :loading="searching"
              :empty-message="
                searchedOnce
                  ? 'No encontramos pacientes con ese criterio.'
                  : 'Todavia no has ejecutado una busqueda.'
              "
            />
          </article>

          <aside class="patients-side">
            <article v-reveal="100" class="patients-side__card">
              <span class="patients-panel__eyebrow">Alta reciente</span>
              <template v-if="latestPatient">
                <h3>{{ latestPatient.nombre }}</h3>
                <p>{{ latestPatient.telefono }}</p>
                <div class="patients-side__chips">
                  <span v-if="latestPatient.correo">{{ latestPatient.correo }}</span>
                  <span>{{ latestPatient.tipoProcedimiento || "Sin procedimiento principal" }}</span>
                </div>
              </template>
              <template v-else>
                <h3>Sin pacientes nuevos en esta sesion</h3>
                <p>Cuando registres uno, lo veras destacado aqui.</p>
              </template>
            </article>

            <article v-reveal="140" class="patients-side__card">
              <span class="patients-panel__eyebrow">Sugerencias</span>
              <ul class="patients-side__list">
                <li>Busca por telefono si quieres encontrar al paciente mas rapido.</li>
                <li>El correo ayuda a evitar duplicados cuando el telefono cambia.</li>
                <li>Asocia un procedimiento principal para reutilizarlo en reservas futuras.</li>
              </ul>
            </article>
          </aside>
        </section>
      </main>

      <AppFooter />
    </div>

    <BaseModal
      :open="modalOpen"
      title="Registrar paciente"
      description="Completa la informacion principal para dejar al paciente listo en la cuenta."
      @close="modalOpen = false; createError = ''"
    >
      <PatientForm
        :submitting="creating"
        :error-message="createError"
        @submit="handleCreatePatient"
        @cancel="modalOpen = false; createError = ''"
      />
    </BaseModal>
  </div>
</template>

<style scoped>
.patients-main {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.patients-hero,
.patients-panel,
.patients-side__card {
  border-radius: 26px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: var(--hero-surface);
  box-shadow: 0 28px 60px rgba(16, 38, 44, 0.08);
}

.patients-stat-card {
  border-radius: 26px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  box-shadow: 0 28px 60px rgba(16, 38, 44, 0.08);
}

.patients-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.45rem;
  background: var(--hero-surface-strong);
}

.patients-eyebrow,
.patients-panel__eyebrow {
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

.patients-hero h1,
.patients-panel__header h2,
.patients-side__card h3 {
  margin: 0.7rem 0 0;
}

.patients-hero p,
.patients-panel__header p,
.patients-side__card p {
  margin: 0.55rem 0 0;
  color: var(--text-soft);
}

.patients-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  justify-content: flex-end;
}

.patients-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.patients-stat-card {
  padding: 1.1rem 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.patients-stat-card span,
.patients-stat-card small {
  color: var(--text-soft);
}

.patients-stat-card strong {
  font-size: 1.6rem;
  color: var(--primary-dark);
}

.patients-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.85fr);
  gap: 1rem;
  align-items: start;
}

.patients-panel,
.patients-side__card {
  padding: 1.2rem;
}

.patients-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.patients-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.patients-search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: end;
}

.patients-feedback,
.patients-error {
  margin: 0;
  padding: 0.95rem 1rem;
  border-radius: 18px;
}

.patients-feedback {
  background: linear-gradient(135deg, rgba(17, 184, 159, 0.12), rgba(255, 143, 90, 0.08));
  color: var(--primary-dark);
}

.patients-error {
  background: rgba(235, 85, 69, 0.12);
  color: #b8392d;
}

.patients-side {
  display: grid;
  gap: 1rem;
}

.patients-side__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.9rem;
}

.patients-side__chips span {
  padding: 0.45rem 0.72rem;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(243, 248, 251, 0.94));
  border: 1px solid rgba(17, 184, 159, 0.1);
  color: var(--text-soft);
}

.patients-side__list {
  margin: 0.9rem 0 0;
  padding-left: 1rem;
  color: var(--text-soft);
  display: grid;
  gap: 0.7rem;
}

@media (max-width: 980px) {
  .patients-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .patients-hero,
  .patients-panel__header,
  .patients-search {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }

  .patients-hero__actions {
    width: 100%;
    justify-content: stretch;
  }

  .patients-hero__actions :deep(.base-button) {
    width: 100%;
  }
}
</style>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import BranchForm from "../components/branches/BranchForm.vue";
import BranchTable from "../components/branches/BranchTable.vue";
import BaseButton from "../components/base/BaseButton.vue";
import BaseModal from "../components/base/BaseModal.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import {
    createBranch,
    getBranches,
    updateBranch,
    updateBranchStatus
} from "../services/branchApi.js";
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

const branches = ref([]);
const loading = ref(false);
const saving = ref(false);
const changingStatusId = ref(null);
const error = ref("");
const feedback = ref("");
const modalError = ref("");
const modalOpen = ref(false);
const modalMode = ref("create");
const currentBranch = ref({});

const modalTitle = computed(() =>
    modalMode.value === "edit" ? "Editar sucursal" : "Nueva sucursal"
);

const activeBranches = computed(() =>
    branches.value.filter((branch) => branch.estado === "activa")
);

const summaryCards = computed(() => {
    const totalRooms = branches.value.reduce(
        (accumulator, branch) => accumulator + Number(branch.roomsCount ?? 0),
        0
    );
    const totalUsers = branches.value.reduce(
        (accumulator, branch) => accumulator + Number(branch.usersCount ?? 0),
        0
    );

    return [
        {
            label: "Sucursales",
            value: branches.value.length
        },
        {
            label: "Activas",
            value: activeBranches.value.length
        },
        {
            label: "Salas asociadas",
            value: totalRooms
        },
        {
            label: "Usuarios asociados",
            value: totalUsers
        }
    ];
});

const principalBranch = computed(
    () => branches.value.find((branch) => branch.codigo === "principal") ?? null
);

async function fetchBranches() {
    loading.value = true;
    error.value = "";

    try {
        const response = await getBranches();
        branches.value = response.data ?? [];
    } catch (requestError) {
        branches.value = [];
        error.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible cargar las sucursales.";
    } finally {
        loading.value = false;
    }
}

function openCreateModal() {
    modalMode.value = "create";
    modalError.value = "";
    currentBranch.value = {};
    modalOpen.value = true;
}

function openEditModal(branch) {
    modalMode.value = "edit";
    modalError.value = "";
    currentBranch.value = {
        ...branch
    };
    modalOpen.value = true;
}

function closeModal() {
    modalOpen.value = false;
    modalError.value = "";
    currentBranch.value = {};
}

async function handleSaveBranch(payload) {
    saving.value = true;
    modalError.value = "";

    try {
        const response =
            modalMode.value === "edit" && currentBranch.value.id
                ? await updateBranch(currentBranch.value.id, payload)
                : await createBranch(payload);

        feedback.value = response.msg;
        closeModal();
        await fetchBranches();
    } catch (requestError) {
        modalError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible guardar la sucursal.";
    } finally {
        saving.value = false;
    }
}

async function handleToggleStatus(branch) {
    changingStatusId.value = branch.id;
    error.value = "";

    try {
        const nextStatus = branch.estado === "activa" ? "inactiva" : "activa";
        const response = await updateBranchStatus(branch.id, nextStatus);
        feedback.value = response.msg;
        await fetchBranches();
    } catch (requestError) {
        error.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible actualizar el estado de la sucursal.";
    } finally {
        changingStatusId.value = null;
    }
}

function logout() {
    authStore.logout();
    router.push("/login");
}

async function bootstrapBranches() {
    if (!authStore.isHydrated) {
        await authStore.hydrate();
    }

    if (!authStore.isAuthenticated) {
        router.replace("/login");
        return;
    }

    await fetchBranches();
}

onMounted(() => {
    bootstrapBranches();
});
</script>

<template>
  <div class="branches-page page-view">
    <div class="branches-shell page-shell">
      <AppNavbar
        :links="navLinks"
        brand-href="/dashboard"
        action-label="Cerrar Sesion"
        :show-profile-icon="true"
        @action="logout"
      />

      <main class="branches-main section-shell">
        <section v-reveal class="branches-hero">
          <div>
            <span class="branches-eyebrow">Organizacion territorial</span>
            <h1>Sucursales de la cuenta</h1>
            <p>
              Organiza salas y equipo por sede, con una vista clara para crear, editar y
              controlar el estado operativo de cada sucursal.
            </p>
          </div>

          <div class="branches-hero__actions">
            <BaseButton @click="openCreateModal">
              Crear sucursal
            </BaseButton>
            <BaseButton variant="ghost" @click="fetchBranches">
              Actualizar
            </BaseButton>
          </div>
        </section>

        <section class="branches-stats stats-strip">
          <article
            v-for="card in summaryCards"
            :key="card.label"
            v-reveal="{ delay: 60 }"
            class="branches-stat-card"
          >
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </article>
        </section>

        <section class="branches-layout">
          <article v-reveal class="branches-panel">
            <div class="branches-panel__header">
              <div>
                <span class="branches-panel__eyebrow">Mapa de sedes</span>
                <h2>Operacion por sucursal</h2>
                <p>La tabla resume salas, usuarios y estado de cada sede de la cuenta.</p>
              </div>
            </div>

            <p v-if="feedback" class="branches-feedback">{{ feedback }}</p>
            <p v-if="error" class="branches-error">{{ error }}</p>

            <BranchTable
              :branches="branches"
              :loading="loading"
              :changing-status-id="changingStatusId"
              @edit="openEditModal"
              @toggle-status="handleToggleStatus"
            />
          </article>

          <aside class="branches-side">
            <article v-reveal="100" class="branches-side__card">
              <span class="branches-panel__eyebrow">Cuenta</span>
              <h3>{{ authStore.workspace?.nombre ?? "Cuenta AGENDO" }}</h3>
              <p>{{ authStore.workspace?.clinicName ?? "Clinica principal" }}</p>
              <div class="branches-side__chips">
                <span>{{ activeBranches.length }} activas</span>
                <span>{{ branches.length }} totales</span>
              </div>
            </article>

            <article v-reveal="140" class="branches-side__card">
              <span class="branches-panel__eyebrow">Sucursal destacada</span>
              <template v-if="principalBranch">
                <h3>{{ principalBranch.nombre }}</h3>
                <p>{{ principalBranch.direccion || "Sin direccion registrada" }}</p>
                <div class="branches-side__chips">
                  <span>{{ principalBranch.roomsCount }} salas</span>
                  <span>{{ principalBranch.usersCount }} usuarios</span>
                  <span>{{ principalBranch.estado }}</span>
                </div>
              </template>
              <template v-else>
                <h3>No hay sucursal principal visible</h3>
                <p>Crea la primera sede o actualiza la migracion de la cuenta.</p>
              </template>
            </article>

            <article v-reveal="180" class="branches-side__card">
              <span class="branches-panel__eyebrow">Reglas</span>
              <ul class="branches-side__list">
                <li>El codigo se normaliza en minusculas para mantenerlo consistente.</li>
                <li>No se puede desactivar la unica sucursal activa de la cuenta.</li>
                <li>Una sucursal con salas activas debe reorganizarse antes de inactivarse.</li>
              </ul>
            </article>
          </aside>
        </section>
      </main>

      <AppFooter />
    </div>

    <BaseModal
      :open="modalOpen"
      :title="modalTitle"
      description="Crea o actualiza una sede operativa de la cuenta."
      @close="closeModal"
    >
      <BranchForm
        :initial-value="currentBranch"
        :submitting="saving"
        :error-message="modalError"
        :mode="modalMode"
        @submit="handleSaveBranch"
        @cancel="closeModal"
      />
    </BaseModal>
  </div>
</template>

<style scoped>
.branches-main {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.branches-hero,
.branches-panel,
.branches-side__card {
  border-radius: 26px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: var(--hero-surface);
  box-shadow: 0 28px 60px rgba(16, 38, 44, 0.08);
}

.branches-stat-card {
  border-radius: 26px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  box-shadow: 0 28px 60px rgba(16, 38, 44, 0.08);
}

.branches-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.45rem;
  background: var(--hero-surface-strong);
}

.branches-eyebrow,
.branches-panel__eyebrow {
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

.branches-hero h1,
.branches-panel__header h2,
.branches-side__card h3 {
  margin: 0.7rem 0 0;
}

.branches-hero p,
.branches-panel__header p,
.branches-side__card p {
  margin: 0.55rem 0 0;
  color: var(--text-soft);
}

.branches-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  justify-content: flex-end;
}

.branches-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.branches-stat-card {
  padding: 1.1rem 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.branches-stat-card span,
.branches-stat-card small {
  color: var(--text-soft);
}

.branches-stat-card strong {
  font-size: 2rem;
  color: var(--primary-dark);
}

.branches-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.85fr);
  gap: 1rem;
  align-items: start;
}

.branches-panel,
.branches-side__card {
  padding: 1.2rem;
}

.branches-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.branches-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.branches-feedback,
.branches-error {
  margin: 0;
  padding: 0.95rem 1rem;
  border-radius: 18px;
}

.branches-feedback {
  background: #eaf7f3;
  color: var(--primary-dark);
}

.branches-error {
  background: rgba(235, 85, 69, 0.12);
  color: #b8392d;
}

.branches-side {
  display: grid;
  gap: 1rem;
}

.branches-side__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.9rem;
}

.branches-side__chips span {
  padding: 0.45rem 0.72rem;
  border-radius: 999px;
  background: #f2f7f8;
  border: 1px solid rgba(17, 184, 159, 0.1);
  color: var(--text-soft);
  text-transform: capitalize;
}

.branches-side__list {
  margin: 0.9rem 0 0;
  padding-left: 1rem;
  color: var(--text-soft);
  display: grid;
  gap: 0.7rem;
}

@media (max-width: 980px) {
  .branches-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .branches-hero,
  .branches-panel__header {
    flex-direction: column;
    align-items: stretch;
  }

  .branches-hero__actions {
    width: 100%;
    justify-content: stretch;
  }

  .branches-hero__actions :deep(.base-button) {
    width: 100%;
  }
}
</style>

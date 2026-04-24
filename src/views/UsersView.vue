<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "../components/base/BaseButton.vue";
import BaseModal from "../components/base/BaseModal.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import InternalUserForm from "../components/users/InternalUserForm.vue";
import { getBranches } from "../services/branchApi.js";
import {
    createInternalUser,
    getInternalUsers,
    updateInternalUser,
    updateInternalUserStatus
} from "../services/internalUserApi.js";
import { buildPrivateNavLinks } from "../shared/privateNavigation.js";
import { isAdministrativeUser } from "../shared/roles.js";
import { useAuthStore } from "../stores/authStore.js";

const router = useRouter();
const authStore = useAuthStore();
const users = ref([]);
const branches = ref([]);
const loading = ref(false);
const saving = ref(false);
const changingStatusId = ref(null);
const feedback = ref("");
const error = ref("");
const modalError = ref("");
const modalOpen = ref(false);
const modalMode = ref("create");
const currentUser = ref({});

const navLinks = computed(() =>
    buildPrivateNavLinks({
        membershipRole: authStore.membershipRole,
        userRole: authStore.user?.rol
    })
);

const isAdminUser = computed(() =>
    isAdministrativeUser({
        membershipRole: authStore.membershipRole,
        userRole: authStore.user?.rol
    })
);

const activeBranchOptions = computed(() =>
    branches.value.filter((branch) => branch.estado === "activa")
);

const summaryCards = computed(() => [
    {
        label: "Usuarios",
        value: users.value.length
    },
    {
        label: "Admins",
        value: users.value.filter((user) => user.role === "admin").length
    },
    {
        label: "Recepcion",
        value: users.value.filter((user) => user.role === "recepcionista").length
    },
    {
        label: "Doctores",
        value: users.value.filter((user) => user.role === "doctor").length
    }
]);

const modalTitle = computed(() =>
    modalMode.value === "edit" ? "Editar usuario" : "Nuevo usuario"
);

async function fetchUsers() {
    loading.value = true;
    error.value = "";

    try {
        const response = await getInternalUsers();
        users.value = response.data ?? [];
    } catch (requestError) {
        users.value = [];
        error.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible cargar los usuarios.";
    } finally {
        loading.value = false;
    }
}

async function fetchBranches() {
    try {
        const response = await getBranches();
        branches.value = response.data ?? [];
    } catch {
        branches.value = [];
    }
}

function openCreateModal() {
    modalMode.value = "create";
    currentUser.value = {};
    modalError.value = "";
    modalOpen.value = true;
}

function openEditModal(user) {
    modalMode.value = "edit";
    currentUser.value = {
        ...user
    };
    modalError.value = "";
    modalOpen.value = true;
}

function closeModal() {
    modalOpen.value = false;
    modalError.value = "";
    currentUser.value = {};
}

async function handleSaveUser(payload) {
    saving.value = true;
    modalError.value = "";

    try {
        const response =
            modalMode.value === "edit" && currentUser.value.id
                ? await updateInternalUser(currentUser.value.id, payload)
                : await createInternalUser(payload);

        feedback.value = response.msg;
        closeModal();
        await fetchUsers();
    } catch (requestError) {
        modalError.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible guardar el usuario.";
    } finally {
        saving.value = false;
    }
}

async function handleToggleStatus(user) {
    changingStatusId.value = user.id;
    error.value = "";

    try {
        const nextStatus = user.estado === "activo" ? "inactivo" : "activo";
        const response = await updateInternalUserStatus(user.id, nextStatus);
        feedback.value = response.msg;
        await fetchUsers();
    } catch (requestError) {
        error.value =
            requestError.response?.msg ||
            requestError.message ||
            "No fue posible actualizar el estado del usuario.";
    } finally {
        changingStatusId.value = null;
    }
}

function logout() {
    authStore.logout();
    router.push("/login");
}

async function bootstrapUsers() {
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

    await Promise.all([fetchUsers(), fetchBranches()]);
}

onMounted(() => {
    bootstrapUsers();
});
</script>

<template>
  <div class="users-page page-view">
    <div class="users-shell page-shell">
      <AppNavbar
        :links="navLinks"
        brand-href="/dashboard"
        action-label="Cerrar Sesion"
        :show-profile-icon="true"
        @action="logout"
      />

      <main class="users-main section-shell">
        <section v-reveal class="users-hero">
          <div>
            <span class="users-eyebrow">Equipo interno</span>
            <h1>Usuarios de la cuenta</h1>
            <p>
              Crea doctores, recepcionistas y admins sin volver a tocar la base de datos.
            </p>
          </div>

          <div class="users-hero__actions">
            <BaseButton @click="openCreateModal">
              Crear usuario
            </BaseButton>
            <BaseButton variant="ghost" @click="fetchUsers">
              Actualizar
            </BaseButton>
          </div>
        </section>

        <section class="users-stats stats-strip">
          <article
            v-for="card in summaryCards"
            :key="card.label"
            v-reveal="{ delay: 60 }"
            class="users-stat-card"
          >
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </article>
        </section>

        <section class="users-layout">
          <article v-reveal class="users-panel">
            <div class="users-panel__header">
              <div>
                <span class="users-panel__eyebrow">Acceso</span>
                <h2>Gestion interna</h2>
                <p>Administra rol, sucursal principal y estado del equipo.</p>
              </div>
            </div>

            <p v-if="feedback" class="users-feedback">{{ feedback }}</p>
            <p v-if="error" class="users-error">{{ error }}</p>
            <p v-if="loading" class="users-state">Cargando usuarios...</p>

            <div v-else class="users-table">
              <div v-if="!users.length" class="users-state">
                No hay usuarios internos registrados todavia.
              </div>

              <table v-else class="users-table__table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Sucursal</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in users" :key="user.id">
                    <td>{{ user.nombre }}</td>
                    <td>{{ user.correo }}</td>
                    <td class="users-table__capitalize">{{ user.role }}</td>
                    <td>{{ user.sucursalNombre || "Sin sucursal" }}</td>
                    <td>
                      <span
                        class="users-table__badge"
                        :class="`users-table__badge--${user.estado}`"
                      >
                        {{ user.estado }}
                      </span>
                    </td>
                    <td class="users-table__actions-cell">
                      <div class="users-table__actions">
                        <BaseButton
                          size="sm"
                          variant="warning"
                          :disabled="user.role === 'owner'"
                          @click="openEditModal(user)"
                        >
                          Editar
                        </BaseButton>
                        <BaseButton
                          size="sm"
                          variant="ghost"
                          :disabled="changingStatusId === user.id || user.role === 'owner'"
                          @click="handleToggleStatus(user)"
                        >
                          {{ user.estado === "activo" ? "Inactivar" : "Activar" }}
                        </BaseButton>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <aside class="users-side">
            <article v-reveal="100" class="users-side__card">
              <span class="users-panel__eyebrow">Roles</span>
              <ul class="users-side__list">
                <li><strong>Admin:</strong> controla configuraciones, usuarios y finanzas.</li>
                <li><strong>Recepcionista:</strong> maneja agenda, historico y cobros.</li>
                <li><strong>Doctor:</strong> trabaja la agenda y su historico propio.</li>
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
      description="Crea o actualiza un usuario interno de la cuenta."
      @close="closeModal"
    >
      <InternalUserForm
        :initial-value="currentUser"
        :branch-options="activeBranchOptions"
        :mode="modalMode"
        :submitting="saving"
        :error-message="modalError"
        @submit="handleSaveUser"
        @cancel="closeModal"
      />
    </BaseModal>
  </div>
</template>

<style scoped>
.users-main {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.users-hero,
.users-panel,
.users-side__card {
  border-radius: 26px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: var(--hero-surface);
  box-shadow: 0 28px 60px rgba(16, 38, 44, 0.08);
}

.users-stat-card {
  border-radius: 26px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  box-shadow: 0 28px 60px rgba(16, 38, 44, 0.08);
}

.users-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.45rem;
  background: var(--hero-surface-strong);
}

.users-eyebrow,
.users-panel__eyebrow {
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

.users-hero h1,
.users-panel__header h2,
.users-side__card h3 {
  margin: 0.7rem 0 0;
}

.users-hero p,
.users-panel__header p {
  margin: 0.55rem 0 0;
  color: var(--text-soft);
}

.users-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.users-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.users-stat-card {
  padding: 1.1rem 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.users-stat-card span {
  color: var(--text-soft);
}

.users-stat-card strong {
  font-size: 2rem;
  color: var(--primary-dark);
}

.users-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.85fr);
  gap: 1rem;
  align-items: start;
}

.users-panel,
.users-side__card {
  padding: 1.2rem;
}

.users-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.users-feedback,
.users-error,
.users-state {
  margin: 0;
  padding: 0.95rem 1rem;
  border-radius: 18px;
}

.users-feedback {
  background: #eaf7f3;
  color: var(--primary-dark);
}

.users-error {
  background: rgba(235, 85, 69, 0.12);
  color: #b8392d;
}

.users-state {
  background: rgba(17, 184, 159, 0.08);
  color: var(--text-soft);
}

.users-table {
  overflow-x: auto;
  background: #fff;
  border-radius: 8px;
}

.users-table__table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
}

.users-table th,
.users-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #e2edf1;
}

.users-table th {
  background: #f8fbfc;
}

.users-table__actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}

.users-table__actions-cell {
  text-align: center;
}

.users-table__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.36rem 0.7rem;
  border-radius: 999px;
  text-transform: capitalize;
}

.users-table__badge--activo {
  background: rgba(17, 184, 159, 0.14);
  color: var(--primary-dark);
}

.users-table__badge--inactivo {
  background: rgba(235, 85, 69, 0.14);
  color: #b8392d;
}

.users-table__capitalize {
  text-transform: capitalize;
}

.users-side {
  display: grid;
  gap: 1rem;
}

.users-side__list {
  margin: 0.9rem 0 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.7rem;
  color: var(--text-soft);
}

@media (max-width: 980px) {
  .users-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .users-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .users-hero__actions :deep(.base-button) {
    width: 100%;
  }
}
</style>

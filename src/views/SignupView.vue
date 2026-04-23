<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import SignupForm from "../components/auth/SignupForm.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import { useAuthStore } from "../stores/authStore.js";
import heroBackground from "../assets/doctorHero.jpg";

const router = useRouter();
const authStore = useAuthStore();
const signupError = ref("");
const signupLoading = ref(false);

const navLinks = [
    { label: "Sobre Nosotros", href: "/#sobre" },
    { label: "Contactanos", href: "/#contacto" },
    { label: "Servicios", href: "/#servicios" }
];

function goToLogin() {
    router.push("/login");
}

async function submitSignup(payload) {
    signupError.value = "";
    signupLoading.value = true;

    try {
        const result = await authStore.signup(payload);

        if (!result.ok) {
            signupError.value = result.msg;
            return;
        }

        router.push("/dashboard");
    } finally {
        signupLoading.value = false;
    }
}
</script>

<template>
  <div class="signup-page page-view">
    <div class="signup-shell page-shell">
      <AppNavbar :links="navLinks" action-label="Iniciar Sesion" @action="goToLogin" />

      <main class="signup-main" :style="{ '--signup-bg': `url(${heroBackground})` }">
        <section v-reveal class="signup-copy">
          <span class="signup-copy__eyebrow">AGENDO SaaS</span>
          <h1>Activa tu clinica y empieza a ordenar salas, pacientes y reservas.</h1>
          <p>
            Crea tu cuenta, elige un plan y entra con una administracion lista
            para crecer.
          </p>

          <div class="signup-copy__highlights">
            <article>
              <strong>Un solo acceso</strong>
              <span>Tu usuario inicial queda listo como administrador de la cuenta.</span>
            </article>
            <article>
              <strong>Trial inmediato</strong>
              <span>La cuenta nace en trial y con limites claros por plan.</span>
            </article>
            <article>
              <strong>Base lista para SaaS</strong>
              <span>Preparado para suscripciones, aliados comped y mas usuarios.</span>
            </article>
          </div>
        </section>

        <section v-reveal="120" class="signup-card">
          <SignupForm
            :submitting="signupLoading"
            :error-message="signupError"
            @submit="submitSignup"
          />

          <p class="signup-card__footer">
            Ya tienes cuenta?
            <button type="button" class="signup-card__link" @click="goToLogin">
              Inicia sesion aqui
            </button>
          </p>
        </section>
      </main>

      <AppFooter />
    </div>
  </div>
</template>

<style scoped>
.signup-page {
}

.signup-shell {
}

.signup-main {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 560px);
  gap: 1.5rem;
  padding: 2rem max(1.25rem, 3vw);
  min-height: calc(100vh - 160px);
  background-image:
    linear-gradient(rgba(217, 238, 248, 0.86), rgba(217, 238, 248, 0.92)),
    var(--signup-bg);
  background-size: cover;
  background-position: center;
}

.signup-copy,
.signup-card {
  background: rgba(255, 255, 255, 0.86);
  border-radius: 8px;
  padding: 1.5rem;
}

.signup-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
}

.signup-copy__eyebrow {
  display: inline-flex;
  align-self: flex-start;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  background: rgba(95, 135, 151, 0.12);
  color: var(--primary-dark);
  font-weight: 600;
}

.signup-copy h1 {
  margin: 0;
  font-size: 2.5rem;
  line-height: 1.08;
}

.signup-copy p {
  margin: 0;
  color: var(--text-soft);
  max-width: 56ch;
}

.signup-copy__highlights {
  display: grid;
  gap: 0.9rem;
}

.signup-copy__highlights article {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 1rem;
  border-radius: 8px;
  background: rgba(95, 135, 151, 0.08);
}

.signup-copy__highlights strong {
  color: var(--primary-dark);
}

.signup-copy__highlights span {
  color: var(--text-soft);
}

.signup-card {
  width: 100%;
  align-self: center;
  box-shadow: var(--shadow);
}

.signup-card__footer {
  margin: 1rem 0 0;
  text-align: center;
  color: var(--text-soft);
}

.signup-card__link {
  border: none;
  background: transparent;
  color: var(--primary-dark);
  cursor: pointer;
  text-decoration: underline;
}

@media (max-width: 980px) {
  .signup-main {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .signup-main {
    padding: 1.25rem;
  }

  .signup-copy h1 {
    font-size: 2rem;
  }
}
</style>

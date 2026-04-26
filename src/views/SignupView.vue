<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import SignupForm from "../components/auth/SignupForm.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import { useAuthStore } from "../stores/authStore.js";
import heroBackground from "../assets/doctorHero.jpg";
import { resolveSignupIntentQuery } from "../shared/pricingCatalog.js";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const signupError = ref("");
const signupLoading = ref(false);
const signupIntent = computed(() => resolveSignupIntentQuery(route.query));

const navLinks = [
    { label: "Sobre Nosotros", href: "/#sobre" },
    { label: "Precios", href: "/#precios" },
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
            :initial-plan-code="signupIntent.planCode"
            :addon-interest-message="signupIntent.addonInterestMessage"
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
  background:
    linear-gradient(135deg, rgba(17, 47, 71, 0.74), rgba(17, 184, 159, 0.24)),
    radial-gradient(circle at 18% 20%, rgba(255, 143, 90, 0.16), transparent 24%),
    radial-gradient(circle at 82% 28%, rgba(17, 184, 159, 0.16), transparent 24%),
    var(--signup-bg);
  background-size: auto, auto, auto, cover;
  background-position: center;
}

.signup-copy,
.signup-card {
  border-radius: 22px;
  padding: 1.5rem;
}

.signup-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  background: rgba(17, 47, 71, 0.84);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 28px 62px rgba(13, 31, 45, 0.22);
  color: #fff;
}

.signup-copy__eyebrow {
  display: inline-flex;
  align-self: flex-start;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-weight: 600;
}

.signup-copy h1 {
  margin: 0;
  font-size: 2.5rem;
  line-height: 1.08;
}

.signup-copy p {
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
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
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.signup-copy__highlights strong {
  color: #fff;
}

.signup-copy__highlights span {
  color: rgba(255, 255, 255, 0.78);
}

.signup-card {
  width: 100%;
  align-self: center;
  background: var(--hero-surface);
  border: 1px solid var(--hero-border);
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

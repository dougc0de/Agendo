<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "../components/base/BaseButton.vue";
import BaseInput from "../components/base/BaseInput.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import { useAuthStore } from "../stores/authStore.js";
import loginShowcaseImage from "../assets/hero-illustration.svg";
import doctorHero from "../assets/doctorHero.jpg";

const router = useRouter();
const authStore = useAuthStore();
const loginError = ref("");
const submitting = ref(false);

const loginForm = reactive({
    email: "",
    password: ""
});

const navLinks = [
    { label: "Servicios", href: "/#servicios" },
    { label: "Sobre Nosotros", href: "/#sobre" },
    { label: "Contacto", href: "/#contacto" }
];

function goHome() {
    router.push("/");
}

function goToSignup() {
    router.push("/signup");
}

async function submitLogin() {
    loginError.value = "";
    submitting.value = true;

    try {
        const resultado = await authStore.login(loginForm);

        if (!resultado.ok) {
            if (resultado.msg === "Debe completar correo y contrasena.") {
                loginError.value = resultado.msg;
                return;
            }

            loginError.value = "Usuario o contrasena incorrecta, por favor intente otra vez.";
            return;
        }

        router.push("/dashboard");
    } finally {
        submitting.value = false;
    }
}
</script>

<template>
  <div class="login-page page-view">
    <div class="login-shell page-shell">
      <AppNavbar
        :links="navLinks"
        brand-href="/"
        action-label="Crear Cuenta"
        @action="goToSignup"
      />

      <main class="login-main">
        <div class="login-layout">
          <section v-reveal class="login-showcase" :style="{ '--login-bg': `url(${doctorHero})` }">
            <button type="button" class="login-showcase__brand" @click="goHome">
              <span class="login-showcase__brand-mark">A</span>
              <span class="login-showcase__brand-copy">
                <strong>AGENDO</strong>
              </span>
            </button>

            <div class="login-showcase__content">
              <h1>Administra tu operacion diaria con una entrada clara y profesional.</h1>

              <figure class="login-showcase__figure">
                <img :src="loginShowcaseImage" alt="Ilustracion del acceso de AGENDO" />
              </figure>
            </div>
          </section>

          <section v-reveal="120" class="login-panel">
            <div class="login-panel__card">
              <h2>Inicia sesion en tu cuenta</h2>

              <form class="login-form" @submit.prevent="submitLogin">
                <BaseInput
                  :model-value="loginForm.email"
                  label="Correo"
                  type="email"
                  placeholder="correo@clinica.com"
                  @update:model-value="loginForm.email = $event"
                />

                <BaseInput
                  :model-value="loginForm.password"
                  label="Contrasena"
                  type="password"
                  placeholder="Ingresa tu contrasena"
                  @update:model-value="loginForm.password = $event"
                />

                <p v-if="loginError" class="login-form__error">{{ loginError }}</p>

                <BaseButton type="submit" block :disabled="submitting">
                  {{ submitting ? "Ingresando..." : "Iniciar Sesion" }}
                </BaseButton>
              </form>

              <div class="login-panel__support">
                <p>Si necesitas recuperar tu acceso, consulta al administrador de la cuenta.</p>
                <RouterLink to="/#contacto" class="login-panel__support-link">
                  Ir a contacto
                </RouterLink>
              </div>

              <div class="login-panel__divider">
                <span></span>
                <small>o</small>
                <span></span>
              </div>

              <button
                type="button"
                class="login-panel__secondary-button"
                @click="goToSignup"
              >
                Crear una cuenta nueva
              </button>

              <button type="button" class="login-panel__back-link" @click="goHome">
                Volver al inicio
              </button>
            </div>
          </section>
        </div>

      </main>

      <AppFooter />
    </div>
  </div>
</template>

<style scoped>
.login-page {
  background: var(--page-bg);
}

.login-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.login-main {
  flex: 1;
  min-height: 0;
  display: flex;
}

.login-layout {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(420px, 0.88fr);
  gap: 1.4rem;
  padding: 1rem;
}

.login-showcase,
.login-panel {
  min-height: 0;
}

.login-showcase {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: clamp(1.1rem, 2vw, 1.8rem);
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(17, 47, 71, 0.8), rgba(17, 184, 159, 0.28)),
    radial-gradient(circle at 18% 18%, rgba(255, 143, 90, 0.18), transparent 30%),
    radial-gradient(circle at 82% 24%, rgba(17, 184, 159, 0.14), transparent 30%),
    var(--login-bg);
  background-size: auto, auto, auto, cover;
  background-position: center;
  background-repeat: no-repeat;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 30px 70px rgba(13, 31, 45, 0.22);
}

.login-showcase__brand {
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 0.9rem;
  border: none;
  background: transparent;
  padding: 0;
  color: #fff;
  cursor: pointer;
}

.login-showcase__brand-mark {
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  background: linear-gradient(135deg, var(--secondary) 0%, var(--accent) 100%);
  box-shadow: 0 12px 28px rgba(255, 143, 90, 0.24);
}

.login-showcase__brand-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.08rem;
}

.login-showcase__brand-copy strong {
  font-size: clamp(2rem, 3vw, 3rem);
  letter-spacing: -0.05em;
  color: #fff;
}

.login-showcase__brand-copy small {
  color: rgba(255, 255, 255, 0.76);
  font-size: 0.86rem;
}

.login-showcase__content {
  flex: 1;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: clamp(1rem, 2vw, 1.6rem);
  min-height: 0;
  text-align: center;
}

.login-showcase__content h1 {
  margin: 0;
  max-width: 16ch;
  font-size: clamp(2rem, 3.4vw, 3.2rem);
  line-height: 1.03;
  letter-spacing: -0.04em;
  color: #fff;
}

.login-showcase__figure {
  margin: 0;
  width: min(100%, 720px);
}

.login-showcase__figure img {
  width: 100%;
  max-height: 48vh;
  object-fit: contain;
  filter: drop-shadow(0 24px 42px rgba(7, 18, 28, 0.24));
}

.login-showcase__caption {
  margin: 0;
  max-width: 22ch;
  font-size: clamp(1.1rem, 1.7vw, 1.55rem);
  line-height: 1.35;
  color: #34516a;
}

.login-panel {
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-panel__card {
  width: 100%;
  max-width: 700px;
  padding: clamp(1.4rem, 3vw, 2.8rem);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--hero-border);
  box-shadow: 0 28px 70px rgba(19, 45, 72, 0.16);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-panel__card h2 {
  margin: 0 0 1.8rem;
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 1.02;
  letter-spacing: -0.04em;
  color: var(--primary-dark);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.login-form__error {
  margin: 0;
  padding: 0.8rem 0.9rem;
  border-radius: 16px;
  background: rgba(235, 85, 69, 0.12);
  color: #b8392d;
  border: 1px solid rgba(235, 85, 69, 0.18);
}

.login-panel__support {
  margin-top: 1.15rem;
}

.login-panel__support p {
  margin: 0;
  color: var(--text-soft);
}

.login-panel__support-link {
  display: inline-flex;
  margin-top: 0.45rem;
  color: var(--accent-dark);
  font-weight: 700;
}

.login-panel__divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.6rem 0 1.2rem;
  color: var(--text-muted);
}

.login-panel__divider span {
  flex: 1;
  height: 1px;
  background: rgba(111, 145, 153, 0.22);
}

.login-panel__secondary-button {
  width: 100%;
  min-height: 3.8rem;
  border-radius: 16px;
  border: 2px solid rgba(17, 184, 159, 0.28);
  background: #f2f7f8;
  color: var(--primary-dark);
  font: inherit;
  font-size: 1.02rem;
  font-weight: 700;
  cursor: pointer;
}

.login-panel__back-link {
  margin-top: 1rem;
  align-self: center;
  border: none;
  background: transparent;
  color: var(--primary-dark);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.login-panel__secondary-button:hover,
.login-panel__back-link:hover {
  color: var(--accent-dark);
}

.login-panel :deep(.base-input) {
  gap: 0.65rem;
}

.login-panel :deep(.base-input__label) {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--primary-dark);
}

.login-panel :deep(.base-input__control) {
  min-height: 3.7rem;
  border-radius: 16px;
  border: 2px solid transparent;
  background: #eef5f7;
  box-shadow: none;
  padding: 1rem 1.1rem;
  font-size: 1rem;
}

.login-panel :deep(.base-input__control::placeholder) {
  color: #6d7f90;
}

.login-panel :deep(.base-input__control:focus) {
  border-color: rgba(17, 184, 159, 0.34);
  box-shadow: 0 0 0 2px rgba(17, 184, 159, 0.12);
  transform: none;
}

.login-panel :deep(.base-button) {
  min-height: 3.75rem;
  border-radius: 16px;
  box-shadow: none;
  font-size: 1.02rem;
}

.login-panel :deep(.base-button--primary) {
  background:
    linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 34%, var(--secondary) 100%);
}

.login-panel :deep(.base-button--primary:hover:not(:disabled)) {
  background:
    linear-gradient(135deg, var(--primary-dark) 0%, var(--secondary-dark) 38%, var(--secondary) 100%);
}

@media (max-width: 1120px) {
  .login-layout {
    grid-template-columns: minmax(0, 0.96fr) minmax(380px, 0.94fr);
  }

  .login-showcase__figure img {
    max-height: 42vh;
  }
}

@media (max-width: 900px) {
  .login-layout {
    min-height: auto;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .login-showcase {
    padding-bottom: 0.25rem;
  }

  .login-showcase__figure img {
    max-height: 280px;
  }

  .login-panel__card {
    min-height: auto;
  }
}

@media (max-width: 760px) {
  .login-layout {
    padding: 0;
    gap: 0;
  }

  .login-showcase {
    display: none;
  }

  .login-panel {
    padding: 0.85rem;
  }
}

@media (max-width: 560px) {
  .login-showcase__brand-copy strong {
    font-size: 1.85rem;
  }

  .login-showcase__content h1 {
    font-size: clamp(1.7rem, 8vw, 2.4rem);
  }

  .login-showcase__caption {
    font-size: 1rem;
  }

  .login-panel__card {
    padding: 1.2rem;
    border-radius: 20px;
  }

  .login-panel__card h2 {
    font-size: clamp(1.8rem, 8vw, 2.4rem);
  }
}
</style>

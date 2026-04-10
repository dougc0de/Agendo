<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "../components/base/BaseButton.vue";
import BaseInput from "../components/base/BaseInput.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import Divisor from "./Divisor.vue";
import { useAuthStore } from "../stores/authStore.js";
import avatarImage from "../../t/avatar.jpg";
import heroBackground from "../../t/doctorHero.jpg";
import crear from "../../t/crear.png";
import reservar from "../../t/reservar.png";
import eliminar from "../../t/eliminar.png";
import revisar from "../../t/revisar.png";
import founderDouglas from "../../t/founderDouglas.jpg";


const router = useRouter();
const authStore = useAuthStore();
const loginError = ref("");
const contactSent = ref(false);

const loginForm = reactive({
    email: "",
    password: ""
});

const contactForm = reactive({
    name: "",
    email: "",
    message: ""
});

const navLinks = [
    { label: "Sobre Nosotros", href: "#sobre" },
    { label: "Contactanos", href: "#contacto" },
    { label: "Servicios", href: "#servicios" }
];

function scrollToLogin() {
    document.getElementById("login-card")?.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

async function submitLogin() {
    loginError.value = "";
    const resultado = await authStore.login(loginForm);

    if (!resultado.ok) {
        if (resultado.msg === "Debe completar correo y contrasena.") {
            loginError.value = resultado.msg;
            return;
        }

        loginError.value = "Usuario o contrasena incorrecta, por favor intente otra vez";
        return;
    }

    router.push("/dashboard");
}

function submitContact() {
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
        return;
    }

    contactSent.value = true;
    contactForm.name = "";
    contactForm.email = "";
    contactForm.message = "";

    window.setTimeout(() => {
        contactSent.value = false;
    }, 2500);
}
</script>

<template>
  <div class="landing-page">
    <div class="landing-shell">
      <AppNavbar :links="navLinks" action-label="Iniciar Sesion" @action="scrollToLogin" />

      <main>
        <section class="hero-section" :style="{ '--hero-bg': `url(${heroBackground})` }">
          <div class="hero-copy">
            <span class="section-label">Gestion de salas</span>
            <h1 class="hero-title">Ordena reservas y disponibilidad en un solo lugar</h1>
            <div class="hero-highlight-row">
              <div class="hero-highlight">
                Sistema de gestion de salas para una operacion mas clara, rapida y visible.
              </div>

              <div class="hero-highlight-avatar">
                <img :src="avatarImage" alt="Avatar de AGENDO" />
              </div>
            </div>

            <div class="hero-pills">
              <span>Reserva salas</span>
              <span>Consulta disponibilidad</span>
              <span>Manten el control diario</span>
            </div>
          </div>

          <div id="login-card" class="login-card">
            <div class="login-card__accent"></div>
            <h2>Iniciar sesion</h2>
            <p class="login-card__text">
              Entra al panel para gestionar reservas y disponibilidad.
            </p>

            <form class="login-form" @submit.prevent="submitLogin">
              <BaseInput
                :model-value="loginForm.email"
                label="Usuario"
                placeholder="correo@clinica.com"
                @update:model-value="loginForm.email = $event"
              />

              <BaseInput
                :model-value="loginForm.password"
                label="Contrasena"
                type="password"
                placeholder="Ingrese su contrasena"
                @update:model-value="loginForm.password = $event"
              />

              <p v-if="loginError" class="form-error">{{ loginError }}</p>

              <BaseButton type="submit" block>
                Ingresar
              </BaseButton>
            </form>
          </div>
        </section>
        
        <section id="servicios" class="section-block">
          <div class="section-heading">
          <span class="section-label">Servicios</span>

            <h2>Funciones clave de AGENDO</h2>
            <p>Lo esencial para gestionar salas con rapidez, orden y visibilidad.</p>
          </div>

          <div class="services-grid">
            <article class="service-card">
              <div class="service-card__visual service-card__visual--one">
                <img :src="crear" alt="Crear salas" />
              </div>
              <h3>Crear salas</h3>
              <p>Registra espacios disponibles con la informacion necesaria.</p>
            </article>
            <article class="service-card">
              <div class="service-card__visual service-card__visual--two">
                <img :src="reservar" alt="Reservar salas">
              </div>
              <h3>Reservar salas</h3>
              <p>Asigna horarios de forma rapida y clara.</p>
            </article>
            <article class="service-card">
              <div class="service-card__visual service-card__visual--three">
                <img :src="revisar" alt="Ver disponibilidad">
              </div>
              <h3>Ver disponibilidad</h3>
              <p>Consulta que salas estan libres o reservadas.</p>
            </article>
            <article class="service-card">
              <div class="service-card__visual service-card__visual--four">
                <img :src="eliminar" alt="Eliminar registros">
              </div>
              <h3>Eliminar registros</h3>
              <p>Manten la informacion actualizada durante la operacion diaria.</p>
            </article>
          </div>
        </section>

        <Divisor />

        <section id="sobre" class="section-block section-block--about">
          <div class="section-heading section-heading--left">
            <span class="section-label">Sobre Nosotros</span>
            <h2>Sobre AGENDO</h2>
            <p class="textinfo">
              AGENDO nace como una solucion para facilitar la organizacion de salas dentro
              de entornos clinicos y mejorar la claridad operativa del dia a dia.
            </p>
          </div>

          <div class="about-grid">
            <article class="info-panel">
              <h3>Nuestra mision</h3>
            <p class="textinfo">
              AGENDO tiene como misión facilitar la gestión de salas dentro de entornos clínicos mediante una experiencia clara, ordenada y funcional. Busca optimizar la reserva de espacios, la consulta de disponibilidad y el control de uso diario, ayudando a reducir cruces de horario, mejorar la organización interna y apoyar una operación más eficiente.
              </p>
            </article>

            <article class="calendar-panel">
              <div class="calendar-panel__card">
                <div class="calendar-panel__header">
                  <span>Sep</span>
                  <span>2026</span>
                </div>
                <div class="calendar-panel__grid">
                  <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
                  <span>8</span><span class="active">9</span><span>10</span><span>11</span><span>12</span><span class="active">13</span><span>14</span>
                  <span>15</span><span>16</span><span>17</span><span>18</span><span>19</span><span>20</span><span>21</span>
                </div>
              </div>
            </article>

            <article class="vision-strip">
              <div class="vision-strip__art"></div>
              <div class="vision-strip__copy">
                <h3>Nuestra vision</h3>
            <p class="textinfo">
                  AGENDO tiene la visión de evolucionar hacia una herramienta adaptable, escalable y confiable para la organización y reserva de espacios, comenzando en el entorno clínico y proyectándose hacia otros contextos donde la planificación, la disponibilidad y la coordinación sean esenciales.
                </p>
              </div>
            </article>

            <article class="founder-card">
              <div class="founder-card__copy">
                <h3>Quien esta detras</h3>
            <p class="textinfo">
                  AGENDO es una iniciativa desarrollada con el objetivo de transformar procesos de organización en experiencias más claras, eficientes y fáciles de usar. El proyecto combina visión funcional, enfoque en el usuario y una base pensada para crecer de forma sólida, de tal forma que con el tiempo no sea solo uno sino varios usuarios puedan hacer sus reservas en una respectiva institucion en este caso medica y asi poder reservar su espacio y su tiempo evitando colisiones con otros miembros de dicha institucion, pero a su vez no solo esta pensado a futuro para servir como una herramienta de organizacion en la parte de la salud sino tambien en otras areas ya que el alma del proyecto es ser una herramienta de gestion de los espacios fisicos y el tiempo que usaran.
                </p>
              </div>
              <div class="founder-card__profile">
                <div class="founder-avatar">
                  <img :src="founderDouglas" alt="Douglas Espinoza">
                </div>
                <strong>Founder</strong>
                <span>Douglas Andres Espinoza</span>
              </div>
            </article>
          </div>
        </section>

        <Divisor />

        <section id="contacto" class="section-block section-block--contact">
          <div class="section-heading">
            <span class="section-label">Contacto</span>
            <h2>Necesita acceso o mas informacion?</h2>
            <p>Escribanos y le ayudaremos con su consulta.</p>
          </div>

          <div class="contact-grid">
            <div class="contact-copy">
              <h3>AGENDO</h3>
              <p>Gestion mas ordenada, rapida y confiable dentro de la clinica.</p>
              <p>Correo: soporte@agendo.com</p>
              <p>Telefono: 89134973</p>
              <p>Horario: Lunes a viernes, 8:00 a.m. - 5:00 p.m.</p>
            </div>

            <form class="contact-form" @submit.prevent="submitContact">
              <div class="contact-form__row">
                <BaseInput
                  :model-value="contactForm.name"
                  label="Nombre"
                  placeholder="Coloque su nombre"
                  @update:model-value="contactForm.name = $event"
                />
                <BaseInput
                  :model-value="contactForm.email"
                  label="Correo"
                  placeholder="Ej: aaa@gmail.com"
                  @update:model-value="contactForm.email = $event"
                />
              </div>

              <BaseInput
                :model-value="contactForm.message"
                label="Mensaje"
                as="textarea"
                placeholder="Escriba aqui su mensaje"
                @update:model-value="contactForm.message = $event"
              />

              <p v-if="contactSent" class="contact-form__success">
                Consulta enviada correctamente.
              </p>

              <BaseButton type="submit">
                Enviar Consulta
              </BaseButton>
            </form>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  </div>
</template>

<style scoped>
.landing-page {
  min-height: 100vh;
  background: var(--page-bg);
}

.landing-shell {
  width: 100%;
  background: var(--page-bg);
  min-height: 100vh;
}

.hero-section {
  display: grid;
  grid-template-columns: 1.4fr 0.9fr;
  min-height: 560px;
  background-color: rgba(74, 195, 235, 0.18);
  background-image: var(--hero-bg), linear-gradient(rgba(243, 207, 207, 0.36), rgba(95, 135, 151, 0.36)), linear-gradient(120deg, #8fb2c0 0%, #d5e9f2 48%, #cfe1ea 48%, #dceef6 100%);
  background-size: cover, cover, cover;
  background-position: center center, center center, center center;
  background-repeat: no-repeat, no-repeat, no-repeat;
  background-blend-mode: overlay, normal, normal;
  border-bottom: 1px solid rgba(95, 135, 151, 0.2);
}

.hero-copy {
  padding: 4rem 3rem 3rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 30px;
  box-shadow: 0 24px 80px rgba(38, 67, 84, 0.12);
}

.section-label {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: var(--text);
  font-weight: 600;
}

.section-label::before {
  content: "";
  width: 3rem;
  height: 0.35rem;
  background: #7fa7b7;
  border-radius: 999px;
}

.hero-title {
  margin: 0;
  font-size: 3rem;
  line-height: 1.08;
  max-width: 10ch;
  color: #fff;
}

.hero-highlight {
  max-width: 440px;
  padding: 1.2rem 1.4rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  color: var(--text);
  font-size: 1.2rem;
}

.hero-highlight-row {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) 140px;
  gap: 1.25rem;
  align-items: center;
  width: min(100%, 720px);
}

.hero-highlight-avatar {
  width: 140px;
  min-width: 140px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 18px 45px rgba(38, 67, 84, 0.16);
  background: #ffffff;
  display: grid;
  place-items: center;
}

.hero-highlight-avatar img {
  width: 100%;
  display: block;
  height: auto;
}

.hero-pills {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  width: min(100%, 640px);
  margin: 0 auto;
  padding: 0.75rem 0.75rem 0.5rem;
  background: rgba(255, 255, 255, 0.86);
  border-radius: 999px;
  box-shadow: 0 14px 34px rgba(38, 67, 84, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.72);
}

.hero-pills span {
  background: rgba(255, 255, 255, 0.96);
  padding: 0.55rem 1rem;
  border-radius: 999px;
  font-size: 0.92rem;
  color: #2d4856;
}

.login-card {
  margin: 1.5rem;
  align-self: center;
  justify-self: center;
  width: min(360px, calc(100% - 2rem));
  background: var(--primary);
  color: #fff;
  border-radius: 8px;
  padding: 2rem 1.75rem;
  box-shadow: var(--shadow);
  position: relative;
}

.login-card__accent {
  width: 80px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  margin-bottom: 1rem;
}

.login-card h2 {
  margin: 0;
  font-size: 2rem;
}

.login-card__text {
  margin: 0.65rem 0 1.4rem;
  color: rgba(255, 255, 255, 0.86);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-error {
  margin: 0;
  padding: 0.7rem 0.85rem;
  border-radius: 8px;
  background: rgba(235, 85, 69, 0.18);
  border: 1px solid rgba(235, 85, 69, 0.32);
  color: #fff;
  font-size: 0.92rem;
  line-height: 1.35;
}

.section-block {
  padding: 3rem 2rem;
  margin-top: 1rem;
}

.section-heading {
  text-align: center;
  margin-bottom: 2rem;
}

.section-heading--left {
  text-align: left;
}

.section-heading h2 {
  margin: 0.8rem 0 0.6rem;
  font-size: 2.4rem;
  color: var(--text);
}

.section-heading p {
  margin: 0 auto;
  max-width: 720px;
  color: var(--text-soft);
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.4rem;
}

.service-card {
  background: rgba(255, 255, 255, 0.76);
  border-radius: 8px;
  padding: 1rem;
}

.service-card__visual {
  height: 150px;
  border-radius: 8px;
  margin-bottom: 1rem;
  overflow: hidden;
}

.service-card__visual img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.service-card__visual--one {
  background: linear-gradient(135deg, #f4efe8, #c7dce7);
}

.service-card__visual--two {
  background: linear-gradient(135deg, #e7f2f8, #bfd7e5);
}

.service-card__visual--three {
  background: linear-gradient(135deg, #d7edf4, #cfd9df);
}

.service-card__visual--four {
  background: linear-gradient(135deg, #dae9ef, #b8d0d9);
}

.service-card h3 {
  margin: 0 0 0.45rem;
  font-size: 1.2rem;
}

.service-card p {
  margin: 0;
  color: var(--text-soft);
}

.section-block--about {
  background: rgba(95, 135, 151, 0.18);
}

.about-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 1.6rem;
}

.info-panel,
.vision-strip__copy,
.founder-card {
  background: rgba(255, 255, 255, 0.82);
  border-radius: 8px;
}

.info-panel {
  padding: 1.6rem;
}

.info-panel h3,
.vision-strip__copy h3,
.founder-card h3 {
  margin: 0 0 0.75rem;
  font-size: 1.8rem;
}

.calendar-panel {
  display: flex;
  justify-content: center;
  align-items: start;
}

.calendar-panel__card {
  background: #fff;
  border-radius: 8px;
  padding: 1rem;
  min-width: 220px;
  box-shadow: var(--shadow);
}

.calendar-panel__header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  color: var(--text-soft);
}

.calendar-panel__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.45rem;
}

.calendar-panel__grid span {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 30px;
  font-size: 0.88rem;
  border-radius: 6px;
}

.calendar-panel__grid .active {
  background: var(--text);
  color: #fff;
}

.vision-strip {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 1.25rem;
  align-items: center;
}

.vision-strip__art {
  min-height: 160px;
  border-radius: 8px;
  background: linear-gradient(135deg, #e6f1f5, #bed6df);
}

.vision-strip__copy {
  padding: 1.6rem;
}

.founder-card {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 1.5rem;
  padding: 1.7rem;
}

.founder-card__copy p {
  margin: 0;
}

.founder-card__profile {
  background: linear-gradient(180deg, #e9f4f8, #d9eef8);
  border-radius: 8px;
  padding: 1rem;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 0.35rem;
}

.founder-avatar {
  width: 180px;
  height: 180px;
  border-radius: 8px;
  background: linear-gradient(135deg, #5f8797, #87b0c0);
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 2rem;
  font-weight: 700;
    overflow: hidden;

}


.founder-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.section-block--contact {
  padding-bottom: 2rem;
}

.contact-grid {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 2rem;
  align-items: start;
}

.contact-copy h3 {
  margin: 0 0 0.8rem;
  font-size: 1.5rem;
}

.contact-copy p {
  margin: 0 0 0.35rem;
}

.contact-form {
  background: rgba(173, 216, 230, 0.45);
  border: 1px solid rgba(95, 135, 151, 0.35);
  border-radius: 8px;
  padding: 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.contact-form__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.contact-form__success {
  margin: 0;
  color: var(--primary-dark);
  font-weight: 600;
}

@media (max-width: 1024px) {
  .hero-section,
  .services-grid,
  .about-grid,
  .contact-grid,
  .vision-strip,
  .founder-card,
  .contact-form__row {
    grid-template-columns: 1fr;
  }

  .hero-title {
    max-width: none;
    font-size: 2.5rem;
  }
}

@media (max-width: 760px) {
  .landing-shell {
    min-height: 100vh;
  }

  .hero-copy,
  .section-block {
    padding-inline: 1.25rem;
  }

  .hero-copy {
    padding-top: 2rem;
  }
}

.textinfo {
  text-align: justify;
  text-justify: inter-word

}
</style>

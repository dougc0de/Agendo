<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "../components/base/BaseButton.vue";
import BaseInput from "../components/base/BaseInput.vue";
import AppFooter from "../components/layout/AppFooter.vue";
import AppNavbar from "../components/layout/AppNavbar.vue";
import heroIllustration from "../assets/hero-illustration.svg";
import avatarImage from "../assets/avatar.jpg";
import crear from "../assets/crear.png";
import reservar from "../assets/reservar.png";
import eliminar from "../assets/eliminar.png";
import revisar from "../assets/revisar.png";
import founderDouglas from "../assets/founderDouglas.jpg";
import doctorHero from "../assets/doctorHero.jpg";
import calend from "../assets/calend.png";
import Divisor from "./Divisor.vue";
import PricingSection from "../components/home/PricingSection.vue";

const router = useRouter();
const contactSent = ref(false);

const contactForm = reactive({
    name: "",
    email: "",
    message: ""
});

const navLinks = [
    { label: "Servicios", href: "#servicios" },
    { label: "Precios", href: "#precios" },
    { label: "Sobre Nosotros", href: "#sobre" },
    { label: "Contacto", href: "#contacto" }
];


const serviceItems = [
    {
        title: "Crear salas",
        description: "Registra espacios disponibles y dejalos listos para reservar sin friccion.",
        image: crear,
        visualClass: "service-card__visual--one"
    },
    {
        title: "Reservar salas",
        description: "Asigna horarios y recursos desde una sola vista, sin repartir informacion.",
        image: reservar,
        visualClass: "service-card__visual--two"
    },
    {
        title: "Ver disponibilidad",
        description: "Detecta huecos libres y cruces de agenda antes de afectar la operacion.",
        image: revisar,
        visualClass: "service-card__visual--three"
    },
    {
        title: "Actualizar registros",
        description: "Mantiene la agenda al dia con cambios visibles y ordenados para todo el equipo.",
        image: eliminar,
        visualClass: "service-card__visual--four"
    }
];

function goToLogin() {
    router.push("/login");
}

function goToSignup() {
    router.push("/signup");
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
  <div class="landing-page page-view">
    <div class="landing-shell page-shell">
      <AppNavbar
        :links="navLinks"
        action-label="Iniciar Sesion"
        @action="goToLogin"
      />

      <main>
        <section
          v-reveal
          class="hero-section"
          :style="{ '--hero-bg': `url(${doctorHero})` }"
        >
          <div class="hero-grid section-shell">
            <div v-reveal class="hero-copy">
              <span class="hero-eyebrow">Sistema de Gestion de Clinicas</span>
              <h1>Administra salas y disponibilidad con una experiencia mas clara y profesional.</h1>


              <div class="hero-actions">
                <BaseButton @click="goToLogin">
                  Iniciar Sesion
                </BaseButton>
                <BaseButton variant="ghost" @click="goToSignup">
                  Crear Cuenta
                </BaseButton>
              </div>



            </div>

            <div v-reveal="120" class="hero-visual">
              <div class="hero-visual__shape hero-visual__shape--one"></div>
              <div class="hero-visual__shape hero-visual__shape--two"></div>

              <div class="hero-visual__badge hero-visual__badge--top">
                <strong>Agenda clara</strong>
                <span>Salas, estados y atenciones visibles en una misma lectura.</span>
              </div>

              <figure class="hero-visual__frame">
                <img :src="heroIllustration" alt="Vista conceptual del flujo de AGENDO" />
              </figure>

              <div class="hero-visual__badge hero-visual__badge--bottom">
                <div class="hero-visual__avatar">
                  <img :src="avatarImage" alt="Equipo usando AGENDO" />
                </div>
                <div>
                  <strong>Operacion mas ordenada</strong>
                  <span>Ideal para recepcion, coordinacion y control diario de disponibilidad.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

<Divisor />
        
        <section id="servicios" v-reveal class="section-block section-shell">
          <div class="section-heading">
            <span class="section-label">Servicios</span>
            <h2>Funciones clave para una operacion que se siente bajo control</h2>
            <p>
              Lo esencial para gestionar salas con rapidez, orden y visibilidad sin
              recargar la interfaz.
            </p>
          </div>

          <div class="services-grid">
            <article
              v-for="service in serviceItems"
              :key="service.title"
              v-reveal="{ delay: 70 }"
              class="service-card"
            >
              <div class="service-card__visual" :class="service.visualClass">
                <img :src="service.image" :alt="service.title" />
              </div>
              <h3>{{ service.title }}</h3>
              <p>{{ service.description }}</p>
            </article>
          </div>
        </section>

        <Divisor />

        <PricingSection />

        <Divisor />

        <section id="sobre" v-reveal class="section-block section-shell section-block--about">
          <div class="section-heading section-heading--left">
            <span class="section-label">Sobre Nosotros</span>
            <div class="about-intro">
              <h2>Sobre AGENDO</h2>
              <p class="textinfo">
                AGENDO nace para ordenar salas, disponibilidad y operacion diaria en entornos clinicos.
              </p>
            </div>
          </div>

          <div class="about-grid">
            <article v-reveal class="info-panel">
              <h3>Nuestra mision</h3>
              <p class="textinfo">
                Facilitar la gestion de salas con una experiencia clara, ordenada y funcional
                que reduzca cruces de horario y mejore la organizacion interna.
              </p>
            </article>

            <article v-reveal="100" class="calendar-panel">
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

            <article v-reveal="140" class="vision-strip">
              <div class="vision-strip__art">
                <img :src="calend" alt="Calendario operativo de AGENDO" />
              </div>
              <div class="vision-strip__copy">
                <h3>Nuestra vision</h3>
                <p class="textinfo">
                  Convertirse en una herramienta adaptable, escalable y confiable para la
                  organizacion de espacios donde la planificacion y la coordinacion son clave.
                </p>
              </div>
            </article>

            <article v-reveal="180" class="founder-card">
              <div class="founder-card__copy">
                <h3>Quien esta detras</h3>
                <p class="textinfo">
                  AGENDO busca reducir errores de coordinacion, evitar conflictos de horario
                  y asegurar un uso mas inteligente del tiempo y de los recursos disponibles.
                </p>
              </div>
              <div class="founder-card__profile">
                <div class="founder-avatar">
                  <img :src="founderDouglas" alt="Douglas Espinoza" />
                </div>
                <strong>Founder</strong>
                <span>Douglas Andres Espinoza</span>
              </div>
            </article>
          </div>
        </section>

        <Divisor />

        <section id="contacto" v-reveal class="section-block section-shell section-block--contact">
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
.hero-section {
  position: relative;
  overflow: clip;
  background:
    linear-gradient(135deg, rgba(17, 47, 71, 0.78), rgba(17, 184, 159, 0.34)),
    radial-gradient(circle at 18% 20%, rgba(255, 143, 90, 0.16), transparent 24%),
    radial-gradient(circle at 82% 28%, rgba(17, 184, 159, 0.16), transparent 24%),
    var(--hero-bg);
  background-size: auto, auto, auto, cover;
  background-position: center;
  background-repeat: no-repeat;
  border-bottom: 1px solid rgba(111, 145, 153, 0.12);
}

.hero-grid {
  width: min(100%, var(--shell-max-width));
  min-height: calc(100vh - 86px);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(360px, 0.98fr);
  gap: clamp(2rem, 5vw, 4.5rem);
  align-items: center;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.15rem;
  max-width: 620px;
}

.hero-eyebrow,
.section-label {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: var(--primary-dark);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 0.82rem;
  margin-bottom: 20px;
  background-color: #fffffff3;
  padding: 0.5rem;
  border-radius: 10px;
}

.hero-eyebrow::before,
.section-label::before {
  content: "";
  width: 3rem;
  height: 0.35rem;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
}

.hero-copy h1 {
  margin: 0;
  font-size: clamp(3rem, 6vw, 5.35rem);
  line-height: 0.94;
  letter-spacing: -0.05em;
  max-width: 10.5ch;
  color: #fff;
  margin-bottom: 20px;
}

.hero-lead {
  margin: 0;
  max-width: 58ch;
  font-size: 1.08rem;
  color: var(--text-soft);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
}

.hero-points {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem 1rem;
}

.hero-points span {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-soft);
}

.hero-points span::before {
  content: "";
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  box-shadow: 0 0 0 5px rgba(47, 122, 134, 0.1);
}

.hero-scroll-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.85rem;
  margin-top: 0.4rem;
  color: var(--text-soft);
}

.hero-scroll-indicator span {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  border: 1px solid rgba(111, 145, 153, 0.18);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(243, 249, 250, 0.86));
  position: relative;
}

.hero-scroll-indicator span::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 11px;
  width: 10px;
  height: 10px;
  border-right: 2px solid var(--primary-dark);
  border-bottom: 2px solid var(--primary-dark);
  transform: translateX(-50%) rotate(45deg);
}

.hero-visual {
  position: relative;
  min-height: 560px;
  display: grid;
  align-items: center;
}

.hero-visual__shape {
  position: absolute;
  border-radius: 999px;
  filter: blur(18px);
}

.hero-visual__shape--one {
  width: 170px;
  height: 170px;
  top: 8%;
  right: 5%;
  background: rgba(120, 170, 179, 0.22);
}

.hero-visual__shape--two {
  width: 220px;
  height: 220px;
  left: 0;
  bottom: 4%;
  background: rgba(242, 159, 56, 0.14);
}

.hero-visual__frame {
  position: relative;
  z-index: 2;
  width: min(100%, 560px);
  margin: 0 auto;
  padding: 1rem;
  border-radius: 34px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(111, 145, 153, 0.16);
  box-shadow: 0 32px 70px rgba(18, 43, 49, 0.12);
}

.hero-visual__frame img {
  width: 100%;
  border-radius: 24px;
}

.hero-visual__badge {
  position: absolute;
  z-index: 3;
  max-width: 280px;
  padding: 1rem 1.1rem;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(111, 145, 153, 0.16);
  box-shadow: 0 24px 44px rgba(16, 38, 44, 0.12);
  backdrop-filter: blur(8px);
}

.hero-visual__badge strong {
  display: block;
  color: var(--primary-dark);
}

.hero-visual__badge span {
  display: block;
  margin-top: 0.35rem;
  color: var(--text-soft);
  font-size: 0.95rem;
}

.hero-visual__badge--top {
  top: 6%;
  left: -2%;
}

.hero-visual__badge--bottom {
  right: -2%;
  bottom: 10%;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  max-width: 320px;
}

.hero-visual__avatar {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  overflow: hidden;
  flex: 0 0 auto;
  box-shadow: 0 12px 24px rgba(16, 38, 44, 0.14);
}

.hero-visual__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.section-block {
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
  font-size: clamp(2rem, 4vw, 3rem);
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
  background: rgba(255, 255, 255, 0.92);
  border-radius: var(--border-radius-large);
  padding: 1rem;
  transition: all var(--transition-normal);
  border: 1px solid rgba(111, 145, 153, 0.12);
  box-shadow: var(--shadow);
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}

.service-card__visual {
  height: 150px;
  border-radius: 18px;
  margin-bottom: 1rem;
  overflow: hidden;
}

.service-card__visual img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.service-card__visual--one {
  background: #dcf4ec;
}

.service-card__visual--two {
  background: #e6f0f8;
}

.service-card__visual--three {
  background: #fff0e5;
}

.service-card__visual--four {
  background: #eaf2f6;
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
  background: rgba(245, 250, 251, 0.9);
}

.about-intro {
  padding: 1.5rem 1.6rem;
  border-radius: 26px;
  background: var(--primary-dark);
  box-shadow: var(--shadow);
}

.about-intro h2,
.about-intro p {
  color: #fff;
}

.about-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 1.6rem;
}

.info-panel,
.vision-strip__copy,
.founder-card {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 24px;
  border: 1px solid rgba(111, 145, 153, 0.12);
  box-shadow: var(--shadow);
  transition: all var(--transition-normal);
}

.info-panel:hover,
.vision-strip__copy:hover,
.founder-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
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
  border-radius: 24px;
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
  border-radius: 30px;
  background: #dfecef;
  overflow: hidden;
}

.vision-strip__art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  background: #e6f0f4;
  border-radius: 20px;
  padding: 1rem;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 0.35rem;
}

.founder-avatar {
  width: 180px;
  height: 180px;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 18px 34px rgba(31, 90, 99, 0.16);
}

.founder-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(111, 145, 153, 0.16);
  border-radius: 24px;
  padding: 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: var(--shadow);
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

.textinfo {
  text-align: justify;
  text-justify: inter-word;
}

@media (max-width: 980px) {
  .hero-grid,
  .services-grid,
  .about-grid,
  .contact-grid,
  .vision-strip,
  .founder-card {
    grid-template-columns: 1fr;
  }

  .hero-grid {
    min-height: auto;
    padding-top: 2.6rem;
    padding-bottom: 2.6rem;
  }

  .hero-copy h1 {
    max-width: 12ch;
  }

  .hero-visual {
    min-height: 500px;
  }

  .contact-form__row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .hero-grid {
    gap: 2rem;
  }

  .hero-copy h1 {
    font-size: clamp(2.4rem, 12vw, 3.8rem);
  }

  .hero-actions,
  .hero-points {
    width: 100%;
  }

  .hero-actions :deep(.base-button) {
    width: 100%;
  }

  .hero-scroll-indicator {
    font-size: 0.95rem;
  }

  .hero-visual {
    min-height: 420px;
  }

  .hero-visual__badge {
    position: relative;
    max-width: none;
  }

  .hero-visual__badge--top,
  .hero-visual__badge--bottom {
    inset: auto;
    margin: 0 auto;
  }

  .hero-visual__badge--top {
    margin-bottom: 1rem;
  }

  .hero-visual__badge--bottom {
    margin-top: 1rem;
  }

  .section-heading h2,
  .about-intro h2 {
    font-size: 2rem;
  }

}

@media (max-width: 480px) {
  .hero-visual__frame {
    padding: 0.75rem;
    border-radius: 24px;
  }

  .hero-visual__frame img {
    border-radius: 18px;
  }

  .about-intro,
  .info-panel,
  .vision-strip__copy,
  .founder-card,
  .contact-form {
    padding: 1rem;
  }

  .founder-avatar {
    width: min(160px, 100%);
    height: auto;
    aspect-ratio: 1;
  }
}
</style>

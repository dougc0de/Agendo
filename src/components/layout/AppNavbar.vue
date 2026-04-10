<script setup>
import { ref } from "vue";
import BaseButton from "../base/BaseButton.vue";

const props = defineProps({
    links: {
        type: Array,
        default: () => []
    },
    actionLabel: {
        type: String,
        default: ""
    },
    showProfileIcon: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(["action"]);

const menuOpen = ref(false);

function toggleMenu(){
  menuOpen.value = !menuOpen.value
}

function closeMenu(){
  menuOpen.value = false;
}

function handleAction(){
  closeMenu();
  emit("action");
}


</script>

<template>
  <header class="navbar">
    <div class="navbar__brand">
      <span class="navbar__brand-name">AGENDO</span>
    </div>

    <button
      type="button"
      class="navbar__burger"
      :aria-expanded="menuOpen ? 'true' : 'false'"
      aria-controls="navbar-mobile-menu"
      aria-label="Abrir menu de navegacion"
      @click="toggleMenu"
    >
      <span></span>
      <span></span>
      <span></span>
    </button>
    <nav class="navbar__links">
      <a
        v-for="link in props.links"
        :key="link.label"
        class="navbar__link"
        :href="link.href"
      >
        {{ link.label }}
      </a>
    </nav>

    <div class="navbar__actions">
      <div v-if="props.showProfileIcon" class="navbar__profile-icon" aria-hidden="true">
        <span></span>
      </div>

      <BaseButton
        v-if="props.actionLabel"
        size="sm"
        variant="primary"
        @click="handleAction"
      >
        {{ props.actionLabel }}
      </BaseButton>
    </div>

    <nav
      v-if="menuOpen"
      id="navbar-mobile-menu"
      class="navbar__mobile-menu"
    >
      <a
        v-for="link in props.links"
        :key="`mobile-${link.label}`"
        class="navbar__mobile-link"
        :href="link.href"
        @click="closeMenu"
      >
        {{ link.label }}
      </a>
    </nav>
  </header>
</template>

<style scoped>
.navbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.94);
  border-bottom: 1px solid rgba(95, 135, 151, 0.24);
}

.navbar__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  font-weight: 700;
  color: var(--primary-dark);
}

.navbar__brand-mark {
  display: inline-grid;
  place-items: center;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 8px;
  background: rgba(95, 135, 151, 0.15);
  font-size: 0.9rem;
}

.navbar__brand-name {
  letter-spacing: 0.04em;
}

.navbar__links {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.navbar__link {
  color: var(--text-soft);
  font-size: 0.95rem;
}

.navbar__link:hover {
  color: var(--primary-dark);
}

.navbar__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.9rem;
}

.navbar__profile-icon {
  width: 2rem;
  height: 2rem;
  border: 1px solid #c3d7de;
  border-radius: 999px;
  display: grid;
  place-items: center;
}

.navbar__profile-icon span {
  width: 0.95rem;
  height: 0.95rem;
  border: 2px solid var(--text);
  border-top-left-radius: 999px;
  border-top-right-radius: 999px;
  border-bottom: none;
  position: relative;
}

.navbar__profile-icon span::after {
  content: "";
  position: absolute;
  left: 50%;
  top: -0.55rem;
  width: 0.5rem;
  height: 0.5rem;
  border: 2px solid var(--text);
  border-radius: 999px;
  transform: translateX(-50%);
  background: #fff;
}


.navbar__burger,
.navbar__mobile-menu {
  display: none;
}

.navbar__burger {
  border: 1px solid rgba(95, 135, 151, 0.24);
  border-radius: 8px;
  background: #fff;
  width: 44px;
  height: 44px;
  padding: 0;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
}

.navbar__burger span {
  width: 20px;
  height: 2px;
  border-radius: 999px;
  background: var(--text);
}

.navbar__mobile-link {
  display: block;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(95, 135, 151, 0.18);
  color: var(--text-soft);
  text-align: center;
}

.navbar__mobile-link:hover {
  color: var(--primary-dark);
}

@media (max-width: 980px) {
  .navbar {
    grid-template-columns: 1fr auto;
    align-items: center;
  }

  .navbar__links {
    display: none;
  }

  .navbar__burger {
    display: inline-flex;
    justify-self: end;
  }

  .navbar__actions {
    grid-column: 1 / -1;
    justify-content: center;
    width: 100%;
    margin-top: 0.5rem;
  }

  .navbar__mobile-menu {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    grid-column: 1 / -1;
    width: 100%;
    padding-top: 0.75rem;
  }
}
</style>

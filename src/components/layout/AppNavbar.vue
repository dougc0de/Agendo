<script setup>
import { ref } from "vue";
import { useRoute } from "vue-router";
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
    },
    brandHref: {
        type: String,
        default: "/"
    }
});

const emit = defineEmits(["action"]);
const route = useRoute();

const menuOpen = ref(false);

function toggleMenu() {
    menuOpen.value = !menuOpen.value;
}

function closeMenu() {
    menuOpen.value = false;
}

function handleAction() {
    closeMenu();
    emit("action");
}

function isRouterHref(href) {
    return typeof href === "string" && href.startsWith("/");
}

function resolveRouterTarget(href) {
    if (!isRouterHref(href)) {
        return href;
    }

    const [path, hash] = href.split("#");

    if (hash) {
        return {
            path,
            hash: `#${hash}`
        };
    }

    return path;
}

function isActiveLink(href) {
    if (!isRouterHref(href)) {
        return false;
    }

    const [path] = href.split("#");
    return route.path === path;
}
</script>

<template>
  <header class="navbar">
    <RouterLink
      v-if="isRouterHref(props.brandHref)"
      :to="resolveRouterTarget(props.brandHref)"
      class="navbar__brand"
      @click="closeMenu"
    >
      <span class="navbar__brand-badge">A</span>
      <span class="navbar__brand-copy">
        <strong class="navbar__brand-name">AGENDO</strong>
        <small class="navbar__brand-tagline">Gestion clinica de salas</small>
      </span>
    </RouterLink>
    <a
      v-else
      :href="props.brandHref"
      class="navbar__brand"
      @click="closeMenu"
    >
      <span class="navbar__brand-badge">A</span>
      <span class="navbar__brand-copy">
        <strong class="navbar__brand-name">AGENDO</strong>
        <small class="navbar__brand-tagline">Gestion clinica de salas</small>
      </span>
    </a>

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
      <template v-for="link in props.links" :key="link.label">
        <RouterLink
          v-if="isRouterHref(link.href)"
          :to="resolveRouterTarget(link.href)"
          class="navbar__link"
          :class="{ 'navbar__link--active': isActiveLink(link.href) }"
        >
          {{ link.label }}
        </RouterLink>
        <a
          v-else
          class="navbar__link"
          :href="link.href"
        >
          {{ link.label }}
        </a>
      </template>
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
      <template v-for="link in props.links" :key="`mobile-${link.label}`">
        <RouterLink
          v-if="isRouterHref(link.href)"
          :to="resolveRouterTarget(link.href)"
          class="navbar__mobile-link"
          :class="{ 'navbar__mobile-link--active': isActiveLink(link.href) }"
          @click="closeMenu"
        >
          {{ link.label }}
        </RouterLink>
        <a
          v-else
          class="navbar__mobile-link"
          :href="link.href"
          @click="closeMenu"
        >
          {{ link.label }}
        </a>
      </template>
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
  background: rgba(250, 253, 253, 0.92);
  border-bottom: 1px solid rgba(111, 145, 153, 0.18);
  backdrop-filter: blur(14px);
  box-shadow: 0 18px 40px rgba(17, 39, 46, 0.08);
  position: sticky;
  top: 0;
  z-index: 30;
}

.navbar__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
  color: var(--primary-dark);
}

.navbar__brand-badge {
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 14px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.88), transparent 60%),
    linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
  letter-spacing: 0.04em;
  box-shadow: 0 12px 28px rgba(47, 122, 134, 0.24);
}

.navbar__brand-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.navbar__brand-name {
  letter-spacing: 0.08em;
  color: var(--primary-dark);
  font-weight: 700;
}

.navbar__brand-tagline {
  color: var(--text-soft);
  font-size: 0.76rem;
  font-weight: 500;
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
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.navbar__link:hover {
  color: var(--primary);
  background: rgba(47, 122, 134, 0.08);
}

.navbar__link--active {
  color: var(--primary-dark);
  background: rgba(47, 122, 134, 0.12);
}

.navbar__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.9rem;
}

.navbar__actions:empty {
  display: none;
}

.navbar__profile-icon {
  width: 2rem;
  height: 2rem;
  border: 1px solid rgba(111, 145, 153, 0.28);
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.7);
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
  border: 1px solid rgba(111, 145, 153, 0.24);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
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
  padding: 0.95rem 1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(111, 145, 153, 0.18);
  color: var(--text-soft);
  text-align: center;
}

.navbar__mobile-link:hover {
  color: var(--primary-dark);
}

.navbar__mobile-link--active {
  color: var(--primary-dark);
  background: rgba(47, 122, 134, 0.1);
}

@media (max-width: 980px) {
  .navbar {
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 0.85rem;
    padding: 0.95rem 1rem;
    justify-items: stretch;
  }

  .navbar__brand {
    min-width: 0;
  }

  .navbar__links {
    display: none;
  }

  .navbar__burger {
    display: inline-flex;
    grid-column: 3;
    grid-row: 1;
    justify-self: end;
  }

  .navbar__actions {
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
    justify-self: end;
    justify-content: flex-end;
    gap: 0.75rem;
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

@media (max-width: 760px) {
  .navbar {
    padding: 0.9rem 1rem;
  }

  .navbar__brand-tagline {
    display: none;
  }

  .navbar__actions {
    gap: 0.5rem;
  }

  .navbar__actions :deep(.base-button) {
    white-space: nowrap;
  }

  .navbar__actions :deep(.base-button--sm) {
    padding: 0.42rem 0.72rem;
    font-size: 0.82rem;
  }

  .navbar__profile-icon {
    display: none;
  }
}

@media (max-width: 420px) {
  .navbar {
    gap: 0.75rem;
    padding: 0.85rem;
  }

  .navbar__brand-name {
    font-size: 0.95rem;
  }

  .navbar__actions {
    gap: 0.4rem;
  }

  .navbar__actions :deep(.base-button--sm) {
    padding: 0.4rem 0.64rem;
    font-size: 0.79rem;
  }
}

@media (max-width: 360px) {
  .navbar {
    gap: 0.5rem;
    padding: 0.75rem 0.65rem;
  }

  .navbar__brand-name {
    font-size: 0.88rem;
    letter-spacing: 0.02em;
  }

  .navbar__burger {
    width: 40px;
    height: 40px;
  }

  .navbar__actions :deep(.base-button--sm) {
    padding: 0.34rem 0.5rem;
    font-size: 0.74rem;
  }
}
</style>

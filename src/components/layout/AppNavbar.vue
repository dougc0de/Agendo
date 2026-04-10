<script setup>
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
</script>

<template>
  <header class="navbar">
    <div class="navbar__brand">
      <span class="navbar__brand-mark">AG</span>
      <span class="navbar__brand-name">AGENDO</span>
    </div>

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
        @click="emit('action')"
      >
        {{ props.actionLabel }}
      </BaseButton>
    </div>
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

@media (max-width: 820px) {
  .navbar {
    grid-template-columns: 1fr;
    justify-items: center;
  }
}
</style>

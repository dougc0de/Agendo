<script setup>
const props = defineProps({
    type: {
        type: String,
        default: "button"
    },
    variant: {
        type: String,
        default: "primary"
    },
    size: {
        type: String,
        default: "md"
    },
    block: {
        type: Boolean,
        default: false
    },
    disabled: {
        type: Boolean,
        default: false
    }
});
</script>

<template>
  <button
    :type="props.type"
    class="base-button"
    :class="[
      `base-button--${props.variant}`,
      `base-button--${props.size}`,
      { 'base-button--block': props.block }
    ]"
    :disabled="props.disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.base-button {
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    border-color var(--transition-fast),
    background-position var(--transition-normal),
    background-color var(--transition-fast),
    color var(--transition-fast);
  box-shadow: var(--shadow);
  background-size: 140% 140%;
  background-position: 0% 50%;
}

.base-button:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px rgba(17, 184, 159, 0.2),
    var(--shadow-hover);
}

.base-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.base-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.base-button--sm {
  padding: 0.45rem 0.85rem;
  font-size: 0.88rem;
}

.base-button--md {
  padding: 0.7rem 1rem;
  font-size: 0.95rem;
}

.base-button--lg {
  padding: 0.9rem 1.2rem;
  font-size: 1rem;
}

.base-button--block {
  width: 100%;
}

.base-button--primary {
  background:
    linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 34%, var(--secondary) 100%);
  color: #fff;
  box-shadow: 0 18px 34px rgba(17, 47, 71, 0.24);
}

.base-button--primary:hover:not(:disabled) {
  background-position: 100% 50%;
}

.base-button--secondary {
  background: linear-gradient(
    135deg,
    var(--secondary) 0%,
    var(--accent) 58%,
    var(--primary-dark) 100%
  );
  color: #fff;
  box-shadow: 0 18px 34px rgba(17, 184, 159, 0.22);
}

.base-button--ghost {
  background: var(--hero-surface-alt);
  border-color: rgba(17, 184, 159, 0.18);
  color: var(--secondary-dark);
  box-shadow: 0 12px 24px rgba(14, 39, 58, 0.06);
}

.base-button--ghost:hover:not(:disabled) {
  background: linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(239, 248, 247, 0.98));
  border-color: rgba(255, 143, 90, 0.24);
  color: var(--primary-dark);
}

.base-button--danger {
  background: linear-gradient(135deg, var(--danger) 0%, #d32f2f 100%);
  color: #fff;
  box-shadow: 0 18px 32px rgba(207, 83, 72, 0.22);
}

.base-button--warning {
  background: linear-gradient(135deg, var(--warning) 0%, #f57c00 100%);
  color: #fff;
  box-shadow: 0 18px 32px rgba(245, 124, 0, 0.22);
}
</style>

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
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
}

.base-button:hover:not(:disabled) {
  transform: translateY(-1px);
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
  background: var(--primary-dark);
  color: #fff;
}

.base-button--primary:hover:not(:disabled) {
  background: var(--primary);
}

.base-button--secondary {
  background: var(--primary);
  color: #fff;
}

.base-button--ghost {
  background: rgba(255, 255, 255, 0.5);
  border-color: var(--border);
  color: var(--text);
}

.base-button--danger {
  background: var(--danger);
  color: #fff;
}

.base-button--warning {
  background: var(--warning);
  color: #fff;
}
</style>

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
  border-radius: var(--border-radius);
  cursor: pointer;
  font-weight: 600;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow);
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
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: #fff;
}

.base-button--primary:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%);
}

.base-button--secondary {
  background: linear-gradient(135deg, var(--secondary) 0%, var(--secondary-dark) 100%);
  color: #fff;
}

.base-button--ghost {
  background: rgba(255, 255, 255, 0.9);
  border-color: var(--border);
  color: var(--text);
  box-shadow: none;
}

.base-button--ghost:hover:not(:disabled) {
  background: var(--surface);
  border-color: var(--primary);
}

.base-button--danger {
  background: linear-gradient(135deg, var(--danger) 0%, #d32f2f 100%);
  color: #fff;
}

.base-button--warning {
  background: linear-gradient(135deg, var(--warning) 0%, #f57c00 100%);
  color: #fff;
}
</style>

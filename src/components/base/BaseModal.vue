<script setup>
const props = defineProps({
    open: {
        type: Boolean,
        default: false
    },
    title: {
        type: String,
        default: ""
    },
    description: {
        type: String,
        default: ""
    }
});

const emit = defineEmits(["close"]);
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" class="modal-backdrop" @click.self="emit('close')">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">{{ props.title }}</h3>
            <p v-if="props.description" class="modal-description">
              {{ props.description }}
            </p>
          </div>
          <button class="modal-close" type="button" @click="emit('close')">
            Cerrar
          </button>
        </div>

        <div class="modal-body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(33, 52, 59, 0.5);
  display: grid;
  place-items: center;
  padding: 1rem;
  z-index: 40;
}

.modal-card {
  width: min(760px, 100%);
  background: #fff;
  border-radius: 8px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.2rem 1.4rem;
  border-bottom: 1px solid #deeaef;
}

.modal-title {
  margin: 0;
  font-size: 1.35rem;
  color: var(--text);
}

.modal-description {
  margin: 0.35rem 0 0;
  color: var(--text-soft);
}

.modal-close {
  background: transparent;
  border: none;
  color: var(--primary-dark);
  cursor: pointer;
  font-weight: 600;
}

.modal-body {
  padding: 1.4rem;
}
</style>

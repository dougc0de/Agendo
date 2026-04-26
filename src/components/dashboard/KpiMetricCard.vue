<script setup>
const props = defineProps({
    label: {
        type: String,
        default: ""
    },
    value: {
        type: String,
        default: "--"
    },
    helper: {
        type: String,
        default: ""
    },
    tone: {
        type: String,
        default: "default"
    }
});
</script>

<template>
  <article class="kpi-metric-card" :class="`kpi-metric-card--${props.tone}`">
    <span>{{ props.label }}</span>
    <strong>{{ props.value }}</strong>
    <small v-if="props.helper">{{ props.helper }}</small>
  </article>
</template>

<style scoped>
.kpi-metric-card {
  padding: 1rem 1.05rem;
  border-radius: 8px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: #fff;
  box-shadow: 0 16px 38px rgba(16, 38, 44, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.kpi-metric-card span,
.kpi-metric-card small {
  color: var(--text-soft);
}

.kpi-metric-card strong {
  color: var(--primary-dark);
  font-size: 1.85rem;
}

.kpi-metric-card--warning {
  border-color: rgba(242, 159, 56, 0.22);
}

.kpi-metric-card--danger {
  border-color: rgba(235, 85, 69, 0.18);
}

.kpi-metric-card--success {
  border-color: rgba(17, 184, 159, 0.22);
}
</style>

<script setup>
import { computed } from "vue";

const props = defineProps({
    title: {
        type: String,
        default: ""
    },
    description: {
        type: String,
        default: ""
    },
    series: {
        type: Array,
        default: () => []
    },
    primaryKey: {
        type: String,
        default: ""
    },
    secondaryKey: {
        type: String,
        default: ""
    },
    primaryLabel: {
        type: String,
        default: ""
    },
    secondaryLabel: {
        type: String,
        default: ""
    },
    primaryFormatter: {
        type: Function,
        default: (value) => String(value ?? "--")
    },
    secondaryFormatter: {
        type: Function,
        default: (value) => String(value ?? "--")
    }
});

function normalizeMetric(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return 0;
    }

    return numericValue;
}

const primaryMax = computed(() =>
    Math.max(0, ...props.series.map((item) => normalizeMetric(item?.[props.primaryKey])))
);

const secondaryMax = computed(() =>
    Math.max(0, ...props.series.map((item) => normalizeMetric(item?.[props.secondaryKey])))
);

function primaryWidth(value) {
    if (!primaryMax.value) {
        return 0;
    }

    return (normalizeMetric(value) / primaryMax.value) * 100;
}

function secondaryWidth(value) {
    if (!secondaryMax.value) {
        return 0;
    }

    return (normalizeMetric(value) / secondaryMax.value) * 100;
}
</script>

<template>
  <article class="kpi-trend-panel">
    <div class="kpi-trend-panel__heading">
      <div>
        <h3>{{ props.title }}</h3>
        <p>{{ props.description }}</p>
      </div>
    </div>

    <div v-if="props.series.length" class="kpi-trend-panel__series">
      <div
        v-for="item in props.series"
        :key="item.bucketKey"
        class="kpi-trend-panel__row"
      >
        <div class="kpi-trend-panel__label">
          <strong>{{ item.label }}</strong>
        </div>

        <div class="kpi-trend-panel__metric">
          <span>{{ props.primaryLabel }}</span>
          <small>{{ props.primaryFormatter(item?.[props.primaryKey]) }}</small>
          <div class="kpi-trend-panel__track">
            <div
              class="kpi-trend-panel__fill kpi-trend-panel__fill--primary"
              :style="{ width: `${primaryWidth(item?.[props.primaryKey])}%` }"
            />
          </div>
        </div>

        <div class="kpi-trend-panel__metric">
          <span>{{ props.secondaryLabel }}</span>
          <small>{{ props.secondaryFormatter(item?.[props.secondaryKey]) }}</small>
          <div class="kpi-trend-panel__track">
            <div
              class="kpi-trend-panel__fill kpi-trend-panel__fill--secondary"
              :style="{ width: `${secondaryWidth(item?.[props.secondaryKey])}%` }"
            />
          </div>
        </div>
      </div>
    </div>

    <p v-else class="kpi-trend-panel__empty">
      No hay datos suficientes para mostrar esta tendencia.
    </p>
  </article>
</template>

<style scoped>
.kpi-trend-panel {
  padding: 1.1rem;
  border-radius: 8px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: #fff;
  box-shadow: 0 16px 38px rgba(16, 38, 44, 0.06);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.kpi-trend-panel__heading h3,
.kpi-trend-panel__heading p {
  margin: 0;
}

.kpi-trend-panel__heading p {
  margin-top: 0.35rem;
  color: var(--text-soft);
}

.kpi-trend-panel__series {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.kpi-trend-panel__row {
  display: grid;
  grid-template-columns: 120px 1fr 1fr;
  gap: 0.85rem;
  align-items: center;
}

.kpi-trend-panel__label strong {
  color: var(--primary-dark);
  font-size: 0.95rem;
}

.kpi-trend-panel__metric {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.kpi-trend-panel__metric span,
.kpi-trend-panel__metric small {
  color: var(--text-soft);
}

.kpi-trend-panel__track {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #eef4f6;
  overflow: hidden;
}

.kpi-trend-panel__fill {
  height: 100%;
  border-radius: inherit;
}

.kpi-trend-panel__fill--primary {
  background: rgba(17, 184, 159, 0.72);
}

.kpi-trend-panel__fill--secondary {
  background: rgba(22, 134, 190, 0.62);
}

.kpi-trend-panel__empty {
  margin: 0;
  color: var(--text-soft);
}

@media (max-width: 760px) {
  .kpi-trend-panel__row {
    grid-template-columns: 1fr;
  }
}
</style>

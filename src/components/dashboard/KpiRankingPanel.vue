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
    rows: {
        type: Array,
        default: () => []
    },
    labelKey: {
        type: String,
        default: ""
    },
    primaryMetricKey: {
        type: String,
        default: ""
    },
    primaryMetricLabel: {
        type: String,
        default: ""
    },
    secondaryMetricKey: {
        type: String,
        default: ""
    },
    secondaryMetricLabel: {
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
    Math.max(0, ...props.rows.map((item) => normalizeMetric(item?.[props.primaryMetricKey])))
);

function primaryWidth(value) {
    if (!primaryMax.value) {
        return 0;
    }

    return (normalizeMetric(value) / primaryMax.value) * 100;
}
</script>

<template>
  <article class="kpi-ranking-panel">
    <div class="kpi-ranking-panel__heading">
      <div>
        <h3>{{ props.title }}</h3>
        <p>{{ props.description }}</p>
      </div>
    </div>

    <div v-if="props.rows.length" class="kpi-ranking-panel__rows">
      <div
        v-for="row in props.rows"
        :key="`${props.labelKey}-${row?.[props.labelKey]}`"
        class="kpi-ranking-panel__row"
      >
        <div class="kpi-ranking-panel__copy">
          <strong>{{ row?.[props.labelKey] || "Sin nombre" }}</strong>
          <small>
            {{ props.primaryMetricLabel }}: {{ props.primaryFormatter(row?.[props.primaryMetricKey]) }}
            <span v-if="props.secondaryMetricKey">
              · {{ props.secondaryMetricLabel }}: {{ props.secondaryFormatter(row?.[props.secondaryMetricKey]) }}
            </span>
          </small>
        </div>

        <div class="kpi-ranking-panel__track">
          <div
            class="kpi-ranking-panel__fill"
            :style="{ width: `${primaryWidth(row?.[props.primaryMetricKey])}%` }"
          />
        </div>
      </div>
    </div>

    <p v-else class="kpi-ranking-panel__empty">
      Todavia no hay datos suficientes para este ranking.
    </p>
  </article>
</template>

<style scoped>
.kpi-ranking-panel {
  padding: 1.1rem;
  border-radius: 8px;
  border: 1px solid rgba(17, 184, 159, 0.12);
  background: #fff;
  box-shadow: 0 16px 38px rgba(16, 38, 44, 0.06);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.kpi-ranking-panel__heading h3,
.kpi-ranking-panel__heading p,
.kpi-ranking-panel__copy strong,
.kpi-ranking-panel__copy small {
  margin: 0;
}

.kpi-ranking-panel__heading p,
.kpi-ranking-panel__copy small,
.kpi-ranking-panel__empty {
  color: var(--text-soft);
}

.kpi-ranking-panel__rows {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.kpi-ranking-panel__row {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.kpi-ranking-panel__copy strong {
  color: var(--primary-dark);
}

.kpi-ranking-panel__track {
  width: 100%;
  height: 9px;
  border-radius: 999px;
  background: #eef4f6;
  overflow: hidden;
}

.kpi-ranking-panel__fill {
  height: 100%;
  border-radius: inherit;
  background: rgba(17, 184, 159, 0.72);
}
</style>

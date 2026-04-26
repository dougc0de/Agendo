<script setup>
const props = defineProps({
    modelValue: {
        type: [String, Number],
        default: ""
    },
    label: {
        type: String,
        default: ""
    },
    type: {
        type: String,
        default: "text"
    },
    placeholder: {
        type: String,
        default: ""
    },
    disabled: {
        type: Boolean,
        default: false
    },
    required: {
        type: Boolean,
        default: false
    },
    min: {
        type: String,
        default: undefined
    },
    max: {
        type: String,
        default: undefined
    },
    step: {
        type: String,
        default: undefined
    },
    as: {
        type: String,
        default: "input"
    },
    rows: {
        type: Number,
        default: 4
    }
});

const emit = defineEmits(["update:modelValue"]);

function updateValue(event) {
    emit("update:modelValue", event.target.value);
}
</script>

<template>
  <label class="base-input">
    <span v-if="props.label" class="base-input__label">
      {{ props.label }}
      <span v-if="props.required" class="base-input__required">*</span>
    </span>

    <textarea
      v-if="props.as === 'textarea'"
      class="base-input__control base-input__control--textarea"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :required="props.required"
      :rows="props.rows"
      :value="props.modelValue"
      @input="updateValue"
    />

    <input
      v-else
      class="base-input__control"
      :type="props.type"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :required="props.required"
      :min="props.min"
      :max="props.max"
      :step="props.step"
      :value="props.modelValue"
      @input="updateValue"
    />
  </label>
</template>

<style scoped>
.base-input {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  width: 100%;
}

.base-input__label {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text);
}

.base-input__required {
  color: #c83d32;
}

.base-input__control {
  width: 100%;
  border: 2px solid var(--border);
  border-radius: var(--border-radius);
  background: var(--surface);
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
  transition: all var(--transition-fast);
  font-size: 1rem;
  box-shadow: var(--shadow);
}

.base-input__control:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(17, 184, 159, 0.15), var(--shadow-hover);
  transform: translateY(-1px);
}

.base-input__control--textarea {
  resize: vertical;
  min-height: 120px;
}
</style>

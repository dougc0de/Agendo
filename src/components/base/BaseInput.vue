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
    <span v-if="props.label" class="base-input__label">{{ props.label }}</span>

    <textarea
      v-if="props.as === 'textarea'"
      class="base-input__control base-input__control--textarea"
      :placeholder="props.placeholder"
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
      :required="props.required"
      :min="props.min"
      :max="props.max"
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

.base-input__control {
  width: 100%;
  border: 1px solid #bfd4dc;
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.base-input__control:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(95, 135, 151, 0.15);
}

.base-input__control--textarea {
  resize: vertical;
  min-height: 120px;
}
</style>

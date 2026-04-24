<script setup>
import { reactive, watch } from "vue";
import BaseButton from "../base/BaseButton.vue";
import BaseInput from "../base/BaseInput.vue";

const props = defineProps({
    initialValue: {
        type: Object,
        default: () => ({})
    },
    submitting: {
        type: Boolean,
        default: false
    },
    errorMessage: {
        type: String,
        default: ""
    },
    mode: {
        type: String,
        default: "create"
    },
    branchOptions: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(["submit", "cancel"]);

function createDefaultForm() {
    return {
        nombre: "",
        correo: "",
        contrasena: "",
        role: "doctor",
        sucursalId: null
    };
}

const form = reactive(createDefaultForm());

watch(
    () => props.initialValue,
    (value) => {
        Object.assign(form, createDefaultForm(), value ?? {});

        if (!form.sucursalId && props.branchOptions.length) {
            form.sucursalId = props.branchOptions[0].id;
        }
    },
    { deep: true, immediate: true }
);

watch(
    () => props.branchOptions,
    (value) => {
        if (!form.sucursalId && value.length) {
            form.sucursalId = value[0].id;
        }
    },
    { deep: true, immediate: true }
);

function handleSubmit() {
    emit("submit", {
        nombre: form.nombre,
        correo: form.correo,
        contrasena: form.contrasena,
        role: form.role,
        sucursalId: Number(form.sucursalId)
    });
}
</script>

<template>
  <form class="internal-user-form" @submit.prevent="handleSubmit">
    <div class="internal-user-form__grid">
      <BaseInput
        :model-value="form.nombre"
        label="Nombre"
        placeholder="Nombre completo"
        :required="true"
        @update:model-value="form.nombre = $event"
      />
      <BaseInput
        :model-value="form.correo"
        label="Correo"
        type="email"
        placeholder="correo@clinica.com"
        :required="true"
        @update:model-value="form.correo = $event"
      />
      <BaseInput
        v-if="props.mode === 'create'"
        :model-value="form.contrasena"
        label="Contrasena inicial"
        type="password"
        placeholder="Define una contrasena temporal"
        :required="true"
        @update:model-value="form.contrasena = $event"
      />

      <label class="internal-user-form__field">
        <span class="internal-user-form__label">Rol</span>
        <select v-model="form.role" class="internal-user-form__select">
          <option value="admin">Admin</option>
          <option value="recepcionista">Recepcionista</option>
          <option value="doctor">Doctor</option>
        </select>
      </label>

      <label class="internal-user-form__field">
        <span class="internal-user-form__label">Sucursal principal</span>
        <select v-model="form.sucursalId" class="internal-user-form__select">
          <option
            v-for="branch in props.branchOptions"
            :key="branch.id"
            :value="branch.id"
          >
            {{ branch.nombre }}
          </option>
        </select>
      </label>
    </div>

    <p v-if="props.errorMessage" class="internal-user-form__error">
      {{ props.errorMessage }}
    </p>

    <div class="internal-user-form__actions">
      <BaseButton variant="ghost" @click.prevent="emit('cancel')">
        Cancelar
      </BaseButton>
      <BaseButton type="submit" :disabled="props.submitting">
        {{ props.mode === "edit" ? "Guardar cambios" : "Crear usuario" }}
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.internal-user-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.internal-user-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.internal-user-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.internal-user-form__label {
  font-size: 0.92rem;
  font-weight: 600;
}

.internal-user-form__select {
  width: 100%;
  border: 1px solid #bfd4dc;
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  padding: 0.8rem 0.9rem;
  outline: none;
}

.internal-user-form__error {
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 18px;
  background: rgba(235, 85, 69, 0.12);
  border: 1px solid rgba(235, 85, 69, 0.2);
  color: #b8392d;
}

.internal-user-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 760px) {
  .internal-user-form__grid {
    grid-template-columns: 1fr;
  }

  .internal-user-form__actions {
    flex-direction: column-reverse;
  }
}
</style>

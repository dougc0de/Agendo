<script setup>
import { RouterView } from "vue-router";
import { useAuthStore } from "./stores/authStore.js";

const authStore = useAuthStore();
authStore.hydrate();
</script>

<template>
  <RouterView />
</template>

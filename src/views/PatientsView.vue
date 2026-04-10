<template>
  <section class="placeholder-view">
    <div class="placeholder-view__card">
      <h1>Modulo de pacientes</h1>
      <p>Este espacio queda disponible para la siguiente fase.</p>
    </div>
  </section>
</template>

<style scoped>
.placeholder-view {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: var(--page-bg);
  padding: 1.5rem;
}

.placeholder-view__card {
  background: #fff;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  box-shadow: var(--shadow);
}

.placeholder-view__card h1 {
  margin: 0 0 0.75rem;
}

.placeholder-view__card p {
  margin: 0;
  color: var(--text-soft);
}
</style>

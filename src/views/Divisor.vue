<template>
  <div class="section-divider">
    <div class="divider-line"></div>
  </div>
</template>

<style scoped>
.section-divider {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 1rem 0;
    background: rgba(255, 255, 255, 0.722);

}

.divider-line {
  width: min(700px, 100%);
  height: 3px;
  border-radius: 999px;
  background: rgba(80, 79, 79, 0.293);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.122) inset;
}
</style>

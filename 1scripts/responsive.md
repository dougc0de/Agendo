# Responsive en Vue.js

## Objetivo

Este documento resume:

1. Que fallo en este proyecto.
2. Por que fallo.
3. Como corregirlo sin romper desktop.
4. Un proceso reutilizable para otros proyectos Vue.js.

La idea central es esta:

```txt
desktop no debe recibir estilos de movil antes de tiempo
movil no debe heredar anchos rigidos de desktop
```

---

## 1. Que fallo en este proyecto

### Falla 1: se aplico una distribucion de movil en anchos demasiado grandes

Paso aqui:

- el navbar se apilo demasiado pronto;
- el hero y varias grillas pasaron a 1 columna en anchos donde todavia debian verse como desktop o tablet amplia.

Ejemplos del problema:

```css
@media (max-width: 1024px) {
  .hero-section,
  .services-grid {
    grid-template-columns: 1fr;
  }
}
```

Eso colapsa demasiado pronto.

### Por que fallo

Porque `1024px` no siempre es "movil". Muchas laptops pequenas, tablets horizontales y ventanas medianas siguen necesitando una version cercana a desktop.

### Como corregirlo

Separar por niveles:

- `980px`: tablet / intermedio
- `760px`: movil
- `480px`: movil angosto

Ejemplo corregido:

```css
@media (max-width: 980px) {
  .services-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .hero-section,
  .services-grid {
    grid-template-columns: 1fr;
  }
}
```

---

### Falla 2: el burger menu se activo demasiado pronto

Paso aqui:

- el navbar dejo de verse como desktop en anchos donde todavia cabia bien.

### Por que fallo

Porque el breakpoint del burger se estaba usando como si fuera "tablet y movil", cuando en realidad el layout desktop aun servia.

### Como corregirlo

Reservar el burger para pantallas mas estrechas.

Ejemplo:

```css
@media (max-width: 560px) {
  .navbar__links {
    display: none;
  }

  .navbar__burger {
    display: inline-flex;
  }
}
```

Y dejar un breakpoint anterior solo para ajustar espacios, no para destruir el layout:

```css
@media (max-width: 820px) {
  .navbar {
    gap: 0.85rem;
    padding: 0.95rem 1rem;
  }

  .navbar__links {
    gap: 1rem;
  }
}
```

---

### Falla 3: el menu movil estaba en el contenedor equivocado

Paso aqui:

- el menu desplegable estaba dentro de `.navbar__actions`.

### Por que fallo

Porque `.navbar__actions` era un contenedor flex, y el menu movil necesitaba colgar directamente del grid principal (`.navbar`) para ocupar toda la fila.

### Como corregirlo

El menu movil debe ser hijo directo del header.

Incorrecto:

```vue
<div class="navbar__actions">
  ...
  <nav class="navbar__mobile-menu">...</nav>
</div>
```

Correcto:

```vue
<div class="navbar__actions">
  ...
</div>

<nav v-if="menuOpen" class="navbar__mobile-menu">
  ...
</nav>
```

---

### Falla 4: habia columnas con ancho rigido empujando la pantalla

Paso aqui:

```css
.hero-highlight-row {
  grid-template-columns: minmax(280px, 1fr) 140px;
}

.hero-highlight-avatar {
  width: 140px;
  min-width: 140px;
}
```

### Por que fallo

En telefonos angostos, esos anchos minimos fuerzan al layout a ocupar mas espacio que el viewport.

### Como corregirlo

En movil, cambiar ese bloque a una sola columna:

```css
@media (max-width: 480px) {
  .hero-highlight-row {
    grid-template-columns: 1fr;
    justify-items: center;
    width: 100%;
  }

  .hero-highlight {
    width: 100%;
    max-width: 100%;
  }

  .hero-highlight-avatar {
    width: min(140px, 100%);
    min-width: 0;
  }
}
```

---

### Falla 5: se quiso resolver overflow sin distinguir entre reglas globales y reglas del componente

### Por que fallo

No todo debe vivir en `style.css`.

Si mandas a global cosas como:

- hero layout,
- navbar layout,
- dashboard layout,

terminas afectando pantallas y componentes que no querias tocar.

### Como corregirlo

Usa esta regla:

```txt
style.css = base global y responsive compartido
componente.vue = layout propio del componente
```

---

## 2. Que debe ir en style.css

Estas si son buenas reglas globales.

```css
:root {
  --shell-max-width: 1220px;
  --page-padding-desktop: 1.5rem;
  --page-padding-mobile: 1rem;
  --section-padding-desktop: 3rem 2rem;
  --section-padding-mobile: 2rem 1.25rem;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#app {
  min-height: 100vh;
}

body {
  margin: 0;
  min-width: 320px;
}

img,
svg,
video {
  display: block;
  max-width: 100%;
  height: auto;
}

button,
input,
textarea,
select {
  font: inherit;
}

.page-view {
  min-height: 100vh;
}

.page-shell {
  width: 100%;
  min-height: 100vh;
}

.section-shell {
  padding: var(--section-padding-desktop);
}

.grid-2,
.grid-3,
.grid-4 {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.grid-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.grid-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.grid-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.scroll-x {
  overflow-x: auto;
}

.min-w-0 {
  min-width: 0;
}

.text-wrap-anywhere {
  overflow-wrap: anywhere;
  word-break: break-word;
}

@media (max-width: 980px) {
  .grid-3,
  .grid-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .section-shell {
    padding: var(--section-padding-mobile);
  }

  .grid-2,
  .grid-3,
  .grid-4 {
    grid-template-columns: 1fr;
  }
}
```

---

## 3. Que no debe ir en style.css

Evita meter aqui:

- `.hero-section`
- `.dashboard-main`
- `.navbar`
- `.appointment-form`
- `.modal-card`

Eso debe quedarse local en su componente, porque responde a la geometria de esa vista.

---

## 4. Proceso correcto para hacer un componente responsive

### Paso 1: construir desktop primero

Ejemplo:

```css
.hero-section {
  display: grid;
  grid-template-columns: 1.4fr 0.9fr;
}
```

### Paso 2: definir breakpoints por intencion

Usa esta regla:

- `980px`: tablet / intermedio
- `760px`: movil
- `480px`: movil angosto

### Paso 3: no colapsar todo demasiado pronto

Mal:

```css
@media (max-width: 1024px) {
  .hero-section,
  .services-grid,
  .contact-grid,
  .about-grid {
    grid-template-columns: 1fr;
  }
}
```

Mejor:

```css
@media (max-width: 980px) {
  .services-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .contact-grid,
  .about-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .hero-section,
  .services-grid {
    grid-template-columns: 1fr;
  }
}
```

### Paso 4: revisar hijos con ancho rigido

Busca cosas como:

```css
width: 400px;
min-width: 280px;
grid-template-columns: 280px 140px;
```

Y preguntate:

```txt
esto cabe en 360px?
```

Si no, debes adaptar.

---

## 5. Patron correcto para burger menu en Vue

### Script

```vue
<script setup>
import { ref } from "vue";

const menuOpen = ref(false);

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function closeMenu() {
  menuOpen.value = false;
}
</script>
```

### Template

```vue
<header class="navbar">
  <div class="navbar__brand">AGENDO</div>

  <button
    type="button"
    class="navbar__burger"
    :aria-expanded="menuOpen ? 'true' : 'false'"
    aria-controls="navbar-mobile-menu"
    aria-label="Abrir menu de navegacion"
    @click="toggleMenu"
  >
    <span></span>
    <span></span>
    <span></span>
  </button>

  <nav class="navbar__links">
    <a href="#sobre">Sobre Nosotros</a>
    <a href="#contacto">Contactanos</a>
    <a href="#servicios">Servicios</a>
  </nav>

  <div class="navbar__actions">
    <button>Iniciar Sesion</button>
  </div>

  <nav
    v-if="menuOpen"
    id="navbar-mobile-menu"
    class="navbar__mobile-menu"
  >
    <a href="#sobre" @click="closeMenu">Sobre Nosotros</a>
    <a href="#contacto" @click="closeMenu">Contactanos</a>
    <a href="#servicios" @click="closeMenu">Servicios</a>
  </nav>
</header>
```

### CSS

```css
.navbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
}

.navbar__links {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
}

.navbar__burger,
.navbar__mobile-menu {
  display: none;
}

.navbar__burger {
  width: 44px;
  height: 44px;
  border: 1px solid rgba(95, 135, 151, 0.24);
  border-radius: 8px;
  background: #fff;
  padding: 0;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
}

.navbar__burger span {
  width: 20px;
  height: 2px;
  background: var(--text);
  border-radius: 999px;
}

@media (max-width: 560px) {
  .navbar {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .navbar__links {
    display: none;
  }

  .navbar__burger {
    display: inline-flex;
    justify-self: end;
  }

  .navbar__actions {
    grid-column: 1 / -1;
    justify-content: center;
    width: 100%;
    margin-top: 0.5rem;
  }

  .navbar__mobile-menu {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    grid-column: 1 / -1;
    width: 100%;
    padding-top: 0.75rem;
  }
}
```

---

## 6. Checklist real para evitar scroll horizontal

Antes de dar por bueno un componente, revisa:

1. Tiene `width` fijo en px?
2. Tiene `min-width`?
3. Tiene `grid-template-columns` rigido?
4. Tiene padding horizontal muy grande?
5. Tiene imagen sin `max-width: 100%`?
6. Tiene texto largo sin romper?
7. Tiene botones o pills que no envuelven?

Si alguna respuesta es "si", probablemente ya encontraste al culpable.

---

## 7. Regla de depuracion

Cuando no sepas que esta empujando el ancho, agrega temporalmente:

```css
* {
  outline: 1px solid rgba(255, 0, 0, 0.08);
}
```

Eso te deja ver quien se sale del viewport.

Luego lo quitas.

---

## 8. Reglas que debes recordar siempre

### Siempre

```txt
usa minmax(0, 1fr) en grid
usa min-width: 0 en hijos flex/grid
usa max-width: 100% en imagenes
separa desktop, tablet y movil
haz ajustes progresivos, no colapses todo de golpe
```

### Nunca como primer parche

```txt
body { overflow-x: hidden; }
```

Eso tapa el problema, no lo corrige.

---

## 9. Convencion recomendada para tus proyectos Vue

### style.css

- reset
- tokens
- layout global
- utilidades
- breakpoints compartidos

### cada componente

- su layout propio
- sus media queries propias
- su comportamiento visual especifico

Regla corta:

```txt
global para sistema
local para geometria
```

---

## 10. Resumen final

Lo que mas se repitio en este proyecto fue:

1. breakpoints demasiado agresivos;
2. columnas rigidas en movil;
3. mezclar reglas globales con layout local;
4. activar burger menu demasiado pronto;
5. meter menu movil en el contenedor equivocado.

Si corriges esas cinco cosas, en la mayoria de tus proyectos Vue ya habras resuelto el 80% de los problemas de responsive.

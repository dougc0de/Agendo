# Creacion De Sala

## Objetivo
Vamos a construir la funcionalidad `Crear Sala` de punta a punta, sin romper el flujo actual del dashboard.

La idea es esta:

1. agregar un boton `Crear Sala` en el sidebar del dashboard;
2. abrir un modal con un formulario propio;
3. enviar los datos al backend con `POST /salas`;
4. validar los datos en backend;
5. guardar la sala en MySQL;
6. mostrar feedback claro al usuario.

Este documento sigue el patron que ya usa el proyecto:

- `BaseButton`
- `BaseModal`
- componente de formulario dedicado
- servicio frontend
- repository/service/routes en backend

## Por Que El Boton Va En El Sidebar
En este proyecto el sidebar de [DashboardView.vue](../src/views/DashboardView.vue) ya concentra acciones primarias como:

- `Agregar Reserva`
- `Recargar Reservas`

`Crear Sala` pertenece ahi porque es una accion administrativa del panel, no una accion secundaria de la tabla.

## Paso 1: Agregar El Boton En El Dashboard
Archivo:

- [DashboardView.vue](../src/views/DashboardView.vue)

Busca este bloque:

```vue
<div class="dashboard-actions">
  <BaseButton block @click="openCreateModal">
    Agregar Reserva
  </BaseButton>
  <BaseButton block variant="secondary" @click="fetchAppointments">
    Recargar Reservas
  </BaseButton>
</div>
```

Agrega un tercer boton:

```vue
<BaseButton block variant="ghost" @click="openCreateRoomModal">
  Crear Sala
</BaseButton>
```

Ahora crea el estado reactivo del modal en el `<script setup>`:

```js
const roomModalOpen = ref(false);
const roomModalError = ref("");
const roomFeedback = ref("");
```

Y agrega estas funciones:

```js
function openCreateRoomModal() {
    roomModalError.value = "";
    roomModalOpen.value = true;
}

function closeCreateRoomModal() {
    roomModalError.value = "";
    roomModalOpen.value = false;
}
```

## Paso 2: Abrir El Modal De Crear Sala
Sigue en [DashboardView.vue](../src/views/DashboardView.vue).

Debajo del modal de reservas agrega otro `BaseModal`:

```vue
<BaseModal
  :open="roomModalOpen"
  title="Crear sala"
  description="Completa la informacion para registrar una nueva sala."
  @close="closeCreateRoomModal"
>
  <SalaForm
    :submitting="savingRoom"
    :error-message="roomModalError"
    @submit="handleCreateRoom"
    @cancel="closeCreateRoomModal"
  />
</BaseModal>
```

Para eso vas a necesitar:

1. importar `SalaForm`
2. crear `savingRoom`
3. crear `handleCreateRoom`

## Paso 3: Crear `SalaForm.vue`
Archivo nuevo recomendado:

- `src/components/rooms/SalaForm.vue`

### Responsabilidad Del Componente
Este componente no debe guardar la sala por si solo. Solo debe:

- mostrar inputs;
- validar lo minimo del lado cliente;
- emitir el payload con `emit("submit", payload)`.

### Props recomendadas

```js
const props = defineProps({
    submitting: {
        type: Boolean,
        default: false
    },
    errorMessage: {
        type: String,
        default: ""
    },
    initialValue: {
        type: Object,
        default: () => ({})
    }
});
```

### Estructura base del form
Reutiliza `BaseInput` y `BaseButton`, como en `AppointmentForm.vue`.

Campos recomendados:

- `nombre` obligatorio
- `tipo` obligatorio
- `descripcion` obligatorio
- `capacidad` obligatorio
- `disponibilidad` opcional visualmente, default `disponible`
- `clinicaId` obligatorio

`estado` no se expone en UI; se enviara desde backend como `activa`.

### Ejemplo de estado local

```js
const form = reactive({
    nombre: "",
    tipo: "",
    descripcion: "",
    capacidad: 1,
    disponibilidad: "disponible",
    clinicaId: 1
});
```

### Ejemplo de submit

```js
function handleSubmit() {
    emit("submit", {
        nombre: form.nombre.trim(),
        tipo: form.tipo.trim(),
        descripcion: form.descripcion.trim(),
        capacidad: Number(form.capacidad),
        disponibilidad: form.disponibilidad || "disponible",
        clinicaId: Number(form.clinicaId)
    });
}
```

### Ejemplo de template

```vue
<form class="room-form" @submit.prevent="handleSubmit">
  <div class="room-form__grid">
    <BaseInput
      :model-value="form.nombre"
      label="Nombre"
      :required="true"
      @update:model-value="form.nombre = $event"
    />
    <BaseInput
      :model-value="form.tipo"
      label="Tipo"
      :required="true"
      @update:model-value="form.tipo = $event"
    />
    <BaseInput
      :model-value="form.capacidad"
      label="Capacidad"
      type="number"
      min="1"
      :required="true"
      @update:model-value="form.capacidad = $event"
    />
    <BaseInput
      :model-value="form.clinicaId"
      label="ID de clinica"
      type="number"
      min="1"
      :required="true"
      @update:model-value="form.clinicaId = $event"
    />
  </div>

  <BaseInput
    :model-value="form.descripcion"
    label="Descripcion"
    as="textarea"
    :rows="3"
    :required="true"
    @update:model-value="form.descripcion = $event"
  />

  <label class="room-form__field">
    <span>Disponibilidad</span>
    <select v-model="form.disponibilidad" class="room-form__select">
      <option value="disponible">Disponible</option>
      <option value="ocupada">Ocupada</option>
      <option value="mantenimiento">Mantenimiento</option>
    </select>
  </label>

  <p v-if="props.errorMessage" class="room-form__error">
    {{ props.errorMessage }}
  </p>

  <div class="room-form__actions">
    <BaseButton variant="ghost" @click.prevent="emit('cancel')">
      Cancelar
    </BaseButton>
    <BaseButton type="submit" :disabled="props.submitting">
      Guardar sala
    </BaseButton>
  </div>
</form>
```

## Paso 4: Crear El Servicio Frontend
Archivo nuevo:

- `src/services/roomApi.js`

### Que hace
Centraliza la llamada HTTP para crear salas.

### Codigo recomendado

```js
import { apiRequest } from "./api.js";

export function createRoom(payload) {
    return apiRequest("/salas", {
        method: "POST",
        body: payload
    });
}
```

### Por que asi
Porque el proyecto ya usa ese patron:

- `useAppointments.js` para reservas
- `patientApi.js` para pacientes

Asi mantienes consistencia.

## Paso 5: Orquestacion En El Dashboard
Regresa a [DashboardView.vue](../src/views/DashboardView.vue).

Importa el servicio:

```js
import { createRoom } from "../services/roomApi.js";
```

Crea el estado:

```js
const savingRoom = ref(false);
```

Crea la funcion:

```js
async function handleCreateRoom(payload) {
    savingRoom.value = true;
    roomModalError.value = "";

    try {
        const response = await createRoom(payload);
        roomFeedback.value = response.msg;
        closeCreateRoomModal();
    } catch (error) {
        roomModalError.value =
            error.response?.msg || error.message || "No fue posible crear la sala.";
    } finally {
        savingRoom.value = false;
    }
}
```

Y muestra el feedback cerca de las acciones o del encabezado:

```vue
<p v-if="roomFeedback" class="dashboard-feedback">
  {{ roomFeedback }}
</p>
```

## Paso 6: Backend - Repository
Archivo nuevo o ampliacion:

- [salaRepository.js](../src/server/repositories/salaRepository.js)

Hoy ya existe `buscarSalaPorId(id)`. Vas a ampliarlo con creacion y una lectura minima.

### Crear sala

```js
export async function crearSala(sala) {
    const [result] = await pool.query(
        `
            INSERT INTO salas
            (nombre, tipo, descripcion, estado, capacidad, disponibilidad, clinica_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
            sala.nombre,
            sala.tipo,
            sala.descripcion,
            sala.estado,
            sala.capacidad,
            sala.disponibilidad,
            sala.clinicaId
        ]
    );

    return result;
}
```

### Buscar la sala recien creada

```js
export async function buscarSalaCreadaPorId(id) {
    const [rows] = await pool.query(
        `
            SELECT *
            FROM salas
            WHERE id = ?
        `,
        [id]
    );

    return rows[0];
}
```

## Paso 7: Backend - Service
Archivo nuevo:

- `src/server/services/salaService.js`

### Responsabilidad
Aqui vive la validacion y la logica de negocio, no en la route.

### Estructura recomendada

```js
import { buscarClinicaPorId } from "../repositories/clinicaRepository.js";
import { crearSala, buscarSalaCreadaPorId } from "../repositories/salaRepository.js";

function esIdValido(valor) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0;
}

function normalizarDatosEntrada(datos) {
    return {
        nombre: String(datos?.nombre ?? "").trim(),
        tipo: String(datos?.tipo ?? "").trim(),
        descripcion: String(datos?.descripcion ?? "").trim(),
        capacidad: Number(datos?.capacidad),
        disponibilidad: String(datos?.disponibilidad ?? "disponible").trim(),
        clinicaId: Number(datos?.clinicaId),
        estado: "activa"
    };
}

export async function crearSalaService(datos) {
    const payload = normalizarDatosEntrada(datos);

    if (!payload.nombre || !payload.tipo || !payload.descripcion) {
        return { ok: false, msg: "Nombre, tipo y descripcion son obligatorios." };
    }

    if (!esIdValido(payload.clinicaId)) {
        return { ok: false, msg: "La clinicaId no es valida." };
    }

    if (!Number.isInteger(payload.capacidad) || payload.capacidad < 1) {
        return { ok: false, msg: "La capacidad debe ser al menos 1." };
    }

    const clinica = await buscarClinicaPorId(payload.clinicaId);

    if (!clinica) {
        return { ok: false, msg: "La clinica indicada no existe." };
    }

    const result = await crearSala(payload);
    const salaCreada = await buscarSalaCreadaPorId(result.insertId);

    return {
        ok: true,
        msg: "Sala creada correctamente.",
        data: salaCreada
    };
}
```

## Paso 8: Backend - Routes
Archivo nuevo:

- `src/server/routes/salaRoutes.js`

### Codigo recomendado

```js
import express from "express";
import { crearSalaService } from "../services/salaService.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", async (req, res) => {
    const result = await crearSalaService(req.body);

    if (!result.ok) {
        return res.status(400).json(result);
    }

    return res.status(201).json(result);
});

export default router;
```

### Por que asi
Porque:

- mantienes la proteccion por token como ya haces con reservas;
- la route solo coordina request/response;
- la validacion de negocio queda en el service.

## Paso 9: Montar `/salas` En El Server
Archivo:

- [src/server/index.js](../src/server/index.js)

Importa la ruta:

```js
import salaRoutes from "./routes/salaRoutes.js";
```

Y montala:

```js
app.use("/salas", salaRoutes);
```

## Paso 10: Contrato Del Endpoint
### Request

```json
{
  "nombre": "Sala Consulta 2",
  "tipo": "consulta",
  "descripcion": "Sala para procedimientos menores",
  "capacidad": 2,
  "disponibilidad": "disponible",
  "clinicaId": 1
}
```

### Lo que completa el backend

```json
{
  "estado": "activa"
}
```

## Paso 11: Validaciones Que Debes Tener
### Frontend
- `nombre` obligatorio
- `tipo` obligatorio
- `descripcion` obligatorio
- `capacidad` minimo 1
- `clinicaId` obligatorio

### Backend
- repetir todas las validaciones del frontend
- no confiar solo en el cliente
- verificar que la clinica exista

## Paso 12: Persistencia En MySQL
La tabla `salas` en [schemes.sql](../src/assets/schemes.sql) ya espera:

- `nombre`
- `tipo`
- `descripcion`
- `estado`
- `capacidad`
- `disponibilidad`
- `clinica_id`

Eso significa que el repository debe mapear:

- `clinicaId` del frontend
- a `clinica_id` en la tabla

El `INSERT` debe devolver `insertId`, y luego buscas la sala creada para devolver un objeto completo al frontend.

## Paso 13: Pruebas
### Caso feliz
1. abrir dashboard
2. tocar `Crear Sala`
3. llenar datos validos
4. guardar
5. ver mensaje `Sala creada correctamente.`

### Caso clinica inexistente
1. usar `clinicaId` que no exista
2. backend debe responder:
   - `La clinica indicada no existe.`

### Caso capacidad invalida
1. usar `0` o un negativo
2. backend debe bloquear

### Caso campos vacios
1. dejar `nombre` o `tipo` vacio
2. el frontend y el backend deben rechazarlo

## Paso 14: Orden Recomendado Para Implementarlo
Hazlo en este orden:

1. boton `Crear Sala` en dashboard
2. estado del modal
3. `SalaForm.vue`
4. `roomApi.js`
5. `handleCreateRoom()` en dashboard
6. ampliar `salaRepository.js`
7. crear `salaService.js`
8. crear `salaRoutes.js`
9. montar `/salas` en `server/index.js`
10. probar desde UI e Insomnia

## Regla De Oro
Piensa el flujo asi:

```txt
UI captura datos
-> Dashboard orquesta
-> roomApi envia
-> route recibe
-> service valida
-> repository guarda
-> MySQL persiste
-> backend responde
-> frontend muestra feedback
```

Si respetas esa cadena, no te pierdes y cada archivo mantiene una sola responsabilidad.

# Agendo Beta - Importaciones y exportaciones actuales

## Objetivo del documento
Este documento registra que exporta cada archivo, que importa cada archivo de prueba y para que se esta usando en esta etapa del proyecto.

La etapa actual es de pruebas en memoria: todavia no estamos usando MySQL, APIs REST ni Vue como interfaz conectada al backend.

## Exports actuales

### `src/models/index.js`
Exporta las clases principales del dominio:

```js
export { Usuario, Clinica, Sala, Reserva, Paciente, HorarioDisponible };
```

Objetivo:

- `Usuario`: probar login, cierre de sesion y estado del usuario.
- `Clinica`: validar horario laboral y si una reserva puede recibirse.
- `Sala`: validar disponibilidad, estado y eliminacion logica.
- `Reserva`: validar horario, sala usada, solapamiento y eliminacion logica.
- `Paciente`: mantener datos de apoyo asociados a una reserva.
- `HorarioDisponible`: modelar bloques disponibles por sala, fecha y hora.

### `src/services/appointmentService.js`
Exporta las funciones de negocio de reservas que ya estamos probando:

```js
export function puedeCrearReserva(nuevaReserva, reservasExistentes, clinica) {}
export function crearReserva(nuevaReserva, reservasExistentes, clinica) {}
export function editarReserva(reservaId, nuevosDatos, reservasExistentes, clinica) {}
export function eliminarReserva(reservaId, reservasExistentes) {}
export function listarReservas(reservasExistentes) {}
export function buscarReservaPorId(reservaId, reservasExistentes) {}
```

Objetivo:

- Coordinar objetos de dominio.
- Validar primero el horario interno de la reserva.
- Validar despues el horario laboral de la clinica.
- Revisar si la nueva reserva se solapa con reservas existentes.
- Crear reservas en memoria cuando pasan las validaciones.
- Buscar reservas por id para reutilizar esa logica en editar y eliminar.
- Editar reservas y restaurar sus datos anteriores si la edicion genera choque.
- Eliminar reservas por estado, sin borrarlas fisicamente.
- Listar reservas visibles, ocultando las eliminadas.

## Imports actuales

### `src/playground.js`
Importa las clases del dominio:

```js
import { Usuario, Clinica, Sala, Reserva, Paciente, HorarioDisponible } from "./models/index.js";
```

Tambien importa la funcion de servicio:

```js
import { buscarReservaPorId, crearReserva, editarReserva, eliminarReserva, listarReservas, puedeCrearReserva } from "./services/appointmentService.js";
```

Objetivo:

- Crear objetos de prueba en memoria.
- Probar que las clases funcionan antes de conectar MySQL.
- Probar que `appointmentService.js` puede coordinar la logica de reservas.
- Simular una lista de reservas existentes con un array.
- Probar el flujo CRUD de reservas en memoria antes de conectar MySQL.

## Regla de organizacion

- `models/index.js`: solo clases y exports de clases.
- `services/appointmentService.js`: funciones de negocio relacionadas con reservas.
- `playground.js`: objetos temporales y `console.log` para pruebas manuales.
- `resources/`: documentacion y decisiones del proyecto.

## Siguiente export recomendado
Cuando avancemos, las siguientes funciones deberian vivir en servicios separados:

```js
export function crearSala() {}
export function eliminarSala() {}
export function iniciarSesion() {}
```

Estas funciones serian el paso previo a guardar salas, usuarios y reservas en MySQL mediante repositories o DAO.

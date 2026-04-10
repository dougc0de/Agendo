# Agendo Beta - Modelos, servicios y playground

## Objetivo
Este documento explica la diferencia entre `models/index.js`, `services/appointmentService.js` y `playground.js`, y por que los tres existen aunque trabajen juntos.

## `src/models/index.js`
Este archivo contiene las clases del dominio.

Su responsabilidad es definir que es cada objeto y que puede hacer por si mismo:

- `Usuario`: puede iniciar sesion, cerrar sesion y cambiar estado.
- `Clinica`: sabe si esta activa y si una reserva cae dentro del horario laboral.
- `Sala`: sabe si esta activa, disponible o eliminada.
- `Reserva`: sabe validar su horario, editarse, eliminarse y comparar si se solapa con otra reserva.
- `Paciente`: representa informacion de apoyo del paciente.
- `HorarioDisponible`: representa un bloque disponible por sala, fecha y hora.

La idea clave:

```txt
Una clase piensa en su propio estado.
```

Ejemplo:

```js
reserva.eliminarReserva()
```

La reserva se marca a si misma como eliminada.

## `src/services/appointmentService.js`
Este archivo contiene funciones de negocio relacionadas con reservas.

Su responsabilidad es coordinar varios objetos al mismo tiempo:

- una reserva nueva;
- una lista de reservas existentes;
- la clinica;
- reglas de choque de horario;
- reglas de horario laboral;
- busqueda, creacion, edicion, eliminacion y listado en memoria.

La idea clave:

```txt
Un service piensa en una accion del sistema.
```

Ejemplo:

```js
crearReserva(nuevaReserva, reservasExistentes, clinica)
```

Esa funcion no solo cambia una reserva. Primero valida si la reserva puede crearse y despues la agrega a la lista temporal.

Hoy esa lista es un array. Mas adelante sera reemplazada por datos obtenidos desde MySQL mediante repositories o DAO.

## `src/playground.js`
Este archivo es un laboratorio temporal.

Su responsabilidad es crear objetos de prueba y ejecutar `console.log` para comprobar que las clases y servicios funcionan antes de conectar base de datos o interfaz.

La idea clave:

```txt
El playground no contiene reglas finales del sistema.
Solo prueba reglas existentes.
```

Ejemplo:

```js
const reservas = [reservaExistente];
console.log(crearReserva(reservaNoSolapada, reservas, clinica));
```

Ese array simula lo que despues vendra de MySQL.

## Como se vinculan
El flujo actual es:

```txt
playground.js
  importa clases desde models/index.js
  importa funciones desde services/appointmentService.js
  crea objetos de prueba
  llama funciones de servicio

appointmentService.js
  recibe objetos creados desde modelos
  coordina reglas de negocio
  devuelve resultados

models/index.js
  define el comportamiento interno de cada objeto
```

Visualmente:

```txt
models/index.js  -> define objetos
appointmentService.js -> coordina acciones con esos objetos
playground.js -> prueba todo en memoria
```

## Diferencia principal

```txt
models/index.js:
Que sabe hacer un objeto?

appointmentService.js:
Que quiere hacer el sistema usando varios objetos?

playground.js:
Funciona lo que estamos construyendo?
```

## Regla para no mezclar responsabilidades
- No crear objetos permanentes dentro de `models/index.js`.
- No poner `console.log` de pruebas dentro de `appointmentService.js`.
- No poner reglas importantes solo en `playground.js`.
- No conectar MySQL directamente desde `playground.js`.

## Proyeccion a MySQL
Lo que hoy es:

```js
const reservas = [reservaExistente];
```

Despues sera:

```js
const reservas = await reservaRepository.buscarPorSalaYFecha(salaId, fecha);
```

Lo que hoy es:

```js
reservas.push(nuevaReserva);
```

Despues sera:

```js
await reservaRepository.crear(nuevaReserva);
```

Por eso el service es importante: permite que la regla de negocio sobreviva cuando cambiemos arrays por base de datos.

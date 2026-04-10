# Contexto Frontend Agendo Beta

## Resumen
Agendo Beta ya tiene una base de backend para `reservas` conectada a MySQL.
El frontend todavia no esta construido: varios `views` y componentes existen, pero estan vacios o sin integrar.

El objetivo inmediato del frontend es consumir la API de reservas y mostrar un CRUD funcional.

## Arquitectura Actual

### Dominio
- `src/models/index.js`
  - Clases principales: `Usuario`, `Clinica`, `Sala`, `Reserva`, `Paciente`, `HorarioDisponible`
  - Estas clases se usan como dominio y apoyo de validacion

### Backend real
- `src/server/db/connection.js`
  - Conexion MySQL con `mysql2/promise`
- `src/server/repositories/`
  - `reservaRepository.js`
  - `salaRepository.js`
  - `clinicaRepository.js`
- `src/server/services/reservaService.js`
  - Logica del backend real de reservas
- `src/server/routes/reservaRoutes.js`
  - Rutas HTTP de reservas
- `src/server/index.js`
  - Entry point del servidor Express

### Frontend actual
- `src/views/AppointmentsView.vue`
- `src/components/appointments/AppointmentForm.vue`
- `src/components/appointments/AppointmentTable.vue`
- `src/components/appointments/AppointmentFilters.vue`
- `src/services/api.js`
- `src/composables/useAppointments.js`

Estas piezas existen y son buenas candidatas para conectar primero, pero hoy no tienen integracion funcional completa.

## Base de datos relevante
Archivo de referencia:
- `resources/schemes.sql`

### Tabla `reservas`
Campos importantes:
- `id`
- `fecha`
- `hora_inicio`
- `hora_fin`
- `descripcion`
- `estado`
- `tipo_consulta`
- `usuario_id`
- `paciente_id`
- `sala_id`

### Relaciones importantes
- `reservas.usuario_id -> usuarios.id`
- `reservas.paciente_id -> pacientes.id`
- `reservas.sala_id -> salas.id`
- `salas.clinica_id -> clinicas.id`

## API disponible hoy
Base URL local:
- `http://localhost:3000`

### Endpoints
- `GET /`
- `GET /reservas`
- `GET /reservas/:id`
- `POST /reservas`
- `PUT /reservas/:id`
- `DELETE /reservas/:id`

### Formato de respuesta del backend
El `service` devuelve:

```json
{
  "ok": true,
  "msg": "Mensaje",
  "data": {}
}
```

## Payload esperado para crear o editar una reserva
El frontend debe enviar este formato:

```json
{
  "fecha": "2026-04-08",
  "horaInicio": "10:00",
  "horaFin": "11:00",
  "descripcion": "Consulta prueba",
  "estado": "pendiente",
  "tipoConsulta": "consulta",
  "usuarioId": 1,
  "pacienteId": 1,
  "salaId": 1
}
```

## IDs que el frontend debe tener presentes
Para crear o editar reservas, el frontend necesita enviar:
- `usuarioId`
- `pacienteId`
- `salaId`

### Nota importante
Esos IDs deben existir de verdad en MySQL.
No basta con mandar cualquier numero; si no existen, la base de datos fallara por claves foraneas o la validacion del backend.

## Estados de reserva aceptados hoy
- `pendiente`
- `confirmada`
- `cancelada`

## Reglas de negocio que el frontend debe respetar
Aunque el backend valida todo, el frontend debe estar alineado a estas reglas:
- `horaFin` debe ser mayor que `horaInicio`
- la reserva debe caer dentro del horario de la clinica
- la sala debe existir y estar reservable
- no puede haber choque de horario en la misma sala y fecha

## Prioridad recomendada para construir el frontend
1. Crear un servicio frontend para consumir `/reservas`
2. Construir `AppointmentsView.vue`
3. Conectar `AppointmentForm.vue` al `POST` y `PUT`
4. Conectar `AppointmentTable.vue` al `GET` y `DELETE`
5. Si hace falta, usar `AppointmentFilters.vue` solo despues del CRUD base

## Servicio frontend sugerido
Archivo sugerido:
- `src/services/api.js` o `src/services/reservaApi.js`

Funciones sugeridas:
- `getReservas()`
- `getReservaById(id)`
- `createReserva(data)`
- `updateReserva(id, data)`
- `deleteReserva(id)`

## Flujo recomendado del frontend
1. Cargar lista de reservas al entrar a `AppointmentsView`
2. Mostrar formulario de creacion
3. Permitir editar una reserva existente
4. Permitir eliminar una reserva
5. Refrescar la lista despues de crear, editar o eliminar

## Punto de partida seguro
Si otro agente toma el frontend, debe empezar por:
- revisar `src/server/routes/reservaRoutes.js`
- revisar `src/server/services/reservaService.js`
- consumir primero `GET /reservas`
- luego conectar `POST /reservas`

Con eso ya puede construir una primera pantalla util de reservas sin volver a tocar backend.

# Configuraciones de la app

Este archivo resume los elementos configurables de AGENDO y el efecto que tienen sobre la operacion de la clinica.

## Configuraciones actuales

### Tiempo de referencia de consultas
- Alcance: `Global de la clinica`
- Valor por defecto: `30 minutos`
- Que cambia en el sistema: sirve como politica base de agenda para consultas y como referencia visual para administracion y recepcion.
- Modulos afectados: `Configuraciones`, `Reservas`

### Tiempo de referencia de procedimientos
- Alcance: `Global de la clinica`
- Valor por defecto: `60 minutos`
- Que cambia en el sistema: define la duracion base que la clinica suele manejar para procedimientos, aunque el doctor puede ajustar cada reserva.
- Modulos afectados: `Configuraciones`, `Reservas`, `Finanzas`

### Horario operativo de consultas
- Alcance: `Global de la clinica`
- Valor por defecto: `08:00 - 17:00`
- Que cambia en el sistema: bloquea reservas fuera de la ventana de consultas.
- Modulos afectados: `Configuraciones`, `Reservas`, `Dashboard`

### Horario operativo de procedimientos
- Alcance: `Global de la clinica`
- Valor por defecto: `08:00 - 17:00`
- Que cambia en el sistema: bloquea procedimientos fuera de la ventana permitida.
- Modulos afectados: `Configuraciones`, `Reservas`, `Dashboard`, `Finanzas`

### Sin cierre para consultas
- Alcance: `Global de la clinica`
- Valor por defecto: `Desactivado`
- Que cambia en el sistema: elimina la hora de cierre de consultas y solo mantiene la apertura.
- Modulos afectados: `Configuraciones`, `Reservas`

### Sin cierre para procedimientos
- Alcance: `Global de la clinica`
- Valor por defecto: `Desactivado`
- Que cambia en el sistema: elimina la hora de cierre de procedimientos y solo mantiene la apertura.
- Modulos afectados: `Configuraciones`, `Reservas`

### Zona horaria
- Alcance: `Global de la clinica`
- Valor por defecto: `America/Costa_Rica`
- Que cambia en el sistema: decide cuando una reserva ya paso, como se clasifican vistas activas/pasadas y como se interpretan cortes operativos.
- Modulos afectados: `Configuraciones`, `Reservas`, `Dashboard`, `Finanzas`, `KPIs`

### Modalidad aplicada a procedimientos
- Alcance: `Global de la clinica`
- Valor por defecto: `solo_sala`
- Que cambia en el sistema: define si el cobro procedural base usa sala, insumos o ambos.
- Modulos afectados: `Configuraciones`, `Finanzas`, `KPIs`

### Moneda por defecto
- Alcance: `Global de la clinica`
- Valor por defecto: `CRC`
- Que cambia en el sistema: define la moneda principal de facturacion y resumentes monetarios.
- Modulos afectados: `Configuraciones`, `Finanzas`, `Dashboard`, `KPIs`

## Configuraciones nuevas de esta fase

### Tiempo entre procedimientos por sala
- Alcance: `Global de la clinica`
- Valor por defecto: `Desactivado`
- Valor sugerido al activarlo: `15 minutos`
- Que cambia en el sistema: si la clinica lo activa, cada procedimiento bloquea la sala durante esos minutos antes de permitir la siguiente reserva.
- Modulos afectados: `Configuraciones`, `Reservas`, `Dashboard operativo`

### Vista inicial del doctor en Reservas
- Alcance: `Por rol`
- Valor por defecto: `Mis reservas`
- Que cambia en el sistema: el doctor puede alternar entre ver solo lo suyo o ver las reservas de la clinica sin salir del modulo.
- Modulos afectados: `Reservas`, `Calendario de reservas`, `Panel diario`

### Responsable doctor en la reserva
- Alcance: `Global de la clinica con reglas por rol`
- Valor por defecto: `Si agenda un doctor, queda a su nombre`
- Que cambia en el sistema: admin o recepcion deben adjudicar un doctor responsable; el doctor agenda a su propio nombre.
- Modulos afectados: `Reservas`, `Dashboard`, `Finanzas`

## Configuraciones propuestas a futuro

### Horario operativo por sucursal y por tipo de atencion
- Alcance: `Heredable`
- Default sugerido: `Usar base comun y override opcional por sucursal`
- Que cambiaria en el sistema: cada sede podria tener ventanas distintas para consultas y procedimientos sin romper una politica corporativa comun.
- Modulos afectados: `Configuraciones`, `Reservas`, `Dashboard`, `KPIs`

### Filtro inicial por rol en Reservas y Dashboard
- Alcance: `Global o por sucursal`
- Default sugerido: `Doctor = personal, Recepcion/Admin = clinica`
- Que cambiaria en el sistema: cada rol abriria la app ya enfocada en su nivel de operacion.
- Modulos afectados: `Reservas`, `Dashboard`

### Compatibilidad sala-procedimiento
- Alcance: `Por sucursal`
- Default sugerido: `Desactivado`
- Que cambiaria en el sistema: solo ciertos procedimientos podrian reservarse en salas compatibles.
- Modulos afectados: `Salas`, `Reservas`, `Finanzas`

### Reglas de confirmacion antes de facturar
- Alcance: `Global de la clinica`
- Default sugerido: `Facturar solo reservas confirmadas`
- Que cambiaria en el sistema: impediria emitir factura para reservas que no cumplan el workflow operativo definido por la clinica.
- Modulos afectados: `Reservas`, `Finanzas`

### Politicas de cancelacion y no-show
- Alcance: `Global o por sucursal`
- Default sugerido: `Sin penalizacion automatica`
- Que cambiaria en el sistema: permitiria definir ventanas de cancelacion, marcas de no-show y metricas operativas asociadas.
- Modulos afectados: `Reservas`, `Dashboard`, `KPIs`, `Finanzas`

### Campos obligatorios del paciente
- Alcance: `Global o por sucursal`
- Default sugerido: `Nombre y telefono`
- Que cambiaria en el sistema: cada clinica decidiria si correo, fecha de nacimiento u observaciones son obligatorios.
- Modulos afectados: `Pacientes`, `Reservas`

### Recordatorios y notificaciones automaticas
- Alcance: `Global o por sucursal`
- Default sugerido: `Desactivado`
- Que cambiaria en el sistema: enviaria recordatorios previos, confirmaciones o alertas internas segun la operacion de cada sede.
- Modulos afectados: `Reservas`, `Pacientes`, `Dashboard`

### Visibilidad de KPIs por rol y por sucursal
- Alcance: `Heredable`
- Default sugerido: `Base comun con excepciones por rol`
- Que cambiaria en el sistema: permitiria decidir que metricas ve un doctor, recepcion o gerente por sede.
- Modulos afectados: `Dashboard`, `KPIs`

### Reglas de moneda y facturacion por sucursal
- Alcance: `Heredable`
- Default sugerido: `Moneda base comun con override opcional`
- Que cambiaria en el sistema: sedes distintas podrian operar con moneda o reglas comerciales diferentes sin romper consolidacion.
- Modulos afectados: `Configuraciones`, `Finanzas`, `KPIs`

### Modelo base comun + overrides por sucursal
- Alcance: `Heredable`
- Default sugerido: `Base comun de clinica`
- Que cambiaria en el sistema: el admin definiria reglas compartidas y luego activaria excepciones por sucursal solo cuando una sede lo necesite.
- Modulos afectados: `Configuraciones`, `Reservas`, `Finanzas`, `Dashboard`, `KPIs`

## Guia de alcance

- `Global de la clinica`: una sola regla para toda la cuenta.
- `Por sucursal`: cada sede define su propia regla.
- `Heredable`: existe una base comun de clinica y cada sucursal puede mantenerla o sobrescribirla.

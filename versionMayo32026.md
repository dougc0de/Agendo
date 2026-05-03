# Agendo - Version Mayo 3 2026

## Resumen general

Agendo es una plataforma SaaS para clinicas orientada a operacion diaria, reservas, pacientes, salas, usuarios internos, sucursales, finanzas operativas, inventario y lectura gerencial.

Hoy el producto funciona con esta arquitectura:

- Frontend en Vue 3 + Vite
- Backend API en Express
- Base de datos en Supabase Postgres

En terminos de producto, Agendo ya permite operar una clinica desde una sola cuenta con contexto de workspace, control por roles y separacion entre agenda actual e historial.

## Que hace Agendo hoy

- Permite crear cuentas nuevas mediante signup comercial.
- Permite iniciar sesion y operar una cuenta privada.
- Permite manejar una o varias sucursales dentro de la misma cuenta.
- Permite crear y administrar salas por sucursal.
- Permite registrar usuarios internos con roles operativos.
- Permite registrar y buscar pacientes.
- Permite crear, editar, cancelar y consultar reservas.
- Permite ver agenda operativa y tambien historial de reservas.
- Permite emitir cobros y reportes operativos ligados a reservas.
- Permite confirmar pagos despues de emitir un cobro.
- Permite generar PDF imprimible de reportes operativos.
- Permite administrar inventario, stock y movimientos.
- Permite ligar consumo de insumos a procedimientos.
- Permite consultar KPIs operativos y financieros segun el rol.
- Permite configurar reglas operativas de la cuenta.

## Roles y permisos

Los roles operativos visibles en el sistema hoy son:

- `owner`
- `admin`
- `recepcionista`
- `doctor`

Capacidades por perfil en terminos generales:

- `owner` y `admin`: acceso administrativo, usuarios, settings, sucursales, salas, agenda y lectura financiera.
- `recepcionista`: acceso a agenda, pacientes, cobros y lectura financiera operativa.
- `doctor`: acceso centrado en sus reservas y flujo operativo diario.

Permisos relevantes ya modelados:

- acceso administrativo
- acceso a finanzas
- gestion de usuarios internos
- vista total del historial de reservas
- vista personal para doctores

## Modulos publicos

### 1. Home / Landing

Pantalla publica principal:

- presenta a Agendo como sistema de gestion de clinicas
- comunica servicios, precios, sobre nosotros y contacto
- dirige a login y signup

Mensajes principales del producto:

- administracion de salas
- control de disponibilidad
- experiencia operativa mas clara y profesional

### 2. Login

Permite:

- iniciar sesion en una cuenta existente
- entrar a la operacion privada
- mostrar errores de acceso

### 3. Signup

Permite:

- crear una cuenta nueva
- iniciar una prueba comercial
- seleccionar plan desde la oferta publica
- entrar al flujo SaaS de workspace nuevo

## Oferta comercial actual

Agendo ya tiene catalogo comercial definido en codigo.

Datos generales del catalogo actual:

- moneda base comercial: `USD`
- trial por defecto: `10 dias`
- planes publicos de signup: `basic`, `premium`, `enterprise`
- plan sugerido por defecto en pricing: `premium`
- plan por defecto en signup: `basic`

### Plan Basico

Nombre comercial:

- `Basico`

Enfoque:

- orden operativo inicial

Precio:

- `USD 39/mes`

Ideal para:

- clinicas pequenas que quieren dejar atras el desorden sin romper su trabajo diario

Limites del plan:

- hasta `3 usuarios`
- hasta `3 salas`
- hasta `500 reservas por mes`

Beneficios principales:

- reservas completas con validacion de choques y horarios
- calendario, historial y pacientes en una sola cuenta
- usuarios internos, salas y sucursal principal listas para operar

Incluye:

- reservas completas
- calendario
- historial de reservas
- pacientes
- salas
- usuarios internos
- sucursal principal
- configuraciones base
- dashboard operativo simple
- validacion de choques y horarios

Resumen funcional por categoria:

- operacion: reservas, calendario, historial, pacientes, salas, usuarios internos y configuraciones base
- finanzas: no incluye finanzas operativas completas ni facturacion procedural
- inventario: no incluye stock, movimientos ni consumo automatico
- reporting: dashboard operativo simple para agenda y lectura diaria basica
- whatsapp: no disponible en este plan

No incluye:

- finanzas operativas completas
- facturacion procedural
- PDF imprimible
- inventario con stock y movimientos
- KPIs gerenciales
- reportes financieros operativos
- Asistente Operativo de Citas por WhatsApp

Valor de upgrade:

- cuando la clinica necesita cobrar mejor, imprimir facturas y leer el negocio con mas control, Premium suma finanzas, inventario y reportes

### Plan Premium

Nombre comercial:

- `Premium`

Enfoque:

- operacion + finanzas + inventario

Precio:

- `USD 89/mes`

Ideal para:

- clinicas con mas citas al dia, recepcion activa y necesidad de trabajar con menos friccion manual

Limites del plan:

- hasta `10 usuarios`
- hasta `10 salas`
- hasta `3000 reservas por mes`

Beneficios principales:

- finanzas operativas, facturacion procedural y PDF imprimible
- historial pagado y no pagado con confirmacion posterior de pago
- inventario con stock, movimientos y consumo automatico en procedimientos

Incluye:

- todo lo del plan Basico
- finanzas operativas completas
- facturacion procedural
- confirmacion posterior de pago
- historial pagado y no pagado
- PDF imprimible
- moneda por cuenta y por caso
- inventario con stock
- movimientos de inventario
- consumo automatico en procedimientos
- reportes financieros operativos
- dashboard con KPIs para admin y recepcion
- acceso al add-on de WhatsApp

Resumen funcional por categoria:

- operacion: mantiene toda la operacion central mientras la clinica crece
- finanzas: cobros, facturacion procedural, confirmacion de pago e historial pagado/no pagado
- inventario: stock, movimientos y consumo automatico ligado a procedimientos
- reporting: reportes financieros operativos y dashboard con KPIs para admin y recepcion
- whatsapp: puede activar el add-on como complemento opcional

No incluye:

- comparativas profundas entre sedes
- onboarding asistido
- acompanamiento comercial y tecnico continuo

Valor de upgrade:

- ya no solo trabajas mejor; tambien puedes cerrar pagos, leer cobros, controlar insumos y reducir trabajo manual

### Plan Enterprise

Nombre comercial:

- `Enterprise`

Enfoque:

- escala multi-sucursal y lectura ejecutiva reforzada

Precio:

- `Desde USD 149/mes`

Ideal para:

- clinicas con varias sedes, mas personal o necesidad de acompanamiento para una operacion con mas capas

Limites del plan:

- usuarios practicamente ilimitados
- salas practicamente ilimitadas
- reservas mensuales practicamente ilimitadas

Beneficios principales:

- mayor capacidad para usuarios, salas y reservas sin frenar la operacion
- lectura ejecutiva reforzada y comparativas mas profundas entre sedes
- onboarding asistido, acompanamiento comercial y configuracion mas negociada

Incluye:

- todo lo del plan Premium
- mayor capacidad de usuarios, salas y reservas
- comparativas mas profundas entre sedes
- onboarding asistido
- acompanamiento comercial y tecnico
- configuracion mas negociada
- add-on de WhatsApp opcional o negociable

Resumen funcional por categoria:

- operacion: lleva mejor la base operativa a entornos con mas sedes y movimiento
- finanzas: mantiene el cierre financiero de Premium y suma mejor lectura ejecutiva
- inventario: conserva inventario operativo y espacio para procesos de mayor escala
- reporting: comparativas mas profundas por sede y lectura ejecutiva reforzada
- whatsapp: puede sumarse como add-on o negociarse comercialmente

Valor de upgrade:

- Enterprise no rompe la operacion base; la amplia con mas lectura ejecutiva, acompanamiento y margen para crecer

### Add-on comercial actual

Existe un add-on definido:

- `Asistente Operativo de Citas por WhatsApp`

Precio del add-on:

- `USD 19/mes`

Disponibilidad:

- disponible para `Premium`
- disponible para `Enterprise`
- no disponible para `Basico`

Capacidades declaradas:

- confirmacion de citas
- cancelacion guiada
- consulta basica de cita
- solicitud de reprogramacion
- hasta `500 mensajes por mes`
- fallback a email cuando aplique

Exceso de uso:

- `USD 0.04` por mensaje adicional

## Modulos privados del producto

### 1. Dashboard

Es el centro de mando operativo y gerencial.

Elementos actuales:

- hero con nombre del workspace
- acceso rapido a Reservas, Historial de Reservas y Finanzas
- bloque de siguiente reserva
- bloque de plan activo con limites y trial

Lectura operativa basica:

- reservas totales
- pendientes
- confirmadas
- reservas de la semana
- citas del dia
- mis citas de hoy

Lectura KPI y gerencial:

- ocupacion de salas
- no-show
- tasa de cancelacion
- ticket promedio
- ingreso por sala/hora
- ingreso promedio por medico
- margen bruto procedural
- revenue leakage
- pendiente de cobro

Filtros disponibles en dashboard:

- rango de fechas
- sucursal
- sala
- medico o responsable
- estado
- moneda
- granularidad dia, semana o mes

Paneles y bloques funcionales visibles:

- disponibilidad de salas
- alertas operativas
- agenda visual
- reservas operativas
- rankings y breakdowns

### 2. Reservas

Pantalla central de operacion diaria.

Permite:

- agendar reserva
- editar reserva
- eliminar reserva
- cambiar entre vista de lista y calendario
- crear sala desde el mismo modulo si el actor es admin
- navegar calendario por dia, semana y mes
- abrir detalle de un dia del calendario

Elementos de la tabla y agenda:

- fecha
- hora inicio
- hora fin
- paciente
- sala
- responsable
- tipo de consulta o procedimiento
- estado
- pago

Comportamiento operativo ya implementado:

- validacion de choques de horario
- validacion de horario operativo de la cuenta
- validacion de separacion entre procedimientos
- validacion para no iniciar reservas en el pasado
- asignacion de doctor responsable
- filtros por estado
- filtros por alcance para doctores
- busqueda textual

La agenda distingue:

- reservas vigentes
- reservas en curso
- historial de reservas

### 3. Historial de Reservas

Pantalla separada de la agenda activa.

Permite:

- consultar reservas pasadas
- filtrar por paciente
- filtrar por estado
- filtrar por pago
- filtrar por rango de fechas
- filtrar por usuario cuando el rol lo permite

Permite tambien:

- cerrar resultado de una reserva
- marcar resultados como atendida, no_show o cancelada
- revisar si la reserva fue pagada o no

### 4. Pacientes

Modulo de base de pacientes.

Permite:

- buscar pacientes por nombre
- buscar pacientes por telefono
- buscar pacientes por correo
- registrar paciente nuevo
- destacar el ultimo alta reciente

La busqueda y el alta estan pensadas para:

- flujo rapido desde recepcion
- reutilizacion del paciente en reservas

### 5. Usuarios internos

Modulo de equipo interno de la cuenta.

Permite:

- crear usuario interno
- editar usuario interno
- activar usuario
- inactivar usuario
- asignar rol
- asignar sucursal principal

Roles visibles en la tabla:

- admin
- recepcionista
- doctor

Campos visibles en la gestion:

- nombre
- correo
- rol
- sucursal
- estado

### 6. Sucursales

Modulo de organizacion territorial.

Permite:

- crear sucursal
- editar sucursal
- activar sucursal
- inactivar sucursal

La lectura actual por sucursal muestra:

- nombre
- direccion
- telefono
- estado
- cantidad de salas asociadas
- cantidad de usuarios asociados

Tambien existe:

- sucursal destacada
- resumen de operacion por sede

### 7. Configuraciones

Modulo administrativo de reglas operativas de la cuenta.

Permite configurar:

- duracion de referencia para consultas
- duracion de referencia para procedimientos
- separacion entre procedimientos
- hora de apertura y cierre de consultas
- hora de apertura y cierre de procedimientos
- modo sin cierre para consultas o procedimientos
- zona horaria de la cuenta
- moneda base
- politica procedural
- modalidad procedural por defecto

Estas configuraciones impactan directamente:

- agenda
- validacion de reservas
- lectura temporal de reservas vigentes vs historial
- facturacion procedural
- lectura financiera

### 8. Finanzas

Es un modulo amplio y hoy ya esta dividido en tabs.

Tabs principales:

- `Cobros`
- `Inventario`
- `Reportes operativos`

#### Cobros

Sub-bandejas actuales:

- `Por facturar`
- `Pendientes de pago`
- `Pagadas y cerradas`

Permite:

- listar reservas facturables
- emitir factura o reporte operativo ligado a una reserva
- editar cobro
- confirmar pago
- actualizar estatus de pago
- revisar historico pagado
- revisar historico pendiente
- consultar resumen financiero

Filtros disponibles:

- paciente
- desde
- hasta
- sucursal
- usuario
- sala
- estado de pago
- atajos de fecha

Datos financieros visibles:

- ingresos cobrados
- pendiente por cobrar
- exonerado
- margen bruto
- reservas pagadas

Tambien maneja:

- modalidad de cobro procedural
- moneda
- decision cobrable o exonerado
- PDF imprimible de reportes

#### Inventario

Capacidades actuales:

- ver catalogo de inventario
- crear item de inventario
- editar item
- activar item
- inactivar item
- registrar movimientos
- revisar movimientos por item
- consultar resumen de inventario
- consultar reportes de inventario

Lecturas visibles:

- stock bajo
- agotados
- inactivos
- costo consumido
- alertas
- insumos mas usados

#### Reportes operativos

Capacidades actuales:

- ver lectura contable y operativa
- ver agregacion por salas
- ver agregacion por usuarios
- imprimir PDF

### 9. KPIs

Aunque gran parte se consume desde Dashboard, existe modulo backend especifico para KPIs.

Endpoints ya definidos:

- dashboard
- trends
- breakdown
- reports
- alerts

La lectura KPI soporta:

- filtros por sucursal
- filtros por sala
- filtros por doctor
- filtros por estado
- filtros por appointment outcome
- filtros por moneda

## Capacidades transversales del sistema

### Autenticacion y cuenta

Agendo hoy soporta:

- login
- signup de owner del workspace
- recuperacion de contexto de cuenta con `/auth/me`
- lectura de suscripcion actual
- lectura del plan actual

### Modelo multi-tenant

La cuenta esta organizada por:

- workspace
- sucursales
- usuarios internos
- salas
- pacientes
- reservas

Esto permite:

- separar datos por cuenta
- operar varias sucursales
- filtrar por sede y responsable

### Reglas de agenda

Agendo ya aplica reglas operativas como:

- evitar reservas en el pasado
- evitar choques en sala
- controlar buffers entre procedimientos
- separar reservas vigentes del historial
- respetar zona horaria de la cuenta

### Integracion entre modulos

Reservas hoy se conecta con:

- pacientes
- salas
- sucursales
- usuarios internos
- finanzas
- inventario
- KPIs

Esto significa que una misma reserva puede terminar afectando:

- la agenda
- el historial
- la facturacion
- el estado de pago
- el consumo de insumos
- las metricas gerenciales

## Elementos principales que hoy ve o usa un usuario

### Usuario administrativo

Puede operar con:

- dashboard completo
- reservas
- historial de reservas
- pacientes
- sucursales
- usuarios internos
- configuraciones
- finanzas
- inventario
- reportes operativos
- KPIs

### Recepcionista

Puede operar con:

- dashboard operativo
- reservas
- historial
- pacientes
- finanzas operativas
- confirmacion de pago

### Doctor

Puede operar con:

- agenda personal o filtrada
- lectura de sus propias reservas
- seguimiento de flujo diario

## Estado funcional general de Agendo al 3 de mayo de 2026

Agendo ya no es solo una agenda simple. En su estado actual ya funciona como una base SaaS clinica con estas capas:

- operacion diaria de reservas
- organizacion por sucursal y salas
- pacientes y equipo interno
- configuracion operativa por cuenta
- finanzas operativas y cobro procedural
- inventario ligado a procedimientos
- lectura gerencial y KPI
- oferta comercial por planes

## Resumen corto de producto

Agendo hoy permite que una clinica:

- cree su cuenta
- configure su operacion
- registre equipo, salas y pacientes
- agende y gestione reservas
- separe agenda actual e historial
- facture procedimientos
- confirme cobros
- controle inventario
- lea indicadores operativos y financieros

Ese es el alcance funcional general visible e implementado al 3 de mayo de 2026.

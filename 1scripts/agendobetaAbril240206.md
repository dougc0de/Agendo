# AGENDO Beta - Estado actual del producto y briefing para marketing

**Fecha de corte:** 25 de abril de 2026

> Documento interno basado en el estado actual del codigo. Esta pieza esta pensada para que marketing traduzca despues esta realidad tecnica a lenguaje publico, comercial y de posicionamiento.

## 1. Resumen ejecutivo

AGENDO hoy es un **SaaS beta para gestion operativa de clinicas**. Ya cubre una base bastante solida para operar el dia a dia de un centro pequeno o mediano: **cuenta multiusuario, reservas, salas, pacientes, sucursales, configuraciones operativas, usuarios internos, historial, calendario, finanzas operativas, inventario reusable y factura procedural imprimible**.

La aplicacion ya tiene **signup publico, roles, planes, trial y separacion clara entre zona publica y zona privada**. Tambien tiene una base multi-tenant real, con limites por plan y un flujo administrativo usable para direccion y recepcion.

Sigue siendo beta porque todavia faltan piezas de escala y robustez para una salida comercial mas fuerte, por ejemplo:

- pagos online integrados;
- checkout publico del SaaS;
- inventario con stock real y trazabilidad;
- notificaciones automaticas;
- testing automatizado formal visible en el repo;
- capa clinica mas profunda como historia clinica o expediente medico.

## 2. Que es AGENDO hoy

AGENDO es un SaaS en espanol orientado a la **organizacion clinica**, centrado en:

- reservas de salas;
- atencion operativa diaria;
- control administrativo por cuenta;
- apoyo a recepcion y direccion del centro.

El termino visible al usuario es **Cuenta**, aunque internamente el sistema sigue usando `workspace` como unidad tecnica de tenancy.

### Perfil de uso real hoy

- **Direccion / administracion de clinica**
- **Recepcion**
- **Doctores o profesionales internos**
- **Clinicas y centros con salas de consulta y/o procedimientos**

### Senales de mercado que ya existen en el producto

- interfaz en espanol;
- timezones orientados a LATAM;
- monedas LATAM + USD;
- narrativa visual y operativa centrada en clinicas hispanohablantes;
- flujos pensados para recepcion y direccion antes que para paciente final.

## 3. Publico objetivo actual

### Comprador primario

- director/a de clinica;
- administrador/a del centro;
- socio operador;
- dueno/a de una clinica con necesidad de orden operativo.

### Usuario diario principal

- recepcionista.

### Usuario secundario

- doctor/profesional interno.

### Tipo de organizacion mas alineada hoy

- clinicas pequenas y medianas;
- centros con varias salas;
- operacion de consulta y procedimientos;
- equipos que necesitan orden operativo, agenda, facturacion interna y control por sede.

### Lo que hoy todavia no es el foco mas fuerte

- hospitales complejos;
- ERP clinico completo;
- historia clinica;
- inventario con stock y kardex;
- cobro online al paciente;
- payroll legal completo;
- contabilidad empresarial formal.

## 4. Estado actual del SaaS

### Producto

AGENDO ya esta **muy por encima de un MVP simple de agenda**. Hoy ya existe una capa SaaS real con onboarding, planes, trial, limites, roles, settings y modulos internos conectados.

### Operacion clinica

La parte operativa esta bien encaminada. Reservas, historial, sucursales, pacientes, usuarios internos y recepcion ya tienen valor real para pruebas beta con uso cotidiano.

### Comercializacion SaaS

El sistema ya tiene:

- planes creados;
- trial automatico;
- limites por plan;
- signup publico.

Pero todavia **no tiene checkout o pasarela publica del SaaS**. La comercializacion sigue siendo parcialmente asistida, sobre todo para Enterprise.

### Finanzas internas

La capa financiera ya es diferencial para una beta:

- facturacion procedural interna;
- emision de factura antes del pago;
- confirmacion posterior de pago;
- inventario reusable por procedimiento;
- PDF imprimible con firmas manuales;
- resumen operativo y financiero.

### Madurez tecnica

- frontend Vue/Vite funcional;
- backend Express;
- PostgreSQL con migraciones Supabase;
- auth con JWT;
- multitenancy por cuenta;
- roles y permisos ya visibles;
- no se detecto suite de tests automatizados formal en el repo.

### Veredicto actual

**AGENDO ya se puede presentar como beta funcional seria** para clinicas pequenas y medianas.  
Todavia **no debe venderse** como plataforma clinica total, ERP medico completo ni sistema contable/legal completo.

## 5. Arquitectura y stack actual

### Frontend

- Vue 3
- Vite
- Pinia
- Vue Router

### Backend

- Express
- estructura por rutas + servicios + repositorios

### Base de datos

- PostgreSQL
- migraciones via Supabase CLI
- acceso desde backend con `pg`

### Auth

- JWT
- sesion por cuenta
- persistencia local del contexto de usuario, cuenta y suscripcion

### Orientacion de dominio

- multi-tenant por cuenta;
- sucursales por cuenta;
- settings por cuenta;
- usuarios internos por cuenta;
- facturacion procedural por cuenta.

### Nota importante

El formulario de contacto del landing **no esta conectado a backend ni CRM** hoy. Funciona como interaccion visual local, no como captacion comercial integrada.

## 6. Modelo SaaS y onboarding

### Flujo actual de alta

El signup publico vive en **`/signup`** y al crear una cuenta genera:

- usuario propietario/admin;
- cuenta;
- clinica;
- sucursal principal;
- suscripcion;
- configuraciones operativas iniciales.

### Trial

- Trial automatico de **14 dias**
- El usuario entra autenticado al terminar el signup

### Estado comercial inicial observado en codigo

- `commercialStatus: trial`
- `billingMode: paid`

### Consideraciones

- `Enterprise` existe como plan en el modelo;
- `Enterprise` **no** esta disponible como alta publica autoservicio;
- signup publico hoy solo expone **Basico** y **Premium**.

## 7. Planes de pago creados

| Plan | Usuarios | Salas | Reservas/mes | Posicionamiento actual |
|---|---:|---:|---:|---|
| Basico | 3 | 3 | 500 | Ideal para empezar |
| Premium | 10 | 10 | 3000 | Escala con mas capacidad |
| Enterprise | 9999 | 9999 | 999999 | Venta asistida |

### Aclaraciones

- signup publico solo permite **Basico** y **Premium**;
- `Enterprise` queda como via comercial asistida;
- hoy no se expone precio numerico publico en codigo;
- lo que si existe hoy es el **posicionamiento del plan y sus limites**.

## 8. Roles y permisos actuales

| Rol | Reservas | Historial | Pacientes | Sucursales | Finanzas | Inventario | Configuraciones | Usuarios internos |
|---|---|---|---|---|---|---|---|---|
| owner/admin | Si | Si | Si | Si | Si | Si | Si | Si |
| recepcionista | Si | Si | Si | Si operativo | Si | Si | No | No |
| doctor | Si | Si, segun alcance | Uso operativo indirecto | No como admin | No | No | No | No |

### Notas de permisos

- `owner/admin` tienen acceso administrativo total;
- `recepcionista` es el rol operativo diario mas importante;
- `doctor` queda fuera de finanzas y configuraciones;
- `staff` sigue existiendo como compatibilidad tecnica legado.

### Navegacion privada visible

- Dashboard
- Reservas
- Pacientes
- Sucursales
- Finanzas (segun rol)
- Administracion (`/settings` y `/users`) para admin

## 9. Rutas principales y zonas del producto

### Zona publica

- `/`
- `/login`
- `/signup`

### Zona privada

- `/dashboard`
- `/appointments`
- `/appointments/past`
- `/patients`
- `/branches`
- `/finance`
- `/settings`
- `/users`

## 10. Inventario completo de funcionalidades actuales

### Zona publica

- landing institucional;
- login;
- signup por plan;
- contacto visual local;
- presentacion de propuesta de valor y servicios.

### Dashboard

- resumen ejecutivo;
- siguiente reserva;
- agenda visual de proximos dias;
- metricas rapidas;
- tarjeta de plan activo para admin;
- acceso a Reservas e Historial de Reservas.

### Reservas

- crear reserva;
- editar reserva;
- eliminar reserva;
- cambiar estado (`pendiente`, `confirmada`, `cancelada`);
- validacion de choques;
- validacion de horario operativo;
- asociacion con paciente y sala;
- seleccion de sala por dropdown;
- filtros;
- vista `Lista | Calendario`;
- calendario por `Mes | Semana | Dia`;
- panel/modal por dia;
- no mezcla reservas pasadas con agenda operativa.

### Historial de Reservas

- modulo separado;
- filtros por paciente, estado, fecha y usuario segun rol;
- historico visible sin contaminar la agenda actual.

### Pacientes

- busqueda por nombre, telefono y correo;
- alta rapida;
- reutilizacion en flujo de reservas;
- destaque del ultimo paciente creado en sesion.

### Sucursales

- CRUD visible;
- activacion/inactivacion;
- conteo de salas y usuarios por sede;
- sucursal principal por cuenta.

### Salas

- existen a nivel backend y operativo;
- se crean desde el flujo de reservas;
- forman parte central del sistema de agenda y finanzas;
- todavia no viven como modulo standalone principal en navbar.

### Configuraciones

- horarios operativos de consulta y procedimiento;
- tiempos de referencia opcionales;
- timezone;
- moneda base;
- modalidad procedural bloqueada por cuenta.

### Usuarios internos

- crear usuarios;
- editar usuarios;
- activar/inactivar;
- asignar sucursal principal;
- roles actuales: admin, recepcionista, doctor.

### Finanzas

- facturacion procedural;
- estado de factura pendiente/pagada/anulada;
- confirmacion de pago posterior;
- moneda por defecto por cuenta + cambio por caso;
- inventario reusable de insumos/equipo;
- busqueda de insumos para anexarlos a un procedimiento;
- asociacion de insumos a procedimientos;
- PDF imprimible por operacion/procedimiento;
- resumen operativo y financiero;
- reportes por sala, usuario y cobro.

## 11. Facturacion, inventario y reportes

### Naturaleza de la facturacion actual

La facturacion actual **no es una pasarela de pago**. Es una **facturacion operativa interna**, pensada para recepcion y control administrativo.

### Modalidades actuales

- solo sala
- solo insumos
- sala + insumos

### Flujo actual

1. Se emite la factura
2. Se imprime
3. Luego recepcion confirma el pago

### Inventario

- es un catalogo reusable;
- no maneja stock real;
- permite buscar insumos existentes;
- permite anexarlos al procedimiento;
- guarda snapshots operativos del uso.

### PDF

- factura imprimible;
- incluye firma manual;
- incluye procedimiento, paciente, sala, montos e insumos segun modalidad.

### Reportes actuales

- ingresos cobrados;
- ingresos pendientes;
- montos exonerados;
- capital por sala;
- capital por usuario;
- costo de insumos;
- margen bruto aproximado.

## 12. APIs y superficie funcional existente

### Familias principales de endpoints

- `auth`
- `reservas`
- `pacientes`
- `salas`
- `sucursales`
- `usuarios-internos`
- `configuraciones`
- `finanzas`

### Capacidades actuales de la API

- CRUD operativo;
- historial;
- calendario;
- configuracion;
- facturacion;
- inventario;
- PDF;
- confirmacion posterior de pago.

## 13. Que ya se puede vender y que no se debe sobreprometer

### Si se puede comunicar hoy

- gestion operativa de clinicas por cuenta;
- organizacion de salas y reservas;
- agenda visual;
- pacientes;
- sucursales;
- usuarios internos;
- facturacion procedural interna;
- inventario reusable por procedimiento;
- soporte para multiples monedas LATAM;
- enfoque claro para direccion y recepcion.

### No se debe comunicar como disponible total

- pagos online integrados;
- checkout publico automatizado del SaaS;
- inventario con stock y kardex;
- historia clinica;
- notificaciones automaticas;
- CRM/contacto comercial integrado;
- contabilidad legal completa o payroll formal;
- suite fuerte de testing automatizado;
- ecosistema hospitalario complejo.

## 14. Lectura estrategica de como va AGENDO

### Fortalezas actuales

- base SaaS multi-tenant ya real;
- UX interna avanzada para beta;
- finanzas e inventario diferencian el producto;
- rol de recepcion esta bien pensado;
- planes, trial y onboarding ya existen.

### Senales de producto prometedor

- onboarding propio;
- planes y trial activos;
- limites por plan;
- calendario + historial + facturacion;
- capa administrativa real por cuenta.

### Riesgos o pendientes

- sin pagos SaaS automatizados;
- sin suite automatizada visible en repo;
- algunas areas todavia viven como beta operativa y no como producto comercial terminado;
- salas todavia no aparecen como modulo principal dedicado en navbar.

### Conclusion sugerida

AGENDO ya es presentable como **beta SaaS funcional para clinicas pequenas y medianas**.  
Todavia **no** debe posicionarse como suite clinica total, ERP medico o sistema contable completo.

## 15. Estado actual de producto frente al marketing

### Lo que marketing ya puede tomar como base

- narrativa de orden operativo;
- agenda visual y control de salas;
- enfoque en direccion y recepcion;
- operacion multiclinica por cuenta;
- crecimiento por planes;
- facturacion procedural como diferenciador.

### Lo que marketing debe tratar con cuidado

- no hablar de pagos online al paciente;
- no hablar de inventario con stock real;
- no vender contacto o captacion automatizada desde la web;
- no vender una solucion hospitalaria de alta complejidad.

## 16. Resumen final

AGENDO hoy ya no es solo una agenda de salas. Es una **beta SaaS clinica con operacion interna real**, pensada para organizar reservas, salas, pacientes, sedes, equipo humano y facturacion procedural desde una sola cuenta.

Su posicionamiento actual mas honesto es:

> **AGENDO es una beta SaaS para clinicas pequenas y medianas que necesitan ordenar reservas, salas, recepcion y control operativo sin cargar al equipo con sistemas complejos o dispersos.**

Ese es, hoy, el estado mas fiel del producto segun el codigo existente.

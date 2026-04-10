Agendo — Documento complementario de arquitectura Vue + POO

Este documento complementa y nutre la base inicial del proyecto, tomando como referencia la documentación ya definida del proyecto Agendo y consolidando las decisiones nuevas establecidas en esta conversación. La base funcional del proyecto ya establece que Agendo es una aplicación orientada a la gestión de horarios y espacios dentro de una clínica, enfocada inicialmente en una sola clínica, con usuarios internos por rol, reservas de salas y validación de conflictos.

1. Propósito de este documento

Este documento tiene como objetivo dejar clara la línea recomendada para el frontend del proyecto Agendo usando Vue, sin contradecir la base ya definida del proyecto, sino ampliándola con una estructura más clara para:

arquitectura de pantallas;

organización de módulos y vistas;

separación correcta entre páginas, subvistas y componentes;

uso de Vue Router;

enfoque escalable y sostenible;

coherencia con una construcción orientada a objetos.

La línea vigente que debe prevalecer es la más reciente definida en esta conversación.

2. Línea arquitectónica aprobada

Agendo debe construirse siguiendo una línea de desarrollo que combine:

frontend modular en Vue;

navegación organizada por rutas;

separación clara entre módulos, vistas y componentes;

modelo de dominio orientado a objetos (POO);

pensamiento escalable desde la fase beta.

La decisión recomendada es que el proyecto no se trate como una sola vista grande, ni como una acumulación de componentes sin jerarquía, sino como una aplicación con una estructura profesional.

Principio rector

La forma más sostenible de hacer crecer Agendo es esta:

modelar correctamente el dominio del negocio con POO;

definir módulos principales del sistema;

convertir esos módulos en vistas o páginas principales;

derivar subvistas cuando una tarea tenga suficiente peso funcional;

usar componentes para piezas reutilizables de interfaz.

Esta línea es la más recomendable para que el proyecto sea:

mantenible;

entendible;

escalable;

fácil de extender a nuevos roles, nuevas pantallas y nuevas reglas de negocio.

3. Regla clave para no mezclar conceptos

En el proyecto Agendo deben distinguirse con claridad estos niveles:

3.1. Módulo o página principal

Es una sección grande del sistema que representa un área funcional importante del negocio.

Ejemplos:

Dashboard;

Agenda;

Pacientes;

Reservas;

Salas;

Perfil;

Configuración.

3.2. Subvista

Una subvista es una vista interna que pertenece a un módulo principal.

En la práctica, puede ser:

una ruta hija;

una pantalla interna;

una página secundaria dentro de un módulo.

Ejemplo en Pacientes:

Lista de pacientes;

Detalle de paciente;

Crear paciente;

Editar paciente.

Es importante dejar claro que, en la arquitectura propuesta, una subvista no es un componente. Es una parte funcional interna de una sección principal.

3.3. Componente

Un componente es una pieza reutilizable de interfaz.

Ejemplos:

tabla;

formulario;

buscador;

modal;

tarjeta;

badge;

calendario;

barra de filtros.

Un componente sirve para construir una vista, pero no representa por sí mismo una sección completa del sistema.

4. Arquitectura de módulos recomendada para AGENDO

La siguiente estructura es la recomendada como línea principal del sistema.

4.1. Módulos principales del sistema privado

Dashboard

Agenda

Pacientes

Reservas

Salas

Perfil

Configuración

4.2. Módulos administrativos

Doctores

Usuarios

Reportes

Configuración clínica

4.3. Módulos públicos

Inicio

Sobre nosotros

Contáctanos

Login

Registro

Recuperar contraseña

5. Aclaración importante sobre Pacientes y módulos similares

Desde Pacientes en adelante, cuando se definieron elementos como Pacientes, Reservas, Salas, Perfil, Doctores, Usuarios o Reportes, la recomendación fue pensarlos primero como:

módulos del sistema;

páginas principales;

o subvistas internas según el caso.

No deben interpretarse primero como componentes.

Regla establecida

Pacientes = módulo o página principal.

Lista de pacientes = subvista.

Detalle de paciente = subvista.

Crear paciente = subvista.

Editar paciente = subvista.

PatientTable, PatientForm, PatientSearchBar = componentes.

La misma lógica se replica en Reservas, Salas, Doctores, Usuarios y Reportes.

6. Sitemap funcional recomendado

A continuación se deja la línea recomendada para el sitemap funcional del proyecto.

6.1. Área pública

Inicio

Sobre nosotros

Contáctanos

Login

Registro

Recuperar contraseña

6.2. Área privada operativa

Dashboard

Agenda

Pacientes

Reservas

Salas

Perfil

Configuración

6.3. Área administrativa

Doctores

Usuarios

Reportes

Configuración clínica

7. Recomendación importante sobre Dashboard

El Dashboard debe entenderse como:

pantalla principal de resumen;

punto de entrada después del login;

centro de acceso rápido a funciones relevantes.

No se recomienda usar el Dashboard como lugar donde viva toda la lógica completa de módulos grandes.

Lo correcto

El Dashboard puede mostrar:

agenda del día;

próximos pacientes;

próximas reservas;

estado rápido de salas;

accesos rápidos a funciones importantes.

Ejemplo de acceso válido desde Dashboard

botón: Gestionar disponibilidad.

Ese botón debe llevar al usuario a una página propia de Gestión de disponibilidad.

Regla aprobada

Dashboard = acceso y resumen;

Gestión de disponibilidad = vista independiente.

Esto mantiene la claridad del sistema y evita que el Dashboard se vuelva una pantalla sobrecargada.

8. Gestión de disponibilidad

La gestión de disponibilidad sí aplica como funcionalidad importante para el profesional.

Recomendación

Debe existir como una página propia o vista independiente, accesible desde el Dashboard mediante un botón o acceso rápido.

Qué puede permitir esa vista

definir días laborales;

definir días no disponibles;

establecer bloques horarios;

bloquear horas específicas;

configurar duración base de consulta;

configurar duración base de procedimiento;

contemplar tiempos colchón o buffers entre reservas.

Qué no se recomienda

No se recomienda incrustar toda esta lógica dentro del Dashboard como si fuera una simple sección interna permanente.

9. Agenda y modo calendario

La decisión recomendada es no tratar “Modo calendario” como una página principal aislada, sino como una forma de visualización dentro del módulo Agenda.

Entonces

Agenda = módulo o página principal.

Vista calendario = subvista o modo de visualización.

Vista lista = subvista o modo de visualización.

Vista día / semana / mes = variantes internas de Agenda.

Eso evita duplicar páginas innecesarias y mantiene una estructura más limpia.

10. Reservas: consulta y procedimiento

La separación entre:

reservar para consulta;

reservar para procedimiento;

sí tiene sentido funcional y debe mantenerse en la arquitectura, porque no siempre ambos casos requieren la misma lógica.

Recomendación

Dentro del módulo Reservas, deben poder existir subvistas o flujos distintos para:

nueva consulta;

nuevo procedimiento;

detalle de reserva;

reprogramación;

cancelación.

Razón de negocio

Un procedimiento puede requerir:

más tiempo;

una sala específica;

preparación previa;

reglas operativas distintas.

Esto está alineado con la base original del proyecto, que ya reconoce que no todas las atenciones requieren el mismo tipo de espacio y que las reservas deben asociar tiempo, espacio, responsable y motivo.

11. Recomendación sobre salas

Dado que Agendo no solo agenda personas, sino también recursos físicos y tiempo operativo, Salas debe considerarse un módulo propio del sistema, no solo un dato secundario.

Posibles subvistas de Salas

Disponibilidad de salas;

Estado de salas;

Reservas del día por sala;

Detalle de sala.

Esto nutre la definición original del proyecto, donde la sala ya es una entidad principal del negocio.

12. Perfil y configuración
Perfil

Perfil debe existir como página propia del usuario, pero no debe funcionar como raíz de todo el sistema privado.

Configuración

Configuración debe concentrar ajustes personales u operativos, como por ejemplo:

preferencias del profesional;

configuración de disponibilidad;

duraciones base de atención;

reglas operativas individuales.

Configuración clínica

Para administrador o dueño, debe existir una configuración aparte de la clínica, enfocada en:

datos de la clínica;

horarios generales;

reglas del sistema;

parámetros base.

13. Explicación simple de Vue Router dentro del proyecto

En una app Vue con varias páginas, normalmente no se crean muchos archivos HTML separados. Lo recomendable es usar Vue Router para que una sola aplicación muestre distintas vistas según la URL.

Qué resuelve el router

Permite definir cosas como:

si la URL es /dashboard, mostrar Dashboard;

si la URL es /patients, mostrar Pacientes;

si la URL es /reservations, mostrar Reservas.

Para qué existe la carpeta router/

La carpeta router/ sirve para guardar centralizada la configuración de navegación de toda la aplicación.

Su responsabilidad es:

definir rutas;

asociar rutas con vistas;

mantener ordenada la navegación.

Eso evita mezclar la lógica de navegación con los componentes o con la interfaz.

Idea simple

views/ = páginas;

components/ = piezas reutilizables;

router/ = mapa que decide qué página mostrar.

14. Estructura recomendada del frontend Vue

Esta es la estructura recomendada y estable para Agendo en la fase actual.

src/
│
├── assets/
│   ├── images/
│   └── styles/
│
├── components/
│   ├── base/
│   │   ├── BaseButton.vue
│   │   ├── BaseInput.vue
│   │   └── BaseModal.vue
│   │
│   ├── layout/
│   │   ├── AppNavbar.vue
│   │   ├── AppSidebar.vue
│   │   └── AppFooter.vue
│   │
│   ├── appointments/
│   │   ├── AppointmentForm.vue
│   │   ├── AppointmentTable.vue
│   │   └── AppointmentFilters.vue
│   │
│   ├── patients/
│   │   ├── PatientForm.vue
│   │   └── PatientTable.vue
│   │
│   └── doctors/
│       ├── DoctorCard.vue
│       └── DoctorSchedule.vue
│
├── views/
│   ├── HomeView.vue
│   ├── LoginView.vue
│   ├── DashboardView.vue
│   ├── AppointmentsView.vue
│   ├── PatientsView.vue
│   ├── DoctorsView.vue
│   └── AvailabilityView.vue
│
├── router/
│   └── index.js
│
├── services/
│   ├── api.js
│   ├── appointmentService.js
│   ├── patientService.js
│   └── doctorService.js
│
├── stores/
│   └── authStore.js
│
├── composables/
│   └── useAppointments.js
│
├── App.vue
└── main.js
15. Criterio técnico de separación

La línea técnica recomendada para decidir dónde va cada cosa es esta:

Va en views/ cuando:

representa una página completa;

corresponde a una ruta;

tiene peso funcional propio.

Va en components/ cuando:

es una pieza reutilizable;

forma parte de una vista mayor;

no representa por sí sola una sección completa del sistema.

Va en router/ cuando:

define la navegación de la app.

Va en services/ cuando:

consume o organiza llamadas al backend.

Va en stores/ cuando:

mantiene estado global.

Va en composables/ cuando:

encapsula lógica reutilizable con Composition API.

16. Conexión con POO

La arquitectura de Vue debe respetar el enfoque del dominio definido para Agendo.

La base del proyecto ya establece entidades principales como:

Usuario;

Clínica;

Sala;

Reserva;

Rol.

Este frontend no debe construirse solo “por pantallas bonitas”, sino reflejando ese modelo de negocio.

Implicación práctica

cada módulo del frontend debe corresponder a una parte real del dominio;

las reglas del negocio deben reflejarse en formularios, validaciones y flujos;

las pantallas deben respetar permisos por rol;

la interfaz debe estar alineada con el modelo orientado a objetos.

Principio recomendado

La interfaz en Vue debe ser una representación clara del dominio POO, no una colección improvisada de vistas.

17. Recomendación de escalabilidad

Para que Agendo sea escalable y sostenible, se recomienda mantener esta secuencia de trabajo:

documentar reglas de negocio;

definir entidades y relaciones en POO;

derivar módulos funcionales;

mapearlos a rutas y vistas;

construir componentes reutilizables;

conectar frontend y backend sin romper la lógica de dominio.

Esta forma de construir el proyecto es superior a empezar directamente por pantallas sin modelo, porque permite:

menos desorden;

menos duplicación;

mejor mantenimiento;

mejor crecimiento futuro.

18. Conclusión

La línea vigente y recomendada para Agendo es construir una aplicación Vue organizada por módulos, rutas y vistas, con separación clara entre páginas, subvistas y componentes, y con una base fuerte en programación orientada a objetos.

Queda establecido que:

el proyecto debe seguir una arquitectura modular;

Dashboard debe ser un panel de acceso y resumen;

Gestión de disponibilidad debe existir como vista propia, accesible desde Dashboard;

Pacientes, Reservas, Salas y módulos similares deben pensarse primero como páginas o módulos del sistema, no como componentes;

Vue Router es necesario para organizar la navegación de una app con varias vistas;

el frontend debe reflejar el dominio del negocio definido para Agendo;

el enfoque POO es la línea correcta para que el proyecto sea más escalable, sostenible y profesional.
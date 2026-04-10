# Agendo — Documentación de alcance Beta

## 1. Nombre del proyecto
**Agendo**

## 2. Descripción general
Agendo es una aplicación orientada a la organización de horarios y espacios dentro de una clínica, con el propósito de evitar desorden, conflictos de uso y mala administración de salas o consultorios.

En esta etapa, el proyecto se desarrollará como una **versión Beta**, reduciendo su alcance para enfocarse en una base funcional, clara y bien construida.

## 3. Objetivo de la versión Beta
Construir una primera versión sólida del sistema que permita administrar salas y reservas dentro de una clínica, manteniendo el espíritu principal de Agendo, pero con un alcance más corto y controlado.

La versión Beta debe servir para validar la lógica principal del sistema antes de incorporar funcionalidades más avanzadas.

## 4. Tecnologías base
La aplicación se desarrollará en:

- **Node.js** como entorno principal de ejecución;
- lógica orientada a objetos para organizar entidades y comportamiento;
- autenticación simple con usuario y contraseña;
- estructura pensada para crecer en futuras versiones.

## 5. Alcance funcional de la Beta
La versión Beta permitirá únicamente las funciones esenciales del sistema.

### 5.1. Gestión de salas
El sistema debe permitir:

- crear salas;
- eliminar salas;
- consultar salas disponibles.

### 5.2. Gestión de reservas
El sistema debe permitir:

- crear reservas;
- eliminar reservas;
- editar reservas;
- consultar disponibilidad de salas;
- consultar mis reservas.

### 5.3. Gestión de usuario
El sistema funcionará con un usuario autenticado mediante:

- nombre de usuario;
- contraseña.

Por tratarse de una Beta, el enfoque estará en que esta funcionalidad quede bien hecha, aunque todavía no se implemente una gestión completa de múltiples tipos de usuarios.

## 6. Espíritu que debe conservar la app
Aunque el alcance será reducido, Agendo debe seguir representando su idea central:

- organizar el uso de espacios;
- evitar conflictos de horarios;
- mantener orden dentro de la clínica;
- permitir una gestión simple y clara de reservas y salas;
- servir como base escalable para futuras versiones.

La Beta no busca cubrir toda la operación de una clínica, sino resolver correctamente el problema principal de reserva de espacios y control básico de agenda.

## 7. Acciones principales del sistema en Beta
Las acciones principales que debe soportar la aplicación son:

- iniciar sesión con usuario y contraseña;
- crear una sala;
- eliminar una sala;
- crear una reserva;
- editar una reserva;
- eliminar una reserva;
- consultar qué salas están disponibles;
- consultar las reservas creadas por el usuario autenticado.

## 8. Entidades principales para esta Beta
Para esta versión inicial, las entidades principales del sistema serán:

- Usuario;
- Sala;
- Reserva.

## 9. Propuesta inicial de objetos

### 9.1. Usuario
Representa a la persona que accede al sistema.

Atributos sugeridos:
- id;
- username;
- password;
- nombre;
- estado.

### 9.2. Sala
Representa el espacio físico que puede reservarse.

Atributos sugeridos:
- id;
- nombre;
- tipo;
- descripcion;
- estado.

### 9.3. Reserva
Representa la asignación de una sala en un horario determinado.

Atributos sugeridos:
- id;
- fecha;
- horaInicio;
- horaFin;
- descripcion;
- estado;
- salaId;
- usuarioId.

## 10. Reglas de negocio básicas
La Beta debe respetar, como mínimo, las siguientes reglas:

1. No puede haber dos reservas en la misma sala al mismo tiempo.
2. No se puede crear una reserva sobre una sala inexistente.
3. No se puede reservar una sala eliminada o inactiva.
4. Toda reserva debe tener fecha, hora de inicio, hora de fin y sala asignada.
5. La hora de fin no puede ser anterior a la hora de inicio.
6. Una reserva eliminada deja de ocupar la sala.
7. El usuario autenticado solo debe consultar sus propias reservas.
8. La edición de una reserva debe volver a validar disponibilidad.

## 11. Casos de uso principales de la Beta
Los casos de uso principales de esta versión serán:

### Caso de uso 1: iniciar sesión
El usuario entra al sistema con su username y password.

### Caso de uso 2: crear sala
El usuario registra una nueva sala en el sistema.

### Caso de uso 3: eliminar sala
El usuario elimina una sala que ya no se utilizará.

### Caso de uso 4: crear reserva
El usuario selecciona una sala, una fecha, un rango de horas y una breve descripción para registrar la reserva.

### Caso de uso 5: editar reserva
El usuario modifica una reserva existente, validando nuevamente que no exista conflicto de horario.

### Caso de uso 6: eliminar reserva
El usuario elimina una reserva y libera la disponibilidad de la sala.

### Caso de uso 7: consultar disponibilidad
El usuario revisa qué salas están disponibles en una fecha y hora determinada.

### Caso de uso 8: consultar mis reservas
El usuario visualiza las reservas que ha creado.

## 12. Qué no incluir en esta Beta
Para mantener el proyecto corto, claro y bien hecho, esta versión Beta no incluirá por ahora:

- múltiples roles complejos;
- gestión completa de clínicas;
- creación de doctores con cuentas separadas;
- pacientes;
- historial clínico;
- pagos;
- facturación;
- reportes avanzados;
- múltiples sucursales;
- notificaciones automáticas;
- integración con servicios externos.

## 13. Enfoque técnico recomendado
La versión Beta debe construirse priorizando:

- claridad en la lógica;
- buena separación de responsabilidades;
- clases y objetos bien definidos;
- validaciones correctas;
- facilidad de mantenimiento;
- posibilidad de escalar en futuras versiones.

## 14. Definición resumida de la Beta
La versión Beta de Agendo será una aplicación en Node.js que permitirá a un usuario autenticado gestionar salas y reservas dentro de una clínica, pudiendo crear, eliminar y editar reservas, así como consultar disponibilidad y revisar sus propias reservas.

## 15. Próximo paso recomendado
Luego de dejar claro este alcance Beta, el siguiente paso será definir:

- clases;
- atributos;
- métodos;
- relaciones entre objetos;
- estructura inicial del proyecto en Node.js.
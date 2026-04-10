

import { Usuario, Clinica, Sala, Reserva, Paciente, HorarioDisponible } from "./models/index.js";
import { buscarReservaPorId, crearReserva, editarReserva, eliminarReserva, listarReservas, puedeCrearReserva } from "./services/appointmentService.js";

const clinica = new Clinica(
    1,
    "Clinica Estetica Saenz",
    "Calle Principal 123",
    "555-1234",
    "08:00",
    "18:00",
    ["lunes", "martes", "miercoles", "jueves", "viernes"],
    "activa"
);

const usuario = new Usuario(
    1,
    "Admin Beta",
    "admin@agendo.com",
    "1234",
    "admin",
    "activo",
    false
);

const salaConsulta = new Sala(
    1,
    "Sala Consulta 1",
    "consulta",
    "Sala para consultas generales",
    "activa",
    2,
    true
);

const paciente = new Paciente(
    1,
    "Juan Perez",
    "1995-04-10",
    "555-9999",
    "juan@test.com",
    "Sin observaciones",
    "activo",
    "consulta"
);

const reservaExistente = new Reserva(
    1,
    "2026-04-07",
    "09:00",
    "10:00",
    "Consulta general",
    "activa",
    1,
    "Juan Perez",
    "consulta"
);

const reservaSolapada = new Reserva(
    2,
    "2026-04-07",
    "09:30",
    "10:30",
    "Consulta seguimiento",
    "activa",
    1,
    "Maria Lopez",
    "consulta"
);


const reservaNoSolapada = new Reserva(
    3,
    "2026-04-07",
    "10:00",
    "11:00",
    "Consulta posterior",
    "activa",
    1,
    "Carlos Ruiz",
    "consulta"
);

const reservaOtraSala = new Reserva(
    4,
    "2026-04-07",
    "09:30",
    "10:30",
    "Consulta en otra sala",
    "activa",
    2,
    "Laura Gomez",
    "consulta"
);

const reservaFueraHorario = new Reserva(
    5,
    "2026-04-07",
    "19:00",
    "20:00",
    "Consulta tarde",
    "activa",
    1,
    "Pedro Mora",
    "consulta"
);

console.log("Solapada:", reservaSolapada.seSolapaCon(reservaExistente)); // true
console.log("No solapada:", reservaNoSolapada.seSolapaCon(reservaExistente)); // false
console.log("Otra sala:", reservaOtraSala.seSolapaCon(reservaExistente)); // false
console.log("Dentro horario clinica:", clinica.puedeRecibirReserva(reservaExistente)); // ok true
console.log("Fuera horario clinica:", clinica.puedeRecibirReserva(reservaFueraHorario)); // ok false

const reservas = [reservaExistente];

console.log("Crear reserva solapada:", puedeCrearReserva(reservaSolapada, reservas, clinica));
console.log("Crear reserva no solapada:", puedeCrearReserva(reservaNoSolapada, reservas, clinica));
console.log("Crear reserva fuera horario:", puedeCrearReserva(reservaFueraHorario, reservas, clinica));
console.log("Buscar reserva 1:", buscarReservaPorId(1, reservas));
console.log("Buscar reserva 99:", buscarReservaPorId(99, reservas));
console.log("Crear reserva real:", crearReserva(reservaNoSolapada, reservas, clinica));
console.log("Crear reserva solapada real:", crearReserva(reservaSolapada, reservas, clinica));
console.log("Listar reservas:", listarReservas(reservas));
console.log("Editar reserva sin choque:", editarReserva(3, {
    fecha: "2026-04-07",
    horaInicio: "11:00",
    horaFin: "12:00",
    descripcion: "Consulta posterior editada",
    estado: "activa",
    salaId: 1,
    pacienteNombre: "Carlos Ruiz",
    tipoConsulta: "consulta"
}, reservas, clinica));
console.log("Editar reserva con choque:", editarReserva(3, {
    fecha: "2026-04-07",
    horaInicio: "09:30",
    horaFin: "10:30",
    descripcion: "Consulta con choque",
    estado: "activa",
    salaId: 1,
    pacienteNombre: "Carlos Ruiz",
    tipoConsulta: "consulta"
}, reservas, clinica));
console.log("Reserva 3 despues del intento con choque:", buscarReservaPorId(3, reservas));
console.log("Eliminar reserva 3:", eliminarReserva(3, reservas));
console.log("Buscar reserva 3 despues de eliminar:", buscarReservaPorId(3, reservas));
console.log("Listar reservas despues de eliminar:", listarReservas(reservas));
console.log("Eliminar sala:", salaConsulta.eliminarSala());
console.log("Sala reservable:", salaConsulta.puedeReservarse());

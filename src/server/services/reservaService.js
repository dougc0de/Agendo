import { Reserva, Sala, Clinica } from "../../models/index.js";
import {
    crearReserva as crearReservaRepository,
    buscarReservaPorId as buscarReservaPorIdRepository,
    buscarReservasPorSalaYFecha as buscarReservasPorSalaYFechaRepository,
    listarReservas as listarReservasRepository,
    actualizarReserva as actualizarReservaRepository,
    eliminarReserva as eliminarReservaRepository
} from "../repositories/reservaRepository.js";
import { buscarSalaPorId } from "../repositories/salaRepository.js";
import { buscarClinicaPorId } from "../repositories/clinicaRepository.js";

const ESTADOS_RESERVA_PERMITIDOS = ["pendiente", "confirmada", "cancelada"];

function esIdValido(valor) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0;
}

function normalizarFecha(fecha) {
    if (!fecha) {
        return null;
    }

    if (fecha instanceof Date) {
        return fecha.toISOString().slice(0, 10);
    }

    return String(fecha).slice(0, 10);
}

function normalizarHora(hora) {
    if (!hora) {
        return null;
    }

    return String(hora).slice(0, 5);
}

function normalizarDiasLaborales(diasLaborales) {
    if (Array.isArray(diasLaborales)) {
        return diasLaborales;
    }

    if (!diasLaborales) {
        return [];
    }

    return String(diasLaborales)
        .split(",")
        .map((dia) => dia.trim())
        .filter(Boolean);
}

function disponibilidadABooleano(disponibilidad) {
    if (typeof disponibilidad === "boolean") {
        return disponibilidad;
    }

    return String(disponibilidad).toLowerCase() === "disponible";
}

function mapearEstadoADominio(estado) {
    return estado === "cancelada" ? "cancelada" : "activa";
}

function formatearReservaSalida(filaReserva) {
    if (!filaReserva) {
        return null;
    }

    return {
        id: filaReserva.id,
        fecha: normalizarFecha(filaReserva.fecha),
        horaInicio: normalizarHora(filaReserva.hora_inicio),
        horaFin: normalizarHora(filaReserva.hora_fin),
        descripcion: filaReserva.descripcion,
        estado: filaReserva.estado,
        tipoConsulta: filaReserva.tipo_consulta,
        usuarioId: filaReserva.usuario_id,
        pacienteId: filaReserva.paciente_id,
        salaId: filaReserva.sala_id,
        createdAt: filaReserva.created_at,
        updatedAt: filaReserva.updated_at
    };
}

function normalizarDatosEntrada(datosReserva) {
    return {
        id: datosReserva?.id ?? null,
        fecha: normalizarFecha(datosReserva?.fecha),
        horaInicio: normalizarHora(datosReserva?.horaInicio),
        horaFin: normalizarHora(datosReserva?.horaFin),
        descripcion: datosReserva?.descripcion ?? null,
        estado: datosReserva?.estado ?? "pendiente",
        tipoConsulta: datosReserva?.tipoConsulta ?? null,
        usuarioId: Number(datosReserva?.usuarioId),
        pacienteId: Number(datosReserva?.pacienteId),
        salaId: Number(datosReserva?.salaId)
    };
}

function validarEntradaReserva(datosReserva) {
    if (!datosReserva) {
        return {
            ok: false,
            msg: "Debe proporcionar los datos de la reserva."
        };
    }

    const datosNormalizados = normalizarDatosEntrada(datosReserva);

    if (!datosNormalizados.fecha) {
        return {
            ok: false,
            msg: "La fecha es obligatoria."
        };
    }

    if (!datosNormalizados.horaInicio || !datosNormalizados.horaFin) {
        return {
            ok: false,
            msg: "La hora de inicio y la hora de fin son obligatorias."
        };
    }

    if (!datosNormalizados.tipoConsulta) {
        return {
            ok: false,
            msg: "El tipo de consulta es obligatorio."
        };
    }

    if (!esIdValido(datosNormalizados.usuarioId)) {
        return {
            ok: false,
            msg: "El usuarioId no es valido."
        };
    }

    if (!esIdValido(datosNormalizados.pacienteId)) {
        return {
            ok: false,
            msg: "El pacienteId no es valido."
        };
    }

    if (!esIdValido(datosNormalizados.salaId)) {
        return {
            ok: false,
            msg: "El salaId no es valido."
        };
    }

    if (!ESTADOS_RESERVA_PERMITIDOS.includes(datosNormalizados.estado)) {
        return {
            ok: false,
            msg: "El estado de la reserva no es valido."
        };
    }

    return {
        ok: true,
        data: datosNormalizados
    };
}

function construirSalaDominio(filaSala) {
    return new Sala(
        filaSala.id,
        filaSala.nombre,
        filaSala.tipo,
        filaSala.descripcion ?? "",
        filaSala.estado,
        filaSala.capacidad,
        disponibilidadABooleano(filaSala.disponibilidad)
    );
}

function construirClinicaDominio(filaClinica) {
    return new Clinica(
        filaClinica.id,
        filaClinica.nombre,
        filaClinica.direccion,
        filaClinica.telefono,
        normalizarHora(filaClinica.hora_apertura),
        normalizarHora(filaClinica.hora_cierre),
        normalizarDiasLaborales(filaClinica.dias_laborales),
        filaClinica.estado
    );
}

function construirReservaDominio(datosReserva) {
    return new Reserva(
        datosReserva.id ?? 0,
        normalizarFecha(datosReserva.fecha),
        normalizarHora(datosReserva.horaInicio ?? datosReserva.hora_inicio),
        normalizarHora(datosReserva.horaFin ?? datosReserva.hora_fin),
        datosReserva.descripcion ?? "",
        mapearEstadoADominio(datosReserva.estado),
        Number(datosReserva.salaId ?? datosReserva.sala_id),
        `Paciente ${datosReserva.pacienteId ?? datosReserva.paciente_id}`,
        datosReserva.tipoConsulta ?? datosReserva.tipo_consulta ?? "consulta"
    );
}

async function obtenerSalaYClinica(salaId) {
    const filaSala = await buscarSalaPorId(salaId);

    if (!filaSala) {
        return {
            ok: false,
            msg: "La sala no existe."
        };
    }

    const sala = construirSalaDominio(filaSala);
    const validacionSala = sala.puedeReservarse();

    if (!validacionSala.ok) {
        return validacionSala;
    }

    const filaClinica = await buscarClinicaPorId(filaSala.clinica_id);

    if (!filaClinica) {
        return {
            ok: false,
            msg: "La clinica asociada a la sala no existe."
        };
    }

    const clinica = construirClinicaDominio(filaClinica);

    return {
        ok: true,
        data: {
            sala,
            clinica
        }
    };
}

async function validarReservaContraContexto(datosReserva) {
    const resultadoEntrada = validarEntradaReserva(datosReserva);

    if (!resultadoEntrada.ok) {
        return resultadoEntrada;
    }

    const datosNormalizados = resultadoEntrada.data;
    const resultadoContexto = await obtenerSalaYClinica(datosNormalizados.salaId);

    if (!resultadoContexto.ok) {
        return resultadoContexto;
    }

    const { clinica } = resultadoContexto.data;
    const reservaDominio = construirReservaDominio(datosNormalizados);

    const validacionHorario = reservaDominio.validarHorario();

    if (!validacionHorario.ok) {
        return validacionHorario;
    }

    const validacionClinica = clinica.puedeRecibirReserva(reservaDominio);

    if (!validacionClinica.ok) {
        return validacionClinica;
    }

    const filasReservasExistentes = await buscarReservasPorSalaYFechaRepository(
        datosNormalizados.salaId,
        datosNormalizados.fecha
    );

    const reservasExistentes = filasReservasExistentes.map((filaReserva) =>
        construirReservaDominio(filaReserva)
    );

    const hayChoque = reservasExistentes.some((reservaExistente) =>
        reservaDominio.seSolapaCon(reservaExistente)
    );

    if (hayChoque) {
        return {
            ok: false,
            msg: "La sala ya tiene una reserva en ese horario."
        };
    }

    return {
        ok: true,
        data: datosNormalizados
    };
}

export async function listarReservas() {
    try {
        const filasReservas = await listarReservasRepository();

        return {
            ok: true,
            msg: "Reservas listadas correctamente.",
            data: filasReservas.map((filaReserva) => formatearReservaSalida(filaReserva))
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al listar las reservas: ${error.message}`
        };
    }
}

export async function buscarReservaPorId(id) {
    try {
        if (!esIdValido(id)) {
            return {
                ok: false,
                msg: "El id de la reserva no es valido."
            };
        }

        const filaReserva = await buscarReservaPorIdRepository(id);

        if (!filaReserva) {
            return {
                ok: false,
                msg: "Reserva no encontrada."
            };
        }

        return {
            ok: true,
            msg: "Reserva encontrada.",
            data: formatearReservaSalida(filaReserva)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al buscar la reserva: ${error.message}`
        };
    }
}

export async function crearReserva(datosReserva) {
    try {
        const resultadoValidacion = await validarReservaContraContexto(datosReserva);

        if (!resultadoValidacion.ok) {
            return resultadoValidacion;
        }

        const datosNormalizados = resultadoValidacion.data;
        const result = await crearReservaRepository(datosNormalizados);
        const filaReservaCreada = await buscarReservaPorIdRepository(result.insertId);

        return {
            ok: true,
            msg: "Reserva creada correctamente.",
            data: formatearReservaSalida(filaReservaCreada)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al crear la reserva: ${error.message}`
        };
    }
}

export async function editarReserva(id, datosReserva) {
    try {
        if (!esIdValido(id)) {
            return {
                ok: false,
                msg: "El id de la reserva no es valido."
            };
        }

        const filaReservaActual = await buscarReservaPorIdRepository(id);

        if (!filaReservaActual) {
            return {
                ok: false,
                msg: "Reserva no encontrada."
            };
        }

        const datosActualizados = {
            id,
            fecha: datosReserva?.fecha ?? normalizarFecha(filaReservaActual.fecha),
            horaInicio: datosReserva?.horaInicio ?? normalizarHora(filaReservaActual.hora_inicio),
            horaFin: datosReserva?.horaFin ?? normalizarHora(filaReservaActual.hora_fin),
            descripcion: datosReserva?.descripcion ?? filaReservaActual.descripcion,
            estado: datosReserva?.estado ?? filaReservaActual.estado,
            tipoConsulta: datosReserva?.tipoConsulta ?? filaReservaActual.tipo_consulta,
            usuarioId: datosReserva?.usuarioId ?? filaReservaActual.usuario_id,
            pacienteId: datosReserva?.pacienteId ?? filaReservaActual.paciente_id,
            salaId: datosReserva?.salaId ?? filaReservaActual.sala_id
        };

        const resultadoValidacion = await validarReservaContraContexto(datosActualizados);

        if (!resultadoValidacion.ok) {
            return resultadoValidacion;
        }

        const datosNormalizados = resultadoValidacion.data;
        const result = await actualizarReservaRepository(id, datosNormalizados);

        if (result.affectedRows === 0) {
            return {
                ok: false,
                msg: "No se pudo actualizar la reserva."
            };
        }

        const filaReservaActualizada = await buscarReservaPorIdRepository(id);

        return {
            ok: true,
            msg: "Reserva actualizada correctamente.",
            data: formatearReservaSalida(filaReservaActualizada)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al editar la reserva: ${error.message}`
        };
    }
}

export async function eliminarReserva(id) {
    try {
        if (!esIdValido(id)) {
            return {
                ok: false,
                msg: "El id de la reserva no es valido."
            };
        }

        const filaReserva = await buscarReservaPorIdRepository(id);

        if (!filaReserva) {
            return {
                ok: false,
                msg: "Reserva no encontrada."
            };
        }

        const result = await eliminarReservaRepository(id);

        if (result.affectedRows === 0) {
            return {
                ok: false,
                msg: "No se pudo eliminar la reserva."
            };
        }

        return {
            ok: true,
            msg: "Reserva eliminada correctamente.",
            data: formatearReservaSalida(filaReserva)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al eliminar la reserva: ${error.message}`
        };
    }
}

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
import { buscarPacientePorId as buscarPacientePorIdRepository } from "../repositories/pacienteRepository.js";

const ESTADOS_RESERVA_PERMITIDOS = ["pendiente", "confirmada", "cancelada"];

function esIdValido(valor) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0;
}

function resolveWorkspaceId(auth) {
    const workspaceId = Number(auth?.workspaceId);

    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
        return null;
    }

    return workspaceId;
}

function resolveUserId(auth) {
    const userId = Number(auth?.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
        return null;
    }

    return userId;
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
        pacienteNombre: filaReserva.paciente_nombre ?? null,
        pacienteTelefono: filaReserva.paciente_telefono ?? null,
        pacienteCorreo: filaReserva.paciente_correo ?? null,
        salaId: filaReserva.sala_id,
        salaNombre: filaReserva.sala_nombre ?? null,
        createdAt: filaReserva.created_at,
        updatedAt: filaReserva.updated_at
    };
}

function normalizarDatosEntrada(datosReserva) {
    return {
        id: datosReserva?.id !== undefined && datosReserva?.id !== null
            ? Number(datosReserva.id)
            : null,
        fecha: normalizarFecha(datosReserva?.fecha),
        horaInicio: normalizarHora(datosReserva?.horaInicio),
        horaFin: normalizarHora(datosReserva?.horaFin),
        descripcion: datosReserva?.descripcion ?? null,
        estado: datosReserva?.estado ?? "pendiente",
        tipoConsulta: datosReserva?.tipoConsulta ?? null,
        usuarioId: Number(datosReserva?.usuarioId),
        pacienteId: Number(datosReserva?.pacienteId),
        salaId: Number(datosReserva?.salaId),
        workspaceId: Number(datosReserva?.workspaceId)
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
        Number(datosReserva.id ?? 0),
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

async function obtenerSalaYClinica(salaId, workspaceId) {
    const filaSala = await buscarSalaPorId(salaId, workspaceId);

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

    const filaClinica = await buscarClinicaPorId(filaSala.clinica_id, workspaceId);

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

async function validarReservaContraContexto(datosReserva, auth, opciones = {}) {
    const workspaceId = resolveWorkspaceId(auth);

    if (!workspaceId) {
        return {
            ok: false,
            msg: "No autorizado. Falta el contexto de workspace."
        };
    }

    const resultadoEntrada = validarEntradaReserva(datosReserva);

    if (!resultadoEntrada.ok) {
        return resultadoEntrada;
    }

    const datosNormalizados = resultadoEntrada.data;
    const resultadoContexto = await obtenerSalaYClinica(
        datosNormalizados.salaId,
        workspaceId
    );

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

    const filaPaciente = await buscarPacientePorIdRepository(
        datosNormalizados.pacienteId,
        workspaceId
    );

    if (!filaPaciente) {
        return {
            ok: false,
            msg: "El paciente no existe en este workspace."
        };
    }

    const excluirReservaId =
        opciones?.excluirReservaId !== undefined && opciones?.excluirReservaId !== null
            ? Number(opciones.excluirReservaId)
            : null;

    const filasReservasExistentes = await buscarReservasPorSalaYFechaRepository(
        datosNormalizados.salaId,
        datosNormalizados.fecha,
        workspaceId,
        excluirReservaId
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
        data: {
            ...datosNormalizados,
            workspaceId
        }
    };
}

export async function listarReservas(auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        const filasReservas = await listarReservasRepository(workspaceId);

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

export async function buscarReservaPorId(id, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        if (!esIdValido(id)) {
            return {
                ok: false,
                msg: "El id de la reserva no es valido."
            };
        }

        const filaReserva = await buscarReservaPorIdRepository(id, workspaceId);

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

export async function crearReserva(datosReserva, auth) {
    try {
        const usuarioId = resolveUserId(auth);

        if (!usuarioId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el usuario de sesion."
            };
        }

        const resultadoValidacion = await validarReservaContraContexto(
            {
                ...datosReserva,
                usuarioId
            },
            auth
        );

        if (!resultadoValidacion.ok) {
            return resultadoValidacion;
        }

        const datosNormalizados = resultadoValidacion.data;
        const result = await crearReservaRepository(datosNormalizados);
        const filaReservaCreada = await buscarReservaPorIdRepository(
            result.insertId,
            datosNormalizados.workspaceId
        );

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

export async function editarReserva(id, datosReserva, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const usuarioId = resolveUserId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        if (!usuarioId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el usuario de sesion."
            };
        }

        if (!esIdValido(id)) {
            return {
                ok: false,
                msg: "El id de la reserva no es valido."
            };
        }

        const filaReservaActual = await buscarReservaPorIdRepository(id, workspaceId);

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
            usuarioId,
            pacienteId: datosReserva?.pacienteId ?? filaReservaActual.paciente_id,
            salaId: datosReserva?.salaId ?? filaReservaActual.sala_id,
            workspaceId
        };

        const resultadoValidacion = await validarReservaContraContexto(
            datosActualizados,
            auth,
            {
                excluirReservaId: id
            }
        );

        if (!resultadoValidacion.ok) {
            return resultadoValidacion;
        }

        const datosNormalizados = resultadoValidacion.data;
        const result = await actualizarReservaRepository(
            id,
            datosNormalizados,
            workspaceId
        );

        if (result.affectedRows === 0) {
            return {
                ok: false,
                msg: "No se pudo actualizar la reserva."
            };
        }

        const filaReservaActualizada = await buscarReservaPorIdRepository(id, workspaceId);

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

export async function eliminarReserva(id, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        if (!esIdValido(id)) {
            return {
                ok: false,
                msg: "El id de la reserva no es valido."
            };
        }

        const filaReserva = await buscarReservaPorIdRepository(id, workspaceId);

        if (!filaReserva) {
            return {
                ok: false,
                msg: "Reserva no encontrada."
            };
        }

        const result = await eliminarReservaRepository(id, workspaceId);

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

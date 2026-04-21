import {
    buscarPacientesPorTermino,
    buscarPacientePorTelefono,
    buscarPacientePorCorreo,
    crearPaciente as crearPacienteRepository,
    buscarPacientePorId
} from "../repositories/pacienteRepository.js";

function normalizarTexto(valor) {
    return String(valor ?? "").trim();
}

function resolveWorkspaceId(auth) {
    const workspaceId = Number(auth?.workspaceId);

    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
        return null;
    }

    return workspaceId;
}

function normalizarPacienteSalida(filaPaciente) {
    if (!filaPaciente) {
        return null;
    }

    return {
        id: filaPaciente.id,
        nombre: filaPaciente.nombre,
        fechaNacimiento: filaPaciente.fecha_nacimiento,
        telefono: filaPaciente.telefono,
        correo: filaPaciente.correo,
        observaciones: filaPaciente.observaciones,
        estado: filaPaciente.estado,
        tipoProcedimiento: filaPaciente.tipo_procedimiento,
        workspaceId: filaPaciente.workspace_id ?? null,
        createdAt: filaPaciente.created_at,
        updatedAt: filaPaciente.updated_at
    };
}

function normalizarDatosPaciente(datosPaciente, workspaceId) {
    return {
        nombre: normalizarTexto(datosPaciente?.nombre),
        fechaNacimiento: normalizarTexto(datosPaciente?.fechaNacimiento) || null,
        telefono: normalizarTexto(datosPaciente?.telefono),
        correo: normalizarTexto(datosPaciente?.correo) || null,
        observaciones: normalizarTexto(datosPaciente?.observaciones) || null,
        estado: "activo",
        workspaceId,
        tipoProcedimiento:
            normalizarTexto(datosPaciente?.tipoProcedimiento) ||
            normalizarTexto(datosPaciente?.tipoConsulta) ||
            null
    };
}

export async function buscarPacientes(search, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        const termino = normalizarTexto(search);

        if (termino.length < 2) {
            return {
                ok: true,
                msg: "Debe ingresar al menos 2 caracteres para buscar pacientes.",
                data: []
            };
        }

        const filasPacientes = await buscarPacientesPorTermino(termino, workspaceId);

        return {
            ok: true,
            msg: "Pacientes encontrados.",
            data: filasPacientes.map((filaPaciente) => normalizarPacienteSalida(filaPaciente))
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al buscar pacientes: ${error.message}`
        };
    }
}

export async function crearPaciente(datosPaciente, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        const datosNormalizados = normalizarDatosPaciente(datosPaciente, workspaceId);

        if (!datosNormalizados.nombre) {
            return {
                ok: false,
                msg: "El nombre del paciente es obligatorio."
            };
        }

        if (!datosNormalizados.telefono) {
            return {
                ok: false,
                msg: "El telefono del paciente es obligatorio."
            };
        }

        const pacienteConTelefono = await buscarPacientePorTelefono(
            datosNormalizados.telefono,
            workspaceId
        );

        if (pacienteConTelefono) {
            return {
                ok: false,
                msg: "Ya existe un paciente con ese telefono."
            };
        }

        if (datosNormalizados.correo) {
            const pacienteConCorreo = await buscarPacientePorCorreo(
                datosNormalizados.correo,
                workspaceId
            );

            if (pacienteConCorreo) {
                return {
                    ok: false,
                    msg: "Ya existe un paciente con ese correo."
                };
            }
        }

        const result = await crearPacienteRepository(datosNormalizados);
        const filaPacienteCreado = await buscarPacientePorId(result.insertId, workspaceId);

        return {
            ok: true,
            msg: "Paciente creado correctamente.",
            data: normalizarPacienteSalida(filaPacienteCreado)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al crear paciente: ${error.message}`
        };
    }
}

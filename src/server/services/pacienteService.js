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
        createdAt: filaPaciente.created_at,
        updatedAt: filaPaciente.updated_at
    };
}

function normalizarDatosPaciente(datosPaciente) {
    return {
        nombre: normalizarTexto(datosPaciente?.nombre),
        fechaNacimiento: normalizarTexto(datosPaciente?.fechaNacimiento) || null,
        telefono: normalizarTexto(datosPaciente?.telefono),
        correo: normalizarTexto(datosPaciente?.correo) || null,
        observaciones: normalizarTexto(datosPaciente?.observaciones) || null,
        estado: "activo",
        tipoProcedimiento:
            normalizarTexto(datosPaciente?.tipoProcedimiento) ||
            normalizarTexto(datosPaciente?.tipoConsulta) ||
            null
    };
}

export async function buscarPacientes(search) {
    try {
        const termino = normalizarTexto(search);

        if (termino.length < 2) {
            return {
                ok: true,
                msg: "Debe ingresar al menos 2 caracteres para buscar pacientes.",
                data: []
            };
        }

        const filasPacientes = await buscarPacientesPorTermino(termino);

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

export async function crearPaciente(datosPaciente) {
    try {
        const datosNormalizados = normalizarDatosPaciente(datosPaciente);

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

        const pacienteConTelefono = await buscarPacientePorTelefono(datosNormalizados.telefono);

        if (pacienteConTelefono) {
            return {
                ok: false,
                msg: "Ya existe un paciente con ese telefono."
            };
        }

        if (datosNormalizados.correo) {
            const pacienteConCorreo = await buscarPacientePorCorreo(datosNormalizados.correo);

            if (pacienteConCorreo) {
                return {
                    ok: false,
                    msg: "Ya existe un paciente con ese correo."
                };
            }
        }

        const result = await crearPacienteRepository(datosNormalizados);
        const filaPacienteCreado = await buscarPacientePorId(result.insertId);

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

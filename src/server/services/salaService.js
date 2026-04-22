import { buscarClinicaPorWorkspaceId } from "../repositories/clinicaRepository.js";
import { buscarSubscriptionPorWorkspaceId } from "../repositories/subscriptionRepository.js";
import {
    buscarSalaPorId,
    contarSalasPorWorkspaceId,
    crearSala as crearSalaRepository,
    listarSalasPorWorkspaceId
} from "../repositories/salaRepository.js";
import { buscarSucursalPorId } from "../repositories/sucursalRepository.js";
import { getPlanDefinition } from "../../shared/plans.js";
import { isAdministrativeUser } from "../../shared/roles.js";

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

function tieneAccesoAdmin(auth) {
    return isAdministrativeUser({
        membershipRole: auth?.membershipRole,
        userRole: auth?.userRole
    });
}

function formatearSalaSalida(filaSala) {
    if (!filaSala) {
        return null;
    }

    return {
        id: filaSala.id,
        nombre: filaSala.nombre,
        tipo: filaSala.tipo,
        descripcion: filaSala.descripcion,
        estado: filaSala.estado,
        capacidad: Number(filaSala.capacidad ?? 0),
        disponibilidad: filaSala.disponibilidad,
        clinicaId: filaSala.clinica_id,
        clinicaNombre: filaSala.clinica_nombre ?? null,
        workspaceId: filaSala.workspace_id,
        sucursalId: filaSala.sucursal_id ?? null,
        sucursalNombre: filaSala.sucursal_nombre ?? null,
        createdAt: filaSala.created_at,
        updatedAt: filaSala.updated_at
    };
}

function normalizarDatosSala(datosSala = {}) {
    return {
        nombre: normalizarTexto(datosSala.nombre),
        tipo: normalizarTexto(datosSala.tipo),
        descripcion: normalizarTexto(datosSala.descripcion) || null,
        capacidad: Number(datosSala.capacidad),
        sucursalId: Number(datosSala.sucursalId),
        disponibilidad: normalizarTexto(datosSala.disponibilidad).toLowerCase() || "disponible"
    };
}

export async function listarSalas(auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        const filasSalas = await listarSalasPorWorkspaceId(workspaceId);

        return {
            ok: true,
            msg: "Salas listadas correctamente.",
            data: filasSalas.map((filaSala) => formatearSalaSalida(filaSala))
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al listar las salas: ${error.message}`
        };
    }
}

export async function crearSala(datosSala, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        if (!tieneAccesoAdmin(auth)) {
            return {
                ok: false,
                msg: "No autorizado. Solo el admin del workspace puede crear salas."
            };
        }

        const datosNormalizados = normalizarDatosSala(datosSala);

        if (!datosNormalizados.nombre) {
            return {
                ok: false,
                msg: "El nombre de la sala es obligatorio."
            };
        }

        if (!datosNormalizados.tipo) {
            return {
                ok: false,
                msg: "El tipo de sala es obligatorio."
            };
        }

        if (!datosNormalizados.descripcion) {
            return {
                ok: false,
                msg: "La descripcion de la sala es obligatoria."
            };
        }

        if (!Number.isInteger(datosNormalizados.capacidad) || datosNormalizados.capacidad < 1) {
            return {
                ok: false,
                msg: "La capacidad debe ser un numero entero mayor o igual a 1."
            };
        }

        if (!Number.isInteger(datosNormalizados.sucursalId) || datosNormalizados.sucursalId <= 0) {
            return {
                ok: false,
                msg: "Debes seleccionar una sucursal valida para la sala."
            };
        }

        const clinica = await buscarClinicaPorWorkspaceId(workspaceId);

        if (!clinica) {
            return {
                ok: false,
                msg: "La clinica del workspace no existe."
            };
        }

        const sucursal = await buscarSucursalPorId(
            datosNormalizados.sucursalId,
            workspaceId
        );

        if (!sucursal) {
            return {
                ok: false,
                msg: "La sucursal seleccionada no existe en este workspace."
            };
        }

        if (sucursal.estado !== "activa") {
            return {
                ok: false,
                msg: "La sucursal seleccionada esta inactiva."
            };
        }

        const subscription = await buscarSubscriptionPorWorkspaceId(workspaceId);
        const maxRooms = Number(subscription?.max_rooms ?? 0);

        if (maxRooms > 0) {
            const totalSalas = await contarSalasPorWorkspaceId(workspaceId);

            if (totalSalas >= maxRooms) {
                const plan = getPlanDefinition(subscription?.plan_code);

                return {
                    ok: false,
                    msg: `Tu plan ${plan?.name ?? ""} permite hasta ${maxRooms} salas. Actualiza el plan o libera capacidad antes de crear otra.`
                };
            }
        }

        const salaCreada = await crearSalaRepository({
            ...datosNormalizados,
            clinicaId: clinica.id,
            workspaceId,
            estado: "activa",
            disponibilidad: "disponible"
        });

        const filaSala = await buscarSalaPorId(salaCreada.id, workspaceId);

        return {
            ok: true,
            msg: "Sala creada correctamente.",
            data: formatearSalaSalida(filaSala)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al crear la sala: ${error.message}`
        };
    }
}

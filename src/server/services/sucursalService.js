import {
    actualizarEstadoSucursal as actualizarEstadoSucursalRepository,
    actualizarSucursal as actualizarSucursalRepository,
    buscarSucursalPorCodigo,
    buscarSucursalPorId,
    contarSalasActivasPorSucursal,
    contarSucursalesActivas,
    crearSucursal as crearSucursalRepository,
    listarSucursalesPorWorkspaceId
} from "../repositories/sucursalRepository.js";

function normalizarTexto(valor) {
    return String(valor ?? "").trim();
}

function normalizarCodigo(valor) {
    return normalizarTexto(valor)
        .toLowerCase()
        .replace(/\s+/g, "-");
}

function resolveWorkspaceId(auth) {
    const workspaceId = Number(auth?.workspaceId);

    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
        return null;
    }

    return workspaceId;
}

function formatearSucursalSalida(filaSucursal) {
    if (!filaSucursal) {
        return null;
    }

    return {
        id: filaSucursal.id,
        workspaceId: filaSucursal.workspace_id,
        nombre: filaSucursal.nombre,
        codigo: filaSucursal.codigo,
        direccion: filaSucursal.direccion,
        telefono: filaSucursal.telefono,
        estado: filaSucursal.estado,
        roomsCount: Number(filaSucursal.rooms_count ?? 0),
        usersCount: Number(filaSucursal.users_count ?? 0),
        activeRoomsCount: Number(filaSucursal.active_rooms_count ?? 0),
        activeUsersCount: Number(filaSucursal.active_users_count ?? 0),
        createdAt: filaSucursal.created_at,
        updatedAt: filaSucursal.updated_at
    };
}

function normalizarDatosSucursal(datosSucursal = {}) {
    return {
        nombre: normalizarTexto(datosSucursal.nombre),
        codigo: normalizarCodigo(datosSucursal.codigo),
        direccion: normalizarTexto(datosSucursal.direccion) || null,
        telefono: normalizarTexto(datosSucursal.telefono) || null
    };
}

function validarEstadoSucursal(estado) {
    const normalizedStatus = normalizarTexto(estado).toLowerCase();
    return ["activa", "inactiva"].includes(normalizedStatus) ? normalizedStatus : null;
}

export async function listarSucursales(auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        const filasSucursales = await listarSucursalesPorWorkspaceId(workspaceId);

        return {
            ok: true,
            msg: "Sucursales listadas correctamente.",
            data: filasSucursales.map((filaSucursal) => formatearSucursalSalida(filaSucursal))
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al listar las sucursales: ${error.message}`
        };
    }
}

export async function crearSucursal(datosSucursal, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        const datosNormalizados = normalizarDatosSucursal(datosSucursal);

        if (!datosNormalizados.nombre) {
            return {
                ok: false,
                msg: "El nombre de la sucursal es obligatorio."
            };
        }

        if (!datosNormalizados.codigo) {
            return {
                ok: false,
                msg: "El codigo de la sucursal es obligatorio."
            };
        }

        const sucursalExistente = await buscarSucursalPorCodigo(
            datosNormalizados.codigo,
            workspaceId
        );

        if (sucursalExistente) {
            return {
                ok: false,
                msg: "Ya existe una sucursal con ese codigo en el workspace."
            };
        }

        const sucursalCreada = await crearSucursalRepository({
            ...datosNormalizados,
            workspaceId,
            estado: "activa"
        });

        const filaSucursal = await buscarSucursalPorId(sucursalCreada.id, workspaceId);

        return {
            ok: true,
            msg: "Sucursal creada correctamente.",
            data: formatearSucursalSalida(filaSucursal)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al crear la sucursal: ${error.message}`
        };
    }
}

export async function editarSucursal(id, datosSucursal, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const sucursalId = Number(id);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        if (!Number.isInteger(sucursalId) || sucursalId <= 0) {
            return {
                ok: false,
                msg: "La sucursal indicada no es valida."
            };
        }

        const sucursalActual = await buscarSucursalPorId(sucursalId, workspaceId);

        if (!sucursalActual) {
            return {
                ok: false,
                msg: "La sucursal no existe en este workspace."
            };
        }

        const datosNormalizados = normalizarDatosSucursal(datosSucursal);

        if (!datosNormalizados.nombre) {
            return {
                ok: false,
                msg: "El nombre de la sucursal es obligatorio."
            };
        }

        if (!datosNormalizados.codigo) {
            return {
                ok: false,
                msg: "El codigo de la sucursal es obligatorio."
            };
        }

        const sucursalConMismoCodigo = await buscarSucursalPorCodigo(
            datosNormalizados.codigo,
            workspaceId,
            sucursalId
        );

        if (sucursalConMismoCodigo) {
            return {
                ok: false,
                msg: "Ya existe otra sucursal con ese codigo en el workspace."
            };
        }

        await actualizarSucursalRepository(
            sucursalId,
            workspaceId,
            datosNormalizados
        );

        const filaSucursal = await buscarSucursalPorId(sucursalId, workspaceId);

        return {
            ok: true,
            msg: "Sucursal actualizada correctamente.",
            data: formatearSucursalSalida(filaSucursal)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al actualizar la sucursal: ${error.message}`
        };
    }
}

export async function cambiarEstadoSucursal(id, estado, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const sucursalId = Number(id);
        const estadoNormalizado = validarEstadoSucursal(estado);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de workspace."
            };
        }

        if (!Number.isInteger(sucursalId) || sucursalId <= 0) {
            return {
                ok: false,
                msg: "La sucursal indicada no es valida."
            };
        }

        if (!estadoNormalizado) {
            return {
                ok: false,
                msg: "El estado de la sucursal no es valido."
            };
        }

        const sucursalActual = await buscarSucursalPorId(sucursalId, workspaceId);

        if (!sucursalActual) {
            return {
                ok: false,
                msg: "La sucursal no existe en este workspace."
            };
        }

        if (sucursalActual.estado === estadoNormalizado) {
            return {
                ok: true,
                msg: "La sucursal ya tenia ese estado.",
                data: formatearSucursalSalida(sucursalActual)
            };
        }

        if (estadoNormalizado === "inactiva") {
            const totalSucursalesActivas = await contarSucursalesActivas(workspaceId);

            if (totalSucursalesActivas <= 1) {
                return {
                    ok: false,
                    msg: "No puedes desactivar la unica sucursal activa del workspace."
                };
            }

            const salasActivas = await contarSalasActivasPorSucursal(sucursalId, workspaceId);

            if (salasActivas > 0) {
                return {
                    ok: false,
                    msg: "No puedes desactivar una sucursal con salas activas asignadas."
                };
            }
        }

        await actualizarEstadoSucursalRepository(
            sucursalId,
            workspaceId,
            estadoNormalizado
        );

        const filaSucursal = await buscarSucursalPorId(sucursalId, workspaceId);

        return {
            ok: true,
            msg: "Estado de sucursal actualizado correctamente.",
            data: formatearSucursalSalida(filaSucursal)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al actualizar el estado de la sucursal: ${error.message}`
        };
    }
}

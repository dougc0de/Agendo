import bcrypt from "bcryptjs";
import { withTransaction } from "../db/connection.js";
import {
    actualizarEstadoUsuario,
    actualizarUsuario,
    buscarUsuarioPorCorreo,
    crearUsuario
} from "../repositories/usuarioRepository.js";
import {
    actualizarEstadoWorkspaceMemberPorUsuarioId,
    actualizarWorkspaceMemberPorUsuarioId,
    buscarUsuarioInternoPorId,
    crearWorkspaceMember,
    listarUsuariosInternosPorWorkspaceId
} from "../repositories/workspaceMemberRepository.js";
import { buscarSucursalPorId } from "../repositories/sucursalRepository.js";
import {
    canAccessFinance,
    canManageInternalUsers,
    normalizeRole
} from "../../shared/roles.js";

const ROLES_INTERNOS_PERMITIDOS = ["admin", "recepcionista", "doctor"];
const ESTADOS_USUARIO_PERMITIDOS = ["activo", "inactivo"];

function resolveWorkspaceId(auth) {
    const workspaceId = Number(auth?.workspaceId);

    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
        return null;
    }

    return workspaceId;
}

function hasAdminAccess(auth) {
    return canManageInternalUsers({
        membershipRole: auth?.membershipRole,
        userRole: auth?.userRole
    });
}

function normalizarTexto(valor) {
    return String(valor ?? "").trim();
}

function normalizarCorreo(valor) {
    return normalizarTexto(valor).toLowerCase();
}

function formatearUsuarioInternoSalida(filaUsuario) {
    if (!filaUsuario) {
        return null;
    }

    return {
        id: filaUsuario.id,
        nombre: filaUsuario.nombre,
        correo: filaUsuario.correo,
        role: filaUsuario.membership_role,
        estado:
            filaUsuario.membership_estado === "activo" &&
            filaUsuario.user_estado === "activo"
                ? "activo"
                : "inactivo",
        sucursalId: filaUsuario.sucursal_id ?? null,
        sucursalNombre: filaUsuario.sucursal_nombre ?? null,
        createdAt: filaUsuario.created_at,
        updatedAt: filaUsuario.updated_at
    };
}

function normalizarPayload(payload = {}) {
    return {
        nombre: normalizarTexto(payload.nombre),
        correo: normalizarCorreo(payload.correo),
        contrasena: normalizarTexto(payload.contrasena),
        role: normalizeRole(payload.role),
        sucursalId: Number(payload.sucursalId)
    };
}

async function validarSucursalAsignada(sucursalId, workspaceId) {
    if (!Number.isInteger(sucursalId) || sucursalId <= 0) {
        return {
            ok: false,
            msg: "Debes seleccionar una sucursal valida para este usuario."
        };
    }

    const sucursal = await buscarSucursalPorId(sucursalId, workspaceId);

    if (!sucursal) {
        return {
            ok: false,
            msg: "La sucursal seleccionada no existe en esta cuenta."
        };
    }

    if (sucursal.estado !== "activa") {
        return {
            ok: false,
            msg: "La sucursal seleccionada esta inactiva."
        };
    }

    return {
        ok: true
    };
}

function validarRole(role) {
    if (!ROLES_INTERNOS_PERMITIDOS.includes(role)) {
        return {
            ok: false,
            msg: "El rol del usuario interno no es valido."
        };
    }

    return {
        ok: true
    };
}

export async function listarUsuariosInternos(auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (
            !hasAdminAccess(auth) &&
            !canAccessFinance({
                membershipRole: auth?.membershipRole,
                userRole: auth?.userRole
            })
        ) {
            return {
                ok: false,
                msg: "No autorizado. No puedes consultar los usuarios internos de la cuenta."
            };
        }

        const filasUsuarios = await listarUsuariosInternosPorWorkspaceId(workspaceId);

        return {
            ok: true,
            msg: "Usuarios internos listados correctamente.",
            data: filasUsuarios.map((filaUsuario) => formatearUsuarioInternoSalida(filaUsuario))
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al listar los usuarios internos: ${error.message}`
        };
    }
}

export async function crearUsuarioInterno(payload, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!hasAdminAccess(auth)) {
            return {
                ok: false,
                msg: "No autorizado. Solo el admin puede gestionar usuarios internos."
            };
        }

        const datos = normalizarPayload(payload);

        if (!datos.nombre || !datos.correo || !datos.contrasena) {
            return {
                ok: false,
                msg: "Debes completar nombre, correo y contrasena inicial."
            };
        }

        const validacionRole = validarRole(datos.role);

        if (!validacionRole.ok) {
            return validacionRole;
        }

        const validacionSucursal = await validarSucursalAsignada(
            datos.sucursalId,
            workspaceId
        );

        if (!validacionSucursal.ok) {
            return validacionSucursal;
        }

        const usuarioExistente = await buscarUsuarioPorCorreo(datos.correo);

        if (usuarioExistente) {
            return {
                ok: false,
                msg: "Ya existe un usuario con ese correo."
            };
        }

        const usuarioCreado = await withTransaction(async (client) => {
            const hashedPassword = await bcrypt.hash(datos.contrasena, 10);
            const user = await crearUsuario(
                {
                    nombre: datos.nombre,
                    correo: datos.correo,
                    contrasena: hashedPassword,
                    rol: datos.role,
                    estado: "activo"
                },
                client
            );

            await crearWorkspaceMember(
                {
                    workspaceId,
                    usuarioId: user.id,
                    role: datos.role,
                    estado: "activo",
                    sucursalId: datos.sucursalId
                },
                client
            );

            return buscarUsuarioInternoPorId(user.id, workspaceId, client);
        });

        return {
            ok: true,
            msg: "Usuario interno creado correctamente.",
            data: formatearUsuarioInternoSalida(usuarioCreado)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al crear el usuario interno: ${error.message}`
        };
    }
}

export async function editarUsuarioInterno(id, payload, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const userId = Number(id);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!hasAdminAccess(auth)) {
            return {
                ok: false,
                msg: "No autorizado. Solo el admin puede gestionar usuarios internos."
            };
        }

        if (!Number.isInteger(userId) || userId <= 0) {
            return {
                ok: false,
                msg: "El usuario interno indicado no es valido."
            };
        }

        const usuarioActual = await buscarUsuarioInternoPorId(userId, workspaceId);

        if (!usuarioActual) {
            return {
                ok: false,
                msg: "El usuario interno no existe en esta cuenta."
            };
        }

        if (usuarioActual.membership_role === "owner") {
            return {
                ok: false,
                msg: "El propietario de la cuenta no se edita desde este modulo."
            };
        }

        const datos = normalizarPayload(payload);

        if (!datos.nombre || !datos.correo) {
            return {
                ok: false,
                msg: "Debes completar nombre y correo del usuario."
            };
        }

        const validacionRole = validarRole(datos.role);

        if (!validacionRole.ok) {
            return validacionRole;
        }

        const validacionSucursal = await validarSucursalAsignada(
            datos.sucursalId,
            workspaceId
        );

        if (!validacionSucursal.ok) {
            return validacionSucursal;
        }

        const usuarioConCorreo = await buscarUsuarioPorCorreo(datos.correo);

        if (usuarioConCorreo && Number(usuarioConCorreo.id) !== userId) {
            return {
                ok: false,
                msg: "Ya existe otro usuario con ese correo."
            };
        }

        const usuarioActualizado = await withTransaction(async (client) => {
            await actualizarUsuario(
                userId,
                {
                    nombre: datos.nombre,
                    correo: datos.correo,
                    rol: datos.role
                },
                client
            );

            await actualizarWorkspaceMemberPorUsuarioId(
                userId,
                workspaceId,
                {
                    role: datos.role,
                    sucursalId: datos.sucursalId
                },
                client
            );

            return buscarUsuarioInternoPorId(userId, workspaceId, client);
        });

        return {
            ok: true,
            msg: "Usuario interno actualizado correctamente.",
            data: formatearUsuarioInternoSalida(usuarioActualizado)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al actualizar el usuario interno: ${error.message}`
        };
    }
}

export async function actualizarEstadoUsuarioInterno(id, estado, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const userId = Number(id);
        const normalizedStatus = normalizarTexto(estado).toLowerCase();

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!hasAdminAccess(auth)) {
            return {
                ok: false,
                msg: "No autorizado. Solo el admin puede gestionar usuarios internos."
            };
        }

        if (!Number.isInteger(userId) || userId <= 0) {
            return {
                ok: false,
                msg: "El usuario interno indicado no es valido."
            };
        }

        if (!ESTADOS_USUARIO_PERMITIDOS.includes(normalizedStatus)) {
            return {
                ok: false,
                msg: "El estado del usuario no es valido."
            };
        }

        const usuarioActual = await buscarUsuarioInternoPorId(userId, workspaceId);

        if (!usuarioActual) {
            return {
                ok: false,
                msg: "El usuario interno no existe en esta cuenta."
            };
        }

        if (usuarioActual.membership_role === "owner") {
            return {
                ok: false,
                msg: "El propietario de la cuenta no puede inactivarse desde este modulo."
            };
        }

        const membershipStatus = normalizedStatus === "activo" ? "activo" : "inactivo";

        const usuarioActualizado = await withTransaction(async (client) => {
            await actualizarEstadoUsuario(userId, normalizedStatus, client);
            await actualizarEstadoWorkspaceMemberPorUsuarioId(
                userId,
                workspaceId,
                membershipStatus,
                client
            );

            return buscarUsuarioInternoPorId(userId, workspaceId, client);
        });

        return {
            ok: true,
            msg: "Estado del usuario actualizado correctamente.",
            data: formatearUsuarioInternoSalida(usuarioActualizado)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al actualizar el estado del usuario: ${error.message}`
        };
    }
}

import { isAdministrativeUser } from "../../shared/roles.js";
import {
    actualizarWorkspaceSettings,
    buscarWorkspaceSettingsPorWorkspaceId,
    crearWorkspaceSettings
} from "../repositories/workspaceSettingsRepository.js";

const DEFAULT_CONSULTATION_DURATION = 30;
const DEFAULT_PROCEDURE_DURATION = 60;

function resolveWorkspaceId(auth) {
    const workspaceId = Number(auth?.workspaceId);

    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
        return null;
    }

    return workspaceId;
}

function hasAdminAccess(auth) {
    return isAdministrativeUser({
        membershipRole: auth?.membershipRole,
        userRole: auth?.userRole
    });
}

function sanitizeSettings(row) {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        consultationDurationMinutes: Number(
            row.consultation_duration_minutes ?? DEFAULT_CONSULTATION_DURATION
        ),
        procedureDurationMinutes: Number(
            row.procedure_duration_minutes ?? DEFAULT_PROCEDURE_DURATION
        ),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function normalizeDuration(value, fallback) {
    const duration = Number(value);

    if (!Number.isInteger(duration)) {
        return fallback;
    }

    return duration;
}

async function ensureWorkspaceSettings(workspaceId, executor) {
    let settings = await buscarWorkspaceSettingsPorWorkspaceId(workspaceId, executor);

    if (settings) {
        return settings;
    }

    return crearWorkspaceSettings(
        {
            workspaceId,
            consultationDurationMinutes: DEFAULT_CONSULTATION_DURATION,
            procedureDurationMinutes: DEFAULT_PROCEDURE_DURATION
        },
        executor
    );
}

export async function obtenerConfiguracionCuenta(auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        const settings = await ensureWorkspaceSettings(workspaceId);

        return {
            ok: true,
            msg: "Configuracion cargada correctamente.",
            data: sanitizeSettings(settings)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al cargar la configuracion: ${error.message}`
        };
    }
}

export async function actualizarConfiguracionCuenta(payload, auth) {
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
                msg: "No autorizado. Solo el administrador puede cambiar la configuracion."
            };
        }

        const consultationDurationMinutes = normalizeDuration(
            payload?.consultationDurationMinutes,
            NaN
        );
        const procedureDurationMinutes = normalizeDuration(
            payload?.procedureDurationMinutes,
            NaN
        );

        if (
            !Number.isInteger(consultationDurationMinutes) ||
            consultationDurationMinutes < 5 ||
            consultationDurationMinutes > 480
        ) {
            return {
                ok: false,
                msg: "La duracion base de consultas debe estar entre 5 y 480 minutos."
            };
        }

        if (
            !Number.isInteger(procedureDurationMinutes) ||
            procedureDurationMinutes < 5 ||
            procedureDurationMinutes > 480
        ) {
            return {
                ok: false,
                msg: "La duracion base de procedimientos debe estar entre 5 y 480 minutos."
            };
        }

        await ensureWorkspaceSettings(workspaceId);

        const updatedSettings = await actualizarWorkspaceSettings(workspaceId, {
            consultationDurationMinutes,
            procedureDurationMinutes
        });

        return {
            ok: true,
            msg: "Configuracion actualizada correctamente.",
            data: sanitizeSettings(updatedSettings)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al actualizar la configuracion: ${error.message}`
        };
    }
}

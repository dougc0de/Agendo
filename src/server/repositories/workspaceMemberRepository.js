import pool from "../db/connection.js";

export async function crearWorkspaceMember(datosWorkspaceMember, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO workspace_members
                (workspace_id, usuario_id, role, estado, sucursal_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `,
        [
            datosWorkspaceMember.workspaceId,
            datosWorkspaceMember.usuarioId,
            datosWorkspaceMember.role,
            datosWorkspaceMember.estado ?? "activo",
            datosWorkspaceMember.sucursalId ?? null
        ]
    );

    return rows[0];
}

export async function buscarSesionActivaPorUsuarioId(usuarioId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT
                u.id AS user_id,
                u.nombre AS user_nombre,
                u.correo AS user_correo,
                u.rol AS user_rol,
                u.estado AS user_estado,
                wm.id AS workspace_member_id,
                wm.role AS membership_role,
                wm.estado AS membership_estado,
                w.id AS workspace_id,
                w.nombre AS workspace_nombre,
                w.slug AS workspace_slug,
                w.estado AS workspace_estado,
                c.id AS clinic_id,
                c.nombre AS clinic_nombre,
                s.id AS subscription_id,
                s.plan_code,
                s.commercial_status,
                s.billing_mode,
                s.trial_ends_at,
                s.current_period_ends_at,
                s.max_users,
                s.max_rooms,
                s.max_reservations_per_month,
                s.partner_valid_until,
                s.partner_notes
            FROM workspace_members wm
            INNER JOIN usuarios u
                ON u.id = wm.usuario_id
            INNER JOIN workspaces w
                ON w.id = wm.workspace_id
            LEFT JOIN subscriptions s
                ON s.workspace_id = w.id
            LEFT JOIN clinicas c
                ON c.workspace_id = w.id
            WHERE wm.usuario_id = $1
              AND wm.estado = 'activo'
            ORDER BY wm.id ASC
            LIMIT 1
        `,
        [usuarioId]
    );

    return rows[0];
}

export async function listarUsuariosInternosPorWorkspaceId(workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT
                u.id,
                u.nombre,
                u.correo,
                u.rol,
                u.estado AS user_estado,
                wm.role AS membership_role,
                wm.estado AS membership_estado,
                wm.sucursal_id,
                s.nombre AS sucursal_nombre,
                wm.created_at,
                wm.updated_at
            FROM workspace_members wm
            INNER JOIN usuarios u
                ON u.id = wm.usuario_id
            LEFT JOIN sucursales s
                ON s.id = wm.sucursal_id
            WHERE wm.workspace_id = $1
            ORDER BY
                CASE wm.role
                    WHEN 'owner' THEN 0
                    WHEN 'admin' THEN 1
                    WHEN 'recepcionista' THEN 2
                    WHEN 'doctor' THEN 3
                    ELSE 4
                END,
                u.nombre ASC
        `,
        [workspaceId]
    );

    return rows;
}

export async function buscarUsuarioInternoPorId(id, workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT
                u.id,
                u.nombre,
                u.correo,
                u.rol,
                u.estado AS user_estado,
                wm.role AS membership_role,
                wm.estado AS membership_estado,
                wm.sucursal_id,
                s.nombre AS sucursal_nombre,
                wm.created_at,
                wm.updated_at
            FROM workspace_members wm
            INNER JOIN usuarios u
                ON u.id = wm.usuario_id
            LEFT JOIN sucursales s
                ON s.id = wm.sucursal_id
            WHERE u.id = $1
              AND wm.workspace_id = $2
            LIMIT 1
        `,
        [id, workspaceId]
    );

    return rows[0];
}

export async function actualizarWorkspaceMemberPorUsuarioId(
    usuarioId,
    workspaceId,
    datosWorkspaceMember,
    executor = pool
) {
    const { rows } = await executor.query(
        `
            UPDATE workspace_members
            SET
                role = $3,
                sucursal_id = $4
            WHERE usuario_id = $1
              AND workspace_id = $2
            RETURNING *
        `,
        [
            usuarioId,
            workspaceId,
            datosWorkspaceMember.role,
            datosWorkspaceMember.sucursalId ?? null
        ]
    );

    return rows[0];
}

export async function actualizarEstadoWorkspaceMemberPorUsuarioId(
    usuarioId,
    workspaceId,
    estado,
    executor = pool
) {
    const { rows } = await executor.query(
        `
            UPDATE workspace_members
            SET estado = $3
            WHERE usuario_id = $1
              AND workspace_id = $2
            RETURNING *
        `,
        [usuarioId, workspaceId, estado]
    );

    return rows[0];
}

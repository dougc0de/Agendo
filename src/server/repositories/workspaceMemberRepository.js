import pool from "../db/connection.js";

export async function crearWorkspaceMember(datosWorkspaceMember, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO workspace_members
                (workspace_id, usuario_id, role, estado)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `,
        [
            datosWorkspaceMember.workspaceId,
            datosWorkspaceMember.usuarioId,
            datosWorkspaceMember.role,
            datosWorkspaceMember.estado ?? "activo"
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

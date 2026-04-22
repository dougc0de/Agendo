import pool from "../db/connection.js";

export async function listarSucursalesPorWorkspaceId(workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT
                s.id,
                s.workspace_id,
                s.nombre,
                s.codigo,
                s.direccion,
                s.telefono,
                s.estado,
                s.created_at,
                s.updated_at,
                COALESCE(room_stats.rooms_count, 0) AS rooms_count,
                COALESCE(room_stats.active_rooms_count, 0) AS active_rooms_count,
                COALESCE(user_stats.users_count, 0) AS users_count,
                COALESCE(user_stats.active_users_count, 0) AS active_users_count
            FROM sucursales s
            LEFT JOIN (
                SELECT
                    sucursal_id,
                    COUNT(*)::int AS rooms_count,
                    COUNT(*) FILTER (WHERE estado = 'activa')::int AS active_rooms_count
                FROM salas
                GROUP BY sucursal_id
            ) room_stats
                ON room_stats.sucursal_id = s.id
            LEFT JOIN (
                SELECT
                    sucursal_id,
                    COUNT(*)::int AS users_count,
                    COUNT(*) FILTER (WHERE estado = 'activo')::int AS active_users_count
                FROM workspace_members
                WHERE sucursal_id IS NOT NULL
                GROUP BY sucursal_id
            ) user_stats
                ON user_stats.sucursal_id = s.id
            WHERE s.workspace_id = $1
            ORDER BY
                CASE WHEN s.codigo = 'principal' THEN 0 ELSE 1 END,
                s.nombre ASC
        `,
        [workspaceId]
    );

    return rows;
}

export async function buscarSucursalPorId(id, workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT
                s.id,
                s.workspace_id,
                s.nombre,
                s.codigo,
                s.direccion,
                s.telefono,
                s.estado,
                s.created_at,
                s.updated_at,
                COALESCE(room_stats.rooms_count, 0) AS rooms_count,
                COALESCE(room_stats.active_rooms_count, 0) AS active_rooms_count,
                COALESCE(user_stats.users_count, 0) AS users_count,
                COALESCE(user_stats.active_users_count, 0) AS active_users_count
            FROM sucursales s
            LEFT JOIN (
                SELECT
                    sucursal_id,
                    COUNT(*)::int AS rooms_count,
                    COUNT(*) FILTER (WHERE estado = 'activa')::int AS active_rooms_count
                FROM salas
                GROUP BY sucursal_id
            ) room_stats
                ON room_stats.sucursal_id = s.id
            LEFT JOIN (
                SELECT
                    sucursal_id,
                    COUNT(*)::int AS users_count,
                    COUNT(*) FILTER (WHERE estado = 'activo')::int AS active_users_count
                FROM workspace_members
                WHERE sucursal_id IS NOT NULL
                GROUP BY sucursal_id
            ) user_stats
                ON user_stats.sucursal_id = s.id
            WHERE s.id = $1
              AND s.workspace_id = $2
            LIMIT 1
        `,
        [id, workspaceId]
    );

    return rows[0];
}

export async function buscarSucursalPorCodigo(
    codigo,
    workspaceId,
    excludeId = null,
    executor = pool
) {
    const params = [workspaceId, codigo];
    let query = `
        SELECT id, workspace_id, nombre, codigo, estado
        FROM sucursales
        WHERE workspace_id = $1
          AND codigo = $2
    `;

    if (excludeId !== null && excludeId !== undefined) {
        params.push(excludeId);
        query += `
          AND id <> $3
        `;
    }

    query += `
        LIMIT 1
    `;

    const { rows } = await executor.query(query, params);
    return rows[0];
}

export async function crearSucursal(datosSucursal, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO sucursales
                (
                    workspace_id,
                    nombre,
                    codigo,
                    direccion,
                    telefono,
                    estado
                )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `,
        [
            datosSucursal.workspaceId,
            datosSucursal.nombre,
            datosSucursal.codigo,
            datosSucursal.direccion,
            datosSucursal.telefono,
            datosSucursal.estado ?? "activa"
        ]
    );

    return rows[0];
}

export async function actualizarSucursal(id, workspaceId, datosSucursal, executor = pool) {
    const { rows } = await executor.query(
        `
            UPDATE sucursales
            SET
                nombre = $3,
                codigo = $4,
                direccion = $5,
                telefono = $6
            WHERE id = $1
              AND workspace_id = $2
            RETURNING *
        `,
        [
            id,
            workspaceId,
            datosSucursal.nombre,
            datosSucursal.codigo,
            datosSucursal.direccion,
            datosSucursal.telefono
        ]
    );

    return rows[0];
}

export async function actualizarEstadoSucursal(
    id,
    workspaceId,
    estado,
    executor = pool
) {
    const { rows } = await executor.query(
        `
            UPDATE sucursales
            SET estado = $3
            WHERE id = $1
              AND workspace_id = $2
            RETURNING *
        `,
        [id, workspaceId, estado]
    );

    return rows[0];
}

export async function contarSucursalesActivas(workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT COUNT(*)::int AS total
            FROM sucursales
            WHERE workspace_id = $1
              AND estado = 'activa'
        `,
        [workspaceId]
    );

    return rows[0]?.total ?? 0;
}

export async function contarSalasActivasPorSucursal(sucursalId, workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT COUNT(*)::int AS total
            FROM salas
            WHERE sucursal_id = $1
              AND workspace_id = $2
              AND estado = 'activa'
        `,
        [sucursalId, workspaceId]
    );

    return rows[0]?.total ?? 0;
}

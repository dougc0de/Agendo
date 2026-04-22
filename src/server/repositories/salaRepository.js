import pool from "../db/connection.js";

export async function listarSalasPorWorkspaceId(workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT
                s.*,
                c.nombre AS clinica_nombre,
                su.nombre AS sucursal_nombre
            FROM salas s
            INNER JOIN clinicas c
                ON c.id = s.clinica_id
            LEFT JOIN sucursales su
                ON su.id = s.sucursal_id
            WHERE s.workspace_id = $1
            ORDER BY
                CASE WHEN s.estado = 'activa' THEN 0 ELSE 1 END,
                s.nombre ASC
        `,
        [workspaceId]
    );

    return rows;
}

export async function buscarSalaPorId(id, workspaceId = null, executor = pool) {
    const params = [id];
    let query = `
        SELECT
            s.*,
            c.nombre AS clinica_nombre,
            su.nombre AS sucursal_nombre
        FROM salas s
        INNER JOIN clinicas c
            ON c.id = s.clinica_id
        LEFT JOIN sucursales su
            ON su.id = s.sucursal_id
        WHERE s.id = $1
    `;

    if (workspaceId !== null && workspaceId !== undefined) {
        params.push(workspaceId);
        query += `
            AND s.workspace_id = $2
        `;
    }

    const { rows } = await executor.query(query, params);

    return rows[0];
}

export async function contarSalasPorWorkspaceId(workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT COUNT(*)::int AS total
            FROM salas
            WHERE workspace_id = $1
        `,
        [workspaceId]
    );

    return rows[0]?.total ?? 0;
}

export async function crearSala(datosSala, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO salas
                (
                    nombre,
                    tipo,
                    descripcion,
                    estado,
                    capacidad,
                    disponibilidad,
                    clinica_id,
                    workspace_id,
                    sucursal_id
                )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `,
        [
            datosSala.nombre,
            datosSala.tipo,
            datosSala.descripcion,
            datosSala.estado ?? "activa",
            datosSala.capacidad,
            datosSala.disponibilidad ?? "disponible",
            datosSala.clinicaId,
            datosSala.workspaceId,
            datosSala.sucursalId
        ]
    );

    return rows[0];
}

import pool from "../db/connection.js";

export async function buscarSalaPorId(id, workspaceId = null, executor = pool) {
    const params = [id];
    let query = `
        SELECT *
        FROM salas
        WHERE id = $1
    `;

    if (workspaceId !== null && workspaceId !== undefined) {
        params.push(workspaceId);
        query += `
            AND workspace_id = $2
        `;
    }

    const { rows } = await executor.query(query, params);

    return rows[0];
}

import pool from "../db/connection.js";

export async function buscarClinicaPorId(id, workspaceId = null, executor = pool) {
    const params = [id];
    let query = `
        SELECT *
        FROM clinicas
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

export async function buscarClinicaPorWorkspaceId(workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
        SELECT *
        FROM clinicas
        WHERE workspace_id = $1
        LIMIT 1
        `,
        [workspaceId]
    );

    return rows[0];
}

export async function crearClinica(datosClinica, executor = pool) {
    const { rows } = await executor.query(
        `
        INSERT INTO clinicas
            (
                nombre,
                direccion,
                telefono,
                hora_apertura,
                hora_cierre,
                dias_laborales,
                estado,
                workspace_id
            )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        `,
        [
            datosClinica.nombre,
            datosClinica.direccion,
            datosClinica.telefono,
            datosClinica.horaApertura,
            datosClinica.horaCierre,
            datosClinica.diasLaborales,
            datosClinica.estado ?? "activa",
            datosClinica.workspaceId
        ]
    );

    return rows[0];
}

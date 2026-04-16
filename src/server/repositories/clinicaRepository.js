import pool from "../db/connection.js";

export async function buscarClinicaPorId(id) {
    const { rows } = await pool.query(
        `
        SELECT *
        FROM clinicas
        WHERE id = $1
        `,
        [id]
    );

    return rows[0];
}

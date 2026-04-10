import pool from "../db/connection.js";

export async function buscarClinicaPorId(id) {
    const [rows] = await pool.query(
        `
        SELECT *
        FROM clinicas
        WHERE id = ?
        `,
        [id]
    );

    return rows[0];
}

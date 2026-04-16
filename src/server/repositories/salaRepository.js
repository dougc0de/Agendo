import pool from "../db/connection.js";

export async function buscarSalaPorId(id) {
    const { rows } = await pool.query(
        `
        SELECT *
        FROM salas
        WHERE id = $1
        `,
        [id]
    );

    return rows[0];
}
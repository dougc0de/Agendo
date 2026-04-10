import pool from "../db/connection.js";

export async function buscarUsuarioPorCorreo(correo) {
    const [rows] = await pool.query(
        `
        SELECT *
        FROM usuarios
        WHERE correo = ?
        LIMIT 1
        `,
        [correo]
    );

    return rows[0];
}

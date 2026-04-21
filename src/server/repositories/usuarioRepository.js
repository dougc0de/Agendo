import pool from "../db/connection.js";

export async function buscarUsuarioPorCorreo(correo, executor = pool) {
    const { rows } = await executor.query(
        `
        SELECT *
        FROM usuarios
        WHERE LOWER(correo) = LOWER($1)
        LIMIT 1
        `,
        [correo]
    );

    return rows[0];
}

export async function buscarUsuarioPorId(id, executor = pool) {
    const { rows } = await executor.query(
        `
        SELECT *
        FROM usuarios
        WHERE id = $1
        LIMIT 1
        `,
        [id]
    );

    return rows[0];
}

export async function crearUsuario(datosUsuario, executor = pool) {
    const { rows } = await executor.query(
        `
        INSERT INTO usuarios
            (nombre, correo, contrasena, rol, estado)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
            datosUsuario.nombre,
            datosUsuario.correo,
            datosUsuario.contrasena,
            datosUsuario.rol,
            datosUsuario.estado ?? "activo"
        ]
    );

    return rows[0];
}

import pool from "../db/connection.js";

export async function buscarPacientesPorTermino(termino, limite = 8) {
    const terminoNormalizado = String(termino ?? "").trim();
    const patron = `%${terminoNormalizado}%`;

    const { rows } = await pool.query(
        `
            SELECT
                id,
                nombre,
                fecha_nacimiento,
                telefono,
                correo,
                observaciones,
                estado,
                tipo_procedimiento,
                created_at,
                updated_at
            FROM pacientes
            WHERE estado = 'activo'
              AND (
                    nombre ILIKE $1
                 OR telefono ILIKE $1
                 OR correo ILIKE $1
              )
            ORDER BY
                CASE
                    WHEN telefono = $2 THEN 0
                    WHEN LOWER(COALESCE(correo, '')) = LOWER($2) THEN 1
                    WHEN LOWER(nombre) LIKE LOWER($3 || '%') THEN 2
                    ELSE 3
                END,
                nombre ASC
            LIMIT $4
        `,
        [
            patron,
            terminoNormalizado,
            terminoNormalizado,
            Number(limite)
        ]
    );

    return rows;
}

export async function buscarPacientePorTelefono(telefono) {
    const { rows } = await pool.query(
        `
            SELECT id, nombre, telefono, correo
            FROM pacientes
            WHERE telefono = $1
            LIMIT 1
        `,
        [telefono]
    );

    return rows[0];
}

export async function buscarPacientePorCorreo(correo) {
    const { rows } = await pool.query(
        `
            SELECT id, nombre, telefono, correo
            FROM pacientes
            WHERE LOWER(correo) = LOWER($1)
            LIMIT 1
        `,
        [correo]
    );

    return rows[0];
}

export async function crearPaciente(datosPaciente) {
    const { rows } = await pool.query(
        `
            INSERT INTO pacientes
                (nombre, fecha_nacimiento, telefono, correo, observaciones, estado, tipo_procedimiento)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `,
        [
            datosPaciente.nombre,
            datosPaciente.fechaNacimiento,
            datosPaciente.telefono,
            datosPaciente.correo,
            datosPaciente.observaciones,
            datosPaciente.estado,
            datosPaciente.tipoProcedimiento
        ]
    );

    return {
        insertId: rows[0].id
    };
}

export async function buscarPacientePorId(id) {
    const { rows } = await pool.query(
        `
            SELECT
                id,
                nombre,
                fecha_nacimiento,
                telefono,
                correo,
                observaciones,
                estado,
                tipo_procedimiento,
                created_at,
                updated_at
            FROM pacientes
            WHERE id = $1
            LIMIT 1
        `,
        [id]
    );

    return rows[0];
}

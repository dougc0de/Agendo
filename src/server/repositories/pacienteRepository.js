import pool from "../db/connection.js";

export async function buscarPacientesPorTermino(termino, limite = 8) {
    const terminoNormalizado = String(termino ?? "").trim();
    const patron = `%${terminoNormalizado}%`;
    const [rows] = await pool.query(
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
                    nombre LIKE ?
                 OR telefono LIKE ?
                 OR correo LIKE ?
              )
            ORDER BY
                CASE
                    WHEN telefono = ? THEN 0
                    WHEN LOWER(COALESCE(correo, '')) = LOWER(?) THEN 1
                    WHEN LOWER(nombre) LIKE LOWER(CONCAT(?, '%')) THEN 2
                    ELSE 3
                END,
                nombre ASC
            LIMIT ?
        `,
        [
            patron,
            patron,
            patron,
            terminoNormalizado,
            terminoNormalizado,
            terminoNormalizado,
            Number(limite)
        ]
    );

    return rows;
}

export async function buscarPacientePorTelefono(telefono) {
    const [rows] = await pool.query(
        `
            SELECT id, nombre, telefono, correo
            FROM pacientes
            WHERE telefono = ?
            LIMIT 1
        `,
        [telefono]
    );

    return rows[0];
}

export async function buscarPacientePorCorreo(correo) {
    const [rows] = await pool.query(
        `
            SELECT id, nombre, telefono, correo
            FROM pacientes
            WHERE LOWER(correo) = LOWER(?)
            LIMIT 1
        `,
        [correo]
    );

    return rows[0];
}

export async function crearPaciente(datosPaciente) {
    const [result] = await pool.query(
        `
            INSERT INTO pacientes
                (nombre, fecha_nacimiento, telefono, correo, observaciones, estado, tipo_procedimiento)
            VALUES (?, ?, ?, ?, ?, ?, ?)
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

    return result;
}

export async function buscarPacientePorId(id) {
    const [rows] = await pool.query(
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
            WHERE id = ?
            LIMIT 1
        `,
        [id]
    );

    return rows[0];
}

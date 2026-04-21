import pool from "../db/connection.js";

export async function buscarPacientesPorTermino(termino, workspaceId, limite = 8, executor = pool) {
    const terminoNormalizado = String(termino ?? "").trim();
    const patron = `%${terminoNormalizado}%`;

    const { rows } = await executor.query(
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
            WHERE workspace_id = $1
              AND estado = 'activo'
              AND (
                    nombre ILIKE $2
                 OR telefono ILIKE $2
                 OR correo ILIKE $2
              )
            ORDER BY
                CASE
                    WHEN telefono = $3 THEN 0
                    WHEN LOWER(COALESCE(correo, '')) = LOWER($3) THEN 1
                    WHEN LOWER(nombre) LIKE LOWER($4 || '%') THEN 2
                    ELSE 3
                END,
                nombre ASC
            LIMIT $5
        `,
        [
            workspaceId,
            patron,
            terminoNormalizado,
            terminoNormalizado,
            Number(limite)
        ]
    );

    return rows;
}

export async function buscarPacientePorTelefono(telefono, workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT id, nombre, telefono, correo
            FROM pacientes
            WHERE telefono = $1
              AND workspace_id = $2
            LIMIT 1
        `,
        [telefono, workspaceId]
    );

    return rows[0];
}

export async function buscarPacientePorCorreo(correo, workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT id, nombre, telefono, correo
            FROM pacientes
            WHERE LOWER(correo) = LOWER($1)
              AND workspace_id = $2
            LIMIT 1
        `,
        [correo, workspaceId]
    );

    return rows[0];
}

export async function crearPaciente(datosPaciente, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO pacientes
                (
                    nombre,
                    fecha_nacimiento,
                    telefono,
                    correo,
                    observaciones,
                    estado,
                    tipo_procedimiento,
                    workspace_id
                )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `,
        [
            datosPaciente.nombre,
            datosPaciente.fechaNacimiento,
            datosPaciente.telefono,
            datosPaciente.correo,
            datosPaciente.observaciones,
            datosPaciente.estado,
            datosPaciente.tipoProcedimiento,
            datosPaciente.workspaceId
        ]
    );

    return {
        insertId: rows[0].id
    };
}

export async function buscarPacientePorId(id, workspaceId, executor = pool) {
    const { rows } = await executor.query(
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
              AND workspace_id = $2
            LIMIT 1
        `,
        [id, workspaceId]
    );

    return rows[0];
}

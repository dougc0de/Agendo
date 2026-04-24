import pool from "../db/connection.js";

export async function crearReserva(reserva, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO reservas
                (
                    fecha,
                    hora_inicio,
                    hora_fin,
                    descripcion,
                    estado,
                    tipo_atencion,
                    tipo_consulta,
                    usuario_id,
                    paciente_id,
                    sala_id,
                    workspace_id
                )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `,
        [
            reserva.fecha,
            reserva.horaInicio,
            reserva.horaFin,
            reserva.descripcion,
            reserva.estado,
            reserva.tipoAtencion,
            reserva.tipoConsulta,
            reserva.usuarioId,
            reserva.pacienteId,
            reserva.salaId,
            reserva.workspaceId
        ]
    );

    return {
        insertId: rows[0].id
    };
}

export async function buscarReservaPorId(id, workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT
                r.*,
                s.nombre AS sala_nombre,
                u.nombre AS usuario_nombre,
                p.nombre AS paciente_nombre,
                p.telefono AS paciente_telefono,
                p.correo AS paciente_correo
            FROM reservas r
            LEFT JOIN salas s
                ON s.id = r.sala_id
               AND s.workspace_id = r.workspace_id
            LEFT JOIN usuarios u
                ON u.id = r.usuario_id
            LEFT JOIN pacientes p
                ON p.id = r.paciente_id
               AND p.workspace_id = r.workspace_id
            WHERE r.id = $1
              AND r.workspace_id = $2
        `,
        [id, workspaceId]
    );

    return rows[0];
}

export async function buscarReservasPorSalaYFecha(
    salaId,
    fecha,
    workspaceId,
    excluirReservaId = null,
    executor = pool
) {
    const params = [salaId, fecha, workspaceId];
    let query = `
        SELECT *
        FROM reservas
        WHERE sala_id = $1
          AND fecha = $2
          AND workspace_id = $3
    `;

    if (excluirReservaId !== null && excluirReservaId !== undefined) {
        params.push(excluirReservaId);
        query += ` AND id <> $4`;
    }

    const { rows } = await executor.query(query, params);
    return rows;
}

export async function listarReservas(workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT
                r.*,
                s.nombre AS sala_nombre,
                u.nombre AS usuario_nombre,
                p.nombre AS paciente_nombre,
                p.telefono AS paciente_telefono,
                p.correo AS paciente_correo
            FROM reservas r
            LEFT JOIN salas s
                ON s.id = r.sala_id
               AND s.workspace_id = r.workspace_id
            LEFT JOIN usuarios u
                ON u.id = r.usuario_id
            LEFT JOIN pacientes p
                ON p.id = r.paciente_id
               AND p.workspace_id = r.workspace_id
            WHERE r.workspace_id = $1
            ORDER BY r.fecha DESC, r.hora_inicio DESC
        `,
        [workspaceId]
    );

    return rows;
}

export async function actualizarReserva(id, datos, workspaceId, executor = pool) {
    const result = await executor.query(
        `
            UPDATE reservas
            SET
                fecha = $1,
                hora_inicio = $2,
                hora_fin = $3,
                descripcion = $4,
                estado = $5,
                tipo_atencion = $6,
                tipo_consulta = $7,
                usuario_id = $8,
                paciente_id = $9,
                sala_id = $10
            WHERE id = $11
              AND workspace_id = $12
        `,
        [
            datos.fecha,
            datos.horaInicio,
            datos.horaFin,
            datos.descripcion,
            datos.estado,
            datos.tipoAtencion,
            datos.tipoConsulta,
            datos.usuarioId,
            datos.pacienteId,
            datos.salaId,
            id,
            workspaceId
        ]
    );

    return {
        affectedRows: result.rowCount
    };
}

export async function eliminarReserva(id, workspaceId, executor = pool) {
    const result = await executor.query(
        `
            DELETE FROM reservas
            WHERE id = $1
              AND workspace_id = $2
        `,
        [id, workspaceId]
    );

    return {
        affectedRows: result.rowCount
    };
}

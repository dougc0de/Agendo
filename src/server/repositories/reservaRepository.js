import pool from "../db/connection.js";

export async function crearReserva(reserva) {
    const { rows } = await pool.query(
        `
            INSERT INTO reservas
                (fecha, hora_inicio, hora_fin, descripcion, estado, tipo_consulta, usuario_id, paciente_id, sala_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `,
        [
            reserva.fecha,
            reserva.horaInicio,
            reserva.horaFin,
            reserva.descripcion,
            reserva.estado,
            reserva.tipoConsulta,
            reserva.usuarioId,
            reserva.pacienteId,
            reserva.salaId
        ]
    );

    return {
        insertId: rows[0].id
    };
}

export async function buscarReservaPorId(id) {
    const { rows } = await pool.query(
        `
            SELECT
                r.*,
                p.nombre AS paciente_nombre,
                p.telefono AS paciente_telefono,
                p.correo AS paciente_correo
            FROM reservas r
            LEFT JOIN pacientes p ON p.id = r.paciente_id
            WHERE r.id = $1
        `,
        [id]
    );

    return rows[0];
}

export async function buscarReservasPorSalaYFecha(salaId, fecha, excluirReservaId = null) {
    const params = [salaId, fecha];
    let query = `
        SELECT *
        FROM reservas
        WHERE sala_id = $1 AND fecha = $2
    `;

    if (excluirReservaId !== null && excluirReservaId !== undefined) {
        params.push(excluirReservaId);
        query += ` AND id <> $3`;
    }

    const { rows } = await pool.query(query, params);
    return rows;
}

export async function listarReservas() {
    const { rows } = await pool.query(
        `
            SELECT
                r.*,
                p.nombre AS paciente_nombre,
                p.telefono AS paciente_telefono,
                p.correo AS paciente_correo
            FROM reservas r
            LEFT JOIN pacientes p ON p.id = r.paciente_id
        `
    );

    return rows;
}

export async function actualizarReserva(id, datos) {
    const result = await pool.query(
        `
            UPDATE reservas
            SET
                fecha = $1,
                hora_inicio = $2,
                hora_fin = $3,
                descripcion = $4,
                estado = $5,
                tipo_consulta = $6,
                usuario_id = $7,
                paciente_id = $8,
                sala_id = $9
            WHERE id = $10
        `,
        [
            datos.fecha,
            datos.horaInicio,
            datos.horaFin,
            datos.descripcion,
            datos.estado,
            datos.tipoConsulta,
            datos.usuarioId,
            datos.pacienteId,
            datos.salaId,
            id
        ]
    );

    return {
        affectedRows: result.rowCount
    };
}

export async function eliminarReserva(id) {
    const result = await pool.query(
        `
            DELETE FROM reservas
            WHERE id = $1
        `,
        [id]
    );

    return {
        affectedRows: result.rowCount
    };
}

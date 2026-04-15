import pool from "../db/connection.js";

export async function crearReserva(reserva) {
    const [result] = await pool.query(
        `
        INSERT INTO reservas
    (fecha, hora_inicio, hora_fin, descripcion, estado, tipo_consulta, usuario_id, paciente_id, sala_id) VALUES (?,?,?,?,?,?,?,?,?)`,
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

    return result;
}

export async function buscarReservaPorId(id) {
    const [rows] = await pool.query(
        `
            SELECT
                r.*,
                p.nombre AS paciente_nombre,
                p.telefono AS paciente_telefono,
                p.correo AS paciente_correo
            FROM reservas r
            LEFT JOIN pacientes p ON p.id = r.paciente_id
            WHERE r.id = ?
        `,
        [id]
    );
    return rows[0];
}

export async function buscarReservasPorSalaYFecha(salaId, fecha, excluirReservaId = null) {
    const query = [
        "SELECT * FROM reservas",
        "WHERE sala_id = ? AND fecha = ?"
    ];
    const params = [salaId, fecha];

    if (excluirReservaId !== null && excluirReservaId !== undefined) {
        query.push("AND id <> ?");
        params.push(excluirReservaId);
    }

    const [rows] = await pool.query(
        query.join(" "),
        params
    );
    return rows;
}

export async function listarReservas() {
    const [rows] = await pool.query(
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
    const [result] = await pool.query(
        `
            UPDATE reservas
            SET fecha = ?, hora_inicio = ?, hora_fin = ?, descripcion = ?, estado = ?, tipo_consulta = ?, usuario_id = ?, paciente_id = ?, sala_id = ?
            WHERE id = ?
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
    return result;
}

export async function eliminarReserva(id) {
    const [result] = await pool.query(
        `
        DELETE FROM reservas WHERE id=?
    `,
        [id]
    );
    return result;
}

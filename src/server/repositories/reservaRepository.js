import pool from "../db/connection.js";

function appendOptionalPositiveIdFilter(clauses, params, expression, value) {
    const numericValue = Number(value);

    if (!Number.isInteger(numericValue) || numericValue <= 0) {
        return;
    }

    params.push(numericValue);
    clauses.push(`${expression} = $${params.length}`);
}

function appendOptionalDateFilter(clauses, params, expression, value, operator) {
    const normalizedValue = String(value ?? "").trim().slice(0, 10);

    if (!normalizedValue) {
        return;
    }

    params.push(normalizedValue);
    clauses.push(`${expression} ${operator} $${params.length}`);
}

function appendOptionalStatusFilter(clauses, params, expression, value) {
    const normalizedValue = String(value ?? "").trim().toLowerCase();

    if (!normalizedValue || normalizedValue === "todos") {
        return;
    }

    params.push(normalizedValue);
    clauses.push(`${expression} = $${params.length}`);
}

function appendOptionalPatientSearchFilter(clauses, params, value) {
    const normalizedValue = String(value ?? "").trim();

    if (!normalizedValue) {
        return;
    }

    params.push(`%${normalizedValue}%`);
    clauses.push(
        `(
            COALESCE(p.nombre, '') ILIKE $${params.length}
            OR COALESCE(p.telefono, '') ILIKE $${params.length}
            OR COALESCE(p.correo, '') ILIKE $${params.length}
        )`
    );
}

function buildReservationSelectQuery({
    sourceExpression,
    alias = "r",
    workspaceId,
    filters = {},
    orderDirection = "desc"
}) {
    const normalizedOrderDirection = String(orderDirection).toLowerCase() === "asc"
        ? "ASC"
        : "DESC";
    const params = [workspaceId];
    const clauses = [`${alias}.workspace_id = $1`];

    appendOptionalPositiveIdFilter(clauses, params, "s.clinica_id", filters.clinicaId);
    appendOptionalPositiveIdFilter(clauses, params, `${alias}.usuario_id`, filters.userId);
    appendOptionalDateFilter(clauses, params, `${alias}.fecha`, filters.from, ">=");
    appendOptionalDateFilter(clauses, params, `${alias}.fecha`, filters.to, "<=");
    appendOptionalStatusFilter(clauses, params, `${alias}.estado`, filters.status);
    appendOptionalPatientSearchFilter(clauses, params, filters.patient);

    return {
        text: `
            SELECT
                ${alias}.*,
                s.nombre AS sala_nombre,
                s.sucursal_id AS sucursal_id,
                su.nombre AS sucursal_nombre,
                u.nombre AS usuario_nombre,
                p.nombre AS paciente_nombre,
                p.telefono AS paciente_telefono,
                p.correo AS paciente_correo,
                bi.name AS billable_item_name,
                bi.category AS billable_item_category
            FROM ${sourceExpression} ${alias}
            LEFT JOIN salas s
                ON s.id = ${alias}.sala_id
               AND s.workspace_id = ${alias}.workspace_id
            LEFT JOIN sucursales su
                ON su.id = s.sucursal_id
            LEFT JOIN usuarios u
                ON u.id = ${alias}.usuario_id
            LEFT JOIN pacientes p
                ON p.id = ${alias}.paciente_id
               AND p.workspace_id = ${alias}.workspace_id
            LEFT JOIN billable_items bi
                ON bi.id = ${alias}.billable_item_id
            WHERE ${clauses.join(" AND ")}
            ORDER BY ${alias}.fecha ${normalizedOrderDirection}, ${alias}.hora_inicio ${normalizedOrderDirection}
        `,
        params
    };
}

async function listarReservasDesdeFuente(
    sourceExpression,
    workspaceId,
    filters = {},
    executor = pool,
    options = {}
) {
    const { text, params } = buildReservationSelectQuery({
        sourceExpression,
        workspaceId,
        filters,
        orderDirection: options.orderDirection ?? "desc"
    });
    const { rows } = await executor.query(text, params);
    return rows;
}

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
                    appointment_outcome,
                    tipo_atencion,
                    tipo_consulta,
                    billable_item_id,
                    usuario_id,
                    paciente_id,
                    sala_id,
                    workspace_id
                )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
        `,
        [
            reserva.fecha,
            reserva.horaInicio,
            reserva.horaFin,
            reserva.descripcion,
            reserva.estado,
            reserva.appointmentOutcome ?? "pendiente",
            reserva.tipoAtencion,
            reserva.tipoConsulta,
            reserva.billableItemId,
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
                s.sucursal_id AS sucursal_id,
                su.nombre AS sucursal_nombre,
                u.nombre AS usuario_nombre,
                p.nombre AS paciente_nombre,
                p.telefono AS paciente_telefono,
                p.correo AS paciente_correo,
                bi.name AS billable_item_name,
                bi.category AS billable_item_category
            FROM reservas r
            LEFT JOIN salas s
                ON s.id = r.sala_id
               AND s.workspace_id = r.workspace_id
            LEFT JOIN sucursales su
                ON su.id = s.sucursal_id
            LEFT JOIN usuarios u
                ON u.id = r.usuario_id
            LEFT JOIN pacientes p
                ON p.id = r.paciente_id
               AND p.workspace_id = r.workspace_id
            LEFT JOIN billable_items bi
                ON bi.id = r.billable_item_id
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
    return listarReservasDesdeFuente("reservas", workspaceId, {}, executor, {
        orderDirection: "desc"
    });
}

export async function listarReservasVigentes(workspaceId, filters = {}, executor = pool) {
    return listarReservasDesdeFuente("public.reservas_vigentes", workspaceId, filters, executor, {
        orderDirection: "asc"
    });
}

export async function listarReservasHistorial(workspaceId, filters = {}, executor = pool) {
    return listarReservasDesdeFuente("public.reservas_historial", workspaceId, filters, executor, {
        orderDirection: "desc"
    });
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
                billable_item_id = $8,
                usuario_id = $9,
                paciente_id = $10,
                sala_id = $11,
                appointment_outcome = $12,
                confirmed_at = $13,
                confirmed_by_user_id = $14,
                cancelled_at = $15,
                cancelled_by_user_id = $16,
                cancellation_reason = $17,
                checked_in_at = $18,
                completed_at = $19,
                outcome_recorded_at = $20,
                outcome_recorded_by_user_id = $21
            WHERE id = $22
              AND workspace_id = $23
        `,
        [
            datos.fecha,
            datos.horaInicio,
            datos.horaFin,
            datos.descripcion,
            datos.estado,
            datos.tipoAtencion,
            datos.tipoConsulta,
            datos.billableItemId,
            datos.usuarioId,
            datos.pacienteId,
            datos.salaId,
            datos.appointmentOutcome,
            datos.confirmedAt,
            datos.confirmedByUserId,
            datos.cancelledAt,
            datos.cancelledByUserId,
            datos.cancellationReason,
            datos.checkedInAt,
            datos.completedAt,
            datos.outcomeRecordedAt,
            datos.outcomeRecordedByUserId,
            id,
            workspaceId
        ]
    );

    return {
        affectedRows: result.rowCount
    };
}

export async function actualizarEstadoReserva(id, datos, workspaceId, executor = pool) {
    const result = await executor.query(
        `
            UPDATE reservas
            SET
                estado = $3,
                appointment_outcome = $4,
                confirmed_at = $5,
                confirmed_by_user_id = $6,
                cancelled_at = $7,
                cancelled_by_user_id = $8,
                cancellation_reason = $9,
                checked_in_at = $10,
                completed_at = $11,
                outcome_recorded_at = $12,
                outcome_recorded_by_user_id = $13
            WHERE id = $1
              AND workspace_id = $2
        `,
        [
            id,
            workspaceId,
            datos.estado,
            datos.appointmentOutcome,
            datos.confirmedAt,
            datos.confirmedByUserId,
            datos.cancelledAt,
            datos.cancelledByUserId,
            datos.cancellationReason,
            datos.checkedInAt,
            datos.completedAt,
            datos.outcomeRecordedAt,
            datos.outcomeRecordedByUserId
        ]
    );

    return {
        affectedRows: result.rowCount
    };
}

export async function actualizarResultadoReserva(id, datos, workspaceId, executor = pool) {
    const result = await executor.query(
        `
            UPDATE reservas
            SET
                estado = $3,
                appointment_outcome = $4,
                cancelled_at = $5,
                cancelled_by_user_id = $6,
                cancellation_reason = $7,
                checked_in_at = $8,
                completed_at = $9,
                outcome_recorded_at = $10,
                outcome_recorded_by_user_id = $11
            WHERE id = $1
              AND workspace_id = $2
        `,
        [
            id,
            workspaceId,
            datos.estado,
            datos.appointmentOutcome,
            datos.cancelledAt,
            datos.cancelledByUserId,
            datos.cancellationReason,
            datos.checkedInAt,
            datos.completedAt,
            datos.outcomeRecordedAt,
            datos.outcomeRecordedByUserId
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

import pool from "../db/connection.js";

export async function listarCobrosPorWorkspaceId(workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT
                rc.*,
                r.fecha AS reservation_date,
                r.hora_inicio AS reservation_start_time,
                r.hora_fin AS reservation_end_time,
                r.estado AS reservation_status,
                r.usuario_id AS reservation_user_id,
                u.nombre AS reservation_user_nombre
            FROM reservation_charges rc
            INNER JOIN reservas r
                ON r.id = rc.reservation_id
               AND r.workspace_id = rc.workspace_id
            LEFT JOIN usuarios u
                ON u.id = r.usuario_id
            WHERE rc.workspace_id = $1
            ORDER BY rc.created_at DESC
        `,
        [workspaceId]
    );

    return rows;
}

export async function buscarCobroPorId(id, workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT
                rc.*,
                r.fecha AS reservation_date,
                r.hora_inicio AS reservation_start_time,
                r.hora_fin AS reservation_end_time,
                r.estado AS reservation_status,
                r.usuario_id AS reservation_user_id,
                u.nombre AS reservation_user_nombre
            FROM reservation_charges rc
            INNER JOIN reservas r
                ON r.id = rc.reservation_id
               AND r.workspace_id = rc.workspace_id
            LEFT JOIN usuarios u
                ON u.id = r.usuario_id
            WHERE rc.id = $1
              AND rc.workspace_id = $2
            LIMIT 1
        `,
        [id, workspaceId]
    );

    return rows[0];
}

export async function buscarCobroPorReservaId(reservationId, workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT
                rc.*,
                r.fecha AS reservation_date,
                r.hora_inicio AS reservation_start_time,
                r.hora_fin AS reservation_end_time,
                r.estado AS reservation_status,
                r.usuario_id AS reservation_user_id,
                u.nombre AS reservation_user_nombre
            FROM reservation_charges rc
            INNER JOIN reservas r
                ON r.id = rc.reservation_id
               AND r.workspace_id = rc.workspace_id
            LEFT JOIN usuarios u
                ON u.id = r.usuario_id
            WHERE rc.reservation_id = $1
              AND rc.workspace_id = $2
            LIMIT 1
        `,
        [reservationId, workspaceId]
    );

    return rows[0];
}

export async function crearCobro(datosCobro, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO reservation_charges
                (
                    workspace_id,
                    reservation_id,
                    patient_id,
                    patient_name_snapshot,
                    room_id,
                    room_name_snapshot,
                    branch_id,
                    branch_name_snapshot,
                    procedure_name,
                    tipo_atencion,
                    amount,
                    currency_code,
                    payment_status,
                    payment_method,
                    paid_at,
                    registered_by_user_id,
                    notes
                )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING id
        `,
        [
            datosCobro.workspaceId,
            datosCobro.reservationId,
            datosCobro.patientId,
            datosCobro.patientNameSnapshot,
            datosCobro.roomId,
            datosCobro.roomNameSnapshot,
            datosCobro.branchId,
            datosCobro.branchNameSnapshot,
            datosCobro.procedureName,
            datosCobro.tipoAtencion,
            datosCobro.amount,
            datosCobro.currencyCode,
            datosCobro.paymentStatus,
            datosCobro.paymentMethod,
            datosCobro.paidAt,
            datosCobro.registeredByUserId,
            datosCobro.notes
        ]
    );

    return rows[0];
}

export async function actualizarCobro(id, workspaceId, datosCobro, executor = pool) {
    const { rows } = await executor.query(
        `
            UPDATE reservation_charges
            SET
                procedure_name = $3,
                amount = $4,
                currency_code = $5,
                payment_status = $6,
                payment_method = $7,
                paid_at = $8,
                registered_by_user_id = $9,
                notes = $10
            WHERE id = $1
              AND workspace_id = $2
            RETURNING id
        `,
        [
            id,
            workspaceId,
            datosCobro.procedureName,
            datosCobro.amount,
            datosCobro.currencyCode,
            datosCobro.paymentStatus,
            datosCobro.paymentMethod,
            datosCobro.paidAt,
            datosCobro.registeredByUserId,
            datosCobro.notes
        ]
    );

    return rows[0];
}

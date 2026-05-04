import pool from "../db/connection.js";

const BILLING_DOCUMENT_SELECT = `
    SELECT
        bd.*,
        su.nombre AS branch_name,
        r.fecha AS reservation_date,
        r.hora_inicio AS reservation_start_time,
        r.hora_fin AS reservation_end_time,
        r.estado AS reservation_status,
        p.nombre AS patient_name,
        p.telefono AS patient_phone,
        u.nombre AS professional_user_name,
        s.nombre AS room_name,
        rcf.paid_amount,
        rcf.outstanding_amount,
        rcf.payment_count,
        rcf.last_payment_at,
        rcf.financial_status
    FROM billing_documents bd
    LEFT JOIN sucursales su
        ON su.id = bd.branch_id
    LEFT JOIN reservas r
        ON r.id = bd.reservation_id
       AND r.workspace_id = bd.workspace_id
    LEFT JOIN pacientes p
        ON p.id = bd.patient_id
       AND p.workspace_id = bd.workspace_id
    LEFT JOIN usuarios u
        ON u.id = bd.professional_user_id
    LEFT JOIN salas s
        ON s.id = bd.room_id
       AND s.workspace_id = bd.workspace_id
    LEFT JOIN public.billing_document_financials rcf
        ON rcf.document_id = bd.id
       AND rcf.workspace_id = bd.workspace_id
`;

export async function listarBillingDocumentsPorWorkspaceId(workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            ${BILLING_DOCUMENT_SELECT}
            WHERE bd.workspace_id = $1
            ORDER BY bd.created_at DESC
        `,
        [workspaceId]
    );

    return rows;
}

export async function listarBillingDocumentsPorReservationIds(
    reservationIds,
    workspaceId,
    executor = pool
) {
    if (!Array.isArray(reservationIds) || !reservationIds.length) {
        return [];
    }

    const { rows } = await executor.query(
        `
            ${BILLING_DOCUMENT_SELECT}
            WHERE bd.workspace_id = $1
              AND bd.reservation_id = ANY($2::bigint[])
              AND bd.document_status <> 'anulado'
            ORDER BY bd.created_at DESC
        `,
        [workspaceId, reservationIds]
    );

    return rows;
}

export async function buscarBillingDocumentPorId(id, workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            ${BILLING_DOCUMENT_SELECT}
            WHERE bd.id = $1
              AND bd.workspace_id = $2
            LIMIT 1
        `,
        [id, workspaceId]
    );

    return rows[0];
}

export async function buscarBillingDocumentActivoPorReservationId(
    reservationId,
    workspaceId,
    executor = pool
) {
    const { rows } = await executor.query(
        `
            ${BILLING_DOCUMENT_SELECT}
            WHERE bd.reservation_id = $1
              AND bd.workspace_id = $2
              AND bd.document_status <> 'anulado'
            LIMIT 1
        `,
        [reservationId, workspaceId]
    );

    return rows[0];
}

export async function crearBillingDocument(datos, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO billing_documents
                (
                    workspace_id,
                    branch_id,
                    reservation_id,
                    patient_id,
                    patient_name_snapshot,
                    patient_phone_snapshot,
                    professional_user_id,
                    professional_name_snapshot,
                    room_id,
                    room_name_snapshot,
                    source_type,
                    source_id,
                    party_type,
                    party_id,
                    document_type,
                    document_status,
                    currency_code,
                    subtotal_amount,
                    tax_amount,
                    discount_amount,
                    total_amount,
                    charge_decision,
                    notes,
                    issued_at,
                    issued_by_user_id
                )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25
            )
            RETURNING id
        `,
        [
            datos.workspaceId,
            datos.branchId,
            datos.reservationId,
            datos.patientId,
            datos.patientNameSnapshot,
            datos.patientPhoneSnapshot,
            datos.professionalUserId,
            datos.professionalNameSnapshot,
            datos.roomId,
            datos.roomNameSnapshot,
            datos.sourceType,
            datos.sourceId,
            datos.partyType,
            datos.partyId,
            datos.documentType,
            datos.documentStatus,
            datos.currencyCode,
            datos.subtotalAmount,
            datos.taxAmount,
            datos.discountAmount,
            datos.totalAmount,
            datos.chargeDecision,
            datos.notes,
            datos.issuedAt,
            datos.issuedByUserId
        ]
    );

    return rows[0];
}

export async function crearBillingDocumentLine(datos, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO billing_document_lines
                (
                    workspace_id,
                    document_id,
                    billable_item_id,
                    line_name_snapshot,
                    description_snapshot,
                    category_snapshot,
                    quantity,
                    unit_price,
                    discount_amount,
                    tax_rate,
                    tax_amount,
                    line_total
                )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `,
        [
            datos.workspaceId,
            datos.documentId,
            datos.billableItemId,
            datos.lineNameSnapshot,
            datos.descriptionSnapshot,
            datos.categorySnapshot,
            datos.quantity,
            datos.unitPrice,
            datos.discountAmount,
            datos.taxRate,
            datos.taxAmount,
            datos.lineTotal
        ]
    );

    return rows[0];
}

export async function listarBillingDocumentLinesPorDocumentIds(
    documentIds,
    workspaceId,
    executor = pool
) {
    if (!Array.isArray(documentIds) || !documentIds.length) {
        return [];
    }

    const { rows } = await executor.query(
        `
            SELECT *
            FROM billing_document_lines
            WHERE workspace_id = $1
              AND document_id = ANY($2::bigint[])
            ORDER BY id ASC
        `,
        [workspaceId, documentIds]
    );

    return rows;
}

export async function crearBillingDocumentPayment(datos, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO billing_document_payments
                (
                    workspace_id,
                    document_id,
                    amount,
                    currency_code,
                    payment_method,
                    paid_at,
                    notes,
                    registered_by_user_id
                )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `,
        [
            datos.workspaceId,
            datos.documentId,
            datos.amount,
            datos.currencyCode,
            datos.paymentMethod,
            datos.paidAt,
            datos.notes,
            datos.registeredByUserId
        ]
    );

    return rows[0];
}

export async function listarBillingDocumentPaymentsPorDocumentIds(
    documentIds,
    workspaceId,
    executor = pool
) {
    if (!Array.isArray(documentIds) || !documentIds.length) {
        return [];
    }

    const { rows } = await executor.query(
        `
            SELECT *
            FROM billing_document_payments
            WHERE workspace_id = $1
              AND document_id = ANY($2::bigint[])
            ORDER BY paid_at ASC, id ASC
        `,
        [workspaceId, documentIds]
    );

    return rows;
}

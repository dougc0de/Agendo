import pool from "../db/connection.js";

const CHARGE_SELECT = `
    SELECT
        rc.*,
        COALESCE(rc.patient_phone_snapshot, p.telefono) AS patient_phone_snapshot,
        r.fecha AS reservation_date,
        r.hora_inicio AS reservation_start_time,
        r.hora_fin AS reservation_end_time,
        r.estado AS reservation_status,
        r.usuario_id AS reservation_user_id,
        u.nombre AS reservation_user_nombre,
        uw.nombre AS waived_by_user_nombre,
        COALESCE(cf.paid_amount, 0) AS paid_amount,
        COALESCE(cf.outstanding_amount, COALESCE(rc.total_billed_amount, rc.amount, 0)) AS outstanding_amount,
        COALESCE(cf.payment_count, 0) AS payment_count,
        COALESCE(cf.last_payment_at, rc.paid_at) AS last_payment_at,
        cf.financial_status,
        bi.name AS billable_item_name,
        bi.category AS billable_item_category
    FROM reservation_charges rc
    INNER JOIN reservas r
        ON r.id = rc.reservation_id
       AND r.workspace_id = rc.workspace_id
    LEFT JOIN pacientes p
        ON p.id = rc.patient_id
       AND p.workspace_id = rc.workspace_id
    LEFT JOIN usuarios u
        ON u.id = r.usuario_id
    LEFT JOIN usuarios uw
        ON uw.id = rc.waived_by_user_id
    LEFT JOIN billable_items bi
        ON bi.id = rc.billable_item_id
    LEFT JOIN public.reservation_charge_financials cf
        ON cf.charge_id = rc.id
       AND cf.workspace_id = rc.workspace_id
`;

const CHARGE_PAYMENT_SELECT = `
    SELECT
        rcp.*
    FROM reservation_charge_payments rcp
`;

export async function listarCobrosPorWorkspaceId(workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            ${CHARGE_SELECT}
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
            ${CHARGE_SELECT}
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
            ${CHARGE_SELECT}
            WHERE rc.reservation_id = $1
              AND rc.workspace_id = $2
            LIMIT 1
        `,
        [reservationId, workspaceId]
    );

    return rows[0];
}

export async function listarCobrosPorReservationIds(
    reservationIds,
    workspaceId,
    executor = pool
) {
    if (!Array.isArray(reservationIds) || !reservationIds.length) {
        return [];
    }

    const { rows } = await executor.query(
        `
            ${CHARGE_SELECT}
            WHERE rc.workspace_id = $1
              AND rc.reservation_id = ANY($2::bigint[])
            ORDER BY rc.created_at DESC
        `,
        [workspaceId, reservationIds]
    );

    return rows;
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
                    patient_phone_snapshot,
                    room_id,
                    room_name_snapshot,
                    branch_id,
                    branch_name_snapshot,
                    procedure_name,
                    tipo_atencion,
                    billable_item_id,
                    amount,
                    currency_code,
                    payment_status,
                    payment_method,
                    paid_at,
                    registered_by_user_id,
                    notes,
                    pricing_mode,
                    room_charge_amount,
                    supplies_total_amount,
                    supplies_total_cost,
                    total_billed_amount,
                    charge_decision,
                    waived_by_user_id,
                    waiver_reason
                )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25, $26, $27
            )
            RETURNING id
        `,
        [
            datosCobro.workspaceId,
            datosCobro.reservationId,
            datosCobro.patientId,
            datosCobro.patientNameSnapshot,
            datosCobro.patientPhoneSnapshot,
            datosCobro.roomId,
            datosCobro.roomNameSnapshot,
            datosCobro.branchId,
            datosCobro.branchNameSnapshot,
            datosCobro.procedureName,
            datosCobro.tipoAtencion,
            datosCobro.billableItemId,
            datosCobro.amount,
            datosCobro.currencyCode,
            datosCobro.paymentStatus,
            datosCobro.paymentMethod,
            datosCobro.paidAt,
            datosCobro.registeredByUserId,
            datosCobro.notes,
            datosCobro.pricingMode,
            datosCobro.roomChargeAmount,
            datosCobro.suppliesTotalAmount,
            datosCobro.suppliesTotalCost,
            datosCobro.totalBilledAmount,
            datosCobro.chargeDecision,
            datosCobro.waivedByUserId,
            datosCobro.waiverReason
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
                notes = $10,
                pricing_mode = $11,
                room_charge_amount = $12,
                supplies_total_amount = $13,
                supplies_total_cost = $14,
                total_billed_amount = $15,
                charge_decision = $16,
                waived_by_user_id = $17,
                waiver_reason = $18,
                billable_item_id = $19
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
            datosCobro.notes,
            datosCobro.pricingMode,
            datosCobro.roomChargeAmount,
            datosCobro.suppliesTotalAmount,
            datosCobro.suppliesTotalCost,
            datosCobro.totalBilledAmount,
            datosCobro.chargeDecision,
            datosCobro.waivedByUserId,
            datosCobro.waiverReason,
            datosCobro.billableItemId
        ]
    );

    return rows[0];
}

export async function actualizarPagoCobro(id, workspaceId, datosPago, executor = pool) {
    const { rows } = await executor.query(
        `
            UPDATE reservation_charges
            SET
                payment_status = $3,
                payment_method = $4,
                paid_at = $5,
                registered_by_user_id = $6
            WHERE id = $1
              AND workspace_id = $2
            RETURNING id
        `,
        [
            id,
            workspaceId,
            datosPago.paymentStatus,
            datosPago.paymentMethod,
            datosPago.paidAt,
            datosPago.registeredByUserId
        ]
    );

    return rows[0];
}

export async function crearPagoCobro(datosPago, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO reservation_charge_payments
                (
                    workspace_id,
                    charge_id,
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
            datosPago.workspaceId,
            datosPago.chargeId,
            datosPago.amount,
            datosPago.currencyCode,
            datosPago.paymentMethod,
            datosPago.paidAt,
            datosPago.notes,
            datosPago.registeredByUserId
        ]
    );

    return rows[0];
}

export async function listarPagosPorChargeIds(chargeIds, workspaceId, executor = pool) {
    if (!Array.isArray(chargeIds) || !chargeIds.length) {
        return [];
    }

    const { rows } = await executor.query(
        `
            ${CHARGE_PAYMENT_SELECT}
            WHERE rcp.workspace_id = $1
              AND rcp.charge_id = ANY($2::bigint[])
            ORDER BY rcp.paid_at ASC, rcp.id ASC
        `,
        [workspaceId, chargeIds]
    );

    return rows;
}

export async function listarLineasInsumosPorChargeIds(chargeIds, workspaceId, executor = pool) {
    if (!chargeIds.length) {
        return [];
    }

    const { rows } = await executor.query(
        `
            SELECT *
            FROM reservation_charge_supplies
            WHERE workspace_id = $1
              AND charge_id = ANY($2::bigint[])
            ORDER BY created_at ASC, id ASC
        `,
        [workspaceId, chargeIds]
    );

    return rows;
}

export async function reemplazarLineasInsumos(chargeId, workspaceId, lineas = [], executor = pool) {
    await executor.query(
        `
            DELETE FROM reservation_charge_supplies
            WHERE charge_id = $1
              AND workspace_id = $2
        `,
        [chargeId, workspaceId]
    );

    for (const linea of lineas) {
        await executor.query(
            `
                INSERT INTO reservation_charge_supplies
                    (
                        workspace_id,
                        charge_id,
                        inventory_item_id,
                        item_name_snapshot,
                        item_category_snapshot,
                        unit_snapshot,
                        quantity,
                        unit_cost,
                        unit_price,
                        subtotal_cost,
                        subtotal_price,
                        notes
                    )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `,
            [
                workspaceId,
                chargeId,
                linea.inventoryItemId,
                linea.itemNameSnapshot,
                linea.itemCategorySnapshot,
                linea.unitSnapshot,
                linea.quantity,
                linea.unitCost,
                linea.unitPrice,
                linea.subtotalCost,
                linea.subtotalPrice,
                linea.notes
            ]
        );
    }
}

export async function listarInventarioPorWorkspaceId(workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT *
            FROM inventory_items
            WHERE workspace_id = $1
            ORDER BY
                CASE WHEN estado = 'activo' THEN 0 ELSE 1 END,
                nombre ASC
        `,
        [workspaceId]
    );

    return rows;
}

export async function buscarItemInventarioPorId(id, workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT *
            FROM inventory_items
            WHERE id = $1
              AND workspace_id = $2
            LIMIT 1
        `,
        [id, workspaceId]
    );

    return rows[0];
}

export async function crearItemInventario(datosItem, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO inventory_items
                (
                    workspace_id,
                    nombre,
                    categoria,
                    unidad,
                    costo_base,
                    precio_sugerido,
                    estado
                )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `,
        [
            datosItem.workspaceId,
            datosItem.nombre,
            datosItem.categoria,
            datosItem.unidad,
            datosItem.costoBase,
            datosItem.precioSugerido,
            datosItem.estado
        ]
    );

    return rows[0];
}

export async function actualizarItemInventario(id, workspaceId, datosItem, executor = pool) {
    const { rows } = await executor.query(
        `
            UPDATE inventory_items
            SET
                nombre = $3,
                categoria = $4,
                unidad = $5,
                costo_base = $6,
                precio_sugerido = $7,
                estado = $8
            WHERE id = $1
              AND workspace_id = $2
            RETURNING *
        `,
        [
            id,
            workspaceId,
            datosItem.nombre,
            datosItem.categoria,
            datosItem.unidad,
            datosItem.costoBase,
            datosItem.precioSugerido,
            datosItem.estado
        ]
    );

    return rows[0];
}

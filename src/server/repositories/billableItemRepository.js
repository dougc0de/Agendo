import pool from "../db/connection.js";

function appendOptionalPositiveIdFilter(clauses, params, expression, value) {
    const numericValue = Number(value);

    if (!Number.isInteger(numericValue) || numericValue <= 0) {
        return;
    }

    params.push(numericValue);
    clauses.push(`${expression} = $${params.length}`);
}

function appendOptionalSearchFilter(clauses, params, value) {
    const normalizedValue = String(value ?? "").trim();

    if (!normalizedValue) {
        return;
    }

    params.push(`%${normalizedValue}%`);
    clauses.push(
        `(
            bi.name ILIKE $${params.length}
            OR COALESCE(bi.description, '') ILIKE $${params.length}
            OR COALESCE(bi.category, '') ILIKE $${params.length}
        )`
    );
}

function appendOptionalStateFilter(clauses, params, value) {
    const normalizedValue = String(value ?? "").trim().toLowerCase();

    if (!normalizedValue || normalizedValue === "todos") {
        return;
    }

    if (normalizedValue === "activo" || normalizedValue === "inactivo") {
        params.push(normalizedValue);
        clauses.push(`bi.state = $${params.length}`);
    }
}

export async function listarBillableItemsPorWorkspaceId(
    workspaceId,
    filters = {},
    executor = pool
) {
    const params = [workspaceId];
    const clauses = ["bi.workspace_id = $1"];

    appendOptionalPositiveIdFilter(clauses, params, "bi.branch_id", filters.branchId);
    appendOptionalSearchFilter(clauses, params, filters.search);
    appendOptionalStateFilter(clauses, params, filters.state);

    const category = String(filters.category ?? "").trim();

    if (category) {
        params.push(category);
        clauses.push(`bi.category = $${params.length}`);
    }

    if (String(filters.reservable ?? "").trim() === "si") {
        clauses.push("bi.reservable = true");
    }

    if (String(filters.manualBilling ?? "").trim() === "si") {
        clauses.push("bi.billable_without_reservation = true");
    }

    const { rows } = await executor.query(
        `
            SELECT
                bi.*,
                su.nombre AS branch_name
            FROM billable_items bi
            LEFT JOIN sucursales su
                ON su.id = bi.branch_id
            WHERE ${clauses.join(" AND ")}
            ORDER BY bi.state ASC, bi.category ASC, bi.name ASC
        `,
        params
    );

    return rows;
}

export async function listarBillableItemsPorIds(ids, workspaceId, executor = pool) {
    if (!Array.isArray(ids) || !ids.length) {
        return [];
    }

    const { rows } = await executor.query(
        `
            SELECT
                bi.*,
                su.nombre AS branch_name
            FROM billable_items bi
            LEFT JOIN sucursales su
                ON su.id = bi.branch_id
            WHERE bi.workspace_id = $1
              AND bi.id = ANY($2::bigint[])
        `,
        [workspaceId, ids]
    );

    return rows;
}

export async function buscarBillableItemPorId(id, workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT
                bi.*,
                su.nombre AS branch_name
            FROM billable_items bi
            LEFT JOIN sucursales su
                ON su.id = bi.branch_id
            WHERE bi.id = $1
              AND bi.workspace_id = $2
            LIMIT 1
        `,
        [id, workspaceId]
    );

    return rows[0];
}

export async function crearBillableItem(datos, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO billable_items
                (
                    workspace_id,
                    branch_id,
                    name,
                    description,
                    category,
                    appointment_type_hint,
                    base_price,
                    currency_code,
                    tax_behavior,
                    tax_rate,
                    estimated_duration_minutes,
                    requires_patient,
                    requires_professional,
                    requires_room,
                    requires_inventory,
                    reservable,
                    billable_without_reservation,
                    package_eligible,
                    visible_to_reception,
                    administrative_only,
                    state
                )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
            )
            RETURNING id
        `,
        [
            datos.workspaceId,
            datos.branchId,
            datos.name,
            datos.description,
            datos.category,
            datos.appointmentTypeHint,
            datos.basePrice,
            datos.currencyCode,
            datos.taxBehavior,
            datos.taxRate,
            datos.estimatedDurationMinutes,
            datos.requiresPatient,
            datos.requiresProfessional,
            datos.requiresRoom,
            datos.requiresInventory,
            datos.reservable,
            datos.billableWithoutReservation,
            datos.packageEligible,
            datos.visibleToReception,
            datos.administrativeOnly,
            datos.state
        ]
    );

    return rows[0];
}

export async function actualizarBillableItem(id, workspaceId, datos, executor = pool) {
    const { rows } = await executor.query(
        `
            UPDATE billable_items
            SET
                branch_id = $3,
                name = $4,
                description = $5,
                category = $6,
                appointment_type_hint = $7,
                base_price = $8,
                currency_code = $9,
                tax_behavior = $10,
                tax_rate = $11,
                estimated_duration_minutes = $12,
                requires_patient = $13,
                requires_professional = $14,
                requires_room = $15,
                requires_inventory = $16,
                reservable = $17,
                billable_without_reservation = $18,
                package_eligible = $19,
                visible_to_reception = $20,
                administrative_only = $21,
                state = $22
            WHERE id = $1
              AND workspace_id = $2
            RETURNING id
        `,
        [
            id,
            workspaceId,
            datos.branchId,
            datos.name,
            datos.description,
            datos.category,
            datos.appointmentTypeHint,
            datos.basePrice,
            datos.currencyCode,
            datos.taxBehavior,
            datos.taxRate,
            datos.estimatedDurationMinutes,
            datos.requiresPatient,
            datos.requiresProfessional,
            datos.requiresRoom,
            datos.requiresInventory,
            datos.reservable,
            datos.billableWithoutReservation,
            datos.packageEligible,
            datos.visibleToReception,
            datos.administrativeOnly,
            datos.state
        ]
    );

    return rows[0];
}

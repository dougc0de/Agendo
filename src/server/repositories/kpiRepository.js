import pool from "../db/connection.js";

function addOptionalFilter(clauses, params, expression, value) {
    if (value === undefined || value === null || value === "") {
        return;
    }

    params.push(value);
    clauses.push(`${expression} = $${params.length}`);
}

export async function listarKpiReservationFacts(workspaceId, filters = {}, executor = pool) {
    const params = [workspaceId];
    const clauses = ["workspace_id = $1"];

    if (filters.from) {
        params.push(filters.from);
        clauses.push(`reservation_date >= $${params.length}`);
    }

    if (filters.to) {
        params.push(filters.to);
        clauses.push(`reservation_date <= $${params.length}`);
    }

    addOptionalFilter(clauses, params, "branch_id", filters.branchId);
    addOptionalFilter(clauses, params, "room_id", filters.roomId);
    addOptionalFilter(clauses, params, "reservation_user_id", filters.doctorUserId);
    addOptionalFilter(clauses, params, "reservation_status", filters.status);
    addOptionalFilter(clauses, params, "appointment_outcome", filters.appointmentOutcome);
    addOptionalFilter(clauses, params, "currency_code", filters.currencyCode);

    const { rows } = await executor.query(
        `
            SELECT *
            FROM public.vw_kpi_reservation_facts
            WHERE ${clauses.join(" AND ")}
            ORDER BY reservation_date ASC, reservation_id ASC
        `,
        params
    );

    return rows;
}

export async function listarSalasParaKpis(workspaceId, filters = {}, executor = pool) {
    const params = [workspaceId];
    const clauses = ["s.workspace_id = $1"];

    addOptionalFilter(clauses, params, "s.sucursal_id", filters.branchId);
    addOptionalFilter(clauses, params, "s.id", filters.roomId);

    const { rows } = await executor.query(
        `
            SELECT
                s.id,
                s.nombre,
                s.estado,
                s.tipo,
                s.sucursal_id,
                su.nombre AS sucursal_nombre
            FROM salas s
            LEFT JOIN sucursales su
                ON su.id = s.sucursal_id
            WHERE ${clauses.join(" AND ")}
            ORDER BY
                CASE WHEN s.estado = 'activa' THEN 0 ELSE 1 END,
                s.nombre ASC
        `,
        params
    );

    return rows;
}

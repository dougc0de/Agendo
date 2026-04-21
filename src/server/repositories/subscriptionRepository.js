import pool from "../db/connection.js";

export async function crearSubscription(datosSubscription, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO subscriptions
                (
                    workspace_id,
                    plan_code,
                    commercial_status,
                    billing_mode,
                    trial_ends_at,
                    current_period_ends_at,
                    max_users,
                    max_rooms,
                    max_reservations_per_month,
                    partner_valid_until,
                    partner_notes
                )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `,
        [
            datosSubscription.workspaceId,
            datosSubscription.planCode,
            datosSubscription.commercialStatus,
            datosSubscription.billingMode,
            datosSubscription.trialEndsAt,
            datosSubscription.currentPeriodEndsAt,
            datosSubscription.maxUsers,
            datosSubscription.maxRooms,
            datosSubscription.maxReservationsPerMonth,
            datosSubscription.partnerValidUntil ?? null,
            datosSubscription.partnerNotes ?? null
        ]
    );

    return rows[0];
}

export async function buscarSubscriptionPorWorkspaceId(workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT *
            FROM subscriptions
            WHERE workspace_id = $1
            LIMIT 1
        `,
        [workspaceId]
    );

    return rows[0];
}

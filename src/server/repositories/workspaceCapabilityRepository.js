import pool from "../db/connection.js";

export async function buscarWorkspaceCapabilitiesPorWorkspaceId(workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT *
            FROM workspace_capabilities
            WHERE workspace_id = $1
            LIMIT 1
        `,
        [workspaceId]
    );

    return rows[0];
}

export async function crearWorkspaceCapabilities(datos, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO workspace_capabilities
                (
                    workspace_id,
                    finance_enabled,
                    inventory_enabled,
                    billable_catalog_enabled,
                    manual_billing_enabled,
                    partial_payments_enabled,
                    packages_enabled,
                    memberships_enabled,
                    rentals_enabled,
                    commissions_enabled,
                    deposits_enabled,
                    penalties_enabled,
                    whatsapp_enabled
                )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `,
        [
            datos.workspaceId,
            datos.financeEnabled,
            datos.inventoryEnabled,
            datos.billableCatalogEnabled,
            datos.manualBillingEnabled,
            datos.partialPaymentsEnabled,
            datos.packagesEnabled,
            datos.membershipsEnabled,
            datos.rentalsEnabled,
            datos.commissionsEnabled,
            datos.depositsEnabled,
            datos.penaltiesEnabled,
            datos.whatsappEnabled
        ]
    );

    return rows[0];
}

export async function actualizarWorkspaceCapabilities(workspaceId, datos, executor = pool) {
    const { rows } = await executor.query(
        `
            UPDATE workspace_capabilities
            SET
                finance_enabled = $2,
                inventory_enabled = $3,
                billable_catalog_enabled = $4,
                manual_billing_enabled = $5,
                partial_payments_enabled = $6,
                packages_enabled = $7,
                memberships_enabled = $8,
                rentals_enabled = $9,
                commissions_enabled = $10,
                deposits_enabled = $11,
                penalties_enabled = $12,
                whatsapp_enabled = $13
            WHERE workspace_id = $1
            RETURNING *
        `,
        [
            workspaceId,
            datos.financeEnabled,
            datos.inventoryEnabled,
            datos.billableCatalogEnabled,
            datos.manualBillingEnabled,
            datos.partialPaymentsEnabled,
            datos.packagesEnabled,
            datos.membershipsEnabled,
            datos.rentalsEnabled,
            datos.commissionsEnabled,
            datos.depositsEnabled,
            datos.penaltiesEnabled,
            datos.whatsappEnabled
        ]
    );

    return rows[0];
}

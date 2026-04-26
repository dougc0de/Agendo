import pool from "../db/connection.js";

const INVENTORY_ITEM_SELECT = `
    SELECT
        ii.*,
        su.nombre AS branch_name,
        cu.nombre AS created_by_user_name,
        uu.nombre AS updated_by_user_name
    FROM inventory_items ii
    LEFT JOIN sucursales su
        ON su.id = ii.branch_id
    LEFT JOIN usuarios cu
        ON cu.id = ii.created_by_user_id
    LEFT JOIN usuarios uu
        ON uu.id = ii.updated_by_user_id
`;

const INVENTORY_MOVEMENT_SELECT = `
    SELECT
        im.*,
        ii.nombre AS item_name,
        ii.categoria AS item_category,
        ii.tipo AS item_type,
        ii.unidad AS item_unit,
        su.nombre AS branch_name,
        u.nombre AS created_by_user_name,
        r.fecha AS reservation_date,
        r.tipo_consulta AS reservation_type_name,
        s.nombre AS room_name,
        ru.nombre AS reservation_user_name,
        rc.procedure_name AS charge_procedure_name
    FROM inventory_movements im
    INNER JOIN inventory_items ii
        ON ii.id = im.inventory_item_id
       AND ii.workspace_id = im.workspace_id
    LEFT JOIN sucursales su
        ON su.id = im.branch_id
    LEFT JOIN usuarios u
        ON u.id = im.created_by_user_id
    LEFT JOIN reservas r
        ON r.id = im.reservation_id
       AND r.workspace_id = im.workspace_id
    LEFT JOIN salas s
        ON s.id = r.sala_id
       AND s.workspace_id = im.workspace_id
    LEFT JOIN usuarios ru
        ON ru.id = r.usuario_id
    LEFT JOIN reservation_charges rc
        ON rc.id = im.charge_id
       AND rc.workspace_id = im.workspace_id
`;

export async function listarItemsInventarioPorWorkspaceId(workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            ${INVENTORY_ITEM_SELECT}
            WHERE ii.workspace_id = $1
            ORDER BY
                CASE WHEN ii.estado = 'activo' THEN 0 ELSE 1 END,
                ii.nombre ASC
        `,
        [workspaceId]
    );

    return rows;
}

export async function listarItemsInventarioPorIds(itemIds, workspaceId, executor = pool) {
    if (!itemIds.length) {
        return [];
    }

    const { rows } = await executor.query(
        `
            ${INVENTORY_ITEM_SELECT}
            WHERE ii.workspace_id = $1
              AND ii.id = ANY($2::bigint[])
            ORDER BY ii.nombre ASC
        `,
        [workspaceId, itemIds]
    );

    return rows;
}

export async function buscarItemInventarioPorId(id, workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            ${INVENTORY_ITEM_SELECT}
            WHERE ii.id = $1
              AND ii.workspace_id = $2
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
                    descripcion,
                    categoria,
                    tipo,
                    unidad,
                    costo_base,
                    precio_sugerido,
                    scope_type,
                    branch_id,
                    controla_stock,
                    allow_negative_stock,
                    estado,
                    created_by_user_id,
                    updated_by_user_id
                )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13, $14, $15
            )
            RETURNING *
        `,
        [
            datosItem.workspaceId,
            datosItem.nombre,
            datosItem.descripcion,
            datosItem.categoria,
            datosItem.tipo,
            datosItem.unidad,
            datosItem.costoBase,
            datosItem.precioSugerido,
            datosItem.scopeType,
            datosItem.branchId,
            datosItem.controlaStock,
            datosItem.allowNegativeStock,
            datosItem.estado,
            datosItem.createdByUserId,
            datosItem.updatedByUserId
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
                descripcion = $4,
                categoria = $5,
                tipo = $6,
                unidad = $7,
                costo_base = $8,
                precio_sugerido = $9,
                scope_type = $10,
                branch_id = $11,
                controla_stock = $12,
                allow_negative_stock = $13,
                estado = $14,
                updated_by_user_id = $15
            WHERE id = $1
              AND workspace_id = $2
            RETURNING *
        `,
        [
            id,
            workspaceId,
            datosItem.nombre,
            datosItem.descripcion,
            datosItem.categoria,
            datosItem.tipo,
            datosItem.unidad,
            datosItem.costoBase,
            datosItem.precioSugerido,
            datosItem.scopeType,
            datosItem.branchId,
            datosItem.controlaStock,
            datosItem.allowNegativeStock,
            datosItem.estado,
            datosItem.updatedByUserId
        ]
    );

    return rows[0];
}

export async function actualizarEstadoItemInventario(
    id,
    workspaceId,
    estado,
    updatedByUserId,
    executor = pool
) {
    const { rows } = await executor.query(
        `
            UPDATE inventory_items
            SET
                estado = $3,
                updated_by_user_id = $4
            WHERE id = $1
              AND workspace_id = $2
            RETURNING *
        `,
        [id, workspaceId, estado, updatedByUserId]
    );

    return rows[0];
}

export async function listarStockLevelsPorWorkspaceId(workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT
                isl.*,
                su.nombre AS branch_name
            FROM inventory_stock_levels isl
            LEFT JOIN sucursales su
                ON su.id = isl.branch_id
            WHERE isl.workspace_id = $1
            ORDER BY su.nombre ASC, isl.id ASC
        `,
        [workspaceId]
    );

    return rows;
}

export async function listarStockLevelsPorItemIds(itemIds, workspaceId, executor = pool) {
    if (!itemIds.length) {
        return [];
    }

    const { rows } = await executor.query(
        `
            SELECT
                isl.*,
                su.nombre AS branch_name
            FROM inventory_stock_levels isl
            LEFT JOIN sucursales su
                ON su.id = isl.branch_id
            WHERE isl.workspace_id = $1
              AND isl.inventory_item_id = ANY($2::bigint[])
            ORDER BY su.nombre ASC, isl.id ASC
        `,
        [workspaceId, itemIds]
    );

    return rows;
}

export async function listarStockLevelsPorItemId(itemId, workspaceId, executor = pool) {
    const { rows } = await executor.query(
        `
            SELECT
                isl.*,
                su.nombre AS branch_name
            FROM inventory_stock_levels isl
            LEFT JOIN sucursales su
                ON su.id = isl.branch_id
            WHERE isl.workspace_id = $1
              AND isl.inventory_item_id = $2
            ORDER BY su.nombre ASC, isl.id ASC
        `,
        [workspaceId, itemId]
    );

    return rows;
}

export async function buscarStockLevelPorItemYSucursal(
    itemId,
    branchId,
    workspaceId,
    executor = pool
) {
    const { rows } = await executor.query(
        `
            SELECT
                isl.*,
                su.nombre AS branch_name
            FROM inventory_stock_levels isl
            LEFT JOIN sucursales su
                ON su.id = isl.branch_id
            WHERE isl.inventory_item_id = $1
              AND isl.branch_id = $2
              AND isl.workspace_id = $3
            LIMIT 1
        `,
        [itemId, branchId, workspaceId]
    );

    return rows[0];
}

export async function upsertStockLevel(datosStock, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO inventory_stock_levels
                (
                    workspace_id,
                    inventory_item_id,
                    branch_id,
                    current_stock,
                    minimum_stock
                )
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (inventory_item_id, branch_id)
            DO UPDATE SET
                current_stock = EXCLUDED.current_stock,
                minimum_stock = EXCLUDED.minimum_stock
            RETURNING *
        `,
        [
            datosStock.workspaceId,
            datosStock.inventoryItemId,
            datosStock.branchId,
            datosStock.currentStock,
            datosStock.minimumStock
        ]
    );

    return rows[0];
}

export async function actualizarStockLevel(id, workspaceId, datosStock, executor = pool) {
    const { rows } = await executor.query(
        `
            UPDATE inventory_stock_levels
            SET
                current_stock = $3,
                minimum_stock = $4
            WHERE id = $1
              AND workspace_id = $2
            RETURNING *
        `,
        [id, workspaceId, datosStock.currentStock, datosStock.minimumStock]
    );

    return rows[0];
}

export async function crearMovimientoInventario(datosMovimiento, executor = pool) {
    const { rows } = await executor.query(
        `
            INSERT INTO inventory_movements
                (
                    workspace_id,
                    inventory_item_id,
                    stock_level_id,
                    branch_id,
                    reservation_id,
                    charge_id,
                    movement_type,
                    origin_type,
                    quantity,
                    quantity_delta,
                    stock_before,
                    stock_after,
                    unit_cost_reference,
                    created_by_user_id,
                    observation
                )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13, $14, $15
            )
            RETURNING *
        `,
        [
            datosMovimiento.workspaceId,
            datosMovimiento.inventoryItemId,
            datosMovimiento.stockLevelId,
            datosMovimiento.branchId,
            datosMovimiento.reservationId,
            datosMovimiento.chargeId,
            datosMovimiento.movementType,
            datosMovimiento.originType,
            datosMovimiento.quantity,
            datosMovimiento.quantityDelta,
            datosMovimiento.stockBefore,
            datosMovimiento.stockAfter,
            datosMovimiento.unitCostReference,
            datosMovimiento.createdByUserId,
            datosMovimiento.observation
        ]
    );

    return rows[0];
}

export async function listarMovimientosInventarioPorWorkspaceId(
    workspaceId,
    filters = {},
    executor = pool
) {
    const params = [workspaceId];
    const conditions = ["im.workspace_id = $1"];

    if (Number.isInteger(Number(filters.itemId)) && Number(filters.itemId) > 0) {
        params.push(Number(filters.itemId));
        conditions.push(`im.inventory_item_id = $${params.length}`);
    }

    if (Number.isInteger(Number(filters.branchId)) && Number(filters.branchId) > 0) {
        params.push(Number(filters.branchId));
        conditions.push(`im.branch_id = $${params.length}`);
    }

    if (filters.movementType) {
        params.push(String(filters.movementType));
        conditions.push(`im.movement_type = $${params.length}`);
    }

    if (filters.from) {
        params.push(String(filters.from));
        conditions.push(`im.created_at::date >= $${params.length}::date`);
    }

    if (filters.to) {
        params.push(String(filters.to));
        conditions.push(`im.created_at::date <= $${params.length}::date`);
    }

    const { rows } = await executor.query(
        `
            ${INVENTORY_MOVEMENT_SELECT}
            WHERE ${conditions.join(" AND ")}
            ORDER BY im.created_at DESC, im.id DESC
        `,
        params
    );

    return rows;
}

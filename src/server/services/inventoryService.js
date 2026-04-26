import { withTransaction } from "../db/connection.js";
import {
    actualizarEstadoItemInventario as actualizarEstadoItemInventarioRepository,
    actualizarItemInventario as actualizarItemInventarioRepository,
    actualizarStockLevel as actualizarStockLevelRepository,
    buscarItemInventarioPorId,
    buscarStockLevelPorItemYSucursal,
    crearItemInventario as crearItemInventarioRepository,
    crearMovimientoInventario as crearMovimientoInventarioRepository,
    listarItemsInventarioPorIds,
    listarItemsInventarioPorWorkspaceId,
    listarMovimientosInventarioPorWorkspaceId,
    listarStockLevelsPorItemId,
    listarStockLevelsPorItemIds,
    listarStockLevelsPorWorkspaceId,
    upsertStockLevel as upsertStockLevelRepository
} from "../repositories/inventoryRepository.js";
import {
    buscarSucursalPorId,
    listarSucursalesPorWorkspaceId
} from "../repositories/sucursalRepository.js";
import { canAccessFinance, isAdministrativeUser } from "../../shared/roles.js";

const INVENTORY_STATES = ["activo", "inactivo"];
const INVENTORY_TYPES = ["desechable", "reusable"];
const INVENTORY_SCOPE_TYPES = ["global", "sucursal"];
const MOVEMENT_TYPES = ["entrada", "salida", "ajuste", "consumo", "devolucion"];
const MANUAL_MOVEMENT_TYPES = ["entrada", "salida", "ajuste", "devolucion"];
const MOVEMENT_ORIGIN_TYPES = ["manual", "procedure_report", "item_creation"];
const STOCK_FILTER_STATES = ["bajo", "agotado", "inactivo", "ok"];
const REPORT_GROUPS = ["room", "branch", "procedure", "date", "user"];

function normalizarTexto(valor) {
    return String(valor ?? "").trim();
}

function normalizarBooleano(valor, fallback = false) {
    if (typeof valor === "boolean") {
        return valor;
    }

    if (typeof valor === "string") {
        const normalized = valor.trim().toLowerCase();

        if (["true", "1", "si", "yes"].includes(normalized)) {
            return true;
        }

        if (["false", "0", "no"].includes(normalized)) {
            return false;
        }
    }

    if (typeof valor === "number") {
        return valor === 1;
    }

    return fallback;
}

function normalizarMonto(valor, fallback = NaN) {
    if (valor === undefined || valor === null || valor === "") {
        return fallback;
    }

    const amount = Number(valor);
    return Number.isFinite(amount) ? amount : NaN;
}

function roundQuantity(value) {
    return Number(Number(value ?? 0).toFixed(2));
}

function normalizarFechaCorta(valor) {
    if (!valor) {
        return null;
    }

    if (valor instanceof Date) {
        return valor.toISOString().slice(0, 10);
    }

    return String(valor).slice(0, 10);
}

function resolveWorkspaceId(auth) {
    const workspaceId = Number(auth?.workspaceId);
    return Number.isInteger(workspaceId) && workspaceId > 0 ? workspaceId : null;
}

function resolveUserId(auth) {
    const userId = Number(auth?.userId);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function hasInventoryAccess(auth) {
    return canAccessFinance({
        membershipRole: auth?.membershipRole,
        userRole: auth?.userRole
    });
}

function canManageInventoryStatus(auth) {
    return isAdministrativeUser({
        membershipRole: auth?.membershipRole,
        userRole: auth?.userRole
    });
}

function formatearStockSalida(row) {
    const currentStock = Number(row.current_stock ?? 0);
    const minimumStock = Number(row.minimum_stock ?? 0);

    return {
        id: row.id,
        workspaceId: row.workspace_id,
        inventoryItemId: row.inventory_item_id,
        branchId: row.branch_id,
        branchName: row.branch_name ?? null,
        currentStock,
        minimumStock,
        isOutOfStock: currentStock <= 0,
        isLowStock: currentStock > 0 && currentStock <= minimumStock,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function agruparStockPorItem(stockRows = []) {
    const grouped = new Map();

    for (const row of stockRows) {
        const itemId = Number(row.inventory_item_id);

        if (!grouped.has(itemId)) {
            grouped.set(itemId, []);
        }

        grouped.get(itemId).push(formatearStockSalida(row));
    }

    return grouped;
}

function resolverEstadoStockItem(item, stockRows = []) {
    if (item.estado !== "activo") {
        return "inactivo";
    }

    if (!item.controlaStock) {
        return "referencial";
    }

    if (!stockRows.length) {
        return "agotado";
    }

    if (stockRows.some((stockRow) => stockRow.isOutOfStock)) {
        return "agotado";
    }

    if (stockRows.some((stockRow) => stockRow.isLowStock)) {
        return "bajo";
    }

    return "ok";
}

function formatearInventarioSalida(row, stockRows = []) {
    const totalStock = stockRows.reduce(
        (sum, stockRow) => sum + Number(stockRow.currentStock ?? 0),
        0
    );
    const lowStockCount = stockRows.filter((stockRow) => stockRow.isLowStock).length;
    const outOfStockCount = stockRows.filter((stockRow) => stockRow.isOutOfStock).length;

    return {
        id: row.id,
        workspaceId: row.workspace_id,
        nombre: row.nombre,
        descripcion: row.descripcion ?? "",
        categoria: row.categoria ?? "",
        tipo: row.tipo ?? "desechable",
        unidad: row.unidad,
        costoBase: Number(row.costo_base ?? 0),
        precioSugerido: Number(row.precio_sugerido ?? 0),
        scopeType: row.scope_type ?? "global",
        branchId: row.branch_id ?? null,
        branchName: row.branch_name ?? null,
        controlaStock: Boolean(row.controla_stock),
        allowNegativeStock: Boolean(row.allow_negative_stock),
        estado: row.estado,
        createdByUserId: row.created_by_user_id ?? null,
        createdByUserName: row.created_by_user_name ?? null,
        updatedByUserId: row.updated_by_user_id ?? null,
        updatedByUserName: row.updated_by_user_name ?? null,
        stockByBranch: stockRows,
        totalStock: roundQuantity(totalStock),
        lowStockCount,
        outOfStockCount,
        stockState: resolverEstadoStockItem(
            {
                estado: row.estado,
                controlaStock: Boolean(row.controla_stock)
            },
            stockRows
        ),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function formatearMovimientoSalida(row) {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        inventoryItemId: row.inventory_item_id,
        itemName: row.item_name,
        itemCategory: row.item_category ?? "",
        itemType: row.item_type ?? "desechable",
        itemUnit: row.item_unit ?? "unidad",
        stockLevelId: row.stock_level_id,
        branchId: row.branch_id,
        branchName: row.branch_name ?? null,
        reservationId: row.reservation_id ?? null,
        reservationDate: normalizarFechaCorta(row.reservation_date),
        chargeId: row.charge_id ?? null,
        roomName: row.room_name ?? null,
        reservationUserName: row.reservation_user_name ?? null,
        procedureName: row.charge_procedure_name ?? row.reservation_type_name ?? null,
        movementType: row.movement_type,
        originType: row.origin_type,
        quantity: Number(row.quantity ?? 0),
        quantityDelta: Number(row.quantity_delta ?? 0),
        stockBefore: Number(row.stock_before ?? 0),
        stockAfter: Number(row.stock_after ?? 0),
        unitCostReference: Number(row.unit_cost_reference ?? 0),
        createdByUserId: row.created_by_user_id,
        createdByUserName: row.created_by_user_name ?? null,
        observation: row.observation ?? "",
        createdAt: row.created_at
    };
}

function normalizarEstadoInventario(valor, fallback = "activo") {
    const normalized = normalizarTexto(valor).toLowerCase();
    return INVENTORY_STATES.includes(normalized) ? normalized : fallback;
}

function normalizarTipoInventario(valor, fallback = "desechable") {
    const normalized = normalizarTexto(valor).toLowerCase();
    return INVENTORY_TYPES.includes(normalized) ? normalized : fallback;
}

function normalizarScopeType(valor, fallback = "global") {
    const normalized = normalizarTexto(valor).toLowerCase();
    return INVENTORY_SCOPE_TYPES.includes(normalized) ? normalized : fallback;
}

function normalizarMovimientoTipo(valor) {
    const normalized = normalizarTexto(valor).toLowerCase();
    return MANUAL_MOVEMENT_TYPES.includes(normalized) ? normalized : null;
}

function normalizarStockRows(stockRows = []) {
    if (!Array.isArray(stockRows)) {
        return [];
    }

    return stockRows
        .map((stockRow) => ({
            branchId: Number(stockRow?.branchId),
            currentStock: roundQuantity(normalizarMonto(stockRow?.currentStock, NaN)),
            minimumStock: roundQuantity(normalizarMonto(stockRow?.minimumStock, NaN))
        }))
        .filter((stockRow) => Number.isInteger(stockRow.branchId) && stockRow.branchId > 0);
}

function normalizarItemInventarioPayload(payload = {}, existingItem = null) {
    return {
        nombre: normalizarTexto(payload?.nombre ?? existingItem?.nombre),
        descripcion:
            normalizarTexto(payload?.descripcion ?? existingItem?.descripcion) || null,
        categoria: normalizarTexto(payload?.categoria ?? existingItem?.categoria) || null,
        tipo: normalizarTipoInventario(payload?.tipo ?? existingItem?.tipo),
        unidad: normalizarTexto(payload?.unidad ?? existingItem?.unidad) || "unidad",
        costoBase: roundQuantity(
            normalizarMonto(payload?.costoBase ?? existingItem?.costo_base, NaN)
        ),
        precioSugerido: roundQuantity(
            normalizarMonto(
                payload?.precioSugerido ?? existingItem?.precio_sugerido,
                NaN
            )
        ),
        scopeType: normalizarScopeType(payload?.scopeType ?? existingItem?.scope_type),
        branchId: payload?.branchId !== undefined
            ? Number(payload?.branchId) || null
            : existingItem?.branch_id ?? null,
        controlaStock: normalizarBooleano(
            payload?.controlaStock ?? existingItem?.controla_stock,
            false
        ),
        allowNegativeStock: normalizarBooleano(
            payload?.allowNegativeStock ?? existingItem?.allow_negative_stock,
            false
        ),
        estado: normalizarEstadoInventario(payload?.estado ?? existingItem?.estado),
        stockByBranch: normalizarStockRows(payload?.stockByBranch ?? []),
        stockAdjustmentReason:
            normalizarTexto(payload?.stockAdjustmentReason) || null
    };
}

async function validarSucursal(branchId, workspaceId, executor) {
    const branch = await buscarSucursalPorId(branchId, workspaceId, executor);

    return branch ? { ok: true, data: branch } : {
        ok: false,
        msg: "La sucursal indicada no existe en esta cuenta."
    };
}

async function validarDatosItemInventario(
    datos,
    workspaceId,
    executor,
    options = {}
) {
    const existingStockRows = options.existingStockRows ?? [];

    if (!datos.nombre) {
        return {
            ok: false,
            msg: "El nombre del insumo es obligatorio."
        };
    }

    if (!Number.isFinite(datos.costoBase) || datos.costoBase < 0) {
        return {
            ok: false,
            msg: "El costo unitario del insumo debe ser valido."
        };
    }

    if (!Number.isFinite(datos.precioSugerido) || datos.precioSugerido < 0) {
        return {
            ok: false,
            msg: "El precio sugerido del insumo debe ser valido."
        };
    }

    if (!INVENTORY_STATES.includes(datos.estado)) {
        return {
            ok: false,
            msg: "El estado del insumo no es valido."
        };
    }

    if (!INVENTORY_TYPES.includes(datos.tipo)) {
        return {
            ok: false,
            msg: "El tipo del insumo no es valido."
        };
    }

    if (!INVENTORY_SCOPE_TYPES.includes(datos.scopeType)) {
        return {
            ok: false,
            msg: "El alcance del insumo no es valido."
        };
    }

    if (!datos.controlaStock) {
        datos.allowNegativeStock = false;

        if (datos.stockByBranch.length) {
            return {
                ok: false,
                msg: "Solo los insumos con control de stock pueden guardar existencias por sucursal."
            };
        }
    }

    if (datos.scopeType === "sucursal") {
        if (!Number.isInteger(Number(datos.branchId)) || Number(datos.branchId) <= 0) {
            return {
                ok: false,
                msg: "Debes asociar la sucursal del insumo."
            };
        }

        const branchResult = await validarSucursal(Number(datos.branchId), workspaceId, executor);

        if (!branchResult.ok) {
            return branchResult;
        }

        if (
            datos.stockByBranch.some(
                (stockRow) => Number(stockRow.branchId) !== Number(datos.branchId)
            )
        ) {
            return {
                ok: false,
                msg: "Un insumo propio de sucursal solo puede manejar stock dentro de esa misma sede."
            };
        }

        if (
            existingStockRows.some(
                (stockRow) => Number(stockRow.branch_id) !== Number(datos.branchId)
            )
        ) {
            return {
                ok: false,
                msg: "No puedes convertir este insumo a una sola sucursal mientras existan existencias en otras sedes."
            };
        }
    } else {
        datos.branchId = null;
    }

    const branchIdSet = new Set();

    for (const stockRow of datos.stockByBranch) {
        if (branchIdSet.has(stockRow.branchId)) {
            return {
                ok: false,
                msg: "No puedes repetir la misma sucursal dentro del stock del insumo."
            };
        }

        branchIdSet.add(stockRow.branchId);

        if (!Number.isFinite(stockRow.currentStock) || stockRow.currentStock < 0) {
            return {
                ok: false,
                msg: "El stock actual debe ser un numero valido mayor o igual a cero."
            };
        }

        if (!Number.isFinite(stockRow.minimumStock) || stockRow.minimumStock < 0) {
            return {
                ok: false,
                msg: "El stock minimo debe ser un numero valido mayor o igual a cero."
            };
        }

        const branchResult = await validarSucursal(stockRow.branchId, workspaceId, executor);

        if (!branchResult.ok) {
            return branchResult;
        }
    }

    return {
        ok: true,
        data: datos
    };
}

async function cargarCatalogoInventario(workspaceId, executor) {
    const [items, stockRows] = await Promise.all([
        listarItemsInventarioPorWorkspaceId(workspaceId, executor),
        listarStockLevelsPorWorkspaceId(workspaceId, executor)
    ]);
    const stockGrouped = agruparStockPorItem(stockRows);

    return items.map((item) =>
        formatearInventarioSalida(item, stockGrouped.get(Number(item.id)) ?? [])
    );
}

function filtrarInventario(items = [], filtros = {}) {
    const query = normalizarTexto(filtros.query).toLowerCase();
    const category = normalizarTexto(filtros.category).toLowerCase();
    const status = normalizarTexto(filtros.status).toLowerCase();
    const scopeType = normalizarTexto(filtros.scopeType).toLowerCase();
    const stockControlled = normalizarTexto(filtros.stockControlled).toLowerCase();
    const stockState = normalizarTexto(filtros.stockState).toLowerCase();
    const branchId = Number(filtros.branchId);

    return items.filter((item) => {
        if (
            query &&
            ![
                item.nombre,
                item.descripcion,
                item.categoria,
                item.unidad,
                item.branchName
            ]
                .join(" ")
                .toLowerCase()
                .includes(query)
        ) {
            return false;
        }

        if (category && String(item.categoria ?? "").toLowerCase() !== category) {
            return false;
        }

        if (status && status !== "todos" && item.estado !== status) {
            return false;
        }

        if (scopeType && scopeType !== "todos" && item.scopeType !== scopeType) {
            return false;
        }

        if (
            stockControlled &&
            stockControlled !== "todos" &&
            String(item.controlaStock) !== String(stockControlled === "si")
        ) {
            return false;
        }

        if (
            Number.isInteger(branchId) &&
            branchId > 0 &&
            item.scopeType === "sucursal" &&
            Number(item.branchId) !== branchId
        ) {
            return false;
        }

        if (Number.isInteger(branchId) && branchId > 0 && item.scopeType === "global") {
            if (item.controlaStock) {
                const stockForBranch = item.stockByBranch.find(
                    (stockRow) => Number(stockRow.branchId) === branchId
                );

                if (!stockForBranch) {
                    return false;
                }
            }
        }

        if (
            stockState &&
            stockState !== "todos" &&
            STOCK_FILTER_STATES.includes(stockState) &&
            item.stockState !== stockState
        ) {
            return false;
        }

        return true;
    });
}

function formatearItemUnico(item, stockRows = []) {
    return formatearInventarioSalida(item, stockRows.map((row) => formatearStockSalida(row)));
}

function normalizarMovimientoManualPayload(payload = {}) {
    return {
        movementType: normalizarMovimientoTipo(payload?.movementType),
        branchId: Number(payload?.branchId),
        quantity: roundQuantity(normalizarMonto(payload?.quantity, NaN)),
        targetStock: roundQuantity(normalizarMonto(payload?.targetStock, NaN)),
        unitCostReference: roundQuantity(normalizarMonto(payload?.unitCostReference, 0)),
        observation: normalizarTexto(payload?.observation) || null
    };
}

function formatearErrorAutorizacion(modulo = "inventario") {
    return {
        ok: false,
        msg: `No autorizado. No tienes acceso al ${modulo}.`
    };
}

function agruparLineasPorItem(lineas = []) {
    const grouped = new Map();

    for (const linea of lineas) {
        const itemId = Number(linea.inventoryItemId ?? linea.inventory_item_id);

        if (!Number.isInteger(itemId) || itemId <= 0) {
            continue;
        }

        if (!grouped.has(itemId)) {
            grouped.set(itemId, {
                quantity: 0,
                unitCost: Number(linea.unitCost ?? linea.unit_cost ?? 0)
            });
        }

        const entry = grouped.get(itemId);
        entry.quantity += Number(linea.quantity ?? 0);

        if (Number(linea.unitCost ?? linea.unit_cost ?? 0) > 0) {
            entry.unitCost = Number(linea.unitCost ?? linea.unit_cost ?? 0);
        }
    }

    return grouped;
}

async function validarItemParaSucursal(item, branchId, executor) {
    if (!Number.isInteger(Number(branchId)) || Number(branchId) <= 0) {
        return {
            ok: false,
            msg: `El insumo ${item.nombre} no puede consumirse porque la reserva no tiene sucursal asociada.`
        };
    }

    if (item.estado !== "activo") {
        return {
            ok: false,
            msg: `El insumo ${item.nombre} esta inactivo y no puede usarse en nuevos procedimientos.`
        };
    }

    if (item.scope_type === "sucursal" && Number(item.branch_id) !== Number(branchId)) {
        return {
            ok: false,
            msg: `El insumo ${item.nombre} pertenece a otra sucursal y no puede usarse en este procedimiento.`
        };
    }

    return {
        ok: true
    };
}

async function aplicarMovimientoStock({
    item,
    branchId,
    movementType,
    originType,
    quantity,
    targetStock = null,
    unitCostReference = 0,
    createdByUserId,
    observation = null,
    reservationId = null,
    chargeId = null,
    executor
}) {
    const workspaceId = Number(item.workspace_id);
    const stockLevel =
        (await buscarStockLevelPorItemYSucursal(item.id, branchId, workspaceId, executor)) ??
        (await upsertStockLevelRepository(
            {
                workspaceId,
                inventoryItemId: item.id,
                branchId,
                currentStock: 0,
                minimumStock: 0
            },
            executor
        ));
    const stockBefore = Number(stockLevel.current_stock ?? 0);
    const minimumStock = Number(stockLevel.minimum_stock ?? 0);

    let quantityValue = quantity;
    let quantityDelta = 0;
    let stockAfter = stockBefore;

    if (movementType === "entrada" || movementType === "devolucion") {
        quantityDelta = roundQuantity(quantityValue);
        stockAfter = roundQuantity(stockBefore + quantityDelta);
    } else if (movementType === "salida" || movementType === "consumo") {
        quantityDelta = roundQuantity(quantityValue * -1);
        stockAfter = roundQuantity(stockBefore + quantityDelta);
    } else if (movementType === "ajuste") {
        if (!Number.isFinite(targetStock) || targetStock < 0) {
            return {
                ok: false,
                msg: "El stock final del ajuste no es valido."
            };
        }

        stockAfter = roundQuantity(targetStock);
        quantityDelta = roundQuantity(stockAfter - stockBefore);
        quantityValue = roundQuantity(Math.abs(quantityDelta));

        if (quantityValue <= 0) {
            return {
                ok: true,
                data: null
            };
        }
    }

    if (quantityValue <= 0) {
        return {
            ok: false,
            msg: "La cantidad del movimiento debe ser mayor a cero."
        };
    }

    if (!item.allow_negative_stock && stockAfter < 0) {
        return {
            ok: false,
            msg: `El insumo ${item.nombre} no tiene existencias suficientes en la sucursal seleccionada.`
        };
    }

    const updatedStockLevel = await actualizarStockLevelRepository(
        stockLevel.id,
        workspaceId,
        {
            currentStock: stockAfter,
            minimumStock
        },
        executor
    );

    const movement = await crearMovimientoInventarioRepository(
        {
            workspaceId,
            inventoryItemId: item.id,
            stockLevelId: updatedStockLevel.id,
            branchId,
            reservationId,
            chargeId,
            movementType,
            originType,
            quantity: quantityValue,
            quantityDelta,
            stockBefore,
            stockAfter,
            unitCostReference: roundQuantity(unitCostReference),
            createdByUserId,
            observation
        },
        executor
    );

    return {
        ok: true,
        data: movement
    };
}

export async function syncProcedureConsumption({
    workspaceId,
    branchId,
    reservationId,
    chargeId,
    previousSupplies = [],
    nextSupplies = [],
    createdByUserId,
    executor
}) {
    const previousGrouped = agruparLineasPorItem(previousSupplies);
    const nextGrouped = agruparLineasPorItem(nextSupplies);
    const itemIds = [...new Set([...previousGrouped.keys(), ...nextGrouped.keys()])];

    if (!itemIds.length) {
        return {
            ok: true
        };
    }

    const items = await listarItemsInventarioPorIds(itemIds, workspaceId, executor);
    const itemMap = new Map(items.map((item) => [Number(item.id), item]));

    for (const itemId of itemIds) {
        const item = itemMap.get(Number(itemId));

        if (!item) {
            return {
                ok: false,
                msg: "Uno de los insumos usados en el reporte ya no existe en esta cuenta."
            };
        }

        if (!item.controla_stock) {
            continue;
        }

        const branchValidation = await validarItemParaSucursal(item, branchId, executor);

        if (!branchValidation.ok) {
            return branchValidation;
        }

        const previousLine = previousGrouped.get(Number(itemId)) ?? {
            quantity: 0,
            unitCost: Number(item.costo_base ?? 0)
        };
        const nextLine = nextGrouped.get(Number(itemId)) ?? {
            quantity: 0,
            unitCost: Number(item.costo_base ?? 0)
        };
        const quantityDelta = roundQuantity(nextLine.quantity - previousLine.quantity);

        if (quantityDelta === 0) {
            continue;
        }

        const movementResult = await aplicarMovimientoStock({
            item,
            branchId,
            movementType: quantityDelta > 0 ? "consumo" : "devolucion",
            originType: "procedure_report",
            quantity: roundQuantity(Math.abs(quantityDelta)),
            unitCostReference:
                quantityDelta > 0 ? nextLine.unitCost : previousLine.unitCost,
            createdByUserId,
            observation:
                quantityDelta > 0
                    ? "Consumo registrado desde el cierre del procedimiento."
                    : "Devolucion automatica al ajustar el procedimiento.",
            reservationId,
            chargeId,
            executor
        });

        if (!movementResult.ok) {
            return movementResult;
        }
    }

    return {
        ok: true
    };
}

export async function listarInventario(filtros, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!hasInventoryAccess(auth)) {
            return formatearErrorAutorizacion("inventario");
        }

        const items = await cargarCatalogoInventario(workspaceId);

        return {
            ok: true,
            msg: "Inventario cargado correctamente.",
            data: filtrarInventario(items, filtros)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al cargar el inventario: ${error.message}`
        };
    }
}

export async function obtenerItemInventario(id, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const itemId = Number(id);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!hasInventoryAccess(auth)) {
            return formatearErrorAutorizacion("inventario");
        }

        if (!Number.isInteger(itemId) || itemId <= 0) {
            return {
                ok: false,
                msg: "El insumo indicado no es valido."
            };
        }

        const [item, stockRows] = await Promise.all([
            buscarItemInventarioPorId(itemId, workspaceId),
            listarStockLevelsPorItemId(itemId, workspaceId)
        ]);

        if (!item) {
            return {
                ok: false,
                msg: "El insumo indicado no existe en esta cuenta."
            };
        }

        return {
            ok: true,
            msg: "Insumo cargado correctamente.",
            data: formatearItemUnico(item, stockRows)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al cargar el insumo: ${error.message}`
        };
    }
}

export async function crearItemInventario(payload, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const createdByUserId = resolveUserId(auth);

        if (!workspaceId || !createdByUserId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!hasInventoryAccess(auth)) {
            return formatearErrorAutorizacion("inventario");
        }

        return await withTransaction(async (client) => {
            const datos = normalizarItemInventarioPayload(payload);
            const validation = await validarDatosItemInventario(
                datos,
                workspaceId,
                client
            );

            if (!validation.ok) {
                return validation;
            }

            const createdItem = await crearItemInventarioRepository(
                {
                    workspaceId,
                    ...validation.data,
                    createdByUserId,
                    updatedByUserId: createdByUserId
                },
                client
            );

            if (validation.data.controlaStock) {
                for (const stockRow of validation.data.stockByBranch) {
                    const createdStockLevel = await upsertStockLevelRepository(
                        {
                            workspaceId,
                            inventoryItemId: createdItem.id,
                            branchId: stockRow.branchId,
                            currentStock: stockRow.currentStock,
                            minimumStock: stockRow.minimumStock
                        },
                        client
                    );

                    if (stockRow.currentStock > 0) {
                        await crearMovimientoInventarioRepository(
                            {
                                workspaceId,
                                inventoryItemId: createdItem.id,
                                stockLevelId: createdStockLevel.id,
                                branchId: stockRow.branchId,
                                reservationId: null,
                                chargeId: null,
                                movementType: "entrada",
                                originType: "item_creation",
                                quantity: stockRow.currentStock,
                                quantityDelta: stockRow.currentStock,
                                stockBefore: 0,
                                stockAfter: stockRow.currentStock,
                                unitCostReference: validation.data.costoBase,
                                createdByUserId,
                                observation: "Stock inicial del insumo."
                            },
                            client
                        );
                    }
                }
            }

            const [item, stockRows] = await Promise.all([
                buscarItemInventarioPorId(createdItem.id, workspaceId, client),
                listarStockLevelsPorItemId(createdItem.id, workspaceId, client)
            ]);

            return {
                ok: true,
                msg: "Insumo creado correctamente.",
                data: formatearItemUnico(item, stockRows)
            };
        });
    } catch (error) {
        return {
            ok: false,
            msg: `Error al crear el insumo: ${error.message}`
        };
    }
}

export async function actualizarItemInventario(id, payload, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const updatedByUserId = resolveUserId(auth);
        const itemId = Number(id);

        if (!workspaceId || !updatedByUserId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!hasInventoryAccess(auth)) {
            return formatearErrorAutorizacion("inventario");
        }

        if (!Number.isInteger(itemId) || itemId <= 0) {
            return {
                ok: false,
                msg: "El insumo indicado no es valido."
            };
        }

        return await withTransaction(async (client) => {
            const existingItem = await buscarItemInventarioPorId(itemId, workspaceId, client);

            if (!existingItem) {
                return {
                    ok: false,
                    msg: "El insumo indicado no existe en esta cuenta."
                };
            }

            const existingStockRows = await listarStockLevelsPorItemId(itemId, workspaceId, client);
            const datos = normalizarItemInventarioPayload(payload, existingItem);
            const validation = await validarDatosItemInventario(
                datos,
                workspaceId,
                client,
                { existingStockRows }
            );

            if (!validation.ok) {
                return validation;
            }

            const needsStockAdjustmentReason = validation.data.stockByBranch.some((stockRow) => {
                const currentRow = existingStockRows.find(
                    (existingStockRow) =>
                        Number(existingStockRow.branch_id) === Number(stockRow.branchId)
                );

                return (
                    !currentRow ||
                    roundQuantity(currentRow.current_stock) !== roundQuantity(stockRow.currentStock)
                );
            });

            if (
                validation.data.controlaStock &&
                needsStockAdjustmentReason &&
                !validation.data.stockAdjustmentReason
            ) {
                return {
                    ok: false,
                    msg: "Debes indicar el motivo del ajuste cuando cambies existencias del insumo."
                };
            }

            await actualizarItemInventarioRepository(
                itemId,
                workspaceId,
                {
                    ...validation.data,
                    updatedByUserId
                },
                client
            );

            if (validation.data.controlaStock) {
                for (const stockRow of validation.data.stockByBranch) {
                    const existingStockRow = existingStockRows.find(
                        (currentStockRow) =>
                            Number(currentStockRow.branch_id) === Number(stockRow.branchId)
                    );

                    if (!existingStockRow) {
                        const createdStockLevel = await upsertStockLevelRepository(
                            {
                                workspaceId,
                                inventoryItemId: itemId,
                                branchId: stockRow.branchId,
                                currentStock: stockRow.currentStock,
                                minimumStock: stockRow.minimumStock
                            },
                            client
                        );

                        if (stockRow.currentStock > 0) {
                            await crearMovimientoInventarioRepository(
                                {
                                    workspaceId,
                                    inventoryItemId: itemId,
                                    stockLevelId: createdStockLevel.id,
                                    branchId: stockRow.branchId,
                                    reservationId: null,
                                    chargeId: null,
                                    movementType: "ajuste",
                                    originType: "manual",
                                    quantity: stockRow.currentStock,
                                    quantityDelta: stockRow.currentStock,
                                    stockBefore: 0,
                                    stockAfter: stockRow.currentStock,
                                    unitCostReference: validation.data.costoBase,
                                    createdByUserId: updatedByUserId,
                                    observation: validation.data.stockAdjustmentReason
                                },
                                client
                            );
                        }

                        continue;
                    }

                    const previousCurrentStock = roundQuantity(existingStockRow.current_stock);
                    const nextCurrentStock = roundQuantity(stockRow.currentStock);
                    const previousMinimumStock = roundQuantity(existingStockRow.minimum_stock);

                    if (previousCurrentStock !== nextCurrentStock) {
                        const movementResult = await aplicarMovimientoStock({
                            item: {
                                ...existingItem,
                                allow_negative_stock: validation.data.allowNegativeStock
                            },
                            branchId: stockRow.branchId,
                            movementType: "ajuste",
                            originType: "manual",
                            quantity: Math.abs(nextCurrentStock - previousCurrentStock),
                            targetStock: nextCurrentStock,
                            unitCostReference: validation.data.costoBase,
                            createdByUserId: updatedByUserId,
                            observation: validation.data.stockAdjustmentReason,
                            executor: client
                        });

                        if (!movementResult.ok) {
                            return movementResult;
                        }
                    }

                    if (previousMinimumStock !== roundQuantity(stockRow.minimumStock)) {
                        await actualizarStockLevelRepository(
                            existingStockRow.id,
                            workspaceId,
                            {
                                currentStock: nextCurrentStock,
                                minimumStock: stockRow.minimumStock
                            },
                            client
                        );
                    }
                }
            }

            const [item, stockRows] = await Promise.all([
                buscarItemInventarioPorId(itemId, workspaceId, client),
                listarStockLevelsPorItemId(itemId, workspaceId, client)
            ]);

            return {
                ok: true,
                msg: "Insumo actualizado correctamente.",
                data: formatearItemUnico(item, stockRows)
            };
        });
    } catch (error) {
        return {
            ok: false,
            msg: `Error al actualizar el insumo: ${error.message}`
        };
    }
}

export async function actualizarEstadoItemInventario(id, estado, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const updatedByUserId = resolveUserId(auth);
        const itemId = Number(id);
        const normalizedStatus = normalizarEstadoInventario(estado, "");

        if (!workspaceId || !updatedByUserId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!canManageInventoryStatus(auth)) {
            return {
                ok: false,
                msg: "No autorizado. Solo el admin puede cambiar el estado del inventario."
            };
        }

        if (!Number.isInteger(itemId) || itemId <= 0) {
            return {
                ok: false,
                msg: "El insumo indicado no es valido."
            };
        }

        if (!INVENTORY_STATES.includes(normalizedStatus)) {
            return {
                ok: false,
                msg: "El estado del inventario no es valido."
            };
        }

        const existingItem = await buscarItemInventarioPorId(itemId, workspaceId);

        if (!existingItem) {
            return {
                ok: false,
                msg: "El insumo indicado no existe en esta cuenta."
            };
        }

        const updatedItem = await actualizarEstadoItemInventarioRepository(
            itemId,
            workspaceId,
            normalizedStatus,
            updatedByUserId
        );
        const stockRows = await listarStockLevelsPorItemId(itemId, workspaceId);

        return {
            ok: true,
            msg: `Insumo ${normalizedStatus === "activo" ? "activado" : "inactivado"} correctamente.`,
            data: formatearItemUnico(updatedItem, stockRows)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al cambiar el estado del inventario: ${error.message}`
        };
    }
}

export async function listarMovimientosInventario(itemId, filtros, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const inventoryItemId = Number(itemId);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!hasInventoryAccess(auth)) {
            return formatearErrorAutorizacion("inventario");
        }

        if (!Number.isInteger(inventoryItemId) || inventoryItemId <= 0) {
            return {
                ok: false,
                msg: "El insumo indicado no es valido."
            };
        }

        const item = await buscarItemInventarioPorId(inventoryItemId, workspaceId);

        if (!item) {
            return {
                ok: false,
                msg: "El insumo indicado no existe en esta cuenta."
            };
        }

        const rows = await listarMovimientosInventarioPorWorkspaceId(
            workspaceId,
            {
                ...filtros,
                itemId: inventoryItemId,
                movementType:
                    MOVEMENT_TYPES.includes(normalizarTexto(filtros?.movementType).toLowerCase())
                        ? normalizarTexto(filtros?.movementType).toLowerCase()
                        : null
            }
        );

        return {
            ok: true,
            msg: "Movimientos del insumo cargados correctamente.",
            data: rows.map((row) => formatearMovimientoSalida(row))
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al listar los movimientos del inventario: ${error.message}`
        };
    }
}

export async function crearMovimientoInventario(itemId, payload, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const createdByUserId = resolveUserId(auth);
        const inventoryItemId = Number(itemId);

        if (!workspaceId || !createdByUserId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!hasInventoryAccess(auth)) {
            return formatearErrorAutorizacion("inventario");
        }

        if (!Number.isInteger(inventoryItemId) || inventoryItemId <= 0) {
            return {
                ok: false,
                msg: "El insumo indicado no es valido."
            };
        }

        const movement = normalizarMovimientoManualPayload(payload);

        if (!movement.movementType) {
            return {
                ok: false,
                msg: "El tipo de movimiento no es valido."
            };
        }

        if (!Number.isInteger(movement.branchId) || movement.branchId <= 0) {
            return {
                ok: false,
                msg: "Debes seleccionar la sucursal del movimiento."
            };
        }

        if (movement.movementType === "ajuste") {
            if (!movement.observation) {
                return {
                    ok: false,
                    msg: "El motivo del ajuste manual es obligatorio."
                };
            }
        } else if (!Number.isFinite(movement.quantity) || movement.quantity <= 0) {
            return {
                ok: false,
                msg: "La cantidad del movimiento debe ser mayor a cero."
            };
        }

        if (!Number.isFinite(movement.unitCostReference) || movement.unitCostReference < 0) {
            return {
                ok: false,
                msg: "El costo referencial del movimiento no es valido."
            };
        }

        return await withTransaction(async (client) => {
            const item = await buscarItemInventarioPorId(inventoryItemId, workspaceId, client);

            if (!item) {
                return {
                    ok: false,
                    msg: "El insumo indicado no existe en esta cuenta."
                };
            }

            if (!item.controla_stock) {
                return {
                    ok: false,
                    msg: "Este insumo es solo referencial y no maneja stock real."
                };
            }

            if (item.estado !== "activo") {
                return {
                    ok: false,
                    msg: "No puedes registrar movimientos manuales sobre un insumo inactivo."
                };
            }

            const branchValidation = await validarItemParaSucursal(item, movement.branchId, client);

            if (!branchValidation.ok) {
                return branchValidation;
            }

            const movementResult = await aplicarMovimientoStock({
                item,
                branchId: movement.branchId,
                movementType: movement.movementType,
                originType: "manual",
                quantity: movement.quantity,
                targetStock: movement.targetStock,
                unitCostReference: movement.unitCostReference,
                createdByUserId,
                observation: movement.observation,
                executor: client
            });

            if (!movementResult.ok) {
                return movementResult;
            }

            const rows = await listarMovimientosInventarioPorWorkspaceId(
                workspaceId,
                {
                    itemId: inventoryItemId
                },
                client
            );

            return {
                ok: true,
                msg: "Movimiento registrado correctamente.",
                data: rows.length ? formatearMovimientoSalida(rows[0]) : null
            };
        });
    } catch (error) {
        return {
            ok: false,
            msg: `Error al registrar el movimiento de inventario: ${error.message}`
        };
    }
}

export async function obtenerResumenInventario(filtros, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!hasInventoryAccess(auth)) {
            return formatearErrorAutorizacion("inventario");
        }

        const [items, movements] = await Promise.all([
            cargarCatalogoInventario(workspaceId),
            listarMovimientosInventarioPorWorkspaceId(workspaceId, {
                branchId: filtros?.branchId,
                from: filtros?.from,
                to: filtros?.to
            })
        ]);
        const filteredItems = filtrarInventario(items, {
            branchId: filtros?.branchId
        });
        const relevantStockRows = filteredItems.flatMap((item) =>
            Number.isInteger(Number(filtros?.branchId)) && Number(filtros?.branchId) > 0
                ? item.stockByBranch.filter(
                      (stockRow) => Number(stockRow.branchId) === Number(filtros.branchId)
                  )
                : item.stockByBranch
        );
        const consumptionRows = movements.filter((movement) =>
            ["consumo", "devolucion"].includes(movement.movement_type)
        );
        const usageMap = new Map();
        let estimatedConsumedCost = 0;

        for (const row of consumptionRows) {
            const signedQuantity = row.movement_type === "devolucion"
                ? Number(row.quantity ?? 0) * -1
                : Number(row.quantity ?? 0);
            const signedCost = signedQuantity * Number(row.unit_cost_reference ?? 0);

            estimatedConsumedCost += signedCost;

            if (!usageMap.has(Number(row.inventory_item_id))) {
                usageMap.set(Number(row.inventory_item_id), {
                    itemId: Number(row.inventory_item_id),
                    itemName: row.item_name,
                    quantityUsed: 0,
                    costConsumed: 0
                });
            }

            const usageEntry = usageMap.get(Number(row.inventory_item_id));
            usageEntry.quantityUsed += signedQuantity;
            usageEntry.costConsumed += signedCost;
        }

        return {
            ok: true,
            msg: "Resumen de inventario generado correctamente.",
            data: {
                totalItems: filteredItems.length,
                stockControlledCount: filteredItems.filter((item) => item.controlaStock).length,
                lowStockCount: relevantStockRows.filter((stockRow) => stockRow.isLowStock).length,
                outOfStockCount: relevantStockRows.filter((stockRow) => stockRow.isOutOfStock)
                    .length,
                inactiveCount: filteredItems.filter((item) => item.estado === "inactivo").length,
                estimatedConsumedCost: roundQuantity(estimatedConsumedCost),
                alerts: relevantStockRows
                    .filter((stockRow) => stockRow.isLowStock || stockRow.isOutOfStock)
                    .map((stockRow) => {
                        const item = filteredItems.find(
                            (currentItem) => Number(currentItem.id) === Number(stockRow.inventoryItemId)
                        );

                        return {
                            itemId: stockRow.inventoryItemId,
                            itemName: item?.nombre ?? `Insumo #${stockRow.inventoryItemId}`,
                            branchId: stockRow.branchId,
                            branchName: stockRow.branchName ?? "Sucursal",
                            currentStock: stockRow.currentStock,
                            minimumStock: stockRow.minimumStock,
                            state: stockRow.isOutOfStock ? "agotado" : "bajo"
                        };
                    }),
                mostUsedItems: [...usageMap.values()]
                    .filter((entry) => entry.quantityUsed > 0)
                    .sort((left, right) => right.quantityUsed - left.quantityUsed)
                    .slice(0, 5)
                    .map((entry) => ({
                        ...entry,
                        quantityUsed: roundQuantity(entry.quantityUsed),
                        costConsumed: roundQuantity(entry.costConsumed)
                    }))
            }
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al generar el resumen de inventario: ${error.message}`
        };
    }
}

export async function obtenerReportesInventario(filtros, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const groupBy = normalizarTexto(filtros?.groupBy).toLowerCase() || "branch";

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!hasInventoryAccess(auth)) {
            return formatearErrorAutorizacion("inventario");
        }

        if (!REPORT_GROUPS.includes(groupBy)) {
            return {
                ok: false,
                msg: "El agrupamiento del reporte de inventario no es valido."
            };
        }

        const rows = await listarMovimientosInventarioPorWorkspaceId(workspaceId, {
            branchId: filtros?.branchId,
            from: filtros?.from,
            to: filtros?.to
        });
        const grouped = new Map();

        for (const row of rows) {
            let key = "sin-referencia";
            let label = "Sin referencia";

            if (groupBy === "room") {
                key = String(row.room_name ?? "Sin sala");
                label = row.room_name ?? "Sin sala";
            } else if (groupBy === "branch") {
                key = String(row.branch_id ?? "sin-sucursal");
                label = row.branch_name ?? "Sin sucursal";
            } else if (groupBy === "procedure") {
                key = String(row.charge_procedure_name ?? row.reservation_type_name ?? "Sin procedimiento");
                label = row.charge_procedure_name ?? row.reservation_type_name ?? "Sin procedimiento";
            } else if (groupBy === "date") {
                key = normalizarFechaCorta(row.created_at) ?? "Sin fecha";
                label = key;
            } else if (groupBy === "user") {
                key = String(row.created_by_user_id ?? "sin-usuario");
                label = row.created_by_user_name ?? "Sin usuario";
            }

            if (!grouped.has(key)) {
                grouped.set(key, {
                    key,
                    label,
                    movementsCount: 0,
                    quantityMoved: 0,
                    netConsumptionQuantity: 0,
                    estimatedConsumedCost: 0,
                    lastMovementAt: row.created_at
                });
            }

            const entry = grouped.get(key);
            const quantity = Number(row.quantity ?? 0);
            const costReference = Number(row.unit_cost_reference ?? 0);
            const signedConsumption = row.movement_type === "consumo"
                ? quantity
                : row.movement_type === "devolucion"
                    ? quantity * -1
                    : 0;

            entry.movementsCount += 1;
            entry.quantityMoved += quantity;
            entry.netConsumptionQuantity += signedConsumption;
            entry.estimatedConsumedCost += signedConsumption * costReference;
            entry.lastMovementAt = row.created_at > entry.lastMovementAt ? row.created_at : entry.lastMovementAt;
        }

        return {
            ok: true,
            msg: "Reporte de inventario generado correctamente.",
            data: [...grouped.values()]
                .sort((left, right) => right.estimatedConsumedCost - left.estimatedConsumedCost)
                .map((entry) => ({
                    ...entry,
                    quantityMoved: roundQuantity(entry.quantityMoved),
                    netConsumptionQuantity: roundQuantity(entry.netConsumptionQuantity),
                    estimatedConsumedCost: roundQuantity(entry.estimatedConsumedCost)
                }))
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al generar el reporte de inventario: ${error.message}`
        };
    }
}

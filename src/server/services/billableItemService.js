import { isAdministrativeUser } from "../../shared/roles.js";
import { normalizeSupportedCurrencyCode } from "../../shared/currencies.js";
import {
    buscarBillableItemPorId,
    crearBillableItem as crearBillableItemRepository,
    listarBillableItemsPorWorkspaceId,
    actualizarBillableItem as actualizarBillableItemRepository
} from "../repositories/billableItemRepository.js";
import { obtenerConfiguracionCuentaNormalizada } from "./workspaceSettingsService.js";

const APPOINTMENT_TYPE_HINTS = ["consulta", "procedimiento", "otro"];
const TAX_BEHAVIORS = ["no_aplica", "incluido", "excluido"];
const ITEM_STATES = ["activo", "inactivo"];

function resolveWorkspaceId(auth) {
    const workspaceId = Number(auth?.workspaceId);
    return Number.isInteger(workspaceId) && workspaceId > 0 ? workspaceId : null;
}

function canManageCatalog(auth) {
    return isAdministrativeUser({
        membershipRole: auth?.membershipRole,
        userRole: auth?.userRole
    });
}

function normalizeText(value) {
    return String(value ?? "").trim();
}

function normalizeBoolean(value, fallback = false) {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        return value.trim().toLowerCase() === "true";
    }

    if (value === undefined || value === null) {
        return fallback;
    }

    return Boolean(value);
}

function normalizeAmount(value, fallback = 0) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : fallback;
}

function normalizeOptionalId(value) {
    const numericValue = Number(value);
    return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
}

function normalizeItemOutput(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        workspaceId: row.workspace_id,
        branchId: row.branch_id ?? null,
        branchName: row.branch_name ?? null,
        name: row.name,
        description: row.description ?? "",
        category: row.category,
        appointmentTypeHint: row.appointment_type_hint ?? "otro",
        basePrice: Number(row.base_price ?? 0),
        currencyCode: row.currency_code,
        taxBehavior: row.tax_behavior ?? "no_aplica",
        taxRate: Number(row.tax_rate ?? 0),
        estimatedDurationMinutes: row.estimated_duration_minutes ?? null,
        requiresPatient: Boolean(row.requires_patient),
        requiresProfessional: Boolean(row.requires_professional),
        requiresRoom: Boolean(row.requires_room),
        requiresInventory: Boolean(row.requires_inventory),
        reservable: Boolean(row.reservable),
        billableWithoutReservation: Boolean(row.billable_without_reservation),
        packageEligible: Boolean(row.package_eligible),
        visibleToReception: Boolean(row.visible_to_reception),
        administrativeOnly: Boolean(row.administrative_only),
        state: row.state ?? "activo",
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function normalizePayload(payload = {}, defaults = {}) {
    const appointmentTypeHint = normalizeText(
        payload.appointmentTypeHint ?? defaults.appointmentTypeHint ?? "otro"
    ).toLowerCase();
    const state = normalizeText(payload.state ?? defaults.state ?? "activo").toLowerCase();
    const taxBehavior = normalizeText(
        payload.taxBehavior ?? defaults.taxBehavior ?? "no_aplica"
    ).toLowerCase();
    const category = normalizeText(payload.category ?? defaults.category);
    const name = normalizeText(payload.name ?? defaults.name);
    const currencyCode = normalizeSupportedCurrencyCode(
        payload.currencyCode ?? defaults.currencyCode,
        ""
    );
    const estimatedDurationMinutes =
        payload.estimatedDurationMinutes === "" || payload.estimatedDurationMinutes === null
            ? null
            : Number(payload.estimatedDurationMinutes);

    if (!name) {
        return {
            ok: false,
            msg: "El nombre del item facturable es obligatorio."
        };
    }

    if (!category) {
        return {
            ok: false,
            msg: "La categoria del item facturable es obligatoria."
        };
    }

    if (!APPOINTMENT_TYPE_HINTS.includes(appointmentTypeHint)) {
        return {
            ok: false,
            msg: "El tipo de atencion sugerido no es valido."
        };
    }

    if (!ITEM_STATES.includes(state)) {
        return {
            ok: false,
            msg: "El estado del item facturable no es valido."
        };
    }

    if (!TAX_BEHAVIORS.includes(taxBehavior)) {
        return {
            ok: false,
            msg: "La politica de impuesto del item no es valida."
        };
    }

    if (!currencyCode) {
        return {
            ok: false,
            msg: "La moneda del item facturable no es valida."
        };
    }

    if (
        estimatedDurationMinutes !== null &&
        (!Number.isInteger(estimatedDurationMinutes) ||
            estimatedDurationMinutes < 5 ||
            estimatedDurationMinutes > 480)
    ) {
        return {
            ok: false,
            msg: "La duracion estimada debe estar entre 5 y 480 minutos."
        };
    }

    return {
        ok: true,
        data: {
            branchId: normalizeOptionalId(payload.branchId ?? defaults.branchId),
            name,
            description: normalizeText(payload.description ?? defaults.description),
            category,
            appointmentTypeHint,
            basePrice: Math.max(0, normalizeAmount(payload.basePrice ?? defaults.basePrice, 0)),
            currencyCode,
            taxBehavior,
            taxRate: Math.max(0, normalizeAmount(payload.taxRate ?? defaults.taxRate, 0)),
            estimatedDurationMinutes,
            requiresPatient: normalizeBoolean(
                payload.requiresPatient ?? defaults.requiresPatient,
                true
            ),
            requiresProfessional: normalizeBoolean(
                payload.requiresProfessional ?? defaults.requiresProfessional,
                false
            ),
            requiresRoom: normalizeBoolean(payload.requiresRoom ?? defaults.requiresRoom, false),
            requiresInventory: normalizeBoolean(
                payload.requiresInventory ?? defaults.requiresInventory,
                false
            ),
            reservable: normalizeBoolean(payload.reservable ?? defaults.reservable, false),
            billableWithoutReservation: normalizeBoolean(
                payload.billableWithoutReservation ??
                    defaults.billableWithoutReservation,
                true
            ),
            packageEligible: normalizeBoolean(
                payload.packageEligible ?? defaults.packageEligible,
                false
            ),
            visibleToReception: normalizeBoolean(
                payload.visibleToReception ?? defaults.visibleToReception,
                true
            ),
            administrativeOnly: normalizeBoolean(
                payload.administrativeOnly ?? defaults.administrativeOnly,
                false
            ),
            state
        }
    };
}

export async function listarItemsFacturables(filtros, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        const settings = await obtenerConfiguracionCuentaNormalizada(
            workspaceId,
            auth?.planCode ?? "basic"
        );

        if (!settings.capabilities.billableCatalogEnabled) {
            return {
                ok: false,
                msg: "El catalogo facturable no esta habilitado para esta cuenta."
            };
        }

        const rows = await listarBillableItemsPorWorkspaceId(workspaceId, filtros);
        const isAdmin = canManageCatalog(auth);
        const items = rows
            .filter((row) => (isAdmin ? true : row.state === "activo"))
            .filter((row) => (isAdmin ? true : row.visible_to_reception))
            .map((row) => normalizeItemOutput(row));

        return {
            ok: true,
            msg: "Catalogo facturable cargado correctamente.",
            data: items
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al cargar el catalogo facturable: ${error.message}`
        };
    }
}

export async function crearItemFacturable(payload, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!canManageCatalog(auth)) {
            return {
                ok: false,
                msg: "No autorizado. Solo el administrador puede crear items facturables."
            };
        }

        const settings = await obtenerConfiguracionCuentaNormalizada(
            workspaceId,
            auth?.planCode ?? "basic"
        );

        if (!settings.capabilities.billableCatalogEnabled) {
            return {
                ok: false,
                msg: "El catalogo facturable no esta habilitado para esta cuenta."
            };
        }

        const normalizedPayload = normalizePayload(payload);

        if (!normalizedPayload.ok) {
            return normalizedPayload;
        }

        const created = await crearBillableItemRepository(
            {
                workspaceId,
                ...normalizedPayload.data
            }
        );
        const row = await buscarBillableItemPorId(created.id, workspaceId);

        return {
            ok: true,
            msg: "Item facturable creado correctamente.",
            data: normalizeItemOutput(row)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al crear el item facturable: ${error.message}`
        };
    }
}

export async function actualizarItemFacturable(id, payload, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);
        const itemId = Number(id);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!canManageCatalog(auth)) {
            return {
                ok: false,
                msg: "No autorizado. Solo el administrador puede editar items facturables."
            };
        }

        if (!Number.isInteger(itemId) || itemId <= 0) {
            return {
                ok: false,
                msg: "El item facturable indicado no es valido."
            };
        }

        const existing = await buscarBillableItemPorId(itemId, workspaceId);

        if (!existing) {
            return {
                ok: false,
                msg: "El item facturable indicado no existe en esta cuenta."
            };
        }

        const normalizedPayload = normalizePayload(payload, normalizeItemOutput(existing));

        if (!normalizedPayload.ok) {
            return normalizedPayload;
        }

        await actualizarBillableItemRepository(itemId, workspaceId, normalizedPayload.data);
        const updatedRow = await buscarBillableItemPorId(itemId, workspaceId);

        return {
            ok: true,
            msg: "Item facturable actualizado correctamente.",
            data: normalizeItemOutput(updatedRow)
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al actualizar el item facturable: ${error.message}`
        };
    }
}

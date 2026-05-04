import { isAdministrativeUser } from "../../shared/roles.js";
import {
    actualizarWorkspaceSettings,
    buscarWorkspaceSettingsPorWorkspaceId,
    crearWorkspaceSettings
} from "../repositories/workspaceSettingsRepository.js";
import {
    actualizarWorkspaceCapabilities,
    buscarWorkspaceCapabilitiesPorWorkspaceId,
    crearWorkspaceCapabilities
} from "../repositories/workspaceCapabilityRepository.js";
import {
    DEFAULT_CURRENCY_CODE,
    normalizeSupportedCurrencyCode,
    SUPPORTED_CURRENCY_CODES
} from "../../shared/currencies.js";
import {
    resolveCapabilitySnapshot,
    sanitizeWorkspaceCapabilitiesRow
} from "./capabilityResolver.js";

const DEFAULT_CONSULTATION_DURATION = 30;
const DEFAULT_PROCEDURE_DURATION = 60;
const DEFAULT_PROCEDURE_TURNOVER_DURATION = 15;
const DEFAULT_CONSULTATION_DURATION_ENABLED = false;
const DEFAULT_PROCEDURE_DURATION_ENABLED = false;
const DEFAULT_PROCEDURE_TURNOVER_ENABLED = false;
const DEFAULT_OPEN_TIME = "08:00";
const DEFAULT_CLOSE_TIME = "17:00";
const DEFAULT_TIME_ZONE = "America/Costa_Rica";
const DEFAULT_PROCEDURE_PRICING_POLICY = "bloqueado";
const DEFAULT_PROCEDURE_PRICING_MODE = "solo_sala";
const DEFAULT_DOCUMENT_MODE = "comprobante_simple";
const DEFAULT_TAXES_ENABLED = false;
const DEFAULT_NO_SHOW_POLICY = "informativo";
const DEFAULT_LATE_CANCELLATION_POLICY = "informativa";
const DEFAULT_ALLOW_RECEPTION_MANUAL_CHARGES = true;
const PROCEDURE_PRICING_POLICIES = ["bloqueado"];
const PROCEDURE_PRICING_MODES = ["solo_sala", "solo_insumos", "sala_mas_insumos"];

function resolveWorkspaceId(auth) {
    const workspaceId = Number(auth?.workspaceId);

    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
        return null;
    }

    return workspaceId;
}

function hasAdminAccess(auth) {
    return isAdministrativeUser({
        membershipRole: auth?.membershipRole,
        userRole: auth?.userRole
    });
}

function sanitizeSettings(row) {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        consultationDurationEnabled: Boolean(
            row.consultation_duration_enabled ?? DEFAULT_CONSULTATION_DURATION_ENABLED
        ),
        consultationDurationMinutes: Number(
            row.consultation_duration_minutes ?? DEFAULT_CONSULTATION_DURATION
        ),
        procedureDurationEnabled: Boolean(
            row.procedure_duration_enabled ?? DEFAULT_PROCEDURE_DURATION_ENABLED
        ),
        procedureDurationMinutes: Number(
            row.procedure_duration_minutes ?? DEFAULT_PROCEDURE_DURATION
        ),
        procedureTurnoverEnabled: Boolean(
            row.procedure_turnover_enabled ?? DEFAULT_PROCEDURE_TURNOVER_ENABLED
        ),
        procedureTurnoverMinutes: Number(
            row.procedure_turnover_minutes ?? DEFAULT_PROCEDURE_TURNOVER_DURATION
        ),
        consultationOpenTime: normalizeTime(
            row.consultation_open_time,
            DEFAULT_OPEN_TIME
        ),
        consultationCloseTime: row.consultation_no_closing
            ? null
            : normalizeTime(row.consultation_close_time, DEFAULT_CLOSE_TIME),
        consultationNoClosing: Boolean(row.consultation_no_closing),
        procedureOpenTime: normalizeTime(
            row.procedure_open_time,
            DEFAULT_OPEN_TIME
        ),
        procedureCloseTime: row.procedure_no_closing
            ? null
            : normalizeTime(row.procedure_close_time, DEFAULT_CLOSE_TIME),
        procedureNoClosing: Boolean(row.procedure_no_closing),
        timeZone: String(row.time_zone ?? DEFAULT_TIME_ZONE),
        procedurePricingPolicy: String(
            row.procedure_pricing_policy ?? DEFAULT_PROCEDURE_PRICING_POLICY
        ),
        defaultProcedurePricingMode: String(
            row.default_procedure_pricing_mode ?? DEFAULT_PROCEDURE_PRICING_MODE
        ),
        defaultCurrencyCode: normalizeSupportedCurrencyCode(
            row.default_currency_code,
            DEFAULT_CURRENCY_CODE
        ),
        documentMode: String(row.document_mode ?? DEFAULT_DOCUMENT_MODE),
        taxesEnabled: Boolean(row.taxes_enabled ?? DEFAULT_TAXES_ENABLED),
        noShowPolicy: String(row.no_show_policy ?? DEFAULT_NO_SHOW_POLICY),
        lateCancellationPolicy: String(
            row.late_cancellation_policy ?? DEFAULT_LATE_CANCELLATION_POLICY
        ),
        allowReceptionManualCharges: Boolean(
            row.allow_reception_manual_charges ?? DEFAULT_ALLOW_RECEPTION_MANUAL_CHARGES
        ),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function normalizeTime(value, fallback = null) {
    const normalized = String(value ?? "").trim().slice(0, 5);
    return normalized || fallback;
}

function normalizeDuration(value, fallback) {
    const duration = Number(value);

    if (!Number.isInteger(duration)) {
        return fallback;
    }

    return duration;
}

function resolveReferenceDuration({
    value,
    fallback,
    enabled,
    label
}) {
    const duration = normalizeDuration(value, fallback);

    if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
        if (!enabled) {
            return {
                ok: true,
                data: fallback
            };
        }

        return {
            ok: false,
            msg: `El tiempo de referencia de ${label} debe estar entre 5 y 480 minutos.`
        };
    }

    return {
        ok: true,
        data: duration
    };
}

function normalizeBoolean(value) {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        return value.trim().toLowerCase() === "true";
    }

    return Boolean(value);
}

function validateScheduleBlock({
    openTime,
    closeTime,
    noClosing,
    openLabel,
    closeLabel
}) {
    const normalizedOpenTime = normalizeTime(openTime);
    const normalizedCloseTime = normalizeTime(closeTime);

    if (!normalizedOpenTime) {
        return {
            ok: false,
            msg: `La ${openLabel} es obligatoria.`
        };
    }

    if (noClosing) {
        return {
            ok: true,
            data: {
                openTime: normalizedOpenTime,
                closeTime: null,
                noClosing: true
            }
        };
    }

    if (!normalizedCloseTime) {
        return {
            ok: false,
            msg: `La ${closeLabel} es obligatoria.`
        };
    }

    if (normalizedCloseTime <= normalizedOpenTime) {
        return {
            ok: false,
            msg: `La ${closeLabel} debe ser posterior a la ${openLabel}.`
        };
    }

    return {
        ok: true,
        data: {
            openTime: normalizedOpenTime,
            closeTime: normalizedCloseTime,
            noClosing: false
        }
    };
}

async function ensureWorkspaceSettings(workspaceId, executor) {
    let settings = await buscarWorkspaceSettingsPorWorkspaceId(workspaceId, executor);

    if (settings) {
        return settings;
    }

    return crearWorkspaceSettings(
        {
            workspaceId,
            consultationDurationEnabled: DEFAULT_CONSULTATION_DURATION_ENABLED,
            consultationDurationMinutes: DEFAULT_CONSULTATION_DURATION,
            procedureDurationEnabled: DEFAULT_PROCEDURE_DURATION_ENABLED,
            procedureDurationMinutes: DEFAULT_PROCEDURE_DURATION,
            procedureTurnoverEnabled: DEFAULT_PROCEDURE_TURNOVER_ENABLED,
            procedureTurnoverMinutes: DEFAULT_PROCEDURE_TURNOVER_DURATION,
            consultationOpenTime: DEFAULT_OPEN_TIME,
            consultationCloseTime: DEFAULT_CLOSE_TIME,
            consultationNoClosing: false,
            procedureOpenTime: DEFAULT_OPEN_TIME,
            procedureCloseTime: DEFAULT_CLOSE_TIME,
            procedureNoClosing: false,
            timeZone: DEFAULT_TIME_ZONE,
            procedurePricingPolicy: DEFAULT_PROCEDURE_PRICING_POLICY,
            defaultProcedurePricingMode: DEFAULT_PROCEDURE_PRICING_MODE,
            defaultCurrencyCode: DEFAULT_CURRENCY_CODE,
            documentMode: DEFAULT_DOCUMENT_MODE,
            taxesEnabled: DEFAULT_TAXES_ENABLED,
            noShowPolicy: DEFAULT_NO_SHOW_POLICY,
            lateCancellationPolicy: DEFAULT_LATE_CANCELLATION_POLICY,
            allowReceptionManualCharges: DEFAULT_ALLOW_RECEPTION_MANUAL_CHARGES
        },
        executor
    );
}

function buildCapabilityDefaults(planCode = "basic") {
    const normalizedPlanCode = String(planCode ?? "basic").trim().toLowerCase() || "basic";

    if (normalizedPlanCode === "enterprise") {
        return {
            financeEnabled: true,
            inventoryEnabled: true,
            billableCatalogEnabled: true,
            manualBillingEnabled: true,
            partialPaymentsEnabled: true,
            packagesEnabled: false,
            membershipsEnabled: false,
            rentalsEnabled: true,
            commissionsEnabled: true,
            depositsEnabled: true,
            penaltiesEnabled: true,
            whatsappEnabled: false
        };
    }

    if (normalizedPlanCode === "premium") {
        return {
            financeEnabled: true,
            inventoryEnabled: true,
            billableCatalogEnabled: true,
            manualBillingEnabled: true,
            partialPaymentsEnabled: true,
            packagesEnabled: false,
            membershipsEnabled: false,
            rentalsEnabled: false,
            commissionsEnabled: false,
            depositsEnabled: true,
            penaltiesEnabled: true,
            whatsappEnabled: false
        };
    }

    return {
        financeEnabled: true,
        inventoryEnabled: false,
        billableCatalogEnabled: true,
        manualBillingEnabled: false,
        partialPaymentsEnabled: false,
        packagesEnabled: false,
        membershipsEnabled: false,
        rentalsEnabled: false,
        commissionsEnabled: false,
        depositsEnabled: false,
        penaltiesEnabled: false,
        whatsappEnabled: false
    };
}

async function ensureWorkspaceCapabilities(workspaceId, planCode, executor) {
    let capabilities = await buscarWorkspaceCapabilitiesPorWorkspaceId(workspaceId, executor);

    if (capabilities) {
        return capabilities;
    }

    const defaults = buildCapabilityDefaults(planCode);

    return crearWorkspaceCapabilities(
        {
            workspaceId,
            ...defaults
        },
        executor
    );
}

function buildSettingsSnapshot(settingsRow, capabilityRow, planCode = "basic") {
    const settings = sanitizeSettings(settingsRow);
    const capabilityConfig = sanitizeWorkspaceCapabilitiesRow(capabilityRow);
    const capabilitySnapshot = resolveCapabilitySnapshot(planCode, capabilityConfig, settingsRow);

    return {
        ...settings,
        capabilityConfig,
        capabilities: capabilitySnapshot.features,
        policies: capabilitySnapshot.policies
    };
}

export async function obtenerConfiguracionOperativaNormalizada(
    workspaceId,
    executor = undefined
) {
    const settings = await ensureWorkspaceSettings(workspaceId, executor);
    return sanitizeSettings(settings);
}

export async function obtenerConfiguracionCuentaNormalizada(
    workspaceId,
    planCode = "basic",
    executor = undefined
) {
    const settingsRow = await ensureWorkspaceSettings(workspaceId, executor);
    const capabilitiesRow = await ensureWorkspaceCapabilities(workspaceId, planCode, executor);
    return buildSettingsSnapshot(settingsRow, capabilitiesRow, planCode);
}

export async function obtenerConfiguracionCuenta(auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        const settings = await ensureWorkspaceSettings(workspaceId);
        const capabilities = await ensureWorkspaceCapabilities(
            workspaceId,
            auth?.planCode ?? "basic"
        );

        return {
            ok: true,
            msg: "Configuracion cargada correctamente.",
            data: buildSettingsSnapshot(settings, capabilities, auth?.planCode ?? "basic")
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al cargar la configuracion: ${error.message}`
        };
    }
}

export async function actualizarConfiguracionCuenta(payload, auth) {
    try {
        const workspaceId = resolveWorkspaceId(auth);

        if (!workspaceId) {
            return {
                ok: false,
                msg: "No autorizado. Falta el contexto de la cuenta."
            };
        }

        if (!hasAdminAccess(auth)) {
            return {
                ok: false,
                msg: "No autorizado. Solo el administrador puede cambiar la configuracion."
            };
        }

        const currentSettingsRow = await ensureWorkspaceSettings(workspaceId);
        const currentSettings = sanitizeSettings(currentSettingsRow);
        const currentCapabilitiesRow = await ensureWorkspaceCapabilities(
            workspaceId,
            auth?.planCode ?? "basic"
        );
        const currentCapabilityConfig = sanitizeWorkspaceCapabilitiesRow(currentCapabilitiesRow);
        const consultationDurationEnabled = normalizeBoolean(
            payload?.consultationDurationEnabled ?? currentSettings.consultationDurationEnabled
        );
        const procedureDurationEnabled = normalizeBoolean(
            payload?.procedureDurationEnabled ?? currentSettings.procedureDurationEnabled
        );
        const procedureTurnoverEnabled = normalizeBoolean(
            payload?.procedureTurnoverEnabled ?? currentSettings.procedureTurnoverEnabled
        );
        const consultationNoClosing = normalizeBoolean(payload?.consultationNoClosing);
        const procedureNoClosing = normalizeBoolean(payload?.procedureNoClosing);
        const timeZone = String(payload?.timeZone ?? currentSettings.timeZone).trim();
        const procedurePricingPolicy = String(
            payload?.procedurePricingPolicy ?? currentSettings.procedurePricingPolicy
        )
            .trim()
            .toLowerCase();
        const defaultProcedurePricingMode = String(
            payload?.defaultProcedurePricingMode ?? currentSettings.defaultProcedurePricingMode
        )
            .trim()
            .toLowerCase();
        const defaultCurrencyCode = normalizeSupportedCurrencyCode(
            payload?.defaultCurrencyCode ?? currentSettings.defaultCurrencyCode,
            ""
        );
        const documentMode = String(
            payload?.documentMode ?? currentSettings.documentMode ?? DEFAULT_DOCUMENT_MODE
        )
            .trim()
            .toLowerCase();
        const taxesEnabled = normalizeBoolean(
            payload?.taxesEnabled ?? currentSettings.taxesEnabled
        );
        const noShowPolicy = String(
            payload?.noShowPolicy ?? currentSettings.noShowPolicy ?? DEFAULT_NO_SHOW_POLICY
        )
            .trim()
            .toLowerCase();
        const lateCancellationPolicy = String(
            payload?.lateCancellationPolicy ??
                currentSettings.lateCancellationPolicy ??
                DEFAULT_LATE_CANCELLATION_POLICY
        )
            .trim()
            .toLowerCase();
        const allowReceptionManualCharges = normalizeBoolean(
            payload?.allowReceptionManualCharges ??
                currentSettings.allowReceptionManualCharges
        );

        const consultationDurationResult = resolveReferenceDuration({
            value: payload?.consultationDurationMinutes,
            fallback: currentSettings.consultationDurationMinutes,
            enabled: consultationDurationEnabled,
            label: "consultas"
        });

        if (!consultationDurationResult.ok) {
            return consultationDurationResult;
        }

        const procedureDurationResult = resolveReferenceDuration({
            value: payload?.procedureDurationMinutes,
            fallback: currentSettings.procedureDurationMinutes,
            enabled: procedureDurationEnabled,
            label: "procedimientos"
        });

        if (!procedureDurationResult.ok) {
            return procedureDurationResult;
        }

        const procedureTurnoverResult = resolveReferenceDuration({
            value: payload?.procedureTurnoverMinutes,
            fallback: currentSettings.procedureTurnoverMinutes,
            enabled: procedureTurnoverEnabled,
            label: "separacion entre procedimientos"
        });

        if (!procedureTurnoverResult.ok) {
            return procedureTurnoverResult;
        }

        if (!timeZone) {
            return {
                ok: false,
                msg: "La zona horaria es obligatoria."
            };
        }

        if (!PROCEDURE_PRICING_POLICIES.includes(procedurePricingPolicy)) {
            return {
                ok: false,
                msg: "La politica procedural no es valida."
            };
        }

        if (!PROCEDURE_PRICING_MODES.includes(defaultProcedurePricingMode)) {
            return {
                ok: false,
                msg: "La modalidad por defecto de procedimientos no es valida."
            };
        }

        if (!SUPPORTED_CURRENCY_CODES.includes(defaultCurrencyCode)) {
            return {
                ok: false,
                msg: "La moneda por defecto de la cuenta no es valida."
            };
        }

        if (![DEFAULT_DOCUMENT_MODE, "prefactura"].includes(documentMode)) {
            return {
                ok: false,
                msg: "El modo de comprobante no es valido."
            };
        }

        const consultationSchedule = validateScheduleBlock({
            openTime: payload?.consultationOpenTime,
            closeTime: payload?.consultationCloseTime,
            noClosing: consultationNoClosing,
            openLabel: "hora de apertura de consultas",
            closeLabel: "hora de cierre de consultas"
        });

        if (!consultationSchedule.ok) {
            return consultationSchedule;
        }

        const procedureSchedule = validateScheduleBlock({
            openTime: payload?.procedureOpenTime,
            closeTime: payload?.procedureCloseTime,
            noClosing: procedureNoClosing,
            openLabel: "hora de apertura de procedimientos",
            closeLabel: "hora de cierre de procedimientos"
        });

        if (!procedureSchedule.ok) {
            return procedureSchedule;
        }

        const updatedSettings = await actualizarWorkspaceSettings(workspaceId, {
            consultationDurationEnabled,
            consultationDurationMinutes: consultationDurationResult.data,
            procedureDurationEnabled,
            procedureDurationMinutes: procedureDurationResult.data,
            procedureTurnoverEnabled,
            procedureTurnoverMinutes: procedureTurnoverResult.data,
            consultationOpenTime: consultationSchedule.data.openTime,
            consultationCloseTime: consultationSchedule.data.closeTime,
            consultationNoClosing: consultationSchedule.data.noClosing,
            procedureOpenTime: procedureSchedule.data.openTime,
            procedureCloseTime: procedureSchedule.data.closeTime,
            procedureNoClosing: procedureSchedule.data.noClosing,
            timeZone,
            procedurePricingPolicy,
            defaultProcedurePricingMode,
            defaultCurrencyCode,
            documentMode,
            taxesEnabled,
            noShowPolicy,
            lateCancellationPolicy,
            allowReceptionManualCharges
        });

        const capabilityDefaults = buildCapabilityDefaults(auth?.planCode ?? "basic");
        const updatedCapabilities = await actualizarWorkspaceCapabilities(workspaceId, {
            financeEnabled: normalizeBoolean(
                payload?.capabilityConfig?.financeEnabled ??
                    payload?.financeEnabled ??
                    currentCapabilityConfig.financeEnabled
            ),
            inventoryEnabled: normalizeBoolean(
                payload?.capabilityConfig?.inventoryEnabled ??
                    payload?.inventoryEnabled ??
                    currentCapabilityConfig.inventoryEnabled
            ),
            billableCatalogEnabled: normalizeBoolean(
                payload?.capabilityConfig?.billableCatalogEnabled ??
                    payload?.billableCatalogEnabled ??
                    currentCapabilityConfig.billableCatalogEnabled
            ),
            manualBillingEnabled:
                capabilityDefaults.manualBillingEnabled &&
                normalizeBoolean(
                    payload?.capabilityConfig?.manualBillingEnabled ??
                        payload?.manualBillingEnabled ??
                        currentCapabilityConfig.manualBillingEnabled
                ),
            partialPaymentsEnabled:
                capabilityDefaults.partialPaymentsEnabled &&
                normalizeBoolean(
                    payload?.capabilityConfig?.partialPaymentsEnabled ??
                        payload?.partialPaymentsEnabled ??
                        currentCapabilityConfig.partialPaymentsEnabled
                ),
            packagesEnabled:
                capabilityDefaults.packagesEnabled &&
                normalizeBoolean(
                    payload?.capabilityConfig?.packagesEnabled ??
                        payload?.packagesEnabled ??
                        currentCapabilityConfig.packagesEnabled
                ),
            membershipsEnabled:
                capabilityDefaults.membershipsEnabled &&
                normalizeBoolean(
                    payload?.capabilityConfig?.membershipsEnabled ??
                        payload?.membershipsEnabled ??
                        currentCapabilityConfig.membershipsEnabled
                ),
            rentalsEnabled:
                capabilityDefaults.rentalsEnabled &&
                normalizeBoolean(
                    payload?.capabilityConfig?.rentalsEnabled ??
                        payload?.rentalsEnabled ??
                        currentCapabilityConfig.rentalsEnabled
                ),
            commissionsEnabled:
                capabilityDefaults.commissionsEnabled &&
                normalizeBoolean(
                    payload?.capabilityConfig?.commissionsEnabled ??
                        payload?.commissionsEnabled ??
                        currentCapabilityConfig.commissionsEnabled
                ),
            depositsEnabled:
                capabilityDefaults.depositsEnabled &&
                normalizeBoolean(
                    payload?.capabilityConfig?.depositsEnabled ??
                        payload?.depositsEnabled ??
                        currentCapabilityConfig.depositsEnabled
                ),
            penaltiesEnabled:
                capabilityDefaults.penaltiesEnabled &&
                normalizeBoolean(
                    payload?.capabilityConfig?.penaltiesEnabled ??
                        payload?.penaltiesEnabled ??
                        currentCapabilityConfig.penaltiesEnabled
                ),
            whatsappEnabled:
                capabilityDefaults.whatsappEnabled &&
                normalizeBoolean(
                    payload?.capabilityConfig?.whatsappEnabled ??
                        payload?.whatsappEnabled ??
                        currentCapabilityConfig.whatsappEnabled
                )
        });

        return {
            ok: true,
            msg: "Configuracion actualizada correctamente.",
            data: buildSettingsSnapshot(updatedSettings, updatedCapabilities, auth?.planCode ?? "basic")
        };
    } catch (error) {
        return {
            ok: false,
            msg: `Error al actualizar la configuracion: ${error.message}`
        };
    }
}

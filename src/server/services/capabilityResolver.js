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

function normalizePlanCode(value) {
    return String(value ?? "basic").trim().toLowerCase() || "basic";
}

function buildPlanCapabilityCeilings(planCode) {
    const normalizedPlanCode = normalizePlanCode(planCode);

    if (normalizedPlanCode === "enterprise") {
        return {
            financeEnabled: true,
            inventoryEnabled: true,
            billableCatalogEnabled: true,
            billableCatalogMode: "avanzado",
            manualBillingEnabled: true,
            partialPaymentsEnabled: true,
            packagesEnabled: true,
            membershipsEnabled: true,
            rentalsEnabled: true,
            commissionsEnabled: true,
            depositsEnabled: true,
            penaltiesEnabled: true,
            whatsappEligible: true
        };
    }

    if (normalizedPlanCode === "premium") {
        return {
            financeEnabled: true,
            inventoryEnabled: true,
            billableCatalogEnabled: true,
            billableCatalogMode: "completo",
            manualBillingEnabled: true,
            partialPaymentsEnabled: true,
            packagesEnabled: false,
            membershipsEnabled: false,
            rentalsEnabled: false,
            commissionsEnabled: false,
            depositsEnabled: true,
            penaltiesEnabled: true,
            whatsappEligible: true
        };
    }

    return {
        financeEnabled: true,
        inventoryEnabled: false,
        billableCatalogEnabled: true,
        billableCatalogMode: "simple",
        manualBillingEnabled: false,
        partialPaymentsEnabled: false,
        packagesEnabled: false,
        membershipsEnabled: false,
        rentalsEnabled: false,
        commissionsEnabled: false,
        depositsEnabled: false,
        penaltiesEnabled: false,
        whatsappEligible: false
    };
}

function sanitizeWorkspaceCapabilitiesRow(row = {}) {
    return {
        financeEnabled: normalizeBoolean(row.finance_enabled ?? row.financeEnabled, true),
        inventoryEnabled: normalizeBoolean(row.inventory_enabled ?? row.inventoryEnabled, false),
        billableCatalogEnabled: normalizeBoolean(
            row.billable_catalog_enabled ?? row.billableCatalogEnabled,
            true
        ),
        manualBillingEnabled: normalizeBoolean(
            row.manual_billing_enabled ?? row.manualBillingEnabled,
            false
        ),
        partialPaymentsEnabled: normalizeBoolean(
            row.partial_payments_enabled ?? row.partialPaymentsEnabled,
            false
        ),
        packagesEnabled: normalizeBoolean(row.packages_enabled ?? row.packagesEnabled, false),
        membershipsEnabled: normalizeBoolean(
            row.memberships_enabled ?? row.membershipsEnabled,
            false
        ),
        rentalsEnabled: normalizeBoolean(row.rentals_enabled ?? row.rentalsEnabled, false),
        commissionsEnabled: normalizeBoolean(
            row.commissions_enabled ?? row.commissionsEnabled,
            false
        ),
        depositsEnabled: normalizeBoolean(row.deposits_enabled ?? row.depositsEnabled, false),
        penaltiesEnabled: normalizeBoolean(row.penalties_enabled ?? row.penaltiesEnabled, false),
        whatsappEnabled: normalizeBoolean(row.whatsapp_enabled ?? row.whatsappEnabled, false)
    };
}

export function resolveCapabilitiesForPlan(planCode, workspaceCapabilities = {}) {
    const ceilings = buildPlanCapabilityCeilings(planCode);
    const workspace = sanitizeWorkspaceCapabilitiesRow(workspaceCapabilities);

    return {
        financeEnabled: ceilings.financeEnabled && workspace.financeEnabled,
        inventoryEnabled: ceilings.inventoryEnabled && workspace.inventoryEnabled,
        billableCatalogEnabled:
            ceilings.billableCatalogEnabled && workspace.billableCatalogEnabled,
        billableCatalogMode: ceilings.billableCatalogMode,
        manualBillingEnabled:
            ceilings.manualBillingEnabled && workspace.manualBillingEnabled,
        partialPaymentsEnabled:
            ceilings.partialPaymentsEnabled && workspace.partialPaymentsEnabled,
        packagesEnabled: ceilings.packagesEnabled && workspace.packagesEnabled,
        membershipsEnabled: ceilings.membershipsEnabled && workspace.membershipsEnabled,
        rentalsEnabled: ceilings.rentalsEnabled && workspace.rentalsEnabled,
        commissionsEnabled: ceilings.commissionsEnabled && workspace.commissionsEnabled,
        depositsEnabled: ceilings.depositsEnabled && workspace.depositsEnabled,
        penaltiesEnabled: ceilings.penaltiesEnabled && workspace.penaltiesEnabled,
        whatsappEnabled: ceilings.whatsappEligible && workspace.whatsappEnabled,
        whatsappEligible: ceilings.whatsappEligible
    };
}

export function resolveCapabilitySnapshot(planCode, workspaceCapabilities = {}, settings = {}) {
    const features = resolveCapabilitiesForPlan(planCode, workspaceCapabilities);

    return {
        features,
        policies: {
            documentMode:
                String(settings.document_mode ?? settings.documentMode ?? "comprobante_simple")
                    .trim()
                    .toLowerCase() || "comprobante_simple",
            taxesEnabled: normalizeBoolean(
                settings.taxes_enabled ?? settings.taxesEnabled,
                false
            ),
            noShowPolicy:
                String(settings.no_show_policy ?? settings.noShowPolicy ?? "informativo")
                    .trim()
                    .toLowerCase() || "informativo",
            lateCancellationPolicy:
                String(
                    settings.late_cancellation_policy ??
                        settings.lateCancellationPolicy ??
                        "informativa"
                )
                    .trim()
                    .toLowerCase() || "informativa",
            allowReceptionManualCharges: normalizeBoolean(
                settings.allow_reception_manual_charges ??
                    settings.allowReceptionManualCharges,
                true
            )
        }
    };
}

export { sanitizeWorkspaceCapabilitiesRow };

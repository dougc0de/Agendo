import { computed, ref, watch } from "vue";
import {
    DEFAULT_PRICING_PLAN_CODE,
    WHATSAPP_ADDON_CODE,
    buildPricingSelection,
    buildSignupQuery,
    canPlanUseAddon
} from "../shared/pricingCatalog.js";

export function usePricingSelection(
    initialPlanCode = DEFAULT_PRICING_PLAN_CODE,
    options = {}
) {
    const selectedPlanCode = ref(initialPlanCode);
    const addonEnabled = ref(Boolean(options.addonEnabled));
    const selectionSource = options.selectionSource ?? "pricing";

    watch(
        selectedPlanCode,
        (nextPlanCode) => {
            if (!canPlanUseAddon(nextPlanCode, WHATSAPP_ADDON_CODE)) {
                addonEnabled.value = false;
            }
        },
        { immediate: true }
    );

    const selection = computed(() =>
        buildPricingSelection(
            selectedPlanCode.value,
            addonEnabled.value,
            selectionSource
        )
    );

    const selectedPlan = computed(() => selection.value.plan);
    const selectedAddon = computed(() => selection.value.addon);
    const isAddonAvailable = computed(() => selection.value.isAddonAvailable);
    const estimatedTotalLabel = computed(() => selection.value.totalLabel);
    const signupQuery = computed(() => buildSignupQuery(selection.value));

    function selectPlan(planCode) {
        selectedPlanCode.value = planCode;
    }

    function setAddonEnabled(nextValue) {
        addonEnabled.value =
            Boolean(nextValue) &&
            canPlanUseAddon(selectedPlanCode.value, WHATSAPP_ADDON_CODE);
    }

    function toggleAddon() {
        setAddonEnabled(!addonEnabled.value);
    }

    return {
        addonEnabled,
        estimatedTotalLabel,
        isAddonAvailable,
        selectPlan,
        selectedAddon,
        selectedPlan,
        selectedPlanCode,
        selection,
        setAddonEnabled,
        signupQuery,
        toggleAddon
    };
}

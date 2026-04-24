export const DEFAULT_CURRENCY_CODE = "CRC";

export const LATAM_CURRENCY_OPTIONS = [
    { code: "USD", label: "USD · Dolar estadounidense" },
    { code: "MXN", label: "MXN · Peso mexicano" },
    { code: "GTQ", label: "GTQ · Quetzal guatemalteco" },
    { code: "HNL", label: "HNL · Lempira hondureno" },
    { code: "NIO", label: "NIO · Cordoba nicaraguense" },
    { code: "CRC", label: "CRC · Colon costarricense" },
    { code: "PAB", label: "PAB · Balboa panameno" },
    { code: "DOP", label: "DOP · Peso dominicano" },
    { code: "COP", label: "COP · Peso colombiano" },
    { code: "VES", label: "VES · Bolivar venezolano" },
    { code: "PEN", label: "PEN · Sol peruano" },
    { code: "BOB", label: "BOB · Boliviano" },
    { code: "CLP", label: "CLP · Peso chileno" },
    { code: "ARS", label: "ARS · Peso argentino" },
    { code: "PYG", label: "PYG · Guarani paraguayo" },
    { code: "UYU", label: "UYU · Peso uruguayo" },
    { code: "BRL", label: "BRL · Real brasileno" }
];

export const SUPPORTED_CURRENCY_CODES = LATAM_CURRENCY_OPTIONS.map(
    (currency) => currency.code
);

export function isSupportedCurrencyCode(currencyCode) {
    return SUPPORTED_CURRENCY_CODES.includes(String(currencyCode ?? "").toUpperCase());
}

export function normalizeSupportedCurrencyCode(
    currencyCode,
    fallback = DEFAULT_CURRENCY_CODE
) {
    const normalized = String(currencyCode ?? "").trim().toUpperCase();
    return isSupportedCurrencyCode(normalized) ? normalized : fallback;
}

export function getCurrencyLabel(currencyCode) {
    return (
        LATAM_CURRENCY_OPTIONS.find(
            (currency) => currency.code === String(currencyCode ?? "").toUpperCase()
        )?.label ?? String(currencyCode ?? "").toUpperCase()
    );
}

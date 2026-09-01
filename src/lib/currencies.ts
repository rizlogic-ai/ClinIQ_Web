export const CURRENCIES = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "PKR", label: "PKR — Pakistani Rupee" },
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "SAR", label: "SAR — Saudi Riyal" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "JPY", label: "JPY — Japanese Yen" },
  { code: "CNY", label: "CNY — Chinese Yuan" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
  { code: "ZAR", label: "ZAR — South African Rand" },
  { code: "NGN", label: "NGN — Nigerian Naira" },
  { code: "BDT", label: "BDT — Bangladeshi Taka" },
  { code: "TRY", label: "TRY — Turkish Lira" },
  { code: "CHF", label: "CHF — Swiss Franc" },
  { code: "SEK", label: "SEK — Swedish Krona" },
  { code: "NOK", label: "NOK — Norwegian Krone" },
  { code: "DKK", label: "DKK — Danish Krone" },
] as const;

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// Starting-point suggestions for per-doctor tiered pricing — always editable,
// never enforced. PKR gets a locally-sized preset; everything else falls
// back to the USD-ish global preset.
export function defaultTierPricing(currency: string): {
  tier1Price: number;
  tier2Price: number;
  tier3PlusPrice: number;
} {
  if (currency === "PKR") {
    return { tier1Price: 60000, tier2Price: 40000, tier3PlusPrice: 25000 };
  }
  return { tier1Price: 350, tier2Price: 250, tier3PlusPrice: 150 };
}

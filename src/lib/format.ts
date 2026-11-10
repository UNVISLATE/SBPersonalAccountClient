const CURRENCY_SYMBOLS: Record<string, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
  UAH: "₴",
  KZT: "₸",
  GBP: "£",
};

export function getCurrencySymbol(currency = "RUB"): string {
  const code = currency.toUpperCase();
  return CURRENCY_SYMBOLS[code] ?? code;
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency = "RUB",
  decimals?: number
): string {
  const num = Number(value ?? 0);
  const safe = Number.isFinite(num) ? num : 0;
  const symbol = getCurrencySymbol(currency);

  const frac =
    typeof decimals === "number"
      ? decimals
      : Number.isInteger(safe)
        ? 0
        : 2;

  const formatted = safe.toLocaleString("ru-RU", {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  });

  return `${formatted} ${symbol}`;
}

export function formatDate(
  iso: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU", options);
}

export function formatDateTime(iso: string | null | undefined): string {
  return formatDate(iso, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

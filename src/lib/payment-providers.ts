import type { PaymentProvider } from "@/api/types"

export interface GroupedProviders {
  sorted: PaymentProvider[]
  featured: PaymentProvider[]
  others: PaymentProvider[]
}

export function getProviderFeeInfo(provider: PaymentProvider | undefined): {
  hasFee: boolean
  percent: number
} {
  if (
    !provider ||
    !provider.fee_enabled ||
    !provider.add_fee_to_amount ||
    !provider.fee_percent ||
    Number(provider.fee_percent) <= 0
  ) {
    return { hasFee: false, percent: 0 }
  }
  return { hasFee: true, percent: Number(provider.fee_percent) }
}

/**
 * Sort recommended providers to the top and partition into featured vs collapsible others.
 * If at least one provider is marked `is_recommended`, all recommended ones stay featured
 * and non-recommended collapse into "Другие способы". Otherwise the first provider is featured.
 */
export function groupPaymentProviders(providers: PaymentProvider[]): GroupedProviders {
  const sorted = [...providers].sort((a, b) => {
    const recA = a.is_recommended ? 1 : 0
    const recB = b.is_recommended ? 1 : 0
    return recB - recA
  })

  if (sorted.length <= 1) {
    return { sorted, featured: sorted, others: [] }
  }

  const recommended = sorted.filter((p) => Boolean(p.is_recommended))
  if (recommended.length > 0) {
    return {
      sorted,
      featured: recommended,
      others: sorted.filter((p) => !p.is_recommended),
    }
  }

  return {
    sorted,
    featured: [sorted[0]],
    others: sorted.slice(1),
  }
}

const NICE_STEPS = [1, 2, 2.5, 5, 10] as const

export function roundToNiceAmount(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1
  if (raw < 0.5) {
    return Number(raw.toPrecision(1))
  }
  const exp = Math.floor(Math.log10(raw))
  const pow = Math.pow(10, exp)
  const mantissa = raw / pow
  let best: number = NICE_STEPS[0]
  let bestDist = Infinity
  for (const step of NICE_STEPS) {
    // Compare in log-space for balanced relative distances
    const dist = Math.abs(Math.log(mantissa / step))
    if (dist < bestDist) {
      bestDist = dist
      best = step
    }
  }
  const rounded = best * pow
  return rounded >= 10 ? Math.round(rounded) : Number(rounded.toFixed(2))
}

function nextNiceAmount(prev: number): number {
  const exp = Math.floor(Math.log10(Math.max(prev, 1)))
  const pow = Math.pow(10, exp)
  const m = prev / pow
  for (const step of NICE_STEPS) {
    if (step * pow > prev + 1e-6 && Math.abs(step - m) > 0.05) {
      const val = step * pow
      return val >= 10 ? Math.round(val) : Number(val.toFixed(2))
    }
  }
  return pow * 10
}

/**
 * Convert base-currency preset amounts into natural rounded presets for any currency
 * using its live FX rate to base currency (no per-currency hardcoding).
 */
export function buildTopUpPresets(basePresets: number[], rateToBase?: number): number[] {
  if (!rateToBase || !Number.isFinite(rateToBase) || rateToBase <= 0 || rateToBase === 1) {
    return basePresets
  }
  const result: number[] = []
  for (const base of basePresets) {
    let nice = Math.max(1, roundToNiceAmount(base / rateToBase))
    while (result.includes(nice)) {
      nice = nextNiceAmount(nice)
    }
    result.push(nice)
  }
  return result
}

export interface TopUpPreview {
  rateToBase: number
  isForeign: boolean
  baseCredit: number
  payTotal: number
  feePercent: number
}

export function calculateTopUpPreview(
  amount: number,
  currency: string,
  baseCurrency: string,
  provider?: PaymentProvider
): TopUpPreview {
  const curU = (currency || baseCurrency).toUpperCase()
  const baseU = baseCurrency.toUpperCase()
  const isForeign = curU !== baseU
  const rateToBase = isForeign ? Number(provider?.fx_rates?.[curU] || 0) : 1
  const markup = isForeign ? Number(provider?.fx_markup_percent || 0) : 0
  const fee = getProviderFeeInfo(provider)

  const rawBase = rateToBase > 0 ? amount * rateToBase : 0
  const baseCredit =
    isForeign && markup > 0 ? rawBase * (1 - markup / 100) : rawBase
  const payTotal = fee.hasFee ? amount * (1 + fee.percent / 100) : amount

  return {
    rateToBase,
    isForeign,
    baseCredit: Number(baseCredit.toFixed(2)),
    payTotal: Number(payTotal.toFixed(2)),
    feePercent: fee.percent,
  }
}

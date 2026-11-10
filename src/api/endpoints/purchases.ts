import { api } from "@/api/client"
import { resolveAssetUrl } from "@/config/env"
import type { PaymentProvider } from "@/api/types"

export interface CreateInvoiceBody {
  amount?: number
  provider: string
  target: "balance" | "service"
  currency?: string
  amount_in_payment_currency?: boolean
  service_id?: number
  custom_amount?: number
  tier_code?: string
  components?: Record<string, unknown>
  form?: Record<string, unknown>
  promocode?: string
  return_url?: string
}

export const getProviders = async (): Promise<PaymentProvider[]> => {
  const res = await api.get<PaymentProvider[]>("/user/purchases/providers")
  return (res || []).map((p) => ({
    ...p,
    icon_url: resolveAssetUrl(p.icon_url) ?? p.icon_url,
  }))
}

export const createInvoice = (body: CreateInvoiceBody) =>
  api.post<{ payment_url?: string | null; pay_url?: string | null; status?: string }>(
    "/user/purchases/create",
    body
  )

export const applyPromo = (code: string, service_id?: number) =>
  api.post<{ discount_amount?: number; new_price?: number; message?: string }>(
    "/user/purchases/promo",
    { code, service_id }
  )

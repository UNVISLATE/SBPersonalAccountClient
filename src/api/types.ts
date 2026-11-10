// ==========================================
// API DATA TYPES & INTERFACES
// ==========================================

export interface PageResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

export interface UserProfile {
  id: number
  login: string
  email: string | null
  role: string | null
  balance: number
  bonus_balance: number
  referral_bonus_earned?: number
  avatar_url: string | null
  created_at: string
  totp_enabled: boolean
  is_active: boolean
  ref_code?: string | null
  referred_by_login?: string | null
  referral_count?: number
}

export type ServiceStatus = "active" | "expired" | "suspended" | "pending"

export interface UserService {
  id: number
  service_id: number
  payment_id?: number | null
  name?: string
  service_name?: string
  status: ServiceStatus | string
  category?: string
  price?: number | string
  discount?: number | string
  currency?: string
  expires_at: string | null
  created_at: string
  delivered_at?: string | null
  auto_renew?: boolean
  cost?: number
  order_config?: Record<string, unknown>
  public_data?: Record<string, unknown>
  product_key?: string | null
  product_kind?: string | null
  actions?: unknown[]
  error?: string | null
  secret_key?: string
  instruction_md?: string | null
  config?: Record<string, unknown>
  credentials?: {
    login?: string
    password?: string
    host?: string
    port?: number
    config_url?: string
    details?: string
  }
}

export interface UserDigitalKey {
  id: number
  service_id: number
  service_name: string
  token: string
  key_value: string
  status: "issued" | "revoked" | "expired"
  created_at: string
  instruction_md?: string | null
}

export interface PaymentInvoice {
  id: number
  amount: number | string
  currency: string
  base_amount?: number | string | null
  base_currency?: string | null
  fx_rate?: number | string | null
  provider: string
  status: "pending" | "paid" | "failed" | "cancelled" | string
  target: "balance" | "service" | string
  user_svc_id?: number | null
  public_data?: Record<string, unknown>
  created_at: string
  paid_at?: string | null
  payment_url?: string | null
  pay_url?: string | null
  description?: string | null
}

export interface PaymentProvider {
  id?: number
  slug: string
  title?: string | null
  name?: string
  currency: string
  currencies?: string[]
  available_currencies?: string[]
  icon_url?: string | null
  is_recommended?: boolean
  fee_enabled?: boolean
  fee_percent?: number
  add_fee_to_amount?: boolean
  fx_rates?: Record<string, number>
  fx_markup_percent?: number
  min_amount?: number
  max_amount?: number
}

export interface AuthSession {
  session_id: string
  ip: string | null
  user_agent: string | null
  created_at: string
  last_seen_at: string
  expires_at?: string
  is_current: boolean
}

export interface StoreBranding {
  name: string
  shop_name?: string
  logo_url?: string | null
  favicon_url?: string | null
  mascot_url?: string | null
  mascot_not_found_url?: string | null
  catalog_banner_url?: string | null
  currency: string
  currencies?: string[]
  support_link?: string | null
  telegram_channel?: string | null
  telegram_chat?: string | null
  discord_link?: string | null
  description?: string | null
  theme?: Record<string, unknown>
  settings?: Record<string, unknown>
}

export interface CatalogCategory {
  id: number
  name: string
  slug: string
  parent_id: number | null
  description: string | null
  icon: string | null
  sort: number
  is_active: boolean
}

export interface ServiceAttachment {
  id: number
  media_id: number
  token: string
  kind: "image" | "video" | string
  tag?: string | null
  position: number
  mime?: string | null
  status: string
  url: string
}

export interface UserReferral {
  id: number
  login: string
  created_at: string
  avatar_url?: string | null
}

export interface CatalogService {
  id: number
  slug?: string
  name: string
  description?: string | null
  catalog_id?: number | null
  price: string
  currency: string
  price_type?: string
  pricing_config?: Record<string, unknown>
  delivery?: "key" | "auto" | "manual" | string
  out_of_stock?: boolean
  is_recommended?: boolean
  is_active?: boolean
  orders_count?: number
  attachments?: ServiceAttachment[]
  image_url?: string | null
  promo_quote?: { discount_amount?: number | string; new_price?: number | string } | null
}

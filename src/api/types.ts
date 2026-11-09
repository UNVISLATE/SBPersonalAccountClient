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
  avatar_url: string | null
  created_at: string
  totp_enabled: boolean
  is_active: boolean
}

export type ServiceStatus = "active" | "expired" | "suspended" | "pending"

export interface UserService {
  id: number
  service_id: number
  name: string
  status: ServiceStatus
  category?: string
  expires_at: string | null
  created_at: string
  auto_renew?: boolean
  cost?: number
  currency?: string
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
  amount: number
  currency: string
  provider: string
  status: "pending" | "paid" | "failed" | "cancelled"
  target: "balance" | "service"
  created_at: string
  paid_at?: string | null
  pay_url?: string | null
}

export interface PaymentProvider {
  id: number
  name: string
  currency: string
  currencies?: string[]
  icon_url?: string | null
  min_amount?: number
  max_amount?: number
}

export interface AuthSession {
  id: number
  ip: string
  user_agent: string
  device?: string
  browser?: string
  created_at: string
  last_activity_at: string
  is_current: boolean
}

export interface StoreBranding {
  shop_name: string
  logo_url?: string | null
  currency: string
  currencies: string[]
  support_link?: string | null
  description?: string | null
}

export interface CatalogService {
  id: number
  name: string
  description?: string
  category?: string
  image_url?: string | null
  pricing_model?: "fixed" | "subscription" | "custom" | "tiered"
  base_price?: number
  currency?: string
  is_active?: boolean
}

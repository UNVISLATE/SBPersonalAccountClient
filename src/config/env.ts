const DEFAULT_API_BASE_URL = "/api/v1"
const DEFAULT_MEDIA_BASE_URL = "/api/media"

function normalizeBaseUrl(raw: string | undefined, fallback: string): string {
  const trimmed = (raw ?? "").trim()
  if (!trimmed) return fallback
  // Strip trailing slashes so path concatenation is deterministic
  return trimmed.replace(/\/+$/, "") || fallback
}

function readEnvValue(key: "VITE_API_BASE_URL" | "VITE_MEDIA_BASE_URL" | "VITE_AUTH_BASE_URL"): string | undefined {
  const runtime = typeof window !== "undefined" ? window.__SB_CONFIG__?.[key] : undefined
  if (typeof runtime === "string" && runtime.trim()) {
    return runtime
  }
  return import.meta.env[key]
}

/**
 * Base URL for Billing API requests (e.g. `/api/v1`, `https://api.example.com/api/v1`, `/billing/api/v1`).
 * Configured at runtime via `window.__SB_CONFIG__` or at build time via `VITE_API_BASE_URL`.
 */
export const API_BASE_URL = normalizeBaseUrl(
  readEnvValue("VITE_API_BASE_URL"),
  DEFAULT_API_BASE_URL
)

/**
 * Base URL for Media Worker requests & asset serving (e.g. `/api/media`, `https://cdn.example.com/media`).
 * Configured at runtime via `window.__SB_CONFIG__` or at build time via `VITE_MEDIA_BASE_URL`.
 */
export const MEDIA_BASE_URL = normalizeBaseUrl(
  readEnvValue("VITE_MEDIA_BASE_URL"),
  DEFAULT_MEDIA_BASE_URL
)

/**
 * Optional explicit Auth base URL if deployed separately from `VITE_API_BASE_URL`.
 * Defaults to `${API_BASE_URL}/auth`.
 */
export const AUTH_BASE_URL = normalizeBaseUrl(
  readEnvValue("VITE_AUTH_BASE_URL"),
  `${API_BASE_URL}/auth`
)

/**
 * Build a full request URL for Billing API or Media Worker paths.
 */
export function buildApiUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint
  }

  if (endpoint === "/api/media" || endpoint.startsWith("/api/media/")) {
    const suffix = endpoint.slice("/api/media".length)
    return `${MEDIA_BASE_URL}${suffix}`
  }

  if (endpoint === "/api/v1" || endpoint.startsWith("/api/v1/")) {
    const suffix = endpoint.slice("/api/v1".length)
    return `${API_BASE_URL}${suffix}`
  }

  const normalizedPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  if (normalizedPath === "/auth" || normalizedPath.startsWith("/auth/")) {
    const authSuffix = normalizedPath.slice("/auth".length)
    return `${AUTH_BASE_URL}${authSuffix}`
  }

  return `${API_BASE_URL}${normalizedPath}`
}

/**
 * Build a direct Media Worker URL (for uploads / streams).
 */
export function buildMediaUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  const clean = path.startsWith("/api/media")
    ? path.slice("/api/media".length)
    : path
  const normalizedPath = clean.startsWith("/") ? clean : `/${clean}`
  return `${MEDIA_BASE_URL}${normalizedPath}`
}

/**
 * Rewrite relative backend `/api/media/...` or `/api/v1/...` asset URLs against configured env base URLs.
 * Keeps external URLs and local public static paths (`/unvi/...`, `/favicon.svg`) intact.
 */
export function resolveAssetUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  const trimmed = url.trim()
  if (!trimmed) return undefined
  if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) {
    return trimmed
  }
  if (trimmed.startsWith("/api/media/") || trimmed === "/api/media") {
    return buildMediaUrl(trimmed)
  }
  if (trimmed.startsWith("/api/v1/") || trimmed === "/api/v1") {
    return buildApiUrl(trimmed)
  }
  return trimmed
}

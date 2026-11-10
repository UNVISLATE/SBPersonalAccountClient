import { buildApiUrl } from "@/config/env"

// ==========================================
// HTTP API CLIENT (COOKIE AUTH + SINGLE-FLIGHT REFRESH)
// ==========================================

export const AUTH_UNAUTHORIZED_EVENT = "sb:auth:unauthorized"

const LEGACY_TOKEN_KEYS = ["sb_client_token", "sb_client_refresh_token"]

export function purgeLegacyAuthStorage(): void {
  try {
    for (const key of LEGACY_TOKEN_KEYS) {
      localStorage.removeItem(key)
    }
  } catch {
    // Ignore storage access errors
  }
}

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.name = "ApiError"
    this.status = status
    this.detail = detail
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>
  _retried?: boolean
  _skipUnauthorizedEvent?: boolean
}

function getCsrfToken(): string | null {
  try {
    const match = document.cookie.match(new RegExp("(^|;\\s*)csrftoken=([^;]+)"))
    return match ? decodeURIComponent(match[2]) : null
  } catch {
    return null
  }
}

// Single-flight refresh promise so concurrent 401s share one refresh rotation.
let refreshPromise: Promise<boolean> | null = null

export async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const headers: Record<string, string> = {
          Accept: "application/json",
        }
        const csrf = getCsrfToken()
        if (csrf) {
          headers["X-CSRFToken"] = csrf
        }
        const res = await fetch(buildApiUrl("/auth/refresh"), {
          method: "POST",
          credentials: "include",
          headers,
        })
        return res.ok
      } catch {
        return false
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const {
    params,
    _retried = false,
    _skipUnauthorizedEvent = false,
    ...fetchOptions
  } = options
  let url = buildApiUrl(endpoint)

  if (params) {
    const searchParams = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        searchParams.append(k, String(v))
      }
    }
    const qs = searchParams.toString()
    if (qs) {
      url += (url.includes("?") ? "&" : "?") + qs
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((fetchOptions.headers as Record<string, string>) || {}),
  }

  if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  const csrf = getCsrfToken()
  if (csrf && ["POST", "PUT", "PATCH", "DELETE"].includes(fetchOptions.method?.toUpperCase() || "")) {
    headers["X-CSRFToken"] = csrf
  }

  const res = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: "include",
  })

  if (res.status === 401 && !_retried) {
    const isAuthEndpoint =
      endpoint.includes("/auth/login") ||
      endpoint.includes("/auth/register") ||
      endpoint.includes("/auth/refresh") ||
      endpoint.includes("/auth/logout") ||
      endpoint.includes("/auth/claim-guest-account") ||
      endpoint.includes("/branding")

    if (!isAuthEndpoint) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        return request<T>(endpoint, { ...options, _retried: true })
      }
      if (!_skipUnauthorizedEvent) {
        window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT))
      }
    }
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const errJson = await res.json()
      detail = errJson.detail || errJson.message || detail
    } catch {
      // Body is not JSON
    }
    throw new ApiError(res.status, detail)
  }

  if (res.status === 204) {
    return {} as T
  }

  return (await res.json()) as T
}

export const api = {
  get: <T>(
    url: string,
    params?: Record<string, string | number | boolean | undefined | null>,
    options?: Pick<RequestOptions, "_skipUnauthorizedEvent">
  ) => request<T>(url, { method: "GET", params, ...options }),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
}

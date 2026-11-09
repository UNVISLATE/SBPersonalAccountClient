// ==========================================
// HTTP API CLIENT (FETCH-BASED)
// ==========================================

export const AUTH_UNAUTHORIZED_EVENT = "sb:auth:unauthorized"

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
}

function getCsrfToken(): string | null {
  const match = document.cookie.match(new RegExp("(^|;\\s*)csrftoken=([^;]+)"))
  return match ? decodeURIComponent(match[2]) : null
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  let url = endpoint.startsWith("/api") ? endpoint : `/api/v1${endpoint}`

  if (options.params) {
    const searchParams = new URLSearchParams()
    for (const [k, v] of Object.entries(options.params)) {
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
    ...((options.headers as Record<string, string>) || {}),
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  const csrf = getCsrfToken()
  if (csrf && ["POST", "PUT", "PATCH", "DELETE"].includes(options.method?.toUpperCase() || "")) {
    headers["X-CSRFToken"] = csrf
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  })

  if (res.status === 401) {
    // Only dispatch unauthorized event if not on auth endpoints
    if (!endpoint.includes("/auth/login") && !endpoint.includes("/auth/me")) {
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT))
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
  get: <T>(url: string, params?: Record<string, string | number | boolean | undefined | null>) =>
    request<T>(url, { method: "GET", params }),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
}

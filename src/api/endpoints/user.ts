import { api } from "@/api/client"
import { buildMediaUrl, resolveAssetUrl } from "@/config/env"
import type {
  UserProfile,
  AuthSession,
  UserService,
  PaymentInvoice,
  UserReferral,
  PageResponse,
} from "@/api/types"

export const getMe = () => api.get<UserProfile>("/user/me")

export const getSessions = () => api.get<AuthSession[]>("/user/me/sessions")

export const revokeSession = (sessionId: string | number) =>
  api.delete<void>(`/user/me/sessions/${sessionId}`)

export const get2faStatus = () =>
  api.get<{ enabled: boolean; required: boolean; recovery_codes_left: number }>("/user/me/2fa")

export const setup2fa = () =>
  api.post<{ secret: string; otpauth_url: string }>("/user/me/2fa/setup")

export const enable2fa = (code: string) =>
  api.post<{ recovery_codes: string[] }>("/user/me/2fa/enable", { code })

export const disable2fa = (password: string) =>
  api.post<void>("/user/me/2fa/disable", { password })

export const changeNickname = (login: string) => api.patch<UserProfile>("/user/me", { login })

export const changeEmail = (email: string) => api.patch<UserProfile>("/user/me", { email })

export const changePassword = (current_password: string, new_password: string) =>
  api.post<void>("/user/me/password", { current_password, new_password })

export const uploadAvatar = async (file: File): Promise<void> => {
  const tokenRes = await api.post<{ upload_token: string; upload_url: string }>(
    buildMediaUrl("/upload?tag=avatar")
  )
  const rawUploadUrl = tokenRes.upload_url || `/api/media/upload/${tokenRes.upload_token}`
  const uploadUrl = buildMediaUrl(rawUploadUrl)
  const upRes = await fetch(uploadUrl, {
    method: "POST",
    body: file,
    credentials: "include",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
  })
  if (!upRes.ok) throw new Error(`Upload error: ${upRes.statusText}`)
  const uploaded = (await upRes.json()) as { token?: string }

  if (uploaded?.token) {
    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) {
      const st = await api.get<{ state: string; error?: string }>(
        `/media/status/${uploaded.token}`
      )
      if (st.state === "ready") break
      if (st.state === "error" || st.state === "failed") {
        throw new Error(st.error || "Ошибка обработки аватара")
      }
      await new Promise((r) => setTimeout(r, 600))
    }
  } else {
    await new Promise((r) => setTimeout(r, 1000))
  }

  const mediaList = await api.get<{ items: Array<{ id: number; token: string }> }>(
    "/user/media?limit=10"
  )
  const match = uploaded?.token
    ? mediaList.items?.find((m) => m.token === uploaded.token)
    : mediaList.items?.[0]
  if (!match) throw new Error("Аватар не найден после загрузки")
  await api.put("/user/me/avatar", { media_id: match.id })
}

export const getReferrals = async (): Promise<UserReferral[]> => {
  const res = await api.get<UserReferral[] | { items: UserReferral[] }>("/user/me/referrals")
  const list = Array.isArray(res) ? res : res?.items || []
  return list.map((ref) => ({
    ...ref,
    avatar_url: resolveAssetUrl(ref.avatar_url) ?? ref.avatar_url,
  }))
}

export const getServices = (
  paramsOrLimit: number | { limit?: number; offset?: number; q?: string } = 50
) => {
  const params =
    typeof paramsOrLimit === "number" ? { limit: paramsOrLimit } : paramsOrLimit
  return api.get<PageResponse<UserService>>("/user/services", params)
}

export const getInvoices = (
  paramsOrLimit: number | { limit?: number; offset?: number } = 50
) => {
  const params =
    typeof paramsOrLimit === "number" ? { limit: paramsOrLimit } : paramsOrLimit
  return api.get<PageResponse<PaymentInvoice>>("/user/purchases", params)
}

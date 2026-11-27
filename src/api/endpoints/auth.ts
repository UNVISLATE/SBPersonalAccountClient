import { api } from "@/api/client"

export async function login(login: string, password: string, totp?: string): Promise<void> {
  await api.post("/auth/login", { login, password, totp })
}

export async function register(
  login: string,
  email: string,
  password: string,
  ref_code?: string
): Promise<void> {
  await api.post("/auth/register", { login, email, password, ref_code })
}

export async function requestGuestClaim(
  email: string
): Promise<{ claim_token: string; ttl_seconds: number }> {
  return await api.post<{ claim_token: string; ttl_seconds: number }>(
    "/auth/claim-guest-account/request",
    { email }
  )
}

export async function verifyGuestClaim(
  claim_token: string,
  code: string,
  password: string
): Promise<void> {
  await api.post("/auth/claim-guest-account/verify", {
    claim_token,
    code,
    password,
  })
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post("/auth/password/reset/request", { email })
}

export async function confirmPasswordReset(
  email: string,
  code: string,
  new_password: string
): Promise<void> {
  await api.post("/auth/password/reset/confirm", {
    email,
    code,
    new_password,
  })
}

export async function claimGuest(claim_code: string, password: string): Promise<void> {
  await verifyGuestClaim(claim_code, "", password)
}

export async function confirmOAuth2fa(
  challenge_token: string,
  code: string
): Promise<void> {
  await api.post("/callback/oauth/2fa/confirm", { challenge_token, code })
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout")
  } catch {
    // ignore network errors on logout
  }
}

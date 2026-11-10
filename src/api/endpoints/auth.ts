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

export async function claimGuest(claim_code: string, password: string): Promise<void> {
  await api.post("/auth/claim-guest-account/verify", { claim_code, password })
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout")
  } catch {
    // ignore network errors on logout
  }
}

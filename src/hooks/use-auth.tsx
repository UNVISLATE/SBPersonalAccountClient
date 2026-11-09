import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api, AUTH_UNAUTHORIZED_EVENT } from "@/api/client"
import type { UserProfile } from "@/api/types"

interface AuthContextValue {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (login: string, password: string, totp?: string) => Promise<void>
  register: (login: string, email: string, password: string) => Promise<void>
  claimGuestAccount: (code: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()

  const {
    data: user = null,
    isLoading,
    refetch,
  } = useQuery<UserProfile | null>({
    queryKey: ["client-me"],
    queryFn: async () => {
      try {
        return await api.get<UserProfile>("/user/me")
      } catch (err: any) {
        if (err.status === 401 || err.status === 403) return null
        throw err
      }
    },
    retry: false,
    staleTime: 60_000,
  })

  useEffect(() => {
    const onUnauthorized = () => {
      qc.setQueryData(["client-me"], null)
      if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/claim")) {
        const from = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?from=${from}`
      }
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized)
  }, [qc])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      async login(login: string, password: string, totp?: string) {
        await api.post("/auth/login", { login, password, totp })
        const profile = await api.get<UserProfile>("/user/me")
        qc.setQueryData(["client-me"], profile)
      },
      async register(login: string, email: string, password: string) {
        await api.post("/auth/register", { login, email, password })
        const profile = await api.get<UserProfile>("/user/me")
        qc.setQueryData(["client-me"], profile)
      },
      async claimGuestAccount(claim_code: string, password: string) {
        await api.post("/auth/claim-guest-account/verify", { claim_code, password })
        const profile = await api.get<UserProfile>("/user/me")
        qc.setQueryData(["client-me"], profile)
      },
      async logout() {
        try {
          await api.post("/auth/logout")
        } catch {
          // Ignore network errors on logout
        }
        qc.clear()
        window.location.href = "/login"
      },
      refreshUser: () => void refetch(),
    }),
    [user, isLoading, qc, refetch],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}

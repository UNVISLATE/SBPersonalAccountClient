import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  api,
  ApiError,
  AUTH_UNAUTHORIZED_EVENT,
  purgeLegacyAuthStorage,
} from "@/api/client"
import { resolveAssetUrl } from "@/config/env"
import type { UserProfile } from "@/api/types"

interface AuthContextValue {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (login: string, password: string, totp?: string) => Promise<UserProfile | null>
  register: (login: string, email: string, password: string) => Promise<UserProfile | null>
  claimGuestAccount: (code: string, password: string) => Promise<UserProfile | null>
  logout: () => Promise<void>
  refreshUser: () => Promise<UserProfile | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function normalizeUserProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    avatar_url: resolveAssetUrl(profile.avatar_url) ?? profile.avatar_url,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const wasAuthenticatedRef = useRef(false)

  useEffect(() => {
    purgeLegacyAuthStorage()
  }, [])

  const {
    data: user = null,
    isLoading,
    refetch,
  } = useQuery<UserProfile | null>({
    queryKey: ["client-me"],
    queryFn: async () => {
      try {
        const profile = await api.get<UserProfile>("/user/me", undefined, {
          _skipUnauthorizedEvent: !wasAuthenticatedRef.current,
        })
        wasAuthenticatedRef.current = true
        return normalizeUserProfile(profile)
      } catch (err: unknown) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          wasAuthenticatedRef.current = false
          return null
        }
        throw err
      }
    },
    retry: false,
    staleTime: 10_000,
  })

  useEffect(() => {
    wasAuthenticatedRef.current = Boolean(user)
  }, [user])

  useEffect(() => {
    // Capture ?ref= from URL and persist referral attribution cleanly
    try {
      const params = new URLSearchParams(window.location.search)
      const refCode = params.get("ref")
      if (refCode && refCode.trim()) {
        localStorage.setItem("sb_ref_code", refCode.trim().toUpperCase())
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, [])

  useEffect(() => {
    const onUnauthorized = () => {
      const hadSession = wasAuthenticatedRef.current
      wasAuthenticatedRef.current = false
      qc.setQueryData(["client-me"], null)
      if (
        hadSession &&
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/register") &&
        !window.location.pathname.startsWith("/claim")
      ) {
        const from = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?from=${from}`
      }
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized)
  }, [qc])

  const refreshUser = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const raw = await api.get<UserProfile>("/user/me", undefined, {
        _skipUnauthorizedEvent: true,
      })
      const profile = normalizeUserProfile(raw)
      wasAuthenticatedRef.current = true
      qc.setQueryData(["client-me"], profile)
      return profile
    } catch {
      const res = await refetch()
      return res.data ?? null
    }
  }, [qc, refetch])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      async login(login: string, password: string, totp?: string) {
        await api.post("/auth/login", { login, password, totp })
        return await refreshUser()
      },
      async register(login: string, email: string, password: string) {
        let ref_code: string | undefined
        try {
          ref_code = localStorage.getItem("sb_ref_code") || undefined
        } catch {
          ref_code = undefined
        }
        await api.post("/auth/register", {
          login,
          email,
          password,
          ref_code,
        })
        return await refreshUser()
      },
      async claimGuestAccount(claim_code: string, password: string) {
        await api.post("/auth/claim-guest-account/verify", { claim_code, password })
        return await refreshUser()
      },
      async logout() {
        try {
          await api.post("/auth/logout")
        } catch {
          // Ignore network errors on logout
        }
        wasAuthenticatedRef.current = false
        qc.setQueryData(["client-me"], null)
        qc.clear()
        window.location.href = "/login"
      },
      refreshUser,
    }),
    [user, isLoading, qc, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}

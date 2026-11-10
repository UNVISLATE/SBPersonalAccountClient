import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { resolveAssetUrl } from "@/config/env"

export interface StoreBranding {
  name: string
  logo_url: string | null
  favicon_url: string | null
  mascot_url: string | null
  mascot_not_found_url: string | null
  catalog_banner_url: string | null
  theme?: Record<string, unknown>
  settings?: Record<string, unknown>
  currency: string
  version?: string
  support_link?: string
  telegram_channel?: string
  telegram_chat?: string
  discord_link?: string
}

export const DEFAULT_BRANDING: StoreBranding = {
  name: "SaviorBill",
  logo_url: "/unvi/logo_1x1_128.webp",
  favicon_url: "/favicon.svg",
  mascot_url: "/unvi/mascot/HelloMascotUNVI.webp",
  mascot_not_found_url: "/unvi/mascot/NotFoundMascotUNVI.webp",
  catalog_banner_url: null,
  currency: "RUB",
  support_link: "https://t.me/support",
}

function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace("#", "").trim()
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16)
    const g = parseInt(cleanHex[1] + cleanHex[1], 16)
    const b = parseInt(cleanHex[2] + cleanHex[2], 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16)
    const g = parseInt(cleanHex.substring(2, 4), 16)
    const b = parseInt(cleanHex.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return hex
}

interface BrandingApiResponse {
  name?: string
  shop_name?: string
  logo_url?: string | null
  favicon_url?: string | null
  mascot_url?: string | null
  mascot_not_found_url?: string | null
  catalog_banner_url?: string | null
  theme?: Record<string, unknown>
  settings?: Record<string, unknown>
  currency?: string
  version?: string
}

export function useBranding() {
  const { data, isLoading } = useQuery<StoreBranding>({
    queryKey: ["store-branding"],
    queryFn: async () => {
      try {
        const res = await api.get<BrandingApiResponse>("/branding/client")
        const s = res.settings || {}

        return {
          name: res.name || res.shop_name || DEFAULT_BRANDING.name,
          logo_url: resolveAssetUrl(res.logo_url) || DEFAULT_BRANDING.logo_url,
          favicon_url: resolveAssetUrl(res.favicon_url) || DEFAULT_BRANDING.favicon_url,
          mascot_url: resolveAssetUrl(res.mascot_url) || DEFAULT_BRANDING.mascot_url,
          mascot_not_found_url:
            resolveAssetUrl(res.mascot_not_found_url) || DEFAULT_BRANDING.mascot_not_found_url,
          catalog_banner_url: resolveAssetUrl(res.catalog_banner_url) || null,
          theme: res.theme || {},
          settings: s,
          currency: res.currency || DEFAULT_BRANDING.currency,
          version: res.version,
          support_link:
            (typeof s.support_link === "string" && s.support_link.trim()) ||
            DEFAULT_BRANDING.support_link,
          telegram_channel:
            typeof s.telegram_channel === "string" && s.telegram_channel.trim()
              ? s.telegram_channel.trim()
              : undefined,
          telegram_chat:
            typeof s.telegram_chat === "string" && s.telegram_chat.trim()
              ? s.telegram_chat.trim()
              : undefined,
          discord_link:
            typeof s.discord_link === "string" && s.discord_link.trim()
              ? s.discord_link.trim()
              : undefined,
        }
      } catch {
        return DEFAULT_BRANDING
      }
    },
    staleTime: 60_000,
  })

  const branding = data || DEFAULT_BRANDING

  useEffect(() => {
    if (branding.name) {
      document.title = `${branding.name} — Личный кабинет`
    }

    if (branding.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
      if (!link) {
        link = document.createElement("link")
        link.rel = "icon"
        document.head.appendChild(link)
      }
      link.href = branding.favicon_url
    }

    if (branding.theme && typeof branding.theme === "object") {
      const root = document.documentElement
      const theme = branding.theme as Record<string, string>

      const primary = theme.primary || theme.accent || theme.primaryColor
      if (primary && typeof primary === "string") {
        root.style.setProperty("--color-accent", primary)
        root.style.setProperty("--primary", primary)
        root.style.setProperty("--color-accent-subtle", hexToRgba(primary, 0.14))
        root.style.setProperty("--color-accent-glow", hexToRgba(primary, 0.36))

        const hoverColor = theme.accentHover || theme.primaryDark
        if (hoverColor && typeof hoverColor === "string") {
          root.style.setProperty("--color-accent-hover", hoverColor)
          root.style.setProperty("--primary-hover", hoverColor)
        } else {
          root.style.setProperty("--color-accent-hover", primary)
        }

        if (theme.primaryDark && typeof theme.primaryDark === "string") {
          root.style.setProperty("--color-accent-deep", theme.primaryDark)
        }
      }

      if (theme.background && typeof theme.background === "string") {
        root.style.setProperty("--color-bg", theme.background)
      }

      if (theme.surface && typeof theme.surface === "string") {
        root.style.setProperty("--color-card", hexToRgba(theme.surface, 0.88))
        root.style.setProperty("--color-card-hover", hexToRgba(theme.surface, 0.96))
      }
    }
  }, [branding])

  return {
    branding,
    data: branding,
    isLoading,
  }
}

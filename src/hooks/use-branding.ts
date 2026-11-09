import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"

export interface StoreBranding {
  name: string
  logo_url: string | null
  favicon_url: string | null
  theme?: Record<string, unknown>
  settings?: Record<string, unknown>
  currency: string
  version?: string
  support_link?: string
}

const DEFAULT_BRANDING: StoreBranding = {
  name: "SaviorBill",
  logo_url: null,
  favicon_url: null,
  currency: "RUB",
  support_link: "https://t.me/support",
}

export function useBranding() {
  const { data, isLoading } = useQuery<StoreBranding>({
    queryKey: ["store-branding"],
    queryFn: async () => {
      try {
        const res = await api.get<{
          name?: string
          shop_name?: string
          logo_url?: string | null
          favicon_url?: string | null
          theme?: Record<string, unknown>
          settings?: Record<string, unknown>
          currency?: string
          version?: string
        }>("/branding/client")

        const name = res.name || res.shop_name || DEFAULT_BRANDING.name
        const currency = res.currency || DEFAULT_BRANDING.currency
        const logo_url = res.logo_url || null
        const favicon_url = res.favicon_url || null

        return {
          name,
          logo_url,
          favicon_url,
          theme: res.theme || {},
          settings: res.settings || {},
          currency,
          version: res.version,
          support_link: (res.settings?.support_link as string) || DEFAULT_BRANDING.support_link,
        }
      } catch {
        return DEFAULT_BRANDING
      }
    },
    staleTime: 60_000,
  })

  const branding = data || DEFAULT_BRANDING

  // Dynamically update document title and favicon
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
  }, [branding])

  return {
    branding,
    data: branding,
    isLoading,
  }
}

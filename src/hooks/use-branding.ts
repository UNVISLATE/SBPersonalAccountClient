import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { StoreBranding } from "@/api/types"

const DEFAULT_BRANDING: StoreBranding = {
  shop_name: "Личный кабинет",
  logo_url: null,
  currency: "RUB",
  currencies: ["RUB", "USD", "EUR", "USDT"],
  support_link: "https://t.me/support",
  description: "Управление вашими услугами, ключами и подписками",
}

export function useBranding() {
  const { data, isLoading } = useQuery<StoreBranding>({
    queryKey: ["store-branding"],
    queryFn: async () => {
      try {
        return await api.get<StoreBranding>("/branding/client")
      } catch {
        return DEFAULT_BRANDING
      }
    },
    staleTime: 300_000,
  })

  const brandingObj = data || DEFAULT_BRANDING

  return {
    branding: brandingObj,
    data: brandingObj,
    isLoading,
  }
}

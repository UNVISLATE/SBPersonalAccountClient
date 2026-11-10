import React, { createContext, useContext, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Header } from "./Header/Header"
import { TopUpModal } from "@/components/modals/TopUpModal"
import { PromoModal } from "@/components/modals/PromoModal"
import { PageTransition } from "@/components/motion/PageTransition"
import { useAuth } from "@/hooks/use-auth"
import { useBranding } from "@/hooks/use-branding"
import { useSmoothScroll } from "@/hooks/use-smooth-scroll"
import styles from "./AppLayout.module.scss"

interface ClientLayoutContextType {
  openTopUp: () => void
  openPromo: () => void
}

const ClientLayoutContext = createContext<ClientLayoutContextType>({
  openTopUp: () => {},
  openPromo: () => {},
})

export const useClientLayout = () => useContext(ClientLayoutContext)

export const AppLayout: React.FC = () => {
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [promoOpen, setPromoOpen] = useState(false)
  const { refreshUser } = useAuth()
  const { branding } = useBranding()
  const location = useLocation()
  useSmoothScroll()

  const handleRefresh = () => {
    refreshUser()
  }

  return (
    <ClientLayoutContext.Provider
      value={{
        openTopUp: () => setTopUpOpen(true),
        openPromo: () => setPromoOpen(true),
      }}
    >
      <div className={styles.layout}>
        <Header
          onOpenTopUp={() => setTopUpOpen(true)}
          onOpenPromo={() => setPromoOpen(true)}
        />

        <main className={styles.main}>
          <PageTransition
            routeKey={
              location.pathname.startsWith("/profile")
                ? "/profile"
                : location.pathname
            }
          >
            <Outlet />
          </PageTransition>
        </main>

        <footer className={styles.footerWrap}>
          <div className={styles.footerCard}>
            <div className={styles.footerBrand}>
              <span className={styles.footerDot} aria-hidden="true" />
              <div className={styles.copyright}>
                © {new Date().getFullYear()} {branding.name}. Все права защищены.
              </div>
            </div>
            <div className={styles.footerLinks}>
              {branding.telegram_channel && (
                <a
                  href={branding.telegram_channel}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.supportLink}
                >
                  Telegram канал
                </a>
              )}
              {branding.telegram_chat && (
                <a
                  href={branding.telegram_chat}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.supportLink}
                >
                  Чат
                </a>
              )}
              {branding.discord_link && (
                <a
                  href={branding.discord_link}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.supportLink}
                >
                  Discord
                </a>
              )}
              {branding.support_link && (
                <a
                  href={branding.support_link}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.supportLink}
                >
                  Поддержка
                </a>
              )}
            </div>
          </div>
        </footer>

        <TopUpModal
          isOpen={topUpOpen}
          onClose={() => setTopUpOpen(false)}
          onSuccess={handleRefresh}
        />

        <PromoModal
          isOpen={promoOpen}
          onClose={() => setPromoOpen(false)}
          onSuccess={handleRefresh}
        />
      </div>
    </ClientLayoutContext.Provider>
  )
}

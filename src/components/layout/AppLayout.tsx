import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { TopUpModal } from "@/components/finance/TopUpModal";
import { PromoModal } from "@/components/promo/PromoModal";
import { useBranding } from "@/hooks/use-branding";
import styles from "./AppLayout.module.scss";

export interface ClientLayoutContext {
  openTopUp: () => void;
  openPromo: () => void;
}

export const AppLayout: React.FC = () => {
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const { branding } = useBranding();

  const contextValue: ClientLayoutContext = {
    openTopUp: () => setTopUpOpen(true),
    openPromo: () => setPromoOpen(true),
  };

  return (
    <div className={styles.layout}>
      <Header
        onOpenTopUp={() => setTopUpOpen(true)}
        onOpenPromo={() => setPromoOpen(true)}
      />

      <main className={styles.content}>
        <Outlet context={contextValue} />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>
            © {new Date().getFullYear()} {branding.name}. Все права защищены.
          </span>
          {branding.support_link && (
            <a
              href={branding.support_link}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.supportLink}
            >
              Служба поддержки
            </a>
          )}
        </div>
      </footer>

      <TopUpModal isOpen={topUpOpen} onClose={() => setTopUpOpen(false)} />
      <PromoModal isOpen={promoOpen} onClose={() => setPromoOpen(false)} />
    </div>
  );
};

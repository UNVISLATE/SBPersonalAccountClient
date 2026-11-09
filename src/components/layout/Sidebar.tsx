import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Server,
  KeyRound,
  Wallet,
  ShoppingBag,
  ShieldCheck,
  Headphones,
  Sparkles,
} from "lucide-react";
import { useBranding } from "@/hooks/use-branding";
import styles from "./Sidebar.module.scss";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { data: branding } = useBranding();

  const navItems = [
    { to: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
    { to: "/services", label: "Мои услуги", icon: Server },
    { to: "/keys", label: "Ключи и лицензии", icon: KeyRound },
    { to: "/finance", label: "Финансы", icon: Wallet },
    { to: "/catalog", label: "Каталог услуг", icon: ShoppingBag },
    { to: "/profile", label: "Безопасность", icon: ShieldCheck },
  ];

  return (
    <>
      {isOpen && <div className={styles.backdrop} onClick={onClose} />}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
        <div className={styles.brand}>
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt="Logo" className={styles.logoImg} />
          ) : (
            <div className={styles.logoMark}>
              <Sparkles size={20} />
            </div>
          )}
          <div className={styles.brandInfo}>
            <span className={styles.name}>{branding?.shop_name || "Личный кабинет"}</span>
            <span className={styles.subtitle}>Client Portal</span>
          </div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSectionTitle}>Основное</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ""}`
                }
                onClick={onClose}
              >
                <Icon className={styles.navIcon} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className={styles.footer}>
          {branding?.support_link && (
            <a
              href={branding.support_link}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.supportBtn}
            >
              <Headphones size={16} />
              <span>Служба поддержки</span>
            </a>
          )}
        </div>
      </aside>
    </>
  );
};

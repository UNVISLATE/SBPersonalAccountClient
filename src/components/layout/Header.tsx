import React from "react";
import { Link, NavLink } from "react-router-dom";
import { Plus, Ticket, LogOut, Sparkles, ShoppingBag, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import styles from "./Header.module.scss";

interface HeaderProps {
  onOpenTopUp: () => void;
  onOpenPromo: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenTopUp, onOpenPromo }) => {
  const { user, logout } = useAuth();
  const { branding } = useBranding();

  const currency = branding?.currency || "₽";

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link to="/profile" className={styles.brand}>
          {branding.logo_url ? (
            <img src={branding.logo_url} alt={branding.name} className={styles.logoImg} />
          ) : (
            <div className={styles.logoMark}>
              <Sparkles size={20} />
            </div>
          )}
          <span className={styles.brandName}>{branding.name}</span>
        </Link>

        <nav className={styles.navLinks}>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ""}`
            }
          >
            <User size={16} />
            <span>Профиль</span>
          </NavLink>
          <NavLink
            to="/catalog"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ""}`
            }
          >
            <ShoppingBag size={16} />
            <span>Каталог</span>
          </NavLink>
        </nav>
      </div>

      <div className={styles.right}>
        <button className={styles.promoBtn} onClick={onOpenPromo}>
          <Ticket size={15} />
          <span>Промокод</span>
        </button>

        <div className={styles.balancePill}>
          <span className={styles.amount}>
            {(user?.balance ?? 0).toLocaleString("ru-RU", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {currency}
          </span>
          <button className={styles.topupBtn} onClick={onOpenTopUp}>
            <Plus size={13} strokeWidth={3} />
            <span>Пополнить</span>
          </button>
        </div>

        <div className={styles.userPill}>
          <div className={styles.avatar}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.login} />
            ) : (
              <span>{user?.login ? user.login[0].toUpperCase() : "U"}</span>
            )}
          </div>
          <span className={styles.login}>{user?.login}</span>
          <button
            className={styles.logoutBtn}
            onClick={() => logout()}
            title="Выйти из аккаунта"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};

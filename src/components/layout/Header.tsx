import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Plus, Ticket, LogOut, ShoppingBag, User, Gift } from "lucide-react";
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
  const [logoFailed, setLogoFailed] = useState(false);

  const currency = branding?.currency || "₽";
  const mainBalance = Number(user?.balance ?? 0);
  const bonusBalance = Number(user?.bonus_balance ?? 0);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link to="/profile" className={styles.brand}>
          <img
            src={!logoFailed && branding.logo_url ? branding.logo_url : "/logo.svg"}
            alt={branding.name}
            className={styles.logoImg}
            onError={() => setLogoFailed(true)}
          />
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
            {mainBalance.toLocaleString("ru-RU", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {currency}
          </span>

          {bonusBalance > 0 && (
            <span className={styles.bonusChip} title="Бонусный баланс">
              <Gift size={12} />
              +{bonusBalance.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
            </span>
          )}

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

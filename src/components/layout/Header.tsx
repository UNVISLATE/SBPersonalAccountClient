import React from "react";
import { Menu, LogOut, Plus, User, Gift } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import styles from "./Header.module.scss";

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenTopUp: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onOpenTopUp }) => {
  const { user, logout } = useAuth();
  const { data: branding } = useBranding();

  const currency = branding?.currency || "₽";

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          className={styles.menuBtn}
          onClick={onToggleSidebar}
          aria-label="Открыть меню"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className={styles.right}>
        <div className={styles.balanceGroup}>
          <div className={styles.balancePill}>
            <span>Баланс:</span>
            <span className={styles.amount}>
              {(user?.balance ?? 0).toLocaleString("ru-RU", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {currency}
            </span>
            <button className={styles.topupBtn} onClick={onOpenTopUp}>
              <Plus size={12} strokeWidth={3} />
              <span>Пополнить</span>
            </button>
          </div>

          {(user?.bonus_balance ?? 0) > 0 && (
            <div className={styles.bonusPill} title="Бонусный баланс">
              <Gift size={13} />
              <span>Бонусы:</span>
              <span className={styles.bonusAmount}>
                {(user?.bonus_balance ?? 0).toLocaleString("ru-RU", {
                  minimumFractionDigits: 2,
                })}{" "}
                {currency}
              </span>
            </div>
          )}
        </div>

        <div className={styles.userMenu}>
          <div className={styles.avatar}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.login} />
            ) : (
              <User size={18} />
            )}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.login}>{user?.login || "Пользователь"}</span>
            <span className={styles.role}>{user?.role || "Клиент"}</span>
          </div>
          <button
            className={styles.logoutBtn}
            onClick={() => logout()}
            title="Выйти из аккаунта"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

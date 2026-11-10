import React from "react";
import { CapsuleTabs, MaskText } from "@/components/motion";
import { Button } from "@/components/ui/Button/Button";
import { Plus, Tag, User, Key, ShoppingBag, Users } from "lucide-react";
import styles from "./ProfileHeader.module.scss";

export type ProfileTabId = "profile" | "services" | "purchases" | "referral";

export interface ProfileHeaderProps {
  login: string;
  activeTab: ProfileTabId;
  onTabChange: (tab: ProfileTabId) => void;
  servicesCount: number;
  purchasesCount: number;
  referralsCount?: number;
  onOpenTopUp: () => void;
  onOpenPromo: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  login,
  activeTab,
  onTabChange,
  servicesCount,
  purchasesCount,
  referralsCount,
  onOpenTopUp,
  onOpenPromo,
}) => {
  const tabs = [
    { id: "profile", label: "Мой профиль", icon: <User size={15} /> },
    {
      id: "services",
      label: "Услуги и ключи",
      icon: <Key size={15} />,
      badge: servicesCount > 0 ? servicesCount : undefined,
    },
    {
      id: "purchases",
      label: "Покупки",
      icon: <ShoppingBag size={15} />,
      badge: purchasesCount > 0 ? purchasesCount : undefined,
    },
    {
      id: "referral",
      label: "Рефералы",
      icon: <Users size={15} />,
      badge: referralsCount && referralsCount > 0 ? referralsCount : undefined,
    },
  ];

  return (
    <div className={styles.header}>
      <div className={styles.topRow}>
        <div className={styles.titleBlock}>
          <span className={styles.eyebrow}>Личный кабинет</span>
          <h1 className={styles.title}>
            <MaskText direction="up" duration={600}>
              Добро пожаловать, @{login}!
            </MaskText>
          </h1>
        </div>

        <div className={styles.actions}>
          <Button
            variant="outline"
            size="md"
            icon={<Tag size={15} />}
            onClick={onOpenPromo}
          >
            Промокод
          </Button>
          <Button
            variant="gradient"
            size="md"
            icon={<Plus size={16} />}
            onClick={onOpenTopUp}
          >
            Пополнить баланс
          </Button>
        </div>
      </div>

      <CapsuleTabs
        items={tabs}
        activeId={activeTab}
        onChange={(id) => onTabChange(id as ProfileTabId)}
        layoutId="profile-tabs-pill"
      />
    </div>
  );
};

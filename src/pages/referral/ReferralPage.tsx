import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { MaskText, Reveal, Skeleton } from "@/components/motion";
import { ReferralTab } from "@/components/profile/ReferralTab";
import { Gift, Users, Sparkles } from "lucide-react";
import styles from "./ReferralPage.module.scss";

export const ReferralPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Skeleton height={80} rounded="lg" />
          <Skeleton height={220} rounded="xl" />
        </div>
      </div>
    );
  }

  const bonusBalance = Number(user.bonus_balance ?? 0);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Reveal variant="fade-up" eager>
          <header className={styles.header}>
            <span className={styles.eyebrow}>
              <Sparkles size={13} />
              <span>Партнёрская программа</span>
            </span>
            <h1 className={styles.title}>
              <MaskText direction="up" duration={600}>
                РЕФЕРАЛЬНАЯ ПРОГРАММА
              </MaskText>
            </h1>
            <p className={styles.subtitle}>
              Приглашайте друзей по персональной ссылке и получайте бонусы на баланс с каждой их покупки
            </p>
          </header>
        </Reveal>

        <Reveal variant="fade-up" delay={70} eager>
          <div className={styles.metricsRow}>
            <div className={styles.metricCard}>
              <div className={styles.metricIcon}>
                <Users size={18} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>Приглашено друзей</span>
                <span className={styles.metricVal}>{user.referral_count ?? 0}</span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricIcon}>
                <Gift size={18} />
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricLabel}>Бонусный баланс</span>
                <span className={styles.metricVal}>+{bonusBalance.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal variant="fade-up" delay={130} eager>
          <ReferralTab user={user} />
        </Reveal>
      </div>
    </div>
  );
};

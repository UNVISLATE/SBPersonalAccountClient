import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getReferrals } from "@/api/endpoints/user";
import type { UserProfile } from "@/api/types";
import { useCopy } from "@/hooks/use-copy";
import { formatDate } from "@/lib/format";
import { Skeleton } from "@/components/motion";
import { Copy, Check, Users, Link2 } from "lucide-react";
import styles from "./ReferralTab.module.scss";

export interface ReferralTabProps {
  user: UserProfile;
}

export const ReferralTab: React.FC<ReferralTabProps> = ({ user }) => {
  const { copy, copiedKey } = useCopy();
  const refCode = user.ref_code || "";
  const refLink = refCode
    ? `${window.location.origin}/register?ref=${refCode}`
    : `${window.location.origin}/register`;

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["user-referrals"],
    queryFn: async () => {
      try {
        return await getReferrals();
      } catch {
        return [];
      }
    },
  });

  return (
    <div className={styles.wrapper}>
      <section className={styles.sectionCard}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>ПАРТНЁРСКАЯ ССЫЛКА</h2>
          <p className={styles.sectionSubtitle}>
            Приглашайте друзей по ссылке или коду и получайте бонусы за их заказы
          </p>
        </div>

        <div className={styles.shareGrid}>
          <div className={styles.shareBox}>
            <span className={styles.shareLabel}>Реферальная ссылка</span>
            <div className={styles.copyRow}>
              <span className={styles.copyText}>
                <Link2 size={14} className={styles.rowIcon} />
                <span className={styles.truncate}>{refLink}</span>
              </span>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => copy(refLink, "tab-ref-link")}
              >
                {copiedKey === "tab-ref-link" ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedKey === "tab-ref-link" ? "Готово" : "Копировать"}</span>
              </button>
            </div>
          </div>

          {refCode && (
            <div className={styles.shareBox}>
              <span className={styles.shareLabel}>Ваш промо-код</span>
              <div className={styles.copyRow}>
                <code className={styles.monoCode}>{refCode}</code>
                <button
                  type="button"
                  className={styles.copyBtn}
                  onClick={() => copy(refCode, "tab-ref-code")}
                >
                  {copiedKey === "tab-ref-code" ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey === "tab-ref-code" ? "Готово" : "Копировать"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>ПРИГЛАШЁННЫЕ ПОЛЬЗОВАТЕЛИ</h2>
          <p className={styles.sectionSubtitle}>
            Список зарегистрированных пользователей по вашему приглашению
          </p>
        </div>

        {isLoading ? (
          <div className={styles.loadingList}>
            <Skeleton height={54} rounded="md" />
            <Skeleton height={54} rounded="md" />
          </div>
        ) : referrals.length === 0 ? (
          <div className={styles.emptyBlock}>
            <div className={styles.emptyIconWrap}>
              <Users size={24} />
            </div>
            <h3 className={styles.emptyTitle}>Пока нет приглашённых друзей</h3>
            <p className={styles.emptySubtitle}>
              Отправьте реферальную ссылку — все регистрации отобразятся в этом списке
            </p>
          </div>
        ) : (
          <div className={styles.list}>
            {referrals.map((r) => (
              <div key={r.id} className={styles.refRow}>
                <div className={styles.refAvatar}>
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt={r.login} className={styles.refAvatarImg} />
                  ) : (
                    <span>{r.login.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <span className={styles.refLogin}>@{r.login}</span>
                <span className={styles.refDate}>{formatDate(r.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

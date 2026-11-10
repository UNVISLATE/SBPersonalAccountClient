import React, { useRef, useState } from "react";
import { uploadAvatar } from "@/api/endpoints/user";
import { ApiError } from "@/api/client";
import type { UserProfile } from "@/api/types";
import { useCopy } from "@/hooks/use-copy";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge/Badge";
import { toast } from "sonner";
import { Camera, Copy, Check, Sparkles, Wallet } from "lucide-react";
import clsx from "clsx";
import styles from "./BentoStats.module.scss";

export interface BentoStatsProps {
  user: UserProfile;
  currency: string;
  purchasesCount: number;
  activeServicesCount: number;
  onAvatarUpdated: () => Promise<unknown>;
  onOpenTopUp: () => void;
}

export const BentoStats: React.FC<BentoStatsProps> = ({
  user,
  currency,
  purchasesCount,
  activeServicesCount,
  onAvatarUpdated,
  onOpenTopUp,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { copy, copiedKey } = useCopy();

  const balance = Number(user.balance ?? 0);
  const bonusBalance = Number(user.bonus_balance ?? 0);
  const referralBonusEarned = Number(user.referral_bonus_earned ?? 0);
  const referralCount = user.referral_count ?? 0;

  const handleAvatarFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Выберите изображение (PNG, JPG, WEBP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Максимальный размер файла — 10 МБ");
      return;
    }

    const toastId = toast.loading("Загрузка аватара...");
    try {
      setUploading(true);
      await uploadAvatar(file);
      await onAvatarUpdated();
      toast.success("Аватар обновлен!", { id: toastId });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.detail
          : err instanceof Error
            ? err.message
            : "Ошибка загрузки аватара";
      toast.error(msg, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleAvatarFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={styles.grid}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={(e) => {
          if (e.target.files?.[0]) handleAvatarFile(e.target.files[0]);
          e.target.value = "";
        }}
      />

      {/* Col 1: Identity + Balance */}
      <div className={styles.identityCard}>
        <div className={styles.identityTop}>
          <button
            type="button"
            className={clsx(styles.avatarBtn, dragging && styles.avatarDragging)}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            disabled={uploading}
            title="Нажмите или перетащите фото для смены аватара"
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.login} className={styles.avatarImg} />
            ) : (
              <span className={styles.avatarInitials}>
                {user.login?.slice(0, 2).toUpperCase() || "U"}
              </span>
            )}
            <span className={styles.avatarEditBadge} aria-hidden="true">
              <Camera size={13} />
            </span>
          </button>

          <div className={styles.userMeta}>
            <div className={styles.loginRow}>
              <span className={styles.loginText}>@{user.login}</span>
              {user.role && user.role !== "user" && (
                <Badge variant="accent" size="sm">
                  {user.role}
                </Badge>
              )}
            </div>
            <span className={styles.memberSince}>
              С нами с {formatDate(user.created_at)}
            </span>
          </div>
        </div>

        <div className={styles.balanceFooter}>
          <div className={styles.balanceBlock}>
            <span className={styles.balanceLabel}>
              <Wallet size={13} />
              <span>Текущий баланс</span>
            </span>
            <div className={styles.balanceValRow}>
              <span className={styles.balanceValue}>
                {formatCurrency(balance, currency)}
              </span>
              {bonusBalance > 0 && (
                <span className={styles.bonusInlineTag} title="Бонусный баланс">
                  <Sparkles size={12} />
                  +{formatCurrency(bonusBalance, currency)} бон.
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            className={styles.topUpInlineBtn}
            onClick={onOpenTopUp}
          >
            Пополнить
          </button>
        </div>
      </div>

      {/* Col 2: Static Metrics Stack (strictly NO hover effects) */}
      <div className={styles.metricsCard}>
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>Всего покупок</span>
          <span className={styles.metricValue}>{purchasesCount}</span>
        </div>
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>Активных услуг</span>
          <span className={styles.metricValue}>{activeServicesCount}</span>
        </div>
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>Приглашено друзей</span>
          <span className={styles.metricValue}>{referralCount}</span>
        </div>
      </div>

      {/* Col 3: Referral Code & Earned Bonuses */}
      <div className={styles.bonusCard}>
        <div className={styles.bonusHeader}>
          <div className={styles.bonusTitleRow}>
            <Sparkles size={15} className={styles.bonusIcon} />
            <span className={styles.bonusTitle}>Реферальный код</span>
          </div>
          <Badge variant={referralBonusEarned > 0 ? "accent" : "muted"} size="sm" dot={referralBonusEarned > 0}>
            Заработано {referralBonusEarned.toFixed(0)} бонусов
          </Badge>
        </div>

        <div className={styles.bonusBody}>
          <p className={styles.bonusHint}>
            Делитесь кодом с друзьями и получайте бонусы с каждой их покупки
          </p>
        </div>

        <div className={styles.refCodeRow}>
          <code className={styles.refCode}>{user.ref_code || "—"}</code>
          {user.ref_code && (
            <button
              type="button"
              className={styles.copyCodeBtn}
              onClick={() => copy(user.ref_code!, "ref-code")}
              title="Скопировать реферальный код"
            >
              {copiedKey === "ref-code" ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedKey === "ref-code" ? "Готово" : "Копировать"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

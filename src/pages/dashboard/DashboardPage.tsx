import React from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  Server,
  KeyRound,
  Gift,
  ArrowRight,
  Plus,
  ShoppingBag,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";
import { api } from "@/api/client";
import { UserDigitalKey, UserService, PageResponse } from "@/api/types";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { useCopy } from "@/hooks/use-copy";
import { Button } from "@/components/ui/Button/Button";
import { Badge } from "@/components/ui/Badge/Badge";
import styles from "./DashboardPage.module.scss";

interface LayoutContext {
  openTopUp: () => void;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { data: branding } = useBranding();
  const { openTopUp } = useOutletContext<LayoutContext>();
  const { copy, copiedKey } = useCopy();

  const currency = branding?.currency || "₽";

  // Query User Services
  const { data: servicesData } = useQuery({
    queryKey: ["user-services-summary"],
    queryFn: async () => {
      try {
        return await api.get<PageResponse<UserService>>("/user/services", { limit: 5 });
      } catch {
        return { items: [], total: 0, limit: 5, offset: 0, has_more: false };
      }
    },
  });

  // Query User Digital Keys
  const { data: keysData } = useQuery({
    queryKey: ["user-keys-summary"],
    queryFn: async () => {
      try {
        return await api.get<PageResponse<UserDigitalKey>>("/user/purchases", { limit: 5 });
      } catch {
        return { items: [], total: 0, limit: 5, offset: 0, has_more: false };
      }
    },
  });

  const services = servicesData?.items || [];
  const totalServices = servicesData?.total || 0;
  const keys = keysData?.items || [];
  const totalKeys = keysData?.total || 0;

  return (
    <div className={styles.container}>
      {/* Welcome Banner */}
      <div className={styles.banner}>
        <div className={styles.bannerInfo}>
          <h1 className={styles.welcomeTitle}>
            Здравствуйте, <span>{user?.login}</span>!
          </h1>
          <p className={styles.welcomeSub}>
            Добро пожаловать в личный кабинет. Здесь вы можете мгновенно продлевать сервисы,
            просматривать лицензионные ключи и управлять балансом.
          </p>
        </div>
        <div className={styles.bannerActions}>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={16} />}
            onClick={openTopUp}
          >
            Пополнить баланс
          </Button>
          <Link to="/catalog">
            <Button variant="outline" size="md" leftIcon={<ShoppingBag size={16} />}>
              Каталог услуг
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.accent}`}>
            <Wallet size={22} />
          </div>
          <div className={styles.statDetails}>
            <span className={styles.statLabel}>Основной баланс</span>
            <span className={styles.statValue}>
              {(user?.balance ?? 0).toLocaleString("ru-RU", {
                minimumFractionDigits: 2,
              })}{" "}
              {currency}
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.warning}`}>
            <Gift size={22} />
          </div>
          <div className={styles.statDetails}>
            <span className={styles.statLabel}>Бонусный счет</span>
            <span className={styles.statValue}>
              {(user?.bonus_balance ?? 0).toLocaleString("ru-RU", {
                minimumFractionDigits: 2,
              })}{" "}
              {currency}
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.info}`}>
            <Server size={22} />
          </div>
          <div className={styles.statDetails}>
            <span className={styles.statLabel}>Активные услуги</span>
            <span className={styles.statValue}>{totalServices}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.purple}`}>
            <KeyRound size={22} />
          </div>
          <div className={styles.statDetails}>
            <span className={styles.statLabel}>Ключи и лицензии</span>
            <span className={styles.statValue}>{totalKeys}</span>
          </div>
        </div>
      </div>

      {/* Recent Keys Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <KeyRound size={20} color="var(--color-accent)" />
            Последние приобретенные ключи
          </h2>
          <Link to="/keys" className={styles.viewAll}>
            Все ключи ({totalKeys})
            <ChevronRight size={16} />
          </Link>
        </div>

        {keys.length > 0 ? (
          <div className={styles.keysList}>
            {keys.map((k) => (
              <div key={k.id} className={styles.keyRow}>
                <div className={styles.keyInfo}>
                  <Badge variant="accent">Лицензия</Badge>
                  <span className={styles.keyService}>{k.service_name || "Товар"}</span>
                </div>
                <div className={styles.keyBox}>
                  <span className={styles.keyMasked}>
                    {k.key_value
                      ? `${k.key_value.slice(0, 4)}••••••••${k.key_value.slice(-4)}`
                      : "••••-••••-••••"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copy(k.key_value, String(k.id))}
                    title="Скопировать ключ"
                  >
                    {copiedKey === String(k.id) ? (
                      <Check size={14} color="var(--color-accent)" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <KeyRound size={36} opacity={0.4} />
            <p>У вас пока нет активных цифровых ключей</p>
            <Link to="/catalog">
              <Button size="sm" variant="outline">
                Перейти в каталог
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Active Services Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Server size={20} color="var(--color-accent)" />
            Мои подключенные услуги
          </h2>
          <Link to="/services" className={styles.viewAll}>
            Все услуги ({totalServices})
            <ChevronRight size={16} />
          </Link>
        </div>

        {services.length > 0 ? (
          <div className={styles.keysList}>
            {services.map((svc) => (
              <div key={svc.id} className={styles.keyRow}>
                <div className={styles.keyInfo}>
                  <Badge
                    variant={svc.status === "active" ? "success" : "warning"}
                    pulse={svc.status === "active"}
                  >
                    {svc.status === "active" ? "Активна" : svc.status}
                  </Badge>
                  <span className={styles.keyService}>{svc.name}</span>
                </div>
                <div>
                  <Link to={`/services/${svc.id}`}>
                    <Button size="sm" variant="outline" rightIcon={<ArrowRight size={14} />}>
                      Управление
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Server size={36} opacity={0.4} />
            <p>Нет подключенных услуг</p>
            <Link to="/catalog">
              <Button size="sm" variant="outline">
                Заказать услугу
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

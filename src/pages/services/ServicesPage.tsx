import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Server, ArrowRight, RefreshCw, ShoppingBag } from "lucide-react";
import { api } from "@/api/client";
import { UserService, PageResponse } from "@/api/types";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import styles from "./ServicesPage.module.scss";

export const ServicesPage: React.FC = () => {
  const [filter, setFilter] = useState<"all" | "active" | "expired">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["user-services", filter],
    queryFn: async () => {
      try {
        return await api.get<PageResponse<UserService>>("/user/services", { limit: 50 });
      } catch {
        return { items: [], total: 0, limit: 50, offset: 0, has_more: false };
      }
    },
  });

  const services = (data?.items || []).filter((s) => {
    if (filter === "active") return s.status === "active";
    if (filter === "expired") return s.status === "expired";
    return true;
  });

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return { text: "Бессрочно", isSoon: false, isExpired: false };
    const date = new Date(expiresAt);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { text: "Срок истек", isSoon: false, isExpired: true };
    if (diffDays <= 3) return { text: `Осталось ${diffDays} дн.`, isSoon: true, isExpired: false };
    return {
      text: date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }),
      isSoon: false,
      isExpired: false,
    };
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Мои подключенные услуги</h1>
          <p className={styles.sub}>
            Управление активными конфигурациями, доступ к серверам и продление
          </p>
        </div>
        <Link to="/catalog">
          <Button variant="primary" size="md" leftIcon={<ShoppingBag size={16} />}>
            Заказать услугу
          </Button>
        </Link>
      </div>

      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${filter === "all" ? styles.active : ""}`}
          onClick={() => setFilter("all")}
        >
          Все ({data?.total || 0})
        </button>
        <button
          className={`${styles.filterBtn} ${filter === "active" ? styles.active : ""}`}
          onClick={() => setFilter("active")}
        >
          Активные
        </button>
        <button
          className={`${styles.filterBtn} ${filter === "expired" ? styles.active : ""}`}
          onClick={() => setFilter("expired")}
        >
          Истекшие
        </button>
      </div>

      {isLoading ? (
        <div className={styles.empty}>
          <p>Загрузка услуг...</p>
        </div>
      ) : services.length > 0 ? (
        <div className={styles.grid}>
          {services.map((svc) => {
            const expiry = formatExpiry(svc.expires_at);
            return (
              <div key={svc.id} className={styles.serviceCard}>
                <div className={styles.cardTop}>
                  <div>
                    <h3 className={styles.serviceName}>{svc.name}</h3>
                    <span className={styles.serviceCategory}>
                      {svc.category || "Сервис / Подписка"}
                    </span>
                  </div>
                  <Badge
                    variant={
                      svc.status === "active"
                        ? "success"
                        : svc.status === "expired"
                        ? "danger"
                        : "warning"
                    }
                    pulse={svc.status === "active"}
                  >
                    {svc.status === "active" ? "Активна" : svc.status}
                  </Badge>
                </div>

                <div className={styles.expiryInfo}>
                  <span className={styles.expiryLabel}>Срок действия:</span>
                  <span
                    className={`${styles.expiryVal} ${
                      expiry.isSoon ? styles.soon : expiry.isExpired ? styles.expired : ""
                    }`}
                  >
                    {expiry.text}
                  </span>
                </div>

                <div className={styles.cardActions}>
                  <Link to={`/services/${svc.id}`} style={{ flex: 1 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      style={{ width: "100%" }}
                      rightIcon={<ArrowRight size={14} />}
                    >
                      Подключение
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Продлить услугу"
                    leftIcon={<RefreshCw size={14} />}
                  >
                    Продлить
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <Server size={44} opacity={0.3} />
          <p>У вас пока нет подключенных услуг в этой категории</p>
          <Link to="/catalog">
            <Button variant="outline" size="sm">
              Перейти в каталог
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

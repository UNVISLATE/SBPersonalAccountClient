import React, { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Zap, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { CatalogService, PageResponse } from "@/api/types";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import styles from "./OrderCatalogPage.module.scss";

interface LayoutContext {
  openTopUp: () => void;
}

export const OrderCatalogPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { data: branding } = useBranding();
  const { openTopUp } = useOutletContext<LayoutContext>();
  const navigate = useNavigate();

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedService, setSelectedService] = useState<CatalogService | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);

  const currency = branding?.currency || "₽";

  const { data, isLoading } = useQuery({
    queryKey: ["catalog-services"],
    queryFn: async () => {
      try {
        return await api.get<PageResponse<CatalogService>>("/catalog", { limit: 50 });
      } catch {
        return {
          items: [],
          total: 0,
          limit: 50,
          offset: 0,
          has_more: false,
        };
      }
    },
  });

  const allItems = data?.items || [];
  const categories = ["all", ...Array.from(new Set(allItems.map((s) => s.category).filter(Boolean)))];

  const filteredItems = allItems.filter((s) => {
    if (categoryFilter === "all") return true;
    return s.category === categoryFilter;
  });

  const handleOrderClick = (svc: CatalogService) => {
    const cost = svc.base_price || 0;
    if ((user?.balance ?? 0) < cost) {
      toast.info(`Недостаточно средств. Пополните баланс на ${(cost - (user?.balance ?? 0)).toLocaleString()} ${currency}`);
      openTopUp();
      return;
    }
    setSelectedService(svc);
  };

  const handleConfirmOrder = async () => {
    if (!selectedService) return;

    try {
      setIsOrdering(true);
      await api.post("/user/services/create", {
        service_id: selectedService.id,
      });

      toast.success(`Услуга "${selectedService.name}" успешно подключена!`);
      await refreshUser();
      setSelectedService(null);
      navigate("/services");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Не удалось оформить заказ";
      toast.error(msg);
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Каталог доступных услуг</h1>
          <p className={styles.sub}>
            Мгновенная выдача и активация услуг сразу после оплаты с баланса
          </p>
        </div>
      </div>

      {categories.length > 1 && (
        <div className={styles.filters}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`${styles.filterBtn} ${categoryFilter === cat ? styles.active : ""}`}
              onClick={() => setCategoryFilter(cat!)}
            >
              {cat === "all" ? "Все категории" : cat}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className={styles.empty}>
          <p>Загрузка каталога...</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className={styles.grid}>
          {filteredItems.map((svc) => (
            <div key={svc.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.iconBox}>
                  {svc.image_url ? (
                    <img src={svc.image_url} alt={svc.name} />
                  ) : (
                    <Sparkles size={20} />
                  )}
                </div>
                <div className={styles.titles}>
                  <h3 className={styles.name}>{svc.name}</h3>
                  <span className={styles.category}>{svc.category || "Сервис"}</span>
                </div>
              </div>

              <p className={styles.desc}>
                {svc.description || "Мгновенная выдача после подключения"}
              </p>

              <div className={styles.pricingRow}>
                <span className={styles.priceLabel}>Стоимость</span>
                <span className={styles.priceVal}>
                  {(svc.base_price ?? 0).toLocaleString("ru-RU")} {currency}
                  {svc.pricing_model === "subscription" ? " / мес." : ""}
                </span>
              </div>

              <Button
                variant="primary"
                size="md"
                leftIcon={<Zap size={16} />}
                onClick={() => handleOrderClick(svc)}
              >
                Подключить
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <ShoppingBag size={44} opacity={0.3} />
          <p>В выбранной категории нет услуг</p>
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedService && (
        <Modal
          isOpen={!!selectedService}
          onClose={() => setSelectedService(null)}
          title="Подтверждение подключения"
          size="sm"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setSelectedService(null)}
                disabled={isOrdering}
              >
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmOrder}
                isLoading={isOrdering}
                leftIcon={<Check size={16} />}
              >
                Оплатить {(selectedService.base_price ?? 0).toLocaleString()} {currency}
              </Button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
              Вы собираетесь подключить услугу{" "}
              <strong style={{ color: "var(--color-text)" }}>
                {selectedService.name}
              </strong>
              .
            </p>
            <div
              style={{
                background: "rgba(0, 255, 200, 0.05)",
                border: "1px solid rgba(0, 255, 200, 0.2)",
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text-dim)" }}>
                Списание с баланса:
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  color: "var(--color-accent)",
                }}
              >
                {(selectedService.base_price ?? 0).toLocaleString()} {currency}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

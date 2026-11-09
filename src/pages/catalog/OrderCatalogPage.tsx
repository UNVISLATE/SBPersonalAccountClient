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
import { Badge } from "@/components/ui/Badge/Badge";
import { Modal } from "@/components/ui/Modal/Modal";
import { ClientLayoutContext } from "@/components/layout/AppLayout";
import styles from "./OrderCatalogPage.module.scss";

export const OrderCatalogPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { branding } = useBranding();
  const { openTopUp } = useOutletContext<ClientLayoutContext>();
  const navigate = useNavigate();

  const [selectedService, setSelectedService] = useState<CatalogService | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);

  const currency = branding?.currency || "₽";

  // Query real catalog services from /catalog/services
  const { data, isLoading } = useQuery({
    queryKey: ["catalog-services"],
    queryFn: async () => {
      try {
        return await api.get<PageResponse<CatalogService>>("/catalog/services", { limit: 50 });
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

  const services = (data?.items || []).filter((s) => s.is_active);

  const handleOrderClick = (svc: CatalogService) => {
    const cost = parseFloat(svc.price) || 0;
    const balance = Number(user?.balance ?? 0);

    if (balance < cost) {
      toast.info(`Недостаточно средств. Пополните баланс на ${(cost - balance).toLocaleString()} ${currency}`);
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

      toast.success(`Услуга "${selectedService.name}" успешно оформлена!`);
      await refreshUser();
      setSelectedService(null);
      navigate("/profile");
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

      {isLoading ? (
        <div className={styles.empty}>
          <p>Загрузка каталога...</p>
        </div>
      ) : services.length > 0 ? (
        <div className={styles.grid}>
          {services.map((svc) => (
            <div key={svc.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.iconBox}>
                  <Sparkles size={20} />
                </div>
                <div className={styles.titles}>
                  <h3 className={styles.name}>{svc.name}</h3>
                  <span className={styles.category}>
                    {svc.delivery === "key" ? "Лицензионный ключ" : "Услуга"}
                  </span>
                </div>
                {svc.out_of_stock && (
                  <Badge variant="warning">Нет в наличии</Badge>
                )}
              </div>

              {svc.description && (
                <p className={styles.desc}>{svc.description}</p>
              )}

              <div className={styles.pricingRow}>
                <span className={styles.priceLabel}>Стоимость</span>
                <span className={styles.priceVal}>
                  {parseFloat(svc.price).toLocaleString("ru-RU")} {svc.currency || currency}
                </span>
              </div>

              <Button
                variant="primary"
                size="md"
                leftIcon={<Zap size={16} />}
                disabled={svc.out_of_stock}
                onClick={() => handleOrderClick(svc)}
              >
                {svc.out_of_stock ? "Распродано" : "Подключить"}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <ShoppingBag size={44} opacity={0.3} />
          <p>В каталоге пока нет доступных товаров</p>
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
                Оплатить {parseFloat(selectedService.price).toLocaleString()} {currency}
              </Button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
              Списать с баланса и подключить:{" "}
              <strong style={{ color: "var(--color-text)" }}>
                {selectedService.name}
              </strong>
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
                Стоимость:
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  color: "var(--color-accent)",
                }}
              >
                {parseFloat(selectedService.price).toLocaleString()} {currency}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

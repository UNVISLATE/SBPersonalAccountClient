import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Wallet, ArrowRight, AlertCircle } from "lucide-react";
import { api } from "@/api/client";
import { PaymentProvider } from "@/api/types";
import { useBranding } from "@/hooks/use-branding";
import { Modal } from "@/components/ui/Modal/Modal";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import styles from "./TopUpModal.module.scss";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESETS = [300, 500, 1000, 2500, 5000];

export const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, onClose }) => {
  const { branding } = useBranding();
  const [amount, setAmount] = useState<string>("500");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch real payment providers from backend
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["payment-providers"],
    queryFn: async () => {
      try {
        return await api.get<PaymentProvider[]>("/user/purchases/providers");
      } catch {
        return [];
      }
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (providers.length > 0 && !selectedProvider) {
      setSelectedProvider(providers[0].name);
    }
  }, [providers, selectedProvider]);

  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      toast.error("Укажите сумму пополнения");
      return;
    }

    if (!selectedProvider) {
      toast.error("Выберите способ оплаты");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post<{ payment_url?: string; pay_url?: string; id?: number }>(
        "/user/purchases/create",
        {
          amount: numAmount,
          provider: selectedProvider,
          target: "balance",
        }
      );

      const url = res.payment_url || res.pay_url;
      if (url) {
        toast.success("Перенаправление на страницу оплаты...");
        window.location.href = url;
      } else {
        toast.success("Счет на оплату сформирован");
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Не удалось сформировать счет";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currency = branding?.currency || "₽";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Пополнение баланса"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={providers.length === 0}
            rightIcon={<ArrowRight size={16} />}
          >
            Оплатить {numAmount > 0 ? `${numAmount.toLocaleString()} ${currency}` : ""}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <label className={styles.label}>Сумма пополнения ({currency})</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            min="1"
            step="any"
            leftIcon={<Wallet size={18} />}
          />
          <div className={styles.presets}>
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p}
                className={`${styles.presetBtn} ${numAmount === p ? styles.active : ""}`}
                onClick={() => setAmount(String(p))}
              >
                +{p} {currency}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Способ оплаты</label>
          {isLoading ? (
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-dim)" }}>
              Загрузка доступных провайдеров...
            </p>
          ) : providers.length > 0 ? (
            <div className={styles.providersList}>
              {providers.map((p) => {
                const isSelected = selectedProvider === p.name;
                return (
                  <div
                    key={p.id || p.name}
                    className={`${styles.providerCard} ${isSelected ? styles.selected : ""}`}
                    onClick={() => setSelectedProvider(p.name)}
                  >
                    <div className={styles.icon}>
                      {p.icon_url ? (
                        <img src={p.icon_url} alt={p.name} />
                      ) : (
                        <CreditCard size={18} />
                      )}
                    </div>
                    <div className={styles.info}>
                      <span className={styles.name}>{p.name}</span>
                      <span className={styles.limits}>
                        {p.currency} {p.min_amount ? `• от ${p.min_amount}` : ""}
                      </span>
                    </div>
                    <div className={styles.radioDot} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-warning)",
                fontSize: "0.8125rem",
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>
                Платежные методы временно не настроены администратором. Используйте промокод или обратитесь в службу поддержки.
              </span>
            </div>
          )}
        </div>

        <div className={styles.summary}>
          <span className={styles.summaryLabel}>Итого к зачислению:</span>
          <span className={styles.summaryValue}>
            {numAmount.toLocaleString()} {currency}
          </span>
        </div>
      </form>
    </Modal>
  );
};

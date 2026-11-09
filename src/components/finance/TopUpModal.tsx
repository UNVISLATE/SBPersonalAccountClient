import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Wallet, ArrowRight } from "lucide-react";
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
  const { data: branding } = useBranding();
  const [amount, setAmount] = useState<string>("500");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: providers = [] } = useQuery({
    queryKey: ["payment-providers"],
    queryFn: async () => {
      try {
        return await api.get<PaymentProvider[]>("/user/purchases/providers");
      } catch {
        return [
          { id: 1, name: "Банковские карты (РФ)", currency: "RUB" },
          { id: 2, name: "СБП (Система быстрых платежей)", currency: "RUB" },
          { id: 3, name: "Криптовалюта (USDT / TON)", currency: "USDT" },
        ] as PaymentProvider[];
      }
    },
    enabled: isOpen,
  });

  // Auto-select first provider when loaded
  React.useEffect(() => {
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

    try {
      setIsSubmitting(true);
      const res = await api.post<{ pay_url?: string; payment_id?: number }>("/user/purchases/create", {
        amount: numAmount,
        provider: selectedProvider,
        target: "balance",
      });

      if (res.pay_url) {
        toast.success("Перенаправление на страницу оплаты...");
        window.location.href = res.pay_url;
      } else {
        toast.success("Счет на оплату сформирован");
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Не удалось создать счет на оплату";
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

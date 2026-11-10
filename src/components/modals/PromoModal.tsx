import React, { useState } from "react";
import { api, ApiError } from "@/api/client";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { toast } from "sonner";
import { Tag, Sparkles } from "lucide-react";
import styles from "./PromoModal.module.scss";

export interface PromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PromoModal: React.FC<PromoModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      toast.error("Введите промокод");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post<{
        status?: string;
        message?: string;
        bonus_amount?: number;
      }>("/promocodes/redeem", { code: cleanCode });

      toast.success(res.message || "Промокод успешно активирован!");
      setCode("");
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.detail
          : err instanceof Error
            ? err.message
            : "Неверный или просроченный промокод";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="АКТИВАЦИЯ ПРОМОКОДА"
      subtitle="Введите купон или подарочный код для начисления бонусов"
      maxWidth={420}
      variant="sheet"
    >
      <form onSubmit={handleRedeem} className={styles.form}>
        <Input
          label="Промокод"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="PROMO-XXXX-XXXX"
          leftIcon={<Tag size={17} />}
          autoFocus
        />

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          loading={submitting}
          disabled={!code.trim()}
          className={styles.submitBtn}
          icon={<Sparkles size={17} />}
        >
          Активировать
        </Button>
      </form>
    </Modal>
  );
};

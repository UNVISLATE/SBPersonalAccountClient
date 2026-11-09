import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Ticket, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { useAuth } from "@/hooks/use-auth";
import { Modal } from "@/components/ui/Modal/Modal";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import styles from "./PromoModal.module.scss";

interface PromoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PromoModal: React.FC<PromoModalProps> = ({ isOpen, onClose }) => {
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Введите промокод");
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post<{
        kind: string;
        message: string;
        bonus_added?: number;
      }>("/promocodes/redeem", { code: code.trim() });

      if (res.bonus_added) {
        toast.success(`Промокод активирован! Начислено: +${res.bonus_added} ₽ бонус`);
      } else {
        toast.success(res.message || "Промокод успешно активирован!");
      }

      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["user-services"] });
      queryClient.invalidateQueries({ queryKey: ["user-billing"] });
      setCode("");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Не удалось активировать промокод";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Активация промокода"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Отмена
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
            rightIcon={<ArrowRight size={16} />}
          >
            Применить
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <p className={styles.hint}>
          Введите промокод для начисления бонусов или активации услуги.
        </p>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="PROMO-XXXX-XXXX"
          leftIcon={<Ticket size={18} />}
          autoFocus
        />
      </form>
    </Modal>
  );
};

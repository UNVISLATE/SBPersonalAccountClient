import React from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Plus, ExternalLink } from "lucide-react";
import { api } from "@/api/client";
import { PaymentInvoice, PageResponse } from "@/api/types";
import { useBranding } from "@/hooks/use-branding";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import styles from "./BillingHistoryPage.module.scss";

interface LayoutContext {
  openTopUp: () => void;
}

export const BillingHistoryPage: React.FC = () => {
  const { data: branding } = useBranding();
  const { openTopUp } = useOutletContext<LayoutContext>();
  const currency = branding?.currency || "₽";

  const { data, isLoading } = useQuery({
    queryKey: ["user-billing-history"],
    queryFn: async () => {
      try {
        return await api.get<PageResponse<PaymentInvoice>>("/user/purchases", { limit: 50 });
      } catch {
        return { items: [], total: 0, limit: 50, offset: 0, has_more: false };
      }
    },
  });

  const invoices = data?.items || [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Финансовая история</h1>
          <p className={styles.sub}>
            История транзакций, платежей и пополнений личного счета
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus size={16} />}
          onClick={openTopUp}
        >
          Пополнить баланс
        </Button>
      </div>

      {isLoading ? (
        <div className={styles.empty}>
          <p>Загрузка операций...</p>
        </div>
      ) : invoices.length > 0 ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID / Дата</th>
                <th>Назначение</th>
                <th>Метод оплаты</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                      #{inv.id}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-dim)" }}>
                      {new Date(inv.created_at).toLocaleString("ru-RU")}
                    </div>
                  </td>
                  <td>
                    {inv.target === "balance"
                      ? "Пополнение баланса"
                      : "Оплата услуги / заказа"}
                  </td>
                  <td>{inv.provider || "Банковская карта"}</td>
                  <td className={styles.amount}>
                    {inv.amount.toLocaleString("ru-RU")} {inv.currency || currency}
                  </td>
                  <td>
                    <Badge
                      variant={
                        inv.status === "paid"
                          ? "success"
                          : inv.status === "failed" || inv.status === "cancelled"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {inv.status === "paid"
                        ? "Оплачен"
                        : inv.status === "pending"
                        ? "Ожидает оплаты"
                        : inv.status}
                    </Badge>
                  </td>
                  <td>
                    {inv.status === "pending" && inv.pay_url ? (
                      <a href={inv.pay_url} target="_blank" rel="noopener noreferrer">
                        <Button
                          size="sm"
                          variant="outline"
                          rightIcon={<ExternalLink size={12} />}
                        >
                          Оплатить
                        </Button>
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.empty}>
          <Wallet size={44} opacity={0.3} />
          <p>Платежи пока не совершались</p>
        </div>
      )}
    </div>
  );
};

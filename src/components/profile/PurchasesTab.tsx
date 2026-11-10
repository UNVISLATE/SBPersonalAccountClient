import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { getInvoices } from "@/api/endpoints/user";
import type { PaymentInvoice } from "@/api/types";
import { useIsMobile } from "@/hooks/use-media-query";
import { useInfiniteSentinel } from "@/hooks/use-infinite-sentinel";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge/Badge";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { Skeleton } from "@/components/motion";
import { ShoppingBag, ExternalLink, Loader2 } from "lucide-react";
import styles from "./PurchasesTab.module.scss";

export interface PurchasesTabProps {
  defaultCurrency: string;
}

const PAGE_SIZE = 8;
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const pageVariants = {
  enter: (direction: number) => ({
    x: direction >= 0 ? 18 : -18,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction >= 0 ? -18 : 18,
    opacity: 0,
  }),
};

const STATUS_META: Record<
  string,
  { label: string; variant: "success" | "warning" | "danger" | "muted" }
> = {
  paid: { label: "Оплачен", variant: "success" },
  succeeded: { label: "Оплачен", variant: "success" },
  pending: { label: "Ожидает оплаты", variant: "warning" },
  failed: { label: "Ошибка", variant: "danger" },
  cancelled: { label: "Отменён", variant: "muted" },
  expired: { label: "Истёк", variant: "muted" },
};

function parsePositivePage(raw: string | null): number {
  const n = Number.parseInt(raw || "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function isConvertedPayment(p: PaymentInvoice): boolean {
  return Boolean(
    p.base_amount != null &&
      p.base_currency &&
      p.base_currency.toUpperCase() !== p.currency.toUpperCase()
  );
}

export const PurchasesTab: React.FC<PurchasesTabProps> = ({ defaultCurrency }) => {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePositivePage(searchParams.get("page"));
  const [pageDirection, setPageDirection] = useState(1);

  // Mobile: paginated query
  const mobileQuery = useQuery({
    queryKey: ["user-purchases", "mobile-page", page],
    enabled: isMobile,
    queryFn: async () => {
      try {
        return await getInvoices({
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        });
      } catch {
        return { items: [], total: 0, limit: PAGE_SIZE, offset: 0, has_more: false };
      }
    },
    placeholderData: keepPreviousData,
  });

  // Desktop: dynamic batch infinite scroll
  const infiniteQuery = useInfiniteQuery({
    queryKey: ["user-purchases", "infinite"],
    enabled: !isMobile,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      try {
        return await getInvoices({
          limit: PAGE_SIZE,
          offset: pageParam,
        });
      } catch {
        return { items: [], total: 0, limit: PAGE_SIZE, offset: pageParam, has_more: false };
      }
    },
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.offset + lastPage.items.length : undefined,
  });

  const sentinelRef = useInfiniteSentinel({
    enabled: !isMobile,
    hasNextPage: infiniteQuery.hasNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    onLoadMore: () => {
      void infiniteQuery.fetchNextPage();
    },
  });

  const desktopBatches = useMemo(
    () => (infiniteQuery.data?.pages ?? []).map((p) => p.items || []),
    [infiniteQuery.data]
  );

  const visiblePurchases = useMemo(() => {
    if (isMobile) return mobileQuery.data?.items ?? [];
    return desktopBatches.flat();
  }, [isMobile, mobileQuery.data, desktopBatches]);

  const total = isMobile
    ? (mobileQuery.data?.total ?? visiblePurchases.length)
    : (infiniteQuery.data?.pages?.[0]?.total ?? visiblePurchases.length);

  const isLoading = isMobile ? mobileQuery.isLoading : infiniteQuery.isLoading;

  const handlePageChange = (nextPage: number) => {
    setPageDirection(nextPage >= page ? 1 : -1);
    const next = new URLSearchParams(searchParams);
    if (nextPage > 1) {
      next.set("page", String(nextPage));
    } else {
      next.delete("page");
    }
    setSearchParams(next, { replace: true });
  };

  const renderPurchaseRow = (p: PaymentInvoice) => {
    const meta = STATUS_META[p.status] || {
      label: p.status,
      variant: "muted" as const,
    };
    const targetLabel =
      p.description ||
      (p.target === "balance"
        ? "Пополнение баланса"
        : p.user_svc_id
          ? `Оплата заказа #${p.user_svc_id}`
          : `Счёт #${p.id}`);
    const payHref = p.payment_url || p.pay_url;
    const cur = p.currency || defaultCurrency;
    const converted = isConvertedPayment(p);

    return (
      <div key={p.id} className={styles.row}>
        <div className={styles.rowLeft}>
          <span className={styles.rowTitle}>{targetLabel}</span>
          <div className={styles.rowMeta}>
            <span>#{p.id}</span>
            <span>·</span>
            <span>{p.provider}</span>
            <span>·</span>
            <span>{formatDateTime(p.created_at)}</span>
          </div>
        </div>

        <div className={styles.rowRight}>
          {converted && p.base_amount != null && p.base_currency ? (
            <div className={styles.amountGroup}>
              <span className={styles.amount}>
                {formatCurrency(p.base_amount, p.base_currency)}
              </span>
              <span className={styles.amountOriginal}>
                ({formatCurrency(p.amount, cur)})
              </span>
            </div>
          ) : (
            <span className={styles.amount}>{formatCurrency(p.amount, cur)}</span>
          )}
          <div className={styles.statusActions}>
            <Badge variant={meta.variant} size="sm" dot={meta.variant === "success"}>
              {meta.label}
            </Badge>
            {p.status === "pending" && payHref && (
              <a
                href={payHref}
                target="_blank"
                rel="noreferrer"
                className={styles.payLink}
                title="Перейти к оплате"
              >
                <span>Оплатить</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>ИСТОРИЯ ПОКУПОК</h2>
        <p className={styles.sectionSubtitle}>
          Все ваши пополнения баланса и прямые оплаты заказов
        </p>
      </div>

      {isLoading ? (
        <div className={styles.loadingList}>
          <Skeleton height={64} rounded="md" />
          <Skeleton height={64} rounded="md" />
          <Skeleton height={64} rounded="md" />
        </div>
      ) : visiblePurchases.length === 0 ? (
        <div className={styles.emptyBlock}>
          <div className={styles.emptyIconWrap}>
            <ShoppingBag size={26} />
          </div>
          <h3 className={styles.emptyTitle}>История покупок пуста</h3>
          <p className={styles.emptySubtitle}>
            Здесь будут отображаться все ваши платежи, счета и пополнения баланса
          </p>
        </div>
      ) : isMobile ? (
        <>
          <AnimatePresence mode="wait" custom={pageDirection}>
            <motion.div
              key={page}
              custom={pageDirection}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
              className={styles.list}
            >
              {visiblePurchases.map(renderPurchaseRow)}
            </motion.div>
          </AnimatePresence>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={handlePageChange}
            disabled={mobileQuery.isFetching}
          />
        </>
      ) : (
        <div className={styles.list}>
          {desktopBatches.map((batch, batchIdx) => (
            <motion.div
              key={`purchases-batch-${batchIdx}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
              className={styles.batchGroup}
            >
              {batch.map(renderPurchaseRow)}
            </motion.div>
          ))}

          {infiniteQuery.hasNextPage && (
            <div ref={sentinelRef} className={styles.loadMoreSentinel}>
              {infiniteQuery.isFetchingNextPage && (
                <div className={styles.loadingBatchPill}>
                  <Loader2 size={15} className={styles.spinIcon} />
                  <span>Загрузка следующих платежей...</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

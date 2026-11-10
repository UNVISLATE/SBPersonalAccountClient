import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQueries,
  useQuery,
} from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { getService as getCatalogService } from "@/api/endpoints/catalog";
import { getServices as getUserServices } from "@/api/endpoints/user";
import type { CatalogService, UserService } from "@/api/types";
import { useCopy } from "@/hooks/use-copy";
import { useIsMobile } from "@/hooks/use-media-query";
import { useInfiniteSentinel } from "@/hooks/use-infinite-sentinel";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Modal } from "@/components/ui/Modal/Modal";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { Skeleton } from "@/components/motion";
import {
  SbuiManifestView,
  extractServiceViewSchema,
} from "@/components/sdui/SbuiManifestView";
import type { OrderManifest } from "@/components/sdui/SbuiOrderForm";
import {
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  BookOpen,
  Calendar,
  LayoutGrid,
  Search,
  X,
  Loader2,
} from "lucide-react";
import styles from "./ServicesTab.module.scss";

const PAGE_SIZE = 6;
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
  active: { label: "Активен", variant: "success" },
  delivered: { label: "Выдан", variant: "success" },
  pending: { label: "Ожидание", variant: "warning" },
  expired: { label: "Истёк", variant: "muted" },
  suspended: { label: "Приостановлен", variant: "danger" },
  failed: { label: "Ошибка", variant: "danger" },
};

function extractSecretValue(
  svc: UserService,
  hasManifestView: boolean
): string | null {
  if (svc.secret_key) return svc.secret_key;
  if (svc.public_data) {
    if (svc.product_key && typeof svc.public_data[svc.product_key] === "string") {
      return svc.public_data[svc.product_key] as string;
    }
    if (typeof svc.public_data.key === "string") return svc.public_data.key;
    if (!hasManifestView && typeof svc.public_data.subscription_url === "string") {
      return svc.public_data.subscription_url;
    }
    if (typeof svc.public_data.access_code === "string") return svc.public_data.access_code;
    if (typeof svc.public_data.secret_key === "string") return svc.public_data.secret_key;
    if (typeof svc.public_data.token === "string") return svc.public_data.token;
  }
  if (svc.credentials?.config_url) return svc.credentials.config_url;
  if (svc.credentials?.details) return svc.credentials.details;
  return null;
}

function extractInstruction(svc: UserService): string | null {
  if (svc.instruction_md) return svc.instruction_md;
  if (svc.public_data && typeof svc.public_data.instruction_md === "string") {
    return svc.public_data.instruction_md;
  }
  return null;
}

function extractOrderChips(svc: UserService): string[] {
  const cfg = svc.order_config;
  if (!cfg || typeof cfg !== "object") return [];
  const chips: string[] = [];

  const tier = cfg.tier as Record<string, unknown> | undefined;
  if (tier && (tier.title || tier.code)) {
    chips.push(String(tier.title || tier.code));
  }

  const comps = cfg.components as Record<string, Record<string, unknown>> | undefined;
  if (comps && typeof comps === "object") {
    for (const [key, comp] of Object.entries(comps)) {
      if (comp && comp.value !== undefined) {
        const unit = comp.unit ? ` ${comp.unit}` : "";
        chips.push(`${key}: ${comp.label || comp.value}${unit}`);
      }
    }
  }

  const form = cfg.form as Record<string, unknown> | undefined;
  if (form && typeof form === "object") {
    for (const [k, v] of Object.entries(form)) {
      if (v !== undefined && v !== null && String(v).trim()) {
        chips.push(`${k}: ${String(v)}`);
      }
    }
  }

  return chips;
}

function parsePositivePage(raw: string | null): number {
  const n = Number.parseInt(raw || "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export const ServicesTab: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const routeParams = useParams<{ serviceOrderId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { copy, copiedKey } = useCopy();
  const [revealedIds, setRevealedIds] = useState<Record<number, boolean>>({});
  const [manualViewSvc, setManualViewSvc] = useState<UserService | null>(null);
  const [activeInstrSvc, setActiveInstrSvc] = useState<UserService | null>(null);

  const urlQuery = (searchParams.get("q") || "").trim();
  const page = parsePositivePage(searchParams.get("page"));
  const rawIdParam = routeParams.serviceOrderId || searchParams.get("id");
  const targetOrderId =
    rawIdParam && /^\d+$/.test(rawIdParam.trim()) ? Number(rawIdParam.trim()) : null;

  const [draftSearch, setDraftSearch] = useState<{ base: string; value: string } | null>(null);
  const searchInput =
    draftSearch && draftSearch.base === urlQuery ? draftSearch.value : urlQuery;
  const debouncedQuery = urlQuery;
  const [pageDirection, setPageDirection] = useState(1);

  const setSearchInput = (nextVal: string) => {
    setDraftSearch({ base: urlQuery, value: nextVal });
  };

  // Debounce typed search input -> URL query (?q=...)
  useEffect(() => {
    const cleanInput = searchInput.trim();
    if (cleanInput === urlQuery) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (cleanInput) {
        next.set("q", cleanInput);
      } else {
        next.delete("q");
      }
      next.delete("page");
      setSearchParams(next, { replace: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput, urlQuery, searchParams, setSearchParams]);

  // Mobile: paginated query
  const mobileQuery = useQuery({
    queryKey: ["user-services", "mobile-page", page, debouncedQuery],
    enabled: isMobile,
    queryFn: async () => {
      try {
        return await getUserServices({
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          q: debouncedQuery || undefined,
        });
      } catch {
        return { items: [], total: 0, limit: PAGE_SIZE, offset: 0, has_more: false };
      }
    },
    placeholderData: keepPreviousData,
  });

  // Desktop: dynamic batch infinite scroll
  const infiniteQuery = useInfiniteQuery({
    queryKey: ["user-services", "infinite", debouncedQuery],
    enabled: !isMobile,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      try {
        return await getUserServices({
          limit: PAGE_SIZE,
          offset: pageParam,
          q: debouncedQuery || undefined,
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

  const visibleServices = useMemo(() => {
    if (isMobile) return mobileQuery.data?.items ?? [];
    return desktopBatches.flat();
  }, [isMobile, mobileQuery.data, desktopBatches]);

  const total = isMobile
    ? (mobileQuery.data?.total ?? visibleServices.length)
    : (infiniteQuery.data?.pages?.[0]?.total ?? visibleServices.length);

  const isLoading = isMobile ? mobileQuery.isLoading : infiniteQuery.isLoading;
  const isFetchingMobile = mobileQuery.isFetching;

  const targetOnVisibleList = useMemo(
    () =>
      targetOrderId !== null
        ? visibleServices.find((s) => s.id === targetOrderId) ?? null
        : null,
    [visibleServices, targetOrderId]
  );

  // Fallback lookup if ?id=... belongs to an order not in the currently loaded slice
  const { data: lookupData } = useQuery({
    queryKey: ["user-services", "lookup", targetOrderId],
    enabled: targetOrderId !== null && !isLoading && targetOnVisibleList === null,
    queryFn: async () => {
      try {
        return await getUserServices({ limit: 50, offset: 0 });
      } catch {
        return { items: [], total: 0, limit: 50, offset: 0, has_more: false };
      }
    },
    staleTime: 30_000,
  });

  const resolvedTargetService = useMemo(() => {
    if (targetOnVisibleList) return targetOnVisibleList;
    if (targetOrderId === null) return null;
    return lookupData?.items?.find((s) => s.id === targetOrderId) ?? null;
  }, [targetOnVisibleList, targetOrderId, lookupData]);

  const activeViewSvc = manualViewSvc ?? resolvedTargetService;

  // Fetch catalog manifest only for distinct service_ids actually displayed/opened (never limit: 100)
  const neededCatalogIds = useMemo(() => {
    const ids = new Set<number>();
    for (const svc of visibleServices) {
      ids.add(svc.service_id);
    }
    if (activeViewSvc) ids.add(activeViewSvc.service_id);
    if (activeInstrSvc) ids.add(activeInstrSvc.service_id);
    return Array.from(ids);
  }, [visibleServices, activeViewSvc, activeInstrSvc]);

  const catalogQueries = useQueries({
    queries: neededCatalogIds.map((id) => ({
      queryKey: ["catalog-service-detail", id],
      queryFn: async () => {
        try {
          return await getCatalogService(id);
        } catch {
          return null;
        }
      },
      staleTime: 60_000,
    })),
  });

  const catalogServiceMap = useMemo(() => {
    const map = new Map<number, CatalogService>();
    for (const q of catalogQueries) {
      if (q.data) map.set(q.data.id, q.data);
    }
    return map;
  }, [catalogQueries]);

  const handleOpenServiceOrder = useCallback(
    (svc: UserService) => {
      setManualViewSvc(svc);
      const next = new URLSearchParams(searchParams);
      next.set("id", String(svc.id));
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handleCloseServiceOrder = useCallback(() => {
    setManualViewSvc(null);
    const next = new URLSearchParams(searchParams);
    next.delete("id");
    if (routeParams.serviceOrderId) {
      const qs = next.toString();
      navigate(qs ? `/profile/services?${qs}` : "/profile/services", { replace: true });
    } else if (searchParams.has("id")) {
      setSearchParams(next, { replace: true });
    }
  }, [navigate, routeParams.serviceOrderId, searchParams, setSearchParams]);

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

  const toggleReveal = (id: number) =>
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const resolveServiceTitle = (svc: UserService): string => {
    const catalogSvc = catalogServiceMap.get(svc.service_id);
    return (
      svc.service_name ||
      svc.name ||
      catalogSvc?.name ||
      (typeof svc.public_data?.service_name === "string"
        ? svc.public_data.service_name
        : `Услуга #${svc.service_id}`)
    );
  };

  const activeViewCatalogManifest = useMemo(() => {
    if (!activeViewSvc) return null;
    const cat = catalogServiceMap.get(activeViewSvc.service_id);
    return (cat?.pricing_config?.manifest as OrderManifest | undefined) ?? null;
  }, [activeViewSvc, catalogServiceMap]);

  const activeViewMeta = useMemo(() => {
    if (!activeViewSvc) return null;
    return extractServiceViewSchema(activeViewSvc, activeViewCatalogManifest);
  }, [activeViewSvc, activeViewCatalogManifest]);

  const activeInstrContent = useMemo(
    () => (activeInstrSvc ? extractInstruction(activeInstrSvc) : null),
    [activeInstrSvc]
  );

  const renderServiceCard = (svc: UserService) => {
    const catalogSvc = catalogServiceMap.get(svc.service_id);
    const catalogManifest =
      (catalogSvc?.pricing_config?.manifest as OrderManifest | undefined) ?? null;
    const { viewSchema, triggerLabel, hideKey } = extractServiceViewSchema(
      svc,
      catalogManifest
    );
    const secretVal = hideKey ? null : extractSecretValue(svc, Boolean(viewSchema));
    const instruction = extractInstruction(svc);
    const orderChips = extractOrderChips(svc);
    const isRevealed = Boolean(revealedIds[svc.id]);
    const meta = STATUS_META[svc.status] || {
      label: svc.status,
      variant: "muted" as const,
    };
    const title = resolveServiceTitle(svc);
    const hasActionsBar = Boolean(viewSchema || instruction);

    return (
      <div key={svc.id} className={styles.serviceCard}>
        <div className={styles.cardTop}>
          <div className={styles.cardTitleWrap}>
            <span className={styles.serviceName}>{title}</span>
            <div className={styles.metaLine}>
              <span>Заказ #{svc.id}</span>
              <span>·</span>
              <span>Выдан {formatDate(svc.created_at)}</span>
              {svc.expires_at && (
                <>
                  <span>·</span>
                  <span className={styles.expiry}>
                    <Calendar size={12} />
                    до {formatDate(svc.expires_at)}
                  </span>
                </>
              )}
            </div>
          </div>
          <Badge variant={meta.variant} size="sm" dot={meta.variant === "success"}>
            {meta.label}
          </Badge>
        </div>

        {orderChips.length > 0 && (
          <div className={styles.configChips}>
            {orderChips.map((chip, chipIdx) => (
              <span key={chipIdx} className={styles.configChip}>
                {chip}
              </span>
            ))}
          </div>
        )}

        {secretVal && (
          <div className={styles.keyBox}>
            <code className={styles.keyValue}>
              {isRevealed ? secretVal : "••••••••••••••••••••••••••••"}
            </code>
            <div className={styles.keyActions}>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => toggleReveal(svc.id)}
                title={isRevealed ? "Скрыть ключ" : "Показать ключ"}
                aria-label={isRevealed ? "Скрыть ключ" : "Показать ключ"}
              >
                {isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => copy(secretVal, `svc-${svc.id}`)}
              >
                {copiedKey === `svc-${svc.id}` ? <Check size={14} /> : <Copy size={14} />}
                <span>
                  {copiedKey === `svc-${svc.id}` ? "Скопировано" : "Копировать"}
                </span>
              </button>
            </div>
          </div>
        )}

        {hasActionsBar && (
          <div className={styles.actionsBar}>
            {viewSchema && (
              <button
                type="button"
                className={styles.viewFormBtn}
                onClick={() => handleOpenServiceOrder(svc)}
              >
                <LayoutGrid size={14} />
                <span>{triggerLabel}</span>
              </button>
            )}

            {instruction && (
              <button
                type="button"
                className={styles.instrBtn}
                onClick={() => setActiveInstrSvc(svc)}
              >
                <BookOpen size={14} />
                <span>Инструкция по использованию</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionTopBar}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>УСЛУГИ И ЛИЦЕНЗИИ</h2>
          <p className={styles.sectionSubtitle}>
            Приобретённые ключи, доступы, конфигурации и инструкции по активации
          </p>
        </div>

        <div className={styles.searchWrap}>
          <Input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Поиск по товару, ключу или #заказу..."
            leftIcon={<Search size={15} />}
            rightSlot={
              searchInput ? (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => setSearchInput("")}
                  aria-label="Очистить поиск"
                >
                  <X size={14} />
                </button>
              ) : undefined
            }
          />
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingList}>
          <Skeleton height={92} rounded="md" />
          <Skeleton height={92} rounded="md" />
          <Skeleton height={92} rounded="md" />
        </div>
      ) : visibleServices.length === 0 ? (
        <div className={styles.emptyBlock}>
          <div className={styles.emptyIconWrap}>
            {debouncedQuery ? <Search size={24} /> : <Key size={26} />}
          </div>
          <h3 className={styles.emptyTitle}>
            {debouncedQuery ? "Ничего не найдено" : "Активных услуг пока нет"}
          </h3>
          <p className={styles.emptySubtitle}>
            {debouncedQuery
              ? `По запросу «${debouncedQuery}» нет выданных товаров или услуг`
              : "После оплаты товара цифровой ключ или доступ появится здесь мгновенно"}
          </p>
          {debouncedQuery ? (
            <Button variant="secondary" size="md" onClick={() => setSearchInput("")}>
              Сбросить поиск
            </Button>
          ) : (
            <Button variant="gradient" size="md" onClick={() => navigate("/catalog")}>
              Перейти в каталог
            </Button>
          )}
        </div>
      ) : isMobile ? (
        <>
          <AnimatePresence mode="wait" custom={pageDirection}>
            <motion.div
              key={`${page}-${debouncedQuery}`}
              custom={pageDirection}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
              className={styles.list}
            >
              {visibleServices.map(renderServiceCard)}
            </motion.div>
          </AnimatePresence>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={handlePageChange}
            disabled={isFetchingMobile}
          />
        </>
      ) : (
        <div className={styles.list}>
          {desktopBatches.map((batch, batchIdx) => (
            <motion.div
              key={`${debouncedQuery}-batch-${batchIdx}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
              className={styles.batchGroup}
            >
              {batch.map(renderServiceCard)}
            </motion.div>
          ))}

          {infiniteQuery.hasNextPage && (
            <div ref={sentinelRef} className={styles.loadMoreSentinel}>
              {infiniteQuery.isFetchingNextPage && (
                <div className={styles.loadingBatchPill}>
                  <Loader2 size={15} className={styles.spinIcon} />
                  <span>Загрузка следующих услуг...</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manifest / Order Details Modal */}
      <Modal
        isOpen={Boolean(activeViewSvc)}
        onClose={handleCloseServiceOrder}
        title={activeViewSvc ? resolveServiceTitle(activeViewSvc) : ""}
        subtitle={
          activeViewSvc
            ? `Заказ #${activeViewSvc.id}${activeViewSvc.expires_at ? ` · до ${formatDate(activeViewSvc.expires_at)}` : ""}`
            : undefined
        }
        maxWidth={560}
        variant="sheet"
      >
        {activeViewSvc && activeViewMeta?.viewSchema ? (
          <SbuiManifestView
            schema={activeViewMeta.viewSchema}
            service={activeViewSvc}
            serviceTitle={resolveServiceTitle(activeViewSvc)}
            extractedKey={extractSecretValue(activeViewSvc, true)}
            instruction={extractInstruction(activeViewSvc)}
            onOpenInstruction={() => {
              const target = activeViewSvc;
              handleCloseServiceOrder();
              setTimeout(() => setActiveInstrSvc(target), 160);
            }}
          />
        ) : activeViewSvc ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div className={styles.metaLine}>
                <span>Заказ #{activeViewSvc.id}</span>
                <span>·</span>
                <span>Выдан {formatDate(activeViewSvc.created_at)}</span>
                {activeViewSvc.expires_at && (
                  <>
                    <span>·</span>
                    <span className={styles.expiry}>
                      <Calendar size={12} />
                      до {formatDate(activeViewSvc.expires_at)}
                    </span>
                  </>
                )}
              </div>
              <Badge
                variant={(STATUS_META[activeViewSvc.status] || { variant: "muted" as const }).variant}
                size="sm"
                dot={STATUS_META[activeViewSvc.status]?.variant === "success"}
              >
                {(STATUS_META[activeViewSvc.status] || { label: activeViewSvc.status }).label}
              </Badge>
            </div>

            {extractOrderChips(activeViewSvc).length > 0 && (
              <div className={styles.configChips}>
                {extractOrderChips(activeViewSvc).map((chip, chipIdx) => (
                  <span key={chipIdx} className={styles.configChip}>
                    {chip}
                  </span>
                ))}
              </div>
            )}

            {extractSecretValue(activeViewSvc, false) && (
              <div className={styles.keyBox}>
                <code className={styles.keyValue}>
                  {extractSecretValue(activeViewSvc, false)}
                </code>
                <div className={styles.keyActions}>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() =>
                      copy(
                        extractSecretValue(activeViewSvc, false) || "",
                        `svc-modal-${activeViewSvc.id}`
                      )
                    }
                  >
                    {copiedKey === `svc-modal-${activeViewSvc.id}` ? (
                      <Check size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                    <span>
                      {copiedKey === `svc-modal-${activeViewSvc.id}` ? "Скопировано" : "Копировать"}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {extractInstruction(activeViewSvc) && (
              <button
                type="button"
                className={styles.instrBtn}
                onClick={() => {
                  const target = activeViewSvc;
                  handleCloseServiceOrder();
                  setTimeout(() => setActiveInstrSvc(target), 160);
                }}
              >
                <BookOpen size={14} />
                <span>Инструкция по использованию</span>
              </button>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Markdown Instruction Dialog */}
      <Modal
        isOpen={Boolean(activeInstrSvc && activeInstrContent)}
        onClose={() => setActiveInstrSvc(null)}
        title="ИНСТРУКЦИЯ ПО ИСПОЛЬЗОВАНИЮ"
        subtitle={activeInstrSvc ? resolveServiceTitle(activeInstrSvc) : undefined}
        maxWidth={680}
        variant="sheet"
      >
        {activeInstrContent && (
          <div className={styles.instrModalBody}>
            <MarkdownContent content={activeInstrContent} />
          </div>
        )}
      </Modal>
    </section>
  );
};

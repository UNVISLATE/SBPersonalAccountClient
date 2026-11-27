import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/api/client";
import { AnimatePresence, motion } from "motion/react";
import { getService as getCatalogService } from "@/api/endpoints/catalog";
import { getServices as getUserServices, get2faStatus } from "@/api/endpoints/user";
import type { CatalogService, CustomServiceAction, UserService } from "@/api/types";
import { OTPInput } from "@/components/ui/OTPInput/OTPInput";
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
  RefreshCw,
  Snowflake,
  Play,
  ChevronDown,
  Settings2,
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
  provisioning: { label: "Настройка...", variant: "warning" },
  frozen: { label: "Заморожен", variant: "danger" },
  stopped: { label: "Остановлен", variant: "muted" },
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

  // Direct lookup by ID if ?id=... or route param is present
  const { data: directOrderData } = useQuery({
    queryKey: ["user-services", "order-by-id", targetOrderId],
    enabled: targetOrderId !== null && targetOnVisibleList === null,
    queryFn: async () => {
      try {
        return await api.get<UserService>(`/user/services/${targetOrderId}`);
      } catch {
        return null;
      }
    },
    staleTime: 10_000,
  });

  // Fallback lookup if ?id=... belongs to an order not in the currently loaded slice
  const { data: lookupData } = useQuery({
    queryKey: ["user-services", "lookup", targetOrderId],
    enabled: targetOrderId !== null && !isLoading && targetOnVisibleList === null && !directOrderData,
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
    if (directOrderData) return directOrderData;
    if (targetOrderId === null) return null;
    return lookupData?.items?.find((s) => s.id === targetOrderId) ?? null;
  }, [targetOnVisibleList, directOrderData, targetOrderId, lookupData]);

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

  const qc = useQueryClient();
  const { data: twofaStatus } = useQuery({
    queryKey: ["user-2fa-status"],
    queryFn: get2faStatus,
    staleTime: 60_000,
  });
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [openManageSvcId, setOpenManageSvcId] = useState<number | null>(null);
  const [pendingCustomModal, setPendingCustomModal] = useState<{
    svc: UserService;
    actionDef: CustomServiceAction;
    verifyRequired?: string;
    activeMethod: "2fa" | "email" | "setup_required";
    verifyCode: string;
    emailSent: boolean;
    sendingEmail: boolean;
  } | null>(null);

  // Auto-poll while target order is pending or provisioning
  const isTargetPending =
    activeViewSvc?.status === "pending" || activeViewSvc?.status === "provisioning";
  useEffect(() => {
    if (!isTargetPending) return;
    const interval = setInterval(() => {
      void qc.invalidateQueries({ queryKey: ["user-services"] });
    }, 2500);
    return () => clearInterval(interval);
  }, [isTargetPending, qc]);

  const handleRenewService = (svc: UserService) => {
    const cat = catalogServiceMap.get(svc.service_id);
    const allowEarly = Boolean(
      (cat?.settings as Record<string, unknown> | undefined)?.allow_early_renew
    );
    if (allowEarly) {
      setRenewModalSvc(svc);
      return;
    }
    navigate(`/catalog/${svc.service_id}`);
    toast.info("Выберите период или тариф для продления услуги");
  };

  const [renewModalSvc, setRenewModalSvc] = useState<UserService | null>(null);
  const [renewSubmitting, setRenewSubmitting] = useState(false);

  const handleConfirmBalanceRenew = async () => {
    if (!renewModalSvc) return;
    try {
      setRenewSubmitting(true);
      await api.post(`/user/services/${renewModalSvc.id}/renew`, {});
      toast.success("Услуга успешно продлена с баланса!");
      setRenewModalSvc(null);
      await qc.invalidateQueries({ queryKey: ["user-services"] });
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : "Не удалось продлить услугу";
      toast.error(msg);
    } finally {
      setRenewSubmitting(false);
    }
  };

  const handleToggleAutoRenew = async (svc: UserService) => {
    try {
      setRunningAction(`${svc.id}-autorenew`);
      await api.patch(`/user/services/${svc.id}/auto-renew`, {
        enabled: !svc.auto_renew,
      });
      toast.success(!svc.auto_renew ? "Автопродление включено" : "Автопродление отключено");
      await qc.invalidateQueries({ queryKey: ["user-services"] });
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : "Не удалось изменить автопродление";
      toast.error(msg);
    } finally {
      setRunningAction(null);
    }
  };

  const handleServiceAction = async (svcId: number, action: string, verifyCode?: string) => {
    try {
      setRunningAction(`${svcId}-${action}`);
      await api.post(`/user/services/${svcId}/action`, {
        action,
        ...(verifyCode ? { verify_code: verifyCode } : {}),
      });
      toast.success(`Действие «${action}» успешно выполнено!`);
      setPendingCustomModal(null);
      await qc.invalidateQueries({ queryKey: ["user-services"] });
    } catch (err) {
      if (err instanceof ApiError && err.status === 428) {
        setPendingCustomModal((prev) =>
          prev ? { ...prev, verifyRequired: prev.verifyRequired || "2fa" } : null
        );
        return;
      }
      const msg = err instanceof ApiError ? err.detail : "Не удалось выполнить действие";
      toast.error(msg);
    } finally {
      setRunningAction(null);
    }
  };

  const triggerCustomAction = (svc: UserService, actionKey: string) => {
    const customList = Array.isArray(svc.custom_actions) ? svc.custom_actions : [];
    const actionDef = customList.find((a) => a.key === actionKey);
    if (!actionDef) {
      toast.error("Это действие недоступно для данной услуги");
      return;
    }
    const allowed = actionDef.allowed_statuses || ["active"];
    if (!allowed.includes(svc.status)) {
      toast.error(`Действие недоступно в статусе «${svc.status}»`);
      return;
    }
    const verify = actionDef.verify || "none";
    const needsVerify = verify !== "none";
    if (actionDef.confirm_text || needsVerify) {
      const totpEnabled = Boolean(twofaStatus?.enabled);
      const emailConfigured = Boolean(twofaStatus?.email_configured);
      let activeMethod: "2fa" | "email" | "setup_required" = "2fa";
      if (needsVerify) {
        if (verify === "2fa" && !totpEnabled) {
          activeMethod = "setup_required";
        } else if (verify === "2fa_or_email") {
          if (totpEnabled) {
            activeMethod = "2fa";
          } else if (emailConfigured) {
            activeMethod = "email";
          } else {
            activeMethod = "setup_required";
          }
        } else if (verify === "email") {
          activeMethod = "email";
        }
      }
      setPendingCustomModal({
        svc,
        actionDef,
        verifyRequired: needsVerify ? verify : undefined,
        activeMethod,
        verifyCode: "",
        emailSent: false,
        sendingEmail: false,
      });
      return;
    }
    void handleServiceAction(svc.id, actionDef.key);
  };

  const handleSendActionChallenge = async () => {
    if (!pendingCustomModal) return;
    try {
      setPendingCustomModal((prev) => (prev ? { ...prev, sendingEmail: true } : null));
      await api.post(`/user/services/${pendingCustomModal.svc.id}/action/challenge`, {
        action: pendingCustomModal.actionDef.key,
      });
      toast.success("Код подтверждения отправлен на ваш email");
      setPendingCustomModal((prev) => (prev ? { ...prev, emailSent: true, sendingEmail: false } : null));
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : "Не удалось отправить код";
      toast.error(msg);
      setPendingCustomModal((prev) => (prev ? { ...prev, sendingEmail: false } : null));
    }
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
    const isKeyDelivery = catalogSvc?.delivery === "key" || svc.product_kind === "key";
    let meta = STATUS_META[svc.status] || {
      label: svc.status,
      variant: "muted" as const,
    };
    if (isKeyDelivery && svc.status === "active") {
      meta = { label: "Выдан", variant: "success" };
    }
    const title = resolveServiceTitle(svc);
    const actionsList = Array.isArray(svc.actions) ? (svc.actions as string[]) : [];
    const canRenew = !isKeyDelivery && svc.status === "active" && (actionsList.includes("renew") || Boolean(svc.expires_at));
    const canFreeze = !isKeyDelivery && svc.status === "active" && actionsList.includes("freeze") && Boolean(svc.expires_at);
    const canUnfreeze = !isKeyDelivery && svc.status === "frozen" && (actionsList.includes("unfreeze") || actionsList.includes("freeze"));
    const catSettings = (catalogSvc?.settings as Record<string, unknown> | undefined) || {};
    const allowAutoRenew = Boolean(catSettings.allow_auto_renew) || Boolean(svc.auto_renew);
    const customActions = (Array.isArray(svc.custom_actions) ? svc.custom_actions : []).filter(
      (ca) => !ca.allowed_statuses || ca.allowed_statuses.includes(svc.status)
    );
    const canManage = canRenew || canFreeze || canUnfreeze || allowAutoRenew || customActions.length > 0;
    const hasActionsBar = Boolean(viewSchema || instruction || canManage);

    return (
      <div
        key={svc.id}
        className={styles.serviceCard}
        style={openManageSvcId === svc.id ? { zIndex: 30 } : undefined}
      >
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

            {canManage && (
              <div className={styles.manageDropdown}>
                <button
                  type="button"
                  className={styles.actionPillBtn}
                  disabled={Boolean(runningAction)}
                  onClick={() =>
                    setOpenManageSvcId((prev) => (prev === svc.id ? null : svc.id))
                  }
                >
                  <Settings2 size={14} />
                  <span>Управление услугой</span>
                  <ChevronDown size={14} />
                </button>

                {openManageSvcId === svc.id && (
                  <div className={styles.manageMenu}>
                    {canRenew && (
                      <button
                        type="button"
                        className={styles.manageMenuItem}
                        disabled={Boolean(runningAction)}
                        onClick={() => {
                          setOpenManageSvcId(null);
                          handleRenewService(svc);
                        }}
                      >
                        <RefreshCw size={14} />
                        <span>Продлить</span>
                      </button>
                    )}

                    {canFreeze && (
                      <button
                        type="button"
                        className={styles.manageMenuItem}
                        disabled={Boolean(runningAction)}
                        onClick={() => {
                          setOpenManageSvcId(null);
                          void handleServiceAction(svc.id, "freeze");
                        }}
                      >
                        <Snowflake size={14} />
                        <span>Заморозить</span>
                      </button>
                    )}

                    {canUnfreeze && (
                      <button
                        type="button"
                        className={styles.manageMenuItem}
                        disabled={Boolean(runningAction)}
                        onClick={() => {
                          setOpenManageSvcId(null);
                          void handleServiceAction(svc.id, "unfreeze");
                        }}
                      >
                        <Play size={14} />
                        <span>Разморозить</span>
                      </button>
                    )}

                    {allowAutoRenew &&
                      (svc.status === "active" ||
                        svc.status === "stopped" ||
                        svc.status === "frozen") && (
                        <button
                          type="button"
                          className={styles.manageMenuItem}
                          disabled={Boolean(runningAction)}
                          onClick={() => {
                            setOpenManageSvcId(null);
                            void handleToggleAutoRenew(svc);
                          }}
                        >
                          <RefreshCw size={14} />
                          <span>
                            {svc.auto_renew ? "Автопродление: ВКЛ" : "Автопродление: ВЫКЛ"}
                          </span>
                        </button>
                      )}

                    {customActions.map((ca) => (
                      <button
                        key={ca.key}
                        type="button"
                        className={`${styles.manageMenuItem} ${
                          ca.variant === "danger" ? styles.manageMenuItemDanger : ""
                        }`.trim()}
                        disabled={Boolean(runningAction)}
                        onClick={() => {
                          setOpenManageSvcId(null);
                          triggerCustomAction(svc, ca.key);
                        }}
                      >
                        <span>{ca.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
            onServiceAction={(actionKey) => {
              if (activeViewSvc) {
                triggerCustomAction(activeViewSvc, actionKey);
              }
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
              {(() => {
                const modalCatSvc = catalogServiceMap.get(activeViewSvc.service_id);
                const modalIsKey = modalCatSvc?.delivery === "key" || activeViewSvc.product_kind === "key";
                let modalMeta = STATUS_META[activeViewSvc.status] || {
                  label: activeViewSvc.status,
                  variant: "muted" as const,
                };
                if (modalIsKey && activeViewSvc.status === "active") {
                  modalMeta = { label: "Выдан", variant: "success" };
                }
                return (
                  <Badge
                    variant={modalMeta.variant}
                    size="sm"
                    dot={modalMeta.variant === "success"}
                  >
                    {modalMeta.label}
                  </Badge>
                );
              })()}
            </div>

            {activeViewSvc.status === "pending" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(234, 179, 8, 0.1)",
                  border: "1px solid rgba(234, 179, 8, 0.25)",
                  color: "#eab308",
                  fontSize: 13,
                }}
              >
                <Loader2 size={16} className="animate-spin" />
                <span>Заказ ожидает подтверждения оплаты или доставки...</span>
              </div>
            )}

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

      {/* Early Balance Renew Modal */}
      <Modal
        isOpen={Boolean(renewModalSvc)}
        onClose={() => setRenewModalSvc(null)}
        title="Продление услуги"
        subtitle={renewModalSvc ? resolveServiceTitle(renewModalSvc) : undefined}
        maxWidth={420}
      >
        {renewModalSvc && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, opacity: 0.9 }}>
              Продлить заказ #{renewModalSvc.id} на следующий период с основного/бонусного баланса?
              {renewModalSvc.pending_apply_at && (
                <>
                  <br />
                  <span style={{ opacity: 0.75, fontSize: 13 }}>
                    Запланированная смена конфигурации применится {formatDate(renewModalSvc.pending_apply_at)}.
                  </span>
                </>
              )}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const target = renewModalSvc;
                  setRenewModalSvc(null);
                  if (target) navigate(`/catalog/${target.service_id}`);
                }}
              >
                Оплатить через провайдера
              </Button>
              <Button
                type="button"
                variant="gradient"
                disabled={renewSubmitting}
                onClick={() => void handleConfirmBalanceRenew()}
              >
                {renewSubmitting ? "Продление..." : "Продлить с баланса"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Custom Action Confirmation & Step-Up Verification Modal */}
      <Modal
        isOpen={Boolean(pendingCustomModal)}
        onClose={() => setPendingCustomModal(null)}
        title={pendingCustomModal?.actionDef.label || "Подтверждение действия"}
        subtitle={pendingCustomModal ? `Заказ #${pendingCustomModal.svc.id}` : undefined}
        maxWidth={440}
      >
        {pendingCustomModal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {pendingCustomModal.actionDef.confirm_text && (
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, opacity: 0.9 }}>
                {pendingCustomModal.actionDef.confirm_text}
              </p>
            )}

            {pendingCustomModal.verifyRequired && pendingCustomModal.verifyRequired !== "none" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {pendingCustomModal.activeMethod === "setup_required" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.9 }}>
                      Это действие требует настройки и подтверждения по 2FA.
                    </div>
                    <Button
                      type="button"
                      variant="gradient"
                      onClick={() => {
                        setPendingCustomModal(null);
                        navigate("/profile?modal=2fa");
                      }}
                    >
                      Настроить 2FA
                    </Button>
                  </div>
                ) : pendingCustomModal.activeMethod === "2fa" ? (
                  <>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                      Введите 6-значный код из приложения-аутентификатора (2FA):
                    </div>
                    <OTPInput
                      value={pendingCustomModal.verifyCode}
                      onChange={(val) =>
                        setPendingCustomModal((prev) =>
                          prev ? { ...prev, verifyCode: val } : null
                        )
                      }
                      length={6}
                      autoFocus
                    />
                    {twofaStatus?.email_configured &&
                      pendingCustomModal.verifyRequired === "2fa_or_email" && (
                        <button
                          type="button"
                          disabled={pendingCustomModal.sendingEmail}
                          onClick={() => {
                            setPendingCustomModal((prev) =>
                              prev ? { ...prev, activeMethod: "email", verifyCode: "" } : null
                            );
                            void handleSendActionChallenge();
                          }}
                          style={{
                            alignSelf: "flex-start",
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            fontSize: 12,
                            color: "var(--color-accent)",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          {pendingCustomModal.sendingEmail
                            ? "Отправка кода..."
                            : "Подтвердить по email"}
                        </button>
                      )}
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>
                      {pendingCustomModal.emailSent
                        ? "Введите одноразовый код, отправленный на вашу почту:"
                        : "Запросите одноразовый код на вашу почту:"}
                    </div>
                    <Input
                      placeholder="Код из письма (6 цифр)"
                      value={pendingCustomModal.verifyCode}
                      onChange={(e) =>
                        setPendingCustomModal((prev) =>
                          prev ? { ...prev, verifyCode: e.target.value } : null
                        )
                      }
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <button
                        type="button"
                        disabled={pendingCustomModal.sendingEmail}
                        onClick={() => void handleSendActionChallenge()}
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          fontSize: 12,
                          color: "var(--color-accent)",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        {pendingCustomModal.sendingEmail
                          ? "Отправка..."
                          : pendingCustomModal.emailSent
                          ? "Отправить код повторно"
                          : "Отправить код на email"}
                      </button>
                      {twofaStatus?.enabled &&
                        pendingCustomModal.verifyRequired === "2fa_or_email" && (
                          <button
                            type="button"
                            onClick={() =>
                              setPendingCustomModal((prev) =>
                                prev ? { ...prev, activeMethod: "2fa", verifyCode: "" } : null
                              )
                            }
                            style={{
                              background: "transparent",
                              border: "none",
                              padding: 0,
                              fontSize: 12,
                              color: "var(--color-text-muted)",
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                          >
                            Вернуться к 2FA
                          </button>
                        )}
                    </div>
                  </>
                )}
              </div>
            )}

            {pendingCustomModal.activeMethod !== "setup_required" && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPendingCustomModal(null)}
                >
                  Отмена
                </Button>
                <Button
                  type="button"
                  variant={pendingCustomModal.actionDef.variant === "danger" ? "danger" : "gradient"}
                  disabled={
                    Boolean(runningAction) ||
                    (Boolean(pendingCustomModal.verifyRequired) &&
                      pendingCustomModal.verifyRequired !== "none" &&
                      pendingCustomModal.verifyCode.trim().length < 6)
                  }
                  onClick={() =>
                    void handleServiceAction(
                      pendingCustomModal.svc.id,
                      pendingCustomModal.actionDef.key,
                      pendingCustomModal.verifyCode.trim() || undefined
                    )
                  }
                >
                  {runningAction ? "Выполнение..." : "Подтвердить"}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </section>
  );
};

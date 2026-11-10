import React, { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Select } from "@unvislate/sbui-sdk/components/form/Select";
import { api, ApiError } from "@/api/client";
import { getCategories, getService } from "@/api/endpoints/catalog";
import { getProviders, createInvoice } from "@/api/endpoints/purchases";
import type { PaymentProvider, ServiceAttachment } from "@/api/types";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { useClientLayout } from "@/components/layout/AppLayout";
import { formatCurrency } from "@/lib/format";
import { MaskText, Reveal, Skeleton } from "@/components/motion";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { MediaLightbox } from "@/components/media/MediaLightbox";
import { OrderCheckoutModal } from "@/components/modals/OrderCheckoutModal";
import {
  SbuiOrderForm,
  getInitialOrderFormValues,
  validateOrderFormValues,
} from "@/components/sdui/SbuiOrderForm";
import { toast } from "sonner";
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Plus,
  Play,
  CreditCard,
  Wallet,
  Tag,
  PackageX,
  Layers,
} from "lucide-react";
import clsx from "clsx";
import styles from "./ProductDetailPage.module.scss";

interface ServiceTier {
  code: string;
  label?: string;
  title?: string;
  price: number | string;
  duration_days?: number;
  group?: string;
  subtiers?: ServiceTier[];
}

interface ConfigurableComponentOption {
  value: string | number;
  label?: string;
  price_delta?: number | string;
}

interface ConfigurableComponent {
  code: string;
  name?: string;
  label?: string;
  type?: "select" | "slider" | "number" | string;
  default?: string | number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  unit_price?: number | string;
  options?: ConfigurableComponentOption[];
}

interface FlatTier extends ServiceTier {
  groupTitle?: string;
}

const getErrMsg = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.detail : err instanceof Error ? err.message : fallback;

function flattenTiers(rawTiers: ServiceTier[]): FlatTier[] {
  const result: FlatTier[] = [];
  for (const item of rawTiers) {
    if (Array.isArray(item.subtiers) && item.subtiers.length > 0) {
      const groupTitle = item.title || item.label || item.code;
      for (const sub of item.subtiers) {
        result.push({ ...sub, groupTitle });
      }
    } else if (item.code) {
      result.push({ ...item, groupTitle: item.group });
    }
  }
  return result;
}

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { branding } = useBranding();
  const { openTopUp } = useClientLayout();

  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [sliderOffset, setSliderOffset] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Pricing selections
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [customAmountStr, setCustomAmountStr] = useState<string | null>(null);
  const [componentValues, setComponentValues] = useState<Record<string, string | number>>({});

  // SDUI Order form values + validation errors
  const [formOverrides, setFormOverrides] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Promo code
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promocode, setPromocode] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [promoSuccessMsg, setPromoSuccessMsg] = useState("");
  const [checkingPromo, setCheckingPromo] = useState(false);

  // Checkout modal & terms
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const serviceId = Number(id);

  const { data: service, isLoading, error } = useQuery({
    queryKey: ["catalog-service", id],
    queryFn: () => getService(serviceId),
    enabled: Boolean(id) && !Number.isNaN(serviceId),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["catalog-categories"],
    queryFn: async () => {
      try {
        return await getCategories();
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const { data: providers = [] } = useQuery<PaymentProvider[]>({
    queryKey: ["payment-providers"],
    queryFn: async () => {
      try {
        return await getProviders();
      } catch {
        return [];
      }
    },
    enabled: isAuthenticated,
  });

  const category = useMemo(() => {
    if (!service?.catalog_id) return null;
    return categories.find((c) => c.id === service.catalog_id) || null;
  }, [service, categories]);

  const attachments: ServiceAttachment[] = useMemo(
    () => service?.attachments || [],
    [service]
  );

  const bannerAttachment =
    attachments.find((a) => a.tag === "banner") ||
    attachments.find((a) => a.kind === "image");
  const bannerUrl = bannerAttachment?.url || service?.image_url || "";

  const galleryAttachments = useMemo(() => {
    const tagged = attachments.filter((a) => a.tag === "gallery");
    if (tagged.length > 0) return tagged;
    return attachments.filter((a) => a.tag !== "banner" && a.tag !== "card");
  }, [attachments]);

  const pricingConfig = useMemo(
    () => (service?.pricing_config || {}) as Record<string, unknown>,
    [service]
  );

  const priceType = service?.price_type || "fixed";
  const currency = service?.currency || branding.currency || "RUB";

  // 1. Tiered plans (flat or grouped subtiers)
  const tiers = useMemo<FlatTier[]>(() => {
    if (priceType === "tiered" && Array.isArray(pricingConfig.tiers)) {
      return flattenTiers(pricingConfig.tiers as ServiceTier[]);
    }
    return [];
  }, [priceType, pricingConfig]);

  const activeTierCode = selectedTier || tiers[0]?.code || null;

  // 2. Custom pricing bounds
  const customMin = Number(pricingConfig.min ?? 10);
  const customMax = Number(pricingConfig.max ?? 100000);
  const customStep = Number(pricingConfig.step ?? 1);
  const effectiveCustomAmount =
    customAmountStr !== null
      ? Number(customAmountStr)
      : Number(service?.price ?? customMin);

  // 3. Configurable components
  const configComponents = useMemo<ConfigurableComponent[]>(() => {
    if (priceType === "configurable" && Array.isArray(pricingConfig.components)) {
      return pricingConfig.components as ConfigurableComponent[];
    }
    return [];
  }, [priceType, pricingConfig]);

  const effectiveComponents = useMemo(() => {
    const res: Record<string, string | number> = {};
    for (const c of configComponents) {
      if (componentValues[c.code] !== undefined) {
        res[c.code] = componentValues[c.code];
      } else if (c.default !== undefined) {
        res[c.code] = c.default;
      } else if (c.type === "select" && c.options?.length) {
        res[c.code] = String(c.options[0].value);
      } else {
        res[c.code] = Number(c.min ?? 0);
      }
    }
    return res;
  }, [configComponents, componentValues]);

  // 4. Merged SDUI Form state
  const formValues = useMemo(() => {
    const defaults = getInitialOrderFormValues(pricingConfig);
    return { ...defaults, ...formOverrides };
  }, [pricingConfig, formOverrides]);

  const handleFormChange = (fieldId: string, val: unknown) => {
    setFormOverrides((prev) => ({ ...prev, [fieldId]: val }));
    if (formErrors[fieldId]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  // Price calculation matching SaviorBill resolve_service_order
  const basePrice = useMemo(() => {
    if (!service) return 0;
    if (priceType === "tiered" && tiers.length > 0) {
      const active = tiers.find((t) => t.code === activeTierCode);
      return Number(active?.price ?? service.price ?? 0);
    }
    if (priceType === "custom") {
      return Number.isFinite(effectiveCustomAmount) ? effectiveCustomAmount : 0;
    }
    if (priceType === "configurable") {
      let total = Number(service.price ?? 0);
      for (const comp of configComponents) {
        const val = effectiveComponents[comp.code];
        if (comp.type === "select") {
          const opt = comp.options?.find((o) => String(o.value) === String(val));
          total += Number(opt?.price_delta ?? 0);
        } else {
          total += Number(val ?? 0) * Number(comp.unit_price ?? 0);
        }
      }
      return total;
    }
    return Number(service.price ?? 0);
  }, [
    service,
    priceType,
    tiers,
    activeTierCode,
    effectiveCustomAmount,
    configComponents,
    effectiveComponents,
  ]);

  const finalPrice = Math.max(0, basePrice - discountAmount);
  const userBalance = Number(user?.balance ?? 0);
  const bonusBalance = Number(user?.bonus_balance ?? 0);
  const totalBalance = userBalance + bonusBalance;
  const canPayFromBalance = totalBalance >= finalPrice;

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promocode.trim() || !service?.id) return;

    try {
      setCheckingPromo(true);
      const res = await api.get<{
        valid: boolean;
        discount: number;
        final_price: number;
        reason?: string;
      }>(
        `/promocodes/${encodeURIComponent(promocode.trim().toUpperCase())}/quote?service_id=${service.id}`
      );

      if (res.valid && res.discount > 0) {
        setDiscountAmount(Number(res.discount));
        const formattedDiscount = formatCurrency(res.discount, currency);
        setPromoSuccessMsg(`Скидка ${formattedDiscount} применена!`);
        toast.success(`Промокод применен: -${formattedDiscount}`);
      } else {
        setDiscountAmount(0);
        setPromoSuccessMsg("");
        toast.error(res.reason || "Промокод не дает скидку на этот товар");
      }
    } catch (err) {
      setDiscountAmount(0);
      setPromoSuccessMsg("");
      toast.error(getErrMsg(err, "Неверный или недействительный промокод"));
    } finally {
      setCheckingPromo(false);
    }
  };

  const validateCheckoutReady = (): boolean => {
    if (!isAuthenticated) {
      toast.info("Войдите в аккаунт для оформления заказа");
      navigate(`/login?from=/catalog/${id}`);
      return false;
    }

    if (!acceptedTerms) {
      toast.error("Необходимо принять условия соглашения");
      return false;
    }

    if (!service) return false;

    if (priceType === "custom") {
      if (
        !Number.isFinite(effectiveCustomAmount) ||
        effectiveCustomAmount < customMin ||
        effectiveCustomAmount > customMax
      ) {
        toast.error(`Введите сумму от ${customMin} до ${customMax} ${currency}`);
        return false;
      }
    }

    const validationErrs = validateOrderFormValues(pricingConfig, formValues);
    if (Object.keys(validationErrs).length > 0) {
      setFormErrors(validationErrs);
      toast.error(Object.values(validationErrs)[0]);
      return false;
    }

    return true;
  };

  const handleOpenCheckout = () => {
    if (!validateCheckoutReady()) return;
    setCheckoutOpen(true);
  };

  const executePurchase = async (selectedMethod: string) => {
    if (!validateCheckoutReady() || !service) return;

    const orderPayload = {
      service_id: service.id,
      tier_code: priceType === "tiered" ? activeTierCode || undefined : undefined,
      custom_amount: priceType === "custom" ? effectiveCustomAmount : undefined,
      components: priceType === "configurable" ? effectiveComponents : undefined,
      form: Object.keys(formValues).length > 0 ? formValues : undefined,
      promocode: promocode.trim().toUpperCase() || undefined,
    };

    try {
      setIsPurchasing(true);

      if (selectedMethod === "balance") {
        if (!canPayFromBalance) {
          toast.error("Недостаточно средств на балансе. Пополните счёт или выберите прямую оплату.");
          setCheckoutOpen(false);
          openTopUp();
          return;
        }

        const res = await api.post<{
          id: number;
          service_id: number;
          status: string;
          secret_key?: string;
        }>("/user/services/create", orderPayload);

        toast.success("Заказ успешно оплачен и выдан!");
        setCheckoutOpen(false);
        await refreshUser();
        await qc.invalidateQueries({ queryKey: ["user-services"] });
        await qc.invalidateQueries({ queryKey: ["user-purchases"] });

        if (res?.secret_key) {
          toast.success(`Ваш ключ: ${res.secret_key}`, { duration: 10000 });
        }
        navigate("/profile");
      } else {
        // Note: For target="service", backend resolves authoritative price server-side (must NOT send amount)
        const payment = await createInvoice({
          target: "service",
          provider: selectedMethod,
          currency,
          return_url: window.location.pathname,
          ...orderPayload,
        });

        setCheckoutOpen(false);
        const redirectUrl = payment.payment_url || payment.pay_url;
        if (redirectUrl) {
          toast.success("Переход на страницу оплаты...");
          window.location.href = redirectUrl;
        } else {
          toast.success("Счёт создан, проверьте статус в личном кабинете");
          navigate("/profile");
        }
      }
    } catch (err) {
      toast.error(getErrMsg(err, "Ошибка при оплате заказа"));
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Skeleton height={24} width={220} rounded="sm" />
          <div className={styles.layoutGrid}>
            <div className={styles.leftCol}>
              <Skeleton height={260} rounded="xl" />
              <Skeleton height={160} rounded="xl" />
            </div>
            <div className={styles.rightCol}>
              <Skeleton height={380} rounded="xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Reveal variant="fade-up" eager className={styles.emptyState}>
            <div className={styles.emptyIconWrap}>
              <PackageX size={28} />
            </div>
            <h2 className={styles.emptyTitle}>Товар не найден</h2>
            <p className={styles.emptySubtitle}>
              Возможно, товар снят с продажи или ссылка устарела.
            </p>
            <Button variant="gradient" size="md" onClick={() => navigate("/catalog")}>
              Вернуться в каталог
            </Button>
          </Reveal>
        </div>
      </div>
    );
  }

  const maxVisibleThumbs = 4;
  const canSlideLeft = sliderOffset > 0;
  const canSlideRight = sliderOffset + maxVisibleThumbs < galleryAttachments.length;
  const visibleThumbs = galleryAttachments.slice(
    sliderOffset,
    sliderOffset + maxVisibleThumbs
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link to="/catalog" className={styles.breadLink}>
            Каталог
          </Link>
          <ChevronRight size={13} className={styles.breadDivider} />
          {category && (
            <>
              <Link to={`/catalog?cat=${category.id}`} className={styles.breadLink}>
                {category.name}
              </Link>
              <ChevronRight size={13} className={styles.breadDivider} />
            </>
          )}
          <span className={styles.breadCurrent}>{service.name}</span>
        </nav>

        <div className={styles.layoutGrid}>
          {/* Left Column */}
          <div className={styles.leftCol}>
            <Reveal variant="fade-up" eager>
              <div
                className={styles.heroCard}
                style={
                  bannerUrl
                    ? {
                        backgroundImage: `linear-gradient(100deg, rgba(10, 10, 11, 0.95) 20%, rgba(10, 10, 11, 0.78) 62%, rgba(10, 10, 11, 0.45) 100%), url(${bannerUrl})`,
                      }
                    : undefined
                }
              >
                {!bannerUrl && <div className={styles.gridOverlay} aria-hidden="true" />}
                <div className={styles.heroContent}>
                  <div className={styles.metaRow}>
                    {category && (
                      <span className={styles.categoryBadge}>
                        <Layers size={13} />
                        <span>{category.name}</span>
                      </span>
                    )}
                    <span className={styles.deliveryBadge}>
                      {service.delivery === "key"
                        ? "Лицензионный ключ"
                        : "Автоматическая выдача"}
                    </span>
                  </div>

                  <h1 className={styles.productTitle}>
                    <MaskText direction="up" duration={600}>
                      {service.name}
                    </MaskText>
                  </h1>

                  <div className={styles.badgesRow}>
                    {service.out_of_stock ? (
                      <Badge variant="muted" size="md" dot>
                        Нет в наличии
                      </Badge>
                    ) : (
                      <Badge variant="success" size="md" dot>
                        Работает · В наличии
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>

            {galleryAttachments.length > 0 && (
              <Reveal variant="fade-up" delay={60} eager className={styles.mediaSection}>
                <div className={styles.sliderControlsWrap}>
                  {galleryAttachments.length > maxVisibleThumbs && (
                    <button
                      type="button"
                      disabled={!canSlideLeft}
                      className={styles.sliderNavBtn}
                      onClick={() => setSliderOffset((p) => Math.max(0, p - 1))}
                      aria-label="Назад"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  )}

                  <div className={styles.thumbnailsSlider}>
                    {visibleThumbs.map((item, localIdx) => {
                      const actualIdx = sliderOffset + localIdx;
                      const isVideo = item.kind === "video";

                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={styles.thumbBtn}
                          onClick={() => {
                            setActiveMediaIndex(actualIdx);
                            setLightboxOpen(true);
                          }}
                        >
                          {isVideo ? (
                            <div className={styles.videoThumbWrap}>
                              <video
                                src={item.url}
                                className={styles.thumbVideo}
                                preload="metadata"
                                muted
                              />
                              <div className={styles.videoThumbBadge}>
                                <Play size={17} fill="currentColor" />
                              </div>
                            </div>
                          ) : (
                            <img
                              src={item.url}
                              alt={`Скриншот ${actualIdx + 1}`}
                              className={styles.thumbImg}
                              loading="lazy"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {galleryAttachments.length > maxVisibleThumbs && (
                    <button
                      type="button"
                      disabled={!canSlideRight}
                      className={styles.sliderNavBtn}
                      onClick={() =>
                        setSliderOffset((p) =>
                          Math.min(galleryAttachments.length - maxVisibleThumbs, p + 1)
                        )
                      }
                      aria-label="Вперед"
                    >
                      <ChevronRight size={18} />
                    </button>
                  )}
                </div>
              </Reveal>
            )}

            {service.description && (
              <Reveal variant="fade-up" delay={100} eager className={styles.descriptionSection}>
                <div className={styles.descHeader}>
                  <Sparkles size={17} className={styles.descIcon} />
                  <h2 className={styles.descTitle}>ОПИСАНИЕ ПРОДУКТА</h2>
                </div>
                <div className={styles.descBody}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {service.description}
                  </ReactMarkdown>
                </div>
              </Reveal>
            )}
          </div>

          {/* Right Column: Checkout Sidebar */}
          <Reveal variant="fade-up" delay={80} eager className={styles.rightCol}>
            <div className={styles.balancePillWidget}>
              <div className={styles.balanceLeft}>
                <div className={styles.balanceIconWrap}>
                  <Wallet size={16} />
                </div>
                <div className={styles.balanceTextWrap}>
                  <span className={styles.balancePillLabel}>Ваш баланс</span>
                  <span className={styles.balancePillVal}>
                    {formatCurrency(userBalance, currency)}
                    {bonusBalance > 0 && (
                      <span className={styles.bonusPillVal}>
                        {" "}
                        +{bonusBalance.toFixed(0)} бон.
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <button type="button" className={styles.pillTopUpBtn} onClick={openTopUp}>
                <Plus size={13} />
                <span>Пополнить</span>
              </button>
            </div>

            <div className={styles.checkoutBox}>
              <h2 className={styles.checkoutTitle}>ОФОРМЛЕНИЕ ЗАКАЗА</h2>

              {/* Pricing Mode 1: Tiered Plans */}
              {priceType === "tiered" && tiers.length > 0 && (
                <div className={styles.tiersSection}>
                  {tiers.map((t) => {
                    const isSelected = activeTierCode === t.code;
                    return (
                      <button
                        key={t.code}
                        type="button"
                        className={clsx(styles.tierCard, isSelected && styles.tierSelected)}
                        onClick={() => setSelectedTier(t.code)}
                      >
                        <div className={styles.tierLeft}>
                          <span className={styles.radioDot}>
                            {isSelected && <span className={styles.innerDot} />}
                          </span>
                          <div className={styles.tierMeta}>
                            <span className={styles.tierLabel}>
                              {t.title || t.label || t.code}
                            </span>
                            {t.groupTitle && (
                              <span className={styles.tierGroup}>{t.groupTitle}</span>
                            )}
                          </div>
                        </div>
                        <span className={styles.tierPrice}>
                          {formatCurrency(t.price, currency)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Pricing Mode 2: Custom Amount */}
              {priceType === "custom" && (
                <div className={styles.customPriceBlock}>
                  <Input
                    label="Сумма оплаты"
                    type="number"
                    min={customMin}
                    max={customMax}
                    step={customStep}
                    value={customAmountStr ?? String(effectiveCustomAmount)}
                    onChange={(e) => setCustomAmountStr(e.target.value)}
                    hint={`Допустимо от ${formatCurrency(customMin, currency)} до ${formatCurrency(customMax, currency)}`}
                    rightSlot={<span className={styles.currencyTag}>{currency}</span>}
                  />
                </div>
              )}

              {/* Pricing Mode 3: Configurable Components */}
              {priceType === "configurable" && configComponents.length > 0 && (
                <div className={clsx(styles.configSection, "sbui-form-scope")}>
                  {configComponents.map((comp) => {
                    const val = effectiveComponents[comp.code];

                    if (comp.type === "select" && comp.options) {
                      const opts = comp.options.map((o) => {
                        const delta = Number(o.price_delta ?? 0);
                        return {
                          value: String(o.value),
                          label:
                            (o.label || String(o.value)) +
                            (delta !== 0
                              ? ` (${delta > 0 ? "+" : ""}${formatCurrency(delta, currency)})`
                              : ""),
                        };
                      });
                      return (
                        <Select
                          key={comp.code}
                          label={comp.name || comp.label || comp.code}
                          options={opts}
                          value={String(val)}
                          onChange={(next) =>
                            setComponentValues((prev) => ({ ...prev, [comp.code]: next }))
                          }
                        />
                      );
                    }

                    const min = Number(comp.min ?? 0);
                    const max = Number(comp.max ?? 100);
                    const step = Number(comp.step ?? 1);
                    const numVal = Number(val ?? min);
                    const unitPrice = Number(comp.unit_price ?? 0);

                    return (
                      <div key={comp.code} className={styles.sliderComp}>
                        <div className={styles.sliderTop}>
                          <span className={styles.sliderLabel}>
                            {comp.name || comp.label || comp.code}
                          </span>
                          <span className={styles.sliderVal}>
                            {numVal} {comp.unit || ""}
                            {unitPrice > 0 && (
                              <span className={styles.sliderDelta}>
                                {" "}
                                (+{formatCurrency(numVal * unitPrice, currency)})
                              </span>
                            )}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          step={step}
                          value={numVal}
                          onChange={(e) =>
                            setComponentValues((prev) => ({
                              ...prev,
                              [comp.code]: Number(e.target.value),
                            }))
                          }
                          className={styles.rangeInput}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pricing Mode 4: Fixed */}
              {priceType === "fixed" && (
                <div className={clsx(styles.tierCard, styles.tierSelected, styles.tierStatic)}>
                  <div className={styles.tierLeft}>
                    <span className={styles.radioDot}>
                      <span className={styles.innerDot} />
                    </span>
                    <span className={styles.tierLabel}>Лицензия / Доступ</span>
                  </div>
                  <span className={styles.tierPrice}>
                    {formatCurrency(service.price, currency)}
                  </span>
                </div>
              )}

              {/* SDUI Dynamic Order Form (via @unvislate/sbui-sdk with external overrides) */}
              <SbuiOrderForm
                pricingConfig={pricingConfig}
                values={formValues}
                onChange={handleFormChange}
                errors={formErrors}
              />

              {/* Promo Code */}
              <div className={styles.promoContainer}>
                {!promoExpanded ? (
                  <div className={styles.promoTriggerRow}>
                    <div className={styles.promoTextWrap}>
                      <Tag size={14} className={styles.promoTagIcon} />
                      <span>Есть промокод?</span>
                    </div>
                    <button
                      type="button"
                      className={styles.promoLinkBtn}
                      onClick={() => setPromoExpanded(true)}
                    >
                      Ввести
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromo} className={styles.promoForm}>
                    <div className={styles.promoInputRow}>
                      <Input
                        type="text"
                        value={promocode}
                        onChange={(e) => setPromocode(e.target.value)}
                        placeholder="Промокод..."
                        autoFocus
                      />
                      <Button
                        type="submit"
                        variant="secondary"
                        size="md"
                        loading={checkingPromo}
                        disabled={!promocode.trim()}
                      >
                        Применить
                      </Button>
                    </div>
                    {promoSuccessMsg && (
                      <span className={styles.promoSuccessText}>{promoSuccessMsg}</span>
                    )}
                  </form>
                )}
              </div>

              <label className={styles.termsLabel}>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className={styles.checkbox}
                />
                <span className={styles.termsText}>
                  Принимаю пользовательское соглашение и условия покупки
                </span>
              </label>

              <Button
                variant="gradient"
                size="lg"
                loading={isPurchasing}
                onClick={handleOpenCheckout}
                disabled={service.out_of_stock || !acceptedTerms}
                className={styles.checkoutBtn}
                icon={<CreditCard size={18} />}
              >
                {service.out_of_stock
                  ? "Нет в наличии"
                  : `Оплатить ${formatCurrency(finalPrice, currency)}`}
              </Button>
            </div>
          </Reveal>
        </div>
      </div>

      <OrderCheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        serviceName={service.name}
        serviceSubtitle={
          priceType === "tiered"
            ? tiers.find((t) => t.code === activeTierCode)?.title ||
              tiers.find((t) => t.code === activeTierCode)?.label
            : priceType === "configurable"
              ? `${Object.values(effectiveComponents).slice(0, 3).join(" · ")}`
              : undefined
        }
        thumbnailUrl={bannerUrl || service.image_url}
        currency={currency}
        basePrice={basePrice}
        promoCode={promocode.trim() || undefined}
        promoDiscount={discountAmount}
        userBalance={userBalance}
        bonusBalance={bonusBalance}
        providers={providers}
        isSubmitting={isPurchasing}
        onOpenTopUp={openTopUp}
        onConfirm={executePurchase}
      />

      <MediaLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        items={galleryAttachments.map((a) => ({
          id: a.id,
          url: a.url,
          type: (a.kind === "video" ? "video" : "image") as "image" | "video",
        }))}
        currentIndex={activeMediaIndex}
        onNavigate={(idx) => setActiveMediaIndex(idx)}
      />
    </div>
  );
};

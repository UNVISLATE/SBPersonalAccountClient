import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { getProviders, createInvoice } from "@/api/endpoints/purchases";
import { ApiError } from "@/api/client";
import type { PaymentProvider } from "@/api/types";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { formatCurrency } from "@/lib/format";
import {
  buildTopUpPresets,
  calculateTopUpPreview,
  getProviderFeeInfo,
  groupPaymentProviders,
  roundToNiceAmount,
} from "@/lib/payment-providers";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Skeleton } from "@/components/motion";
import { toast } from "sonner";
import { Wallet, CreditCard, ArrowRight, ChevronDown } from "lucide-react";
import clsx from "clsx";
import styles from "./TopUpModal.module.scss";

export interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const BASE_PRESET_AMOUNTS = [100, 500, 1000, 2500, 5000, 10000];

export const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { branding } = useBranding();

  const [amount, setAmount] = useState<string>("500");
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");
  const [othersExpanded, setOthersExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const brandCurrency = branding.currency || "RUB";
  const currentBalance = Number(user?.balance ?? 0);

  const { data: providers = [], isLoading } = useQuery<PaymentProvider[]>({
    queryKey: ["payment-providers"],
    queryFn: async () => {
      try {
        return await getProviders();
      } catch {
        return [];
      }
    },
    enabled: isOpen,
  });

  const { sorted: sortedProviders, featured: featuredProviders, others: otherProviders } = useMemo(
    () => groupPaymentProviders(providers),
    [providers]
  );

  const activeProvider =
    sortedProviders.find((p) => p.slug === selectedSlug) ||
    featuredProviders[0] ||
    sortedProviders[0];

  const availableCurrencies =
    activeProvider?.currencies && activeProvider.currencies.length > 0
      ? activeProvider.currencies
      : activeProvider?.available_currencies && activeProvider.available_currencies.length > 0
        ? activeProvider.available_currencies
        : [activeProvider?.currency || brandCurrency];

  const activeCurrency =
    selectedCurrency && availableCurrencies.includes(selectedCurrency)
      ? selectedCurrency
      : activeProvider?.currency || brandCurrency;

  const rateToBase =
    activeCurrency.toUpperCase() === brandCurrency.toUpperCase()
      ? 1
      : activeProvider?.fx_rates?.[activeCurrency.toUpperCase()] || 0;

  const presetAmounts = useMemo(
    () => buildTopUpPresets(BASE_PRESET_AMOUNTS, rateToBase),
    [rateToBase]
  );

  const numAmount = parseFloat(amount);
  const validAmount = !isNaN(numAmount) && numAmount > 0 ? numAmount : 0;
  const preview = useMemo(
    () => calculateTopUpPreview(validAmount, activeCurrency, brandCurrency, activeProvider),
    [validAmount, activeCurrency, brandCurrency, activeProvider]
  );

  const convertInputOnCurrencySwitch = (
    prevCurrency: string,
    nextCurrency: string,
    nextProvider?: PaymentProvider
  ) => {
    const prevU = prevCurrency.toUpperCase();
    const nextU = nextCurrency.toUpperCase();
    if (prevU === nextU) return;

    const prevRate =
      prevU === brandCurrency.toUpperCase()
        ? 1
        : (activeProvider?.fx_rates?.[prevU] ?? nextProvider?.fx_rates?.[prevU] ?? 0);
    const nextRate =
      nextU === brandCurrency.toUpperCase()
        ? 1
        : (nextProvider?.fx_rates?.[nextU] ?? activeProvider?.fx_rates?.[nextU] ?? 0);

    const parsed = parseFloat(amount);
    if (!isNaN(parsed) && parsed > 0 && prevRate > 0 && nextRate > 0) {
      const baseEquivalent = parsed * prevRate;
      const converted = roundToNiceAmount(baseEquivalent / nextRate);
      setAmount(String(converted));
      return;
    }
    const nextPresets = buildTopUpPresets(BASE_PRESET_AMOUNTS, nextRate);
    setAmount(String(nextPresets[1] ?? nextPresets[0] ?? 10));
  };

  const handleSelectCurrency = (nextCurrency: string) => {
    convertInputOnCurrencySwitch(activeCurrency, nextCurrency, activeProvider);
    setSelectedCurrency(nextCurrency);
  };

  const handleSelectProvider = (provider: PaymentProvider) => {
    const nextCur = provider.currency || brandCurrency;
    convertInputOnCurrencySwitch(activeCurrency, nextCur, provider);
    setSelectedSlug(provider.slug);
    setSelectedCurrency(nextCur);
  };

  const renderProviderIcon = (p: PaymentProvider, size: "md" | "sm" = "md") => {
    if (p.icon_url) {
      return (
        <img
          src={p.icon_url}
          alt={p.title || p.name || p.slug}
          className={size === "sm" ? styles.miniProviderImg : styles.providerImg}
        />
      );
    }
    return size === "sm" ? (
      <CreditCard size={12} className={styles.miniProviderIcon} />
    ) : (
      <span className={styles.providerIconBox}>
        <CreditCard size={16} className={styles.providerIcon} />
      </span>
    );
  };

  const renderProviderButton = (p: PaymentProvider, featuredBadge = false) => {
    const isSelected = activeProvider?.slug === p.slug;
    const displayName = p.title || p.name || p.slug;
    const fee = getProviderFeeInfo(p);

    return (
      <button
        key={p.slug}
        type="button"
        className={clsx(
          styles.providerCard,
          featuredBadge && p.is_recommended && styles.featuredCard,
          isSelected && styles.providerSelected
        )}
        onClick={() => handleSelectProvider(p)}
      >
        {featuredBadge && p.is_recommended && (
          <span className={styles.recommendedPill}>РЕКОМЕНДУЕМ</span>
        )}

        <span className={styles.radioDot}>
          {isSelected && <span className={styles.innerDot} />}
        </span>

        {renderProviderIcon(p)}

        <div className={styles.providerInfo}>
          <span className={styles.providerName}>{displayName}</span>
          <span className={styles.providerCurrency}>
            {p.currencies?.length ? p.currencies.join(" · ") : p.currency}
          </span>
        </div>

        <span className={clsx(styles.feeBadge, fee.hasFee ? styles.feeWarn : styles.feeFree)}>
          {fee.hasFee ? `+${fee.percent} %` : "Без комиссии"}
        </span>
      </button>
    );
  };

  const handleTopUp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Введите корректную сумму пополнения");
      return;
    }
    if (!activeProvider) {
      toast.error("Выберите способ оплаты");
      return;
    }

    try {
      setSubmitting(true);
      const res = await createInvoice({
        amount: numAmount,
        provider: activeProvider.slug,
        target: "balance",
        currency: activeCurrency,
        amount_in_payment_currency:
          activeCurrency.toUpperCase() !== brandCurrency.toUpperCase(),
        return_url: window.location.pathname,
      });

      const redirectUrl = res?.payment_url || res?.pay_url;
      if (redirectUrl) {
        toast.success("Переход на страницу оплаты...");
        window.location.href = redirectUrl;
      } else {
        toast.success("Счёт на оплату создан!");
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.detail
          : err instanceof Error
            ? err.message
            : "Ошибка создания платежа";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ПОПОЛНЕНИЕ БАЛАНСА"
      subtitle={`Текущий баланс: ${formatCurrency(currentBalance, brandCurrency)}`}
      maxWidth={480}
      variant="sheet"
    >
      <form onSubmit={handleTopUp} className={styles.container}>
        {/* Preset Capsules */}
        <div className={styles.section}>
          <span className={styles.label}>Сумма пополнения</span>
          <div className={styles.presetsGrid}>
            {presetAmounts.map((val) => {
              const isSelected = amount === String(val);
              return (
                <button
                  key={val}
                  type="button"
                  className={clsx(styles.presetBtn, isSelected && styles.presetActive)}
                  onClick={() => setAmount(String(val))}
                >
                  {formatCurrency(val, activeCurrency)}
                </button>
              );
            })}
          </div>

          <Input
            type="number"
            min="0.01"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Или введите свою сумму"
            rightSlot={<span className={styles.currencyTag}>{activeCurrency}</span>}
          />

          {validAmount > 0 && (preview.isForeign || preview.feePercent > 0) && (
            <div className={styles.conversionHint}>
              {preview.isForeign && preview.baseCredit > 0 && (
                <span>
                  На баланс: <strong>≈ {formatCurrency(preview.baseCredit, brandCurrency)}</strong>
                </span>
              )}
              <span>
                К оплате: <strong>{formatCurrency(preview.payTotal, activeCurrency)}</strong>
                {preview.feePercent > 0 ? ` (вкл. +${preview.feePercent}%)` : ""}
              </span>
            </div>
          )}
        </div>

        {/* Currency Switcher (only when provider supports multiple) */}
        {availableCurrencies.length > 1 && (
          <div className={styles.section}>
            <span className={styles.label}>Валюта оплаты</span>
            <div className={styles.currencyPills}>
              {availableCurrencies.map((cur) => (
                <button
                  key={cur}
                  type="button"
                  className={clsx(
                    styles.currencyPill,
                    activeCurrency === cur && styles.currencyPillActive
                  )}
                  onClick={() => handleSelectCurrency(cur)}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Payment Providers */}
        <div className={styles.section}>
          <span className={styles.label}>Способ оплаты</span>
          {isLoading ? (
            <div className={styles.loadingList}>
              <Skeleton height={54} rounded="md" />
              <Skeleton height={54} rounded="md" />
            </div>
          ) : sortedProviders.length === 0 ? (
            <div className={styles.emptyProviders}>
              <Wallet size={18} />
              <span>Платежные способы временно недоступны</span>
            </div>
          ) : (
            <div className={styles.providersList}>
              {featuredProviders.map((p) => renderProviderButton(p, true))}

              {otherProviders.length > 0 && (
                <>
                  <button
                    type="button"
                    className={styles.otherToggle}
                    onClick={() => setOthersExpanded((v) => !v)}
                    aria-expanded={othersExpanded}
                  >
                    <div className={styles.stackedIcons}>
                      {otherProviders.slice(0, 4).map((p) => (
                        <span key={p.slug} className={styles.stackedIconItem}>
                          {renderProviderIcon(p, "sm")}
                        </span>
                      ))}
                    </div>

                    <div className={styles.providerInfo}>
                      <span className={styles.providerName}>Другие способы</span>
                      <span className={styles.providerCurrency}>
                        {othersExpanded
                          ? "Свернуть список"
                          : otherProviders
                              .map((p) => p.title || p.name || p.slug)
                              .slice(0, 3)
                              .join(", ")}
                      </span>
                    </div>

                    {!othersExpanded && (
                      <span className={styles.moreCountBadge}>+{otherProviders.length}</span>
                    )}
                    <span className={clsx(styles.chevronCircle, othersExpanded && styles.chevronOpen)}>
                      <ChevronDown size={15} />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {othersExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                        className={styles.otherListFlatMotion}
                      >
                        <div className={styles.otherListFlat}>
                          {otherProviders.map((p) => renderProviderButton(p, false))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          )}
        </div>

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          loading={submitting}
          disabled={!activeProvider || sortedProviders.length === 0}
          className={styles.submitBtn}
          icon={<ArrowRight size={17} />}
          iconPosition="right"
        >
          Продолжить
        </Button>
      </form>
    </Modal>
  );
};

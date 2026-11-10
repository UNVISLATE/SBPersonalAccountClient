import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import type { PaymentProvider } from "@/api/types";
import { formatCurrency } from "@/lib/format";
import { getProviderFeeInfo, groupPaymentProviders } from "@/lib/payment-providers";
import {
  ChevronDown,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import clsx from "clsx";
import styles from "./OrderCheckoutModal.module.scss";

export interface OrderCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  serviceSubtitle?: string;
  thumbnailUrl?: string | null;
  currency: string;
  basePrice: number;
  promoCode?: string;
  promoDiscount: number;
  userBalance: number;
  bonusBalance: number;
  providers: PaymentProvider[];
  isSubmitting: boolean;
  onOpenTopUp: () => void;
  onConfirm: (selectedMethod: string) => Promise<void> | void;
}

export const OrderCheckoutModal: React.FC<OrderCheckoutModalProps> = ({
  isOpen,
  onClose,
  serviceName,
  serviceSubtitle,
  thumbnailUrl,
  currency,
  basePrice,
  promoCode,
  promoDiscount,
  userBalance,
  bonusBalance,
  providers,
  isSubmitting,
  onOpenTopUp,
  onConfirm,
}) => {
  const { sorted: sortedProviders, featured: featuredProviders, others: otherProviders } = useMemo(
    () => groupPaymentProviders(providers),
    [providers]
  );

  const primaryProvider = featuredProviders[0] || null;

  const netAfterPromo = Math.max(0, basePrice - promoDiscount);
  const totalBalance = userBalance + bonusBalance;
  const canPayFromBalance = totalBalance >= netAfterPromo;

  const defaultMethod = useMemo(() => {
    if (canPayFromBalance) return "balance";
    if (primaryProvider) return primaryProvider.slug;
    return "balance";
  }, [canPayFromBalance, primaryProvider]);

  const [selectedMethod, setSelectedMethod] = useState<string>(defaultMethod);
  const [othersExpanded, setOthersExpanded] = useState(false);

  // Keep valid selection when balance or provider list changes before manual choice
  const activeMethod = useMemo(() => {
    if (selectedMethod === "balance") return "balance";
    if (sortedProviders.some((p) => p.slug === selectedMethod)) return selectedMethod;
    return defaultMethod;
  }, [selectedMethod, sortedProviders, defaultMethod]);

  const selectedProvider = useMemo(
    () => sortedProviders.find((p) => p.slug === activeMethod),
    [sortedProviders, activeMethod]
  );

  const isBalanceSelected = activeMethod === "balance";

  const feeInfo = isBalanceSelected
    ? { hasFee: false, percent: 0 }
    : getProviderFeeInfo(selectedProvider);

  const feeAmount = feeInfo.hasFee
    ? Math.round(netAfterPromo * (feeInfo.percent / 100) * 100) / 100
    : 0;

  const bonusUsedOnBalance = isBalanceSelected
    ? Math.min(bonusBalance, netAfterPromo)
    : 0;
  const mainUsedOnBalance = isBalanceSelected
    ? Math.max(0, netAfterPromo - bonusUsedOnBalance)
    : 0;

  const payableAmount = isBalanceSelected
    ? mainUsedOnBalance
    : netAfterPromo + feeAmount;
  const maxUsableBonus = Math.min(bonusBalance, netAfterPromo);

  const renderProviderIcon = (p: PaymentProvider, size: "md" | "sm" = "md") => {
    if (p.icon_url) {
      return (
        <img
          src={p.icon_url}
          alt={p.title || p.slug}
          className={size === "sm" ? styles.miniProviderImg : styles.providerImg}
        />
      );
    }
    return (
      <span className={size === "sm" ? styles.miniProviderFallback : styles.providerFallback}>
        <CreditCard size={size === "sm" ? 12 : 15} />
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={840}
      showCloseButton={false}
      variant="sheet"
      className={styles.checkoutModalRoot}
    >
      <div className={styles.splitGrid}>
        {/* Left Column: Payment Methods */}
        <div className={styles.leftCol} data-lenis-prevent data-lenis-prevent-wheel>
          <div className={styles.leftHeader}>
            <h2 className={styles.modalTitle}>ОПЛАТА ЗАКАЗА</h2>
          </div>

          <div className={styles.methodsStack}>
            {/* Featured Recommended Providers */}
            {featuredProviders.map((provider) => {
              const f = getProviderFeeInfo(provider);
              return (
                <button
                  key={provider.slug}
                  type="button"
                  className={clsx(
                    styles.methodCard,
                    provider.is_recommended && styles.featuredCard,
                    activeMethod === provider.slug && styles.methodSelected
                  )}
                  onClick={() => setSelectedMethod(provider.slug)}
                >
                  {provider.is_recommended && (
                    <span className={styles.recommendedPill}>РЕКОМЕНДУЕМ</span>
                  )}

                  <span className={styles.radioDot}>
                    {activeMethod === provider.slug && <span className={styles.innerDot} />}
                  </span>

                  <div className={styles.methodMain}>
                    <span className={styles.methodTitle}>
                      {provider.title || provider.name || provider.slug}
                    </span>
                    <div className={styles.iconStrip}>
                      {renderProviderIcon(provider)}
                      <span className={styles.currencyLabel}>{provider.currency}</span>
                    </div>
                  </div>

                  <span className={clsx(styles.feeBadge, f.hasFee ? styles.feeWarn : styles.feeFree)}>
                    {f.hasFee ? `+${f.percent} %` : "Без комиссии"}
                  </span>
                </button>
              );
            })}

            {/* Balance + Bonus Option */}
            {(canPayFromBalance || totalBalance > 0) && (
              <button
                type="button"
                className={clsx(
                  styles.methodCard,
                  activeMethod === "balance" && styles.methodSelected,
                  !canPayFromBalance && styles.methodDisabledHint
                )}
                onClick={() => {
                  if (canPayFromBalance) {
                    setSelectedMethod("balance");
                  } else {
                    onClose();
                    onOpenTopUp();
                  }
                }}
              >
                <span className={styles.radioDot}>
                  {activeMethod === "balance" && <span className={styles.innerDot} />}
                </span>

                <span className={styles.balanceIconBadge}>
                  <Wallet size={16} />
                </span>

                <div className={styles.methodMain}>
                  <span className={styles.methodTitle}>Баланс и бонусы</span>
                  <span className={styles.methodSubtext}>
                    {canPayFromBalance
                      ? bonusUsedOnBalance > 0 || bonusBalance > 0
                        ? `Спишется ${formatCurrency(maxUsableBonus, currency)} бонусами`
                        : `Доступно: ${formatCurrency(totalBalance, currency)}`
                      : `Не хватает ${formatCurrency(netAfterPromo - totalBalance, currency)} — пополнить`}
                  </span>
                </div>

                <span className={clsx(styles.feeBadge, styles.feeFree)}>0 %</span>
              </button>
            )}

            {/* Collapsible "Другие способы" Toggle + Flat List (NO nested card wrapper) */}
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

                  <div className={styles.methodMain}>
                    <span className={styles.methodTitle}>Другие способы</span>
                    <span className={styles.methodSubtext}>
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
                        {otherProviders.map((p) => {
                          const selected = activeMethod === p.slug;
                          const f = getProviderFeeInfo(p);
                          return (
                            <button
                              key={p.slug}
                              type="button"
                              className={clsx(styles.methodCard, selected && styles.methodSelected)}
                              onClick={() => setSelectedMethod(p.slug)}
                            >
                              <span className={styles.radioDot}>
                                {selected && <span className={styles.innerDot} />}
                              </span>
                              <div className={styles.methodMain}>
                                <span className={styles.methodTitle}>
                                  {p.title || p.name || p.slug}
                                </span>
                                <div className={styles.iconStrip}>
                                  {renderProviderIcon(p)}
                                  <span className={styles.currencyLabel}>{p.currency}</span>
                                </div>
                              </div>
                              <span className={clsx(styles.feeBadge, f.hasFee ? styles.feeWarn : styles.feeFree)}>
                                {f.hasFee ? `+${f.percent} %` : "0 %"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            <button
              type="button"
              className={styles.inlineTopUpLink}
              onClick={() => {
                onClose();
                onOpenTopUp();
              }}
            >
              На балансе {formatCurrency(userBalance, currency)}
              {bonusBalance > 0 ? ` (+${formatCurrency(bonusBalance, currency)} бон.)` : ""} — пополнить
            </button>
          </div>

          <div className={styles.trustFooter}>
            <ShieldCheck size={14} />
            <span>Моментальная выдача после оплаты · Защищённое соединение</span>
          </div>
        </div>

        {/* Right Column: Order Breakdown & Total */}
        <div className={styles.rightCol} data-lenis-prevent data-lenis-prevent-wheel>
          <div className={styles.rightHeader}>
            <span className={styles.rightHeading}>Детали заказа</span>
            <button
              type="button"
              className={styles.desktopCloseBtn}
              onClick={onClose}
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          </div>

          <div className={styles.productSummary}>
            <div className={styles.productThumb}>
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt={serviceName} />
              ) : (
                <Sparkles size={18} />
              )}
            </div>
            <div className={styles.productMeta}>
              <span className={styles.productTitle}>{serviceName}</span>
              {serviceSubtitle && (
                <span className={styles.productSub}>{serviceSubtitle}</span>
              )}
            </div>
          </div>

          <div className={styles.breakdown}>
            <div className={styles.breakRow}>
              <span>Цена</span>
              <span>{formatCurrency(basePrice, currency)}</span>
            </div>

            {promoDiscount > 0 && (
              <div className={clsx(styles.breakRow, styles.savingRow)}>
                <span>Промокод{promoCode ? ` (${promoCode.toUpperCase()})` : ""}</span>
                <span>−{formatCurrency(promoDiscount, currency)}</span>
              </div>
            )}

            {isBalanceSelected && bonusUsedOnBalance > 0 && (
              <div className={clsx(styles.breakRow, styles.savingRow)}>
                <span>Спишется с бонусов</span>
                <span>−{formatCurrency(bonusUsedOnBalance, currency)}</span>
              </div>
            )}

            {!isBalanceSelected && maxUsableBonus > 0 && (
              <div className={styles.bonusTipRow}>
                <Sparkles size={13} />
                <span>
                  {canPayFromBalance
                    ? `Бонусы сэкономят ${formatCurrency(maxUsableBonus, currency)} при оплате с баланса`
                    : `Накоплено ${formatCurrency(bonusBalance, currency)} бонусами — пополните баланс для списания`}
                </span>
              </div>
            )}

            {feeAmount > 0 && (
              <div className={clsx(styles.breakRow, styles.feeRow)}>
                <span>Комиссия (+{feeInfo.percent}%)</span>
                <span>+{formatCurrency(feeAmount, currency)}</span>
              </div>
            )}
          </div>

          <div className={styles.totalFooter}>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>
                {isBalanceSelected ? "С основного баланса" : "К оплате"}
              </span>
              <span className={styles.totalAmount}>
                {formatCurrency(payableAmount, currency)}
              </span>
            </div>

            <Button
              variant="gradient"
              size="lg"
              loading={isSubmitting}
              onClick={() => onConfirm(activeMethod)}
              className={styles.confirmBtn}
            >
              {isBalanceSelected && bonusUsedOnBalance >= netAfterPromo
                ? `Оплатить бонусами (${formatCurrency(bonusUsedOnBalance, currency)})`
                : isBalanceSelected && bonusUsedOnBalance > 0
                  ? `Оплатить (${formatCurrency(payableAmount, currency)} + ${bonusUsedOnBalance.toFixed(0)} бон.)`
                  : `Оплатить ${formatCurrency(payableAmount, currency)}`}
            </Button>

            <p className={clsx(styles.feeNote, !feeInfo.hasFee && styles.feeNoteFree)}>
              {isBalanceSelected && bonusUsedOnBalance >= netAfterPromo
                ? "Полностью покрыто бонусами · Без доплаты"
                : feeInfo.hasFee
                  ? `Включая комиссию шлюза ${feeInfo.percent}%`
                  : `Без комиссии — ровно ${formatCurrency(payableAmount, currency)}`}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

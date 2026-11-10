import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { OTPInput } from "@/components/ui/OTPInput/OTPInput";
import { Logo } from "@/components/ui/Logo/Logo";
import { CapsuleTabs, MaskText, Reveal } from "@/components/motion";
import { toast } from "sonner";
import {
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import styles from "./AuthPage.module.scss";

export interface AuthPageProps {
  initialMode?: "login" | "register" | "claim";
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = "login" }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register" | "claim">(initialMode);
  const [loginValue, setLoginValue] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [claimCode, setClaimCode] = useState(() => searchParams.get("code") || "");
  const [totpValue, setTotpValue] = useState("");
  const [requiresTotp, setRequiresTotp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mascotFailed, setMascotFailed] = useState(false);

  const { login, register, claimGuestAccount } = useAuth();
  const { branding } = useBranding();

  const rawReturnUrl = searchParams.get("from") || "/profile";
  const returnUrl =
    rawReturnUrl.startsWith("/") && !rawReturnUrl.startsWith("//")
      ? rawReturnUrl
      : "/profile";

  const handleModeChange = (nextId: string) => {
    const nextMode = nextId as "login" | "register";
    setMode(nextMode);
    setRequiresTotp(false);
    setTotpValue("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "claim") {
      if (!claimCode.trim() || !passwordValue) {
        toast.error("Введите код активации и новый пароль");
        return;
      }
      try {
        setSubmitting(true);
        await claimGuestAccount(claimCode.trim(), passwordValue);
        toast.success("Аккаунт успешно привязан!");
        navigate("/profile", { replace: true });
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.detail
            : err instanceof Error
              ? err.message
              : "Ошибка активации аккаунта";
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!loginValue.trim()) {
      toast.error("Введите логин");
      return;
    }
    if (!passwordValue) {
      toast.error("Введите пароль");
      return;
    }
    if (mode === "register" && !emailValue.trim()) {
      toast.error("Введите Email для регистрации");
      return;
    }

    try {
      setSubmitting(true);

      if (mode === "login") {
        await login(loginValue.trim(), passwordValue, totpValue.trim() || undefined);
        toast.success("Вход выполнен успешно!");
        navigate(returnUrl, { replace: true });
      } else {
        await register(loginValue.trim(), emailValue.trim(), passwordValue);
        toast.success("Регистрация успешна!");
        navigate("/profile", { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.detail === "TOTP_REQUIRED") {
        setRequiresTotp(true);
        toast.info("Введите 6-значный код двухфакторной аутентификации");
        return;
      }
      const msg =
        err instanceof ApiError
          ? err.detail
          : err instanceof Error
            ? err.message
            : "Ошибка входа в систему";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const tabItems = [
    { id: "login", label: "Авторизация" },
    { id: "register", label: "Регистрация" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.ambientGlow} aria-hidden="true" />

      <Reveal variant="fade-blur" eager className={styles.authContainer}>
        {/* Left Poster Card (Ghost Style with Mascot, static - no hover gimmicks) */}
        <div className={styles.posterCard}>
          <div className={styles.gridOverlay} aria-hidden="true" />
          <div className={styles.glowOrb} aria-hidden="true" />

          <div className={styles.posterBadge}>
            <ShieldCheck size={15} />
            <span>{branding.name}</span>
          </div>

          <div className={styles.mascotWrapper}>
            {!mascotFailed ? (
              <img
                key={branding.mascot_url || "default-mascot"}
                src={branding.mascot_url || "/unvi/mascot/HelloMascotUNVI.webp"}
                alt={branding.name}
                className={styles.mascotImage}
                onError={() => setMascotFailed(true)}
              />
            ) : (
              <div className={styles.mascotFallback}>
                <Logo src={branding.logo_url} size={84} />
              </div>
            )}
          </div>

          <div className={styles.posterFooter}>
            <p className={styles.posterFooterText}>
              Закрытый личный кабинет · Защищённое соединение
            </p>
          </div>
        </div>

        {/* Right Form Card */}
        <div className={styles.formCard}>
          {/* Mobile Brand Header */}
          <div className={styles.mobileBrand}>
            <Logo src={branding.logo_url} size={28} />
            <span>{branding.name}</span>
          </div>

          <div className={styles.formHeader}>
            <h1 className={styles.title}>
              <MaskText direction="up" duration={600}>
                {mode === "claim" ? "АКТИВАЦИЯ ДОСТУПА" : "ДОБРО ПОЖАЛОВАТЬ!"}
              </MaskText>
            </h1>
            <p className={styles.subtitle}>
              {mode === "claim"
                ? "Укажите код из заказа и задайте пароль для входа в кабинет"
                : mode === "login"
                  ? "Войдите в аккаунт для управления услугами и балансом"
                  : "Создайте учетную запись для доступа к личному кабинету"}
            </p>
          </div>

          {mode !== "claim" && (
            <div className={styles.tabsWrap}>
              <CapsuleTabs
                items={tabItems}
                activeId={mode}
                onChange={handleModeChange}
                layoutId="auth-mode-pill"
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {mode === "claim" ? (
              <Input
                label="Код активации"
                type="text"
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value)}
                placeholder="Вставьте код из письма или чека"
                leftIcon={<KeyRound size={17} />}
                required
              />
            ) : (
              <Input
                label="Логин"
                type="text"
                value={loginValue}
                onChange={(e) => setLoginValue(e.target.value)}
                placeholder="Ваш логин"
                leftIcon={<User size={17} />}
                autoComplete="username"
                required
              />
            )}

            <AnimatePresence initial={false}>
              {mode === "register" && (
                <motion.div
                  key="email-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <Input
                    label="Электронная почта"
                    type="email"
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    placeholder="name@example.com"
                    leftIcon={<Mail size={17} />}
                    autoComplete="email"
                    required
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Input
              label={mode === "claim" ? "Новый пароль" : "Пароль"}
              type={showPassword ? "text" : "password"}
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
              placeholder="••••••••••••"
              leftIcon={<Lock size={17} />}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              rightSlot={
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <AnimatePresence>
              {requiresTotp && (
                <motion.div
                  key="totp-field"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={styles.totpGroup}
                >
                  <span className={styles.totpLabel}>Код 2FA (Authenticator)</span>
                  <OTPInput
                    value={totpValue}
                    onChange={setTotpValue}
                    length={6}
                    autoFocus
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {mode === "login" && (
              <div className={styles.formExtra}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span>Запомнить меня</span>
                </label>
                <button
                  type="button"
                  className={styles.textLink}
                  onClick={() => setMode("claim")}
                >
                  Есть код активации?
                </button>
              </div>
            )}

            {mode === "claim" && (
              <div className={styles.formExtra}>
                <button
                  type="button"
                  className={styles.textLink}
                  onClick={() => setMode("login")}
                >
                  Вернуться ко входу
                </button>
              </div>
            )}

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              loading={submitting}
              className={styles.submitBtn}
              icon={<ArrowRight size={18} />}
              iconPosition="right"
            >
              {mode === "claim"
                ? "Активировать аккаунт"
                : mode === "login"
                  ? "Войти в кабинет"
                  : "Создать аккаунт"}
            </Button>
          </form>
        </div>
      </Reveal>
    </div>
  );
};

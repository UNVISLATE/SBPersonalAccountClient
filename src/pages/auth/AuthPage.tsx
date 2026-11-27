import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/api/client";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import {
  requestGuestClaim,
  requestPasswordReset,
  confirmPasswordReset,
  confirmOAuth2fa,
} from "@/api/endpoints/auth";
import { Logo } from "@/components/ui/Logo/Logo";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { CapsuleTabs } from "@/components/motion";
import { OTPInput } from "@/components/ui/OTPInput/OTPInput";
import { Reveal } from "@/components/motion/Reveal";
import { MaskText } from "@/components/motion/MaskText";
import {
  ShieldCheck,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  RotateCcw,
  Info,
} from "lucide-react";
import styles from "./AuthPage.module.scss";

export interface AuthPageProps {
  initialMode?: "login" | "register" | "claim" | "reset";
}

interface OAuthProviderItem {
  slug: string;
  title?: string | null;
  icon_url?: string | null;
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = "login" }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register" | "claim" | "reset">(initialMode);
  const [loginValue, setLoginValue] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");

  // Claim guest flow states
  const [claimEmail, setClaimEmail] = useState("");
  const [claimToken, setClaimToken] = useState(() => searchParams.get("claim_token") || "");
  const [claimCode, setClaimCode] = useState(() => searchParams.get("code") || "");
  const [claimPassword, setClaimPassword] = useState("");

  // Password reset flow states
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");

  const [totpValue, setTotpValue] = useState("");
  const [requiresTotp, setRequiresTotp] = useState(false);
  const [oauth2faToken, setOauth2faToken] = useState(() => searchParams.get("oauth_2fa_token") || "");
  const [oauth2faCode, setOauth2faCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mascotFailed, setMascotFailed] = useState(false);

  const { login, register, claimGuestAccount } = useAuth();
  const { branding } = useBranding();
  const isRegistrationAllowed = branding.registration_enabled !== false;

  if (!isRegistrationAllowed && mode === "register") {
    setMode("login");
  }

  React.useEffect(() => {
    if (!isRegistrationAllowed && mode === "register") {
      navigate("/login", { replace: true });
      toast.info("Регистрация новых пользователей временно отключена");
    }
  }, [isRegistrationAllowed, mode, navigate]);

  const { data: oauthProviders = [] } = useQuery<OAuthProviderItem[]>({
    queryKey: ["auth-oauth-providers"],
    queryFn: async () => {
      try {
        return await api.get<OAuthProviderItem[]>("/oauth/providers");
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const rawReturnUrl = searchParams.get("from") || "/profile";
  const returnUrl =
    rawReturnUrl.startsWith("/") && !rawReturnUrl.startsWith("//")
      ? rawReturnUrl
      : "/profile";
  const isOrderRedirect = returnUrl.includes("/profile/services");

  const handleModeChange = (nextId: string) => {
    const nextMode = nextId as "login" | "register";
    setMode(nextMode);
    setRequiresTotp(false);
    setTotpValue("");
  };

  const handleOAuthStart = async (providerSlug: string) => {
    try {
      const res = await api.get<{ authorize_url?: string }>(`/oauth/${providerSlug}`);
      if (res?.authorize_url && /^https?:\/\//i.test(res.authorize_url)) {
        window.location.assign(res.authorize_url);
      }
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.detail : "Не удалось запустить вход через " + providerSlug;
      toast.error(msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "reset") {
      if (!resetSent) {
        if (!resetEmail.trim()) {
          toast.error("Введите email для сброса пароля");
          return;
        }
        try {
          setSubmitting(true);
          await requestPasswordReset(resetEmail.trim());
          setResetSent(true);
          toast.info("Код для сброса пароля отправлен на ваш email");
        } catch (err) {
          const msg =
            err instanceof ApiError
              ? err.detail
              : err instanceof Error
                ? err.message
                : "Не удалось запросить сброс пароля";
          toast.error(msg);
        } finally {
          setSubmitting(false);
        }
      } else {
        if (!resetCode.trim() || !resetNewPassword) {
          toast.error("Введите код подтверждения и новый пароль");
          return;
        }
        try {
          setSubmitting(true);
          await confirmPasswordReset(resetEmail.trim(), resetCode.trim(), resetNewPassword);
          toast.success("Пароль успешно изменён! Войдите с новым паролем.");
          setMode("login");
          setResetSent(false);
          setPasswordValue("");
        } catch (err) {
          const msg =
            err instanceof ApiError
              ? err.detail
              : err instanceof Error
                ? err.message
                : "Неверный код или ошибка сброса пароля";
          toast.error(msg);
        } finally {
          setSubmitting(false);
        }
      }
      return;
    }

    if (mode === "claim") {
      if (!claimToken) {
        if (!claimEmail.trim()) {
          toast.error("Введите email гостевого аккаунта");
          return;
        }
        try {
          setSubmitting(true);
          const res = await requestGuestClaim(claimEmail.trim());
          setClaimToken(res.claim_token);
          toast.info("Код подтверждения отправлен на почту");
        } catch (err) {
          const msg =
            err instanceof ApiError
              ? err.detail
              : err instanceof Error
                ? err.message
                : "Ошибка запроса активации";
          toast.error(msg);
        } finally {
          setSubmitting(false);
        }
      } else {
        if (!claimCode.trim() || !claimPassword) {
          toast.error("Введите код из письма и новый пароль");
          return;
        }
        try {
          setSubmitting(true);
          await claimGuestAccount(claimToken.trim(), claimCode.trim(), claimPassword);
          toast.success("Аккаунт успешно активирован и привязан!");
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
    if (mode === "register" && !isRegistrationAllowed) {
      toast.error("Регистрация новых пользователей отключена");
      return;
    }
    if (mode === "register" && !emailValue.trim()) {
      toast.error("Введите Email для регистрации");
      return;
    }

    try {
      setSubmitting(true);

      if (oauth2faToken) {
        if (!oauth2faCode.trim()) {
          toast.error("Введите код 2FA или резервный код");
          return;
        }
        await confirmOAuth2fa(oauth2faToken, oauth2faCode.trim());
        toast.success("Вход выполнен!");
        window.location.assign("/profile");
        return;
      }

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
      // 4.1: Handle 400 TOTP_REQUIRED & 401 "totp required" / "invalid totp"
      if (
        err instanceof ApiError &&
        ((err.status === 400 && err.detail === "TOTP_REQUIRED") ||
          (err.status === 401 && (err.detail === "totp required" || err.detail === "invalid totp")))
      ) {
        setRequiresTotp(true);
        if (err.detail === "invalid totp") {
          toast.error("Неверный код двухфакторной аутентификации");
        } else {
          toast.info("Введите 6-значный код двухфакторной аутентификации");
        }
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
    ...(isRegistrationAllowed ? [{ id: "register", label: "Регистрация" }] : []),
  ];

  return (
    <div className={styles.page}>
      <div className={styles.ambientGlow} aria-hidden="true" />

      <Reveal variant="fade-blur" eager className={styles.authContainer}>
        {/* Left Poster Card */}
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
                {mode === "claim"
                  ? "АКТИВАЦИЯ ДОСТУПА"
                  : mode === "reset"
                    ? "СБРОС ПАРОЛЯ"
                    : "ДОБРО ПОЖАЛОВАТЬ!"}
              </MaskText>
            </h1>
            <p className={styles.subtitle}>
              {mode === "claim"
                ? !claimToken
                  ? "Введите email гостевого аккаунта для получения кода подтверждения"
                  : "Введите код подтверждения из письма и задайте постоянный пароль"
                : mode === "reset"
                  ? !resetSent
                    ? "Введите адрес электронной почты для получения кода сброса пароля"
                    : "Введите код подтверждения из письма и новый пароль"
                  : mode === "login"
                    ? isOrderRedirect
                      ? "Войдите в аккаунт, чтобы просмотреть выданную услугу или ключ по вашему заказу"
                      : "Войдите в аккаунт для управления услугами и балансом"
                    : isOrderRedirect
                      ? "Зарегистрируйтесь, чтобы получить доступ к выданной услуге"
                      : "Создайте учетную запись для доступа к личному кабинету"}
            </p>
          </div>

          {isOrderRedirect && (
            <div
              className={styles.loginNotice}
              style={{
                background: "rgba(0, 144, 128, 0.1)",
                borderColor: "rgba(0, 144, 128, 0.3)",
                color: "var(--color-accent, #009080)",
              }}
            >
              <KeyRound size={16} />
              <div>Войдите в аккаунт для просмотра вашего заказа и выданного ключа</div>
            </div>
          )}

          {branding.login_notice && (
            <div className={styles.loginNotice}>
              <Info size={16} />
              <div>{branding.login_notice}</div>
            </div>
          )}

          {!oauth2faToken && mode !== "claim" && mode !== "reset" && tabItems.length > 1 && (
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
            {oauth2faToken ? (
              <>
                <div className={styles.loginNotice}>
                  <Info size={16} />
                  <div>
                    Аккаунт защищён 2FA. Введите одноразовый или резервный код для завершения входа через OAuth.
                  </div>
                </div>
                <Input
                  label="Код 2FA или резервный код"
                  type="text"
                  value={oauth2faCode}
                  onChange={(e) => setOauth2faCode(e.target.value)}
                  leftIcon={<KeyRound size={16} />}
                  placeholder="000000 или резервный код"
                  required
                  autoFocus
                />
                <Button type="submit" variant="gradient" size="lg" loading={submitting} className={styles.submitBtn}>
                  Подтвердить вход
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOauth2faToken("");
                    setOauth2faCode("");
                    navigate("/login", { replace: true });
                  }}
                >
                  Отмена
                </Button>
              </>
            ) : (
              <>
            {/* ── Mode: Claim ── */}
            {mode === "claim" && !claimToken && (
              <Input
                label="Email гостевого аккаунта"
                type="email"
                value={claimEmail}
                onChange={(e) => setClaimEmail(e.target.value)}
                placeholder="guest@example.com"
                leftIcon={<Mail size={17} />}
                autoComplete="email"
                required
              />
            )}

            {mode === "claim" && Boolean(claimToken) && (
              <>
                <Input
                  label="Код подтверждения (из письма)"
                  type="text"
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value)}
                  placeholder="6-значный код"
                  leftIcon={<KeyRound size={17} />}
                  required
                />
                <Input
                  label="Новый пароль"
                  type={showPassword ? "text" : "password"}
                  value={claimPassword}
                  onChange={(e) => setClaimPassword(e.target.value)}
                  placeholder="••••••••••••"
                  leftIcon={<Lock size={17} />}
                  autoComplete="new-password"
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
              </>
            )}

            {/* ── Mode: Reset Password ── */}
            {mode === "reset" && !resetSent && (
              <Input
                label="Электронная почта"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="name@example.com"
                leftIcon={<Mail size={17} />}
                autoComplete="email"
                required
              />
            )}

            {mode === "reset" && resetSent && (
              <>
                <Input
                  label="Код подтверждения из письма"
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="Код подтверждения"
                  leftIcon={<KeyRound size={17} />}
                  required
                />
                <Input
                  label="Новый пароль"
                  type={showPassword ? "text" : "password"}
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  leftIcon={<Lock size={17} />}
                  autoComplete="new-password"
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
              </>
            )}

            {/* ── Mode: Login / Register ── */}
            {mode !== "claim" && mode !== "reset" && (
              <>
                {mode === "login" && requiresTotp ? (
                  <motion.div
                    key="totp-step"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={styles.totpGroup}
                  >
                    <span className={styles.totpLabel}>
                      Двухфакторная аутентификация — введите 6-значный код для «{loginValue}»
                    </span>
                    <OTPInput
                      value={totpValue}
                      onChange={setTotpValue}
                      length={6}
                      autoFocus
                    />
                    <button
                      type="button"
                      className={styles.textLink}
                      style={{ alignSelf: "flex-start", marginTop: 6 }}
                      onClick={() => {
                        setRequiresTotp(false);
                        setTotpValue("");
                      }}
                    >
                      Назад ко входу
                    </button>
                  </motion.div>
                ) : (
                  <>
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
                      label="Пароль"
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
                  </>
                )}
              </>
            )}

            {mode === "login" && !requiresTotp && (
              <div className={styles.formExtra}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span>Запомнить</span>
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className={styles.textLink}
                    onClick={() => {
                      setMode("reset");
                      setResetSent(false);
                    }}
                  >
                    Забыли пароль?
                  </button>
                  <button
                    type="button"
                    className={styles.textLink}
                    onClick={() => {
                      setMode("claim");
                      setClaimToken("");
                    }}
                  >
                    Активация?
                  </button>
                </div>
              </div>
            )}

            {(mode === "claim" || mode === "reset") && (
              <div className={styles.formExtra}>
                <button
                  type="button"
                  className={styles.textLink}
                  onClick={() => {
                    setMode("login");
                    setClaimToken("");
                    setResetSent(false);
                  }}
                >
                  Вернуться ко входу
                </button>
                {mode === "claim" && Boolean(claimToken) && (
                  <button
                    type="button"
                    className={styles.textLink}
                    onClick={() => setClaimToken("")}
                  >
                    Сменить email
                  </button>
                )}
                {mode === "reset" && resetSent && (
                  <button
                    type="button"
                    className={styles.textLink}
                    onClick={() => setResetSent(false)}
                  >
                    Запросить код снова
                  </button>
                )}
              </div>
            )}

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              loading={submitting}
              className={styles.submitBtn}
              icon={mode === "reset" ? <RotateCcw size={17} /> : <ArrowRight size={18} />}
              iconPosition="right"
            >
              {mode === "claim"
                ? !claimToken
                  ? "Получить код активации"
                  : "Активировать аккаунт"
                : mode === "reset"
                  ? !resetSent
                    ? "Отправить код сброса"
                    : "Сменить пароль"
                  : mode === "login"
                    ? "Войти в кабинет"
                    : "Создать аккаунт"}
            </Button>
              </>
            )}
          </form>

          {/* ── OAuth Fast Sign-In Buttons ── */}
          {(mode === "login" || mode === "register") && oauthProviders.length > 0 && (
            <>
              <div className={styles.oauthDivider}>
                <span>или войти через</span>
              </div>
              <div className={styles.oauthList}>
                {oauthProviders.map((prov) => (
                  <button
                    key={prov.slug}
                    type="button"
                    className={styles.oauthBtn}
                    onClick={() => handleOAuthStart(prov.slug)}
                    title={prov.title || prov.slug}
                  >
                    {prov.icon_url && (
                      <img
                        src={prov.icon_url}
                        alt={prov.title || prov.slug}
                        className={styles.oauthIcon}
                      />
                    )}
                    <span>{prov.title || prov.slug}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </Reveal>
    </div>
  );
};

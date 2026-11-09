import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Lock, User, KeyRound, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import styles from "./LoginPage.module.scss";

export const LoginPage: React.FC = () => {
  const { login, claimGuestAccount } = useAuth();
  const { data: branding } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<"password" | "claim">("password");
  const [isLoading, setIsLoading] = useState(false);

  // Standard Login state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);

  // Claim Order state
  const [claimToken, setClaimToken] = useState("");
  const [claimEmail, setClaimEmail] = useState("");

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/dashboard";

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error("Пожалуйста, заполните все поля");
      return;
    }

    try {
      setIsLoading(true);
      await login(identifier, password, totpCode || undefined);
      toast.success("Успешный вход в личный кабинет");
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка авторизации";
      if (msg.toLowerCase().includes("2fa") || msg.toLowerCase().includes("totp")) {
        setNeeds2FA(true);
        toast.info("Введите код двухфакторной аутентификации");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimToken.trim() || !claimEmail.trim()) {
      toast.error("Укажите токен заказа и ваш email");
      return;
    }

    try {
      setIsLoading(true);
      await claimGuestAccount(claimToken.trim(), claimEmail.trim());
      toast.success("Заказ успешно привязан! Добро пожаловать.");
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Не удалось привязать гостевой заказ";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Sparkles size={24} />
          </div>
          <h1 className={styles.title}>{branding?.shop_name || "Личный кабинет"}</h1>
          <p className={styles.subtitle}>
            Управление активными сервисами и лицензионными ключами
          </p>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "password" ? styles.active : ""}`}
            onClick={() => setActiveTab("password")}
          >
            Вход по паролю
          </button>
          <button
            className={`${styles.tab} ${activeTab === "claim" ? styles.active : ""}`}
            onClick={() => setActiveTab("claim")}
          >
            Гостевой заказ
          </button>
        </div>

        {activeTab === "password" ? (
          <form onSubmit={handlePasswordSubmit} className={styles.form}>
            <Input
              label="Логин или Email"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Введите логин или почту"
              leftIcon={<User size={18} />}
              required
              autoFocus
            />

            <Input
              label="Пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock size={18} />}
              required
            />

            {needs2FA && (
              <Input
                label="Код подтверждения (2FA Authenticator)"
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="6-значный код"
                leftIcon={<ShieldCheck size={18} />}
                autoFocus
              />
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              rightIcon={<ArrowRight size={18} />}
            >
              Войти в аккаунт
            </Button>
          </form>
        ) : (
          <form onSubmit={handleClaimSubmit} className={styles.form}>
            <Input
              label="Токен или номер заказа"
              type="text"
              value={claimToken}
              onChange={(e) => setClaimToken(e.target.value)}
              placeholder="sb-claim-xxxx-xxxx"
              leftIcon={<KeyRound size={18} />}
              required
              autoFocus
            />

            <Input
              label="Email, указанный при покупке"
              type="email"
              value={claimEmail}
              onChange={(e) => setClaimEmail(e.target.value)}
              placeholder="user@example.com"
              leftIcon={<User size={18} />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              rightIcon={<ArrowRight size={18} />}
            >
              Привязать и открыть
            </Button>
          </form>
        )}

        <div className={styles.footer}>
          Нет аккаунта?
          <Link to="/register">Зарегистрироваться</Link>
        </div>
      </div>
    </div>
  );
};

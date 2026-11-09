import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Lock, User, Sparkles, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import styles from "./LoginPage.module.scss";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { data: branding } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error("Заполните логин и пароль");
      return;
    }

    try {
      setIsLoading(true);
      await login(identifier.trim(), password, totpCode.trim() || undefined);
      toast.success("Вход выполнен успешно");
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

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Sparkles size={26} strokeWidth={2.5} />
          </div>
          <h1 className={styles.title}>
            {branding?.name || "Личный кабинет"}
          </h1>
          <p className={styles.subtitle}>
            Авторизуйтесь для доступа к сервисам и лицензионным ключам
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Логин или Email"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Введите ваш логин или email"
            leftIcon={<User size={18} />}
            required
            autoFocus
          />

          <Input
            label="Пароль"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Lock size={18} />}
            rightIcon={
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            required
          />

          {needs2FA && (
            <Input
              label="Код двухфакторной аутентификации (2FA)"
              type="text"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="000000"
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

        <div className={styles.footer}>
          Нет аккаунта?
          <Link to="/register">Зарегистрироваться</Link>
        </div>
      </div>
    </div>
  );
};

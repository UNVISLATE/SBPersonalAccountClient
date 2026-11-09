import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, User, Mail, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import styles from "./LoginPage.module.scss";

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { data: branding } = useBranding();
  const navigate = useNavigate();

  const [loginVal, setLoginVal] = useState("");
  const [emailVal, setEmailVal] = useState("");
  const [passwordVal, setPasswordVal] = useState("");
  const [confirmPasswordVal, setConfirmPasswordVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginVal.trim() || !passwordVal) {
      toast.error("Заполните обязательные поля");
      return;
    }

    if (passwordVal !== confirmPasswordVal) {
      toast.error("Пароли не совпадают");
      return;
    }

    if (passwordVal.length < 8) {
      toast.error("Пароль должен быть не короче 8 символов");
      return;
    }

    try {
      setIsLoading(true);
      await register(loginVal.trim(), emailVal.trim(), passwordVal);
      toast.success("Регистрация завершена! Добро пожаловать.");
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка при регистрации";
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
          <h1 className={styles.title}>Создание аккаунта</h1>
          <p className={styles.subtitle}>
            Зарегистрируйтесь в {branding?.name || "личном кабинете"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Желаемый логин"
            type="text"
            value={loginVal}
            onChange={(e) => setLoginVal(e.target.value)}
            placeholder="username"
            leftIcon={<User size={18} />}
            required
            autoFocus
          />

          <Input
            label="Email (для чеков и восстановления)"
            type="email"
            value={emailVal}
            onChange={(e) => setEmailVal(e.target.value)}
            placeholder="user@example.com"
            leftIcon={<Mail size={18} />}
          />

          <Input
            label="Пароль"
            type="password"
            value={passwordVal}
            onChange={(e) => setPasswordVal(e.target.value)}
            placeholder="Минимум 8 символов"
            leftIcon={<Lock size={18} />}
            required
          />

          <Input
            label="Повторите пароль"
            type="password"
            value={confirmPasswordVal}
            onChange={(e) => setConfirmPasswordVal(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Lock size={18} />}
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            rightIcon={<ArrowRight size={18} />}
          >
            Зарегистрироваться
          </Button>
        </form>

        <div className={styles.footer}>
          Уже есть аккаунт?
          <Link to="/login">Войти</Link>
        </div>
      </div>
    </div>
  );
};

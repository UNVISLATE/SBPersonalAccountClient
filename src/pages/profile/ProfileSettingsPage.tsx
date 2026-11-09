import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Lock,
  Laptop,
  Trash2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { api } from "@/api/client";
import { AuthSession } from "@/api/types";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/Input/Input";
import { Button } from "@/components/ui/Button/Button";
import { Badge } from "@/components/ui/Badge/Badge";
import { Modal } from "@/components/ui/Modal/Modal";
import styles from "./ProfileSettingsPage.module.scss";

export const ProfileSettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  // Change password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPass, setIsChangingPass] = useState(false);

  // 2FA modal state
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [totpVerifyCode, setTotpVerifyCode] = useState("");
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);

  // Active sessions query
  const { data: sessions = [] } = useQuery<AuthSession[]>({
    queryKey: ["user-sessions"],
    queryFn: async () => {
      try {
        return await api.get<AuthSession[]>("/user/sessions");
      } catch {
        return [];
      }
    },
  });

  // Revoke session mutation
  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await api.delete(`/user/sessions?session_id=${sessionId}`);
    },
    onSuccess: () => {
      toast.success("Сессия успешно завершена");
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
    },
    onError: () => {
      toast.error("Не удалось завершить сессию");
    },
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      toast.error("Заполните все поля");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Новые пароли не совпадают");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Пароль должен быть не менее 8 символов");
      return;
    }

    try {
      setIsChangingPass(true);
      await api.post("/user/me/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
      });
      toast.success("Пароль успешно обновлен");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка при смене пароля";
      toast.error(msg);
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleStart2FASetup = async () => {
    try {
      const res = await api.get<{ secret: string; otpauth_url: string }>("/user/twofa");
      setSecretKey(res.secret);
      const url = await QRCode.toDataURL(res.otpauth_url, { width: 200, margin: 1 });
      setQrDataUrl(url);
      setIs2FAModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Не удалось инициализировать 2FA";
      toast.error(msg);
    }
  };

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpVerifyCode || totpVerifyCode.length !== 6) {
      toast.error("Введите корректный 6-значный код");
      return;
    }

    try {
      setIsEnabling2FA(true);
      await api.post("/user/twofa", { code: totpVerifyCode, secret: secretKey });
      toast.success("Двухфакторная аутентификация включена");
      setIs2FAModalOpen(false);
      setTotpVerifyCode("");
      await refreshUser();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Неверный код 2FA";
      toast.error(msg);
    } finally {
      setIsEnabling2FA(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Безопасность и настройки аккаунта</h1>
        <p className={styles.sub}>
          Защита учетной записи, смена пароля и управление активными сессиями
        </p>
      </div>

      <div className={styles.grid}>
        {/* Change Password Panel */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>
            <KeyRound size={20} color="var(--color-accent)" />
            Смена пароля
          </h2>
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input
              label="Текущий пароль"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock size={16} />}
              required
            />
            <Input
              label="Новый пароль"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Минимум 8 символов"
              leftIcon={<Lock size={16} />}
              required
            />
            <Input
              label="Повторите новый пароль"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock size={16} />}
              required
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isChangingPass}
            >
              Обновить пароль
            </Button>
          </form>
        </div>

        {/* 2FA Panel */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>
            {user?.totp_enabled ? (
              <ShieldCheck size={20} color="var(--color-accent)" />
            ) : (
              <ShieldAlert size={20} color="var(--color-warning)" />
            )}
            Двухфакторная аутентификация (2FA)
          </h2>

          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
            {user?.totp_enabled
              ? "Ваш аккаунт надежно защищен. При каждом входе требуется код из приложения Google Authenticator или Яндекс Ключ."
              : "Рекомендуем подключить 2FA. Даже если злоумышленник узнает ваш пароль, он не сможет войти без одноразового кода."}
          </p>

          <div style={{ marginTop: "auto" }}>
            {user?.totp_enabled ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Badge variant="success" pulse>2FA Активна</Badge>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => toast.info("Для отключения 2FA обратитесь в поддержку")}
                >
                  Отключить 2FA
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleStart2FASetup}
              >
                Включить 2FA
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Active Sessions Panel */}
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>
          <Laptop size={20} color="var(--color-accent)" />
          Активные сессии и устройства
        </h2>

        {sessions.length > 0 ? (
          <div className={styles.sessionsList}>
            {sessions.map((s) => (
              <div key={s.id} className={styles.sessionItem}>
                <div className={styles.sessionInfo}>
                  <div className={styles.device}>
                    <span>{s.browser || s.user_agent || "Браузер"}</span>
                    {s.is_current && <Badge variant="accent">Текущая</Badge>}
                  </div>
                  <div className={styles.meta}>
                    <span>IP: {s.ip}</span> •{" "}
                    <span>
                      Активность: {new Date(s.last_activity_at).toLocaleString("ru-RU")}
                    </span>
                  </div>
                </div>
                {!s.is_current && (
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<Trash2 size={14} />}
                    onClick={() => revokeSessionMutation.mutate(s.id)}
                  >
                    Завершить
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
            Нет информации о сессиях
          </p>
        )}
      </div>

      {/* 2FA QR Code Setup Modal */}
      <Modal
        isOpen={is2FAModalOpen}
        onClose={() => setIs2FAModalOpen(false)}
        title="Настройка 2FA Authenticator"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIs2FAModalOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm2FA}
              isLoading={isEnabling2FA}
              leftIcon={<Check size={16} />}
            >
              Подтвердить код
            </Button>
          </>
        }
      >
        <div className={styles.qrContainer}>
          <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            Отсканируйте QR-код в приложении Google Authenticator или введите ключ вручную:
          </p>
          {qrDataUrl && (
            <div className={styles.qrBox}>
              <img src={qrDataUrl} alt="2FA QR Code" width={180} height={180} />
            </div>
          )}
          <span className={styles.secretKey}>{secretKey}</span>

          <div style={{ width: "100%", marginTop: 8 }}>
            <Input
              label="6-значный код из приложения"
              value={totpVerifyCode}
              onChange={(e) => setTotpVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              autoFocus
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

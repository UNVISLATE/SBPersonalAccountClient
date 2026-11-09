import React, { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  ShoppingBag,
  KeyRound,
  History,
  Trash2,
  Copy,
  Check,
  BookOpen,
  Eye,
  EyeOff,
  Laptop,
  LogOut,
  Plus,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import { QRCode } from "@unvislate/sbui-sdk";
import { api } from "@/api/client";
import {
  UserService,
  UserDigitalKey,
  PaymentInvoice,
  AuthSession,
  PageResponse,
} from "@/api/types";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { useCopy } from "@/hooks/use-copy";
import { Button } from "@/components/ui/Button/Button";
import { Badge } from "@/components/ui/Badge/Badge";
import { Input } from "@/components/ui/Input/Input";
import { Modal } from "@/components/ui/Modal/Modal";
import { ClientLayoutContext } from "@/components/layout/AppLayout";
import styles from "./ProfilePage.module.scss";

export const ProfilePage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const { branding } = useBranding();
  const { copy, copiedKey } = useCopy();
  const { openTopUp, openPromo } = useOutletContext<ClientLayoutContext>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"profile" | "services" | "keys" | "billing">("profile");

  // Modals state
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [isSubmittingPass, setIsSubmittingPass] = useState(false);

  // 2FA state
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [totpSecret, setTotpSecret] = useState("");
  const [totpOtpAuth, setTotpOtpAuth] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);

  // Keys reveal
  const [revealedKeys, setRevealedKeys] = useState<Record<number, boolean>>({});
  const [activeInstruction, setActiveInstruction] = useState<UserDigitalKey | null>(null);

  const currency = branding?.currency || "₽";

  // Queries
  const { data: servicesData } = useQuery({
    queryKey: ["user-services"],
    queryFn: async () => {
      try {
        return await api.get<PageResponse<UserService>>("/user/services", { limit: 50 });
      } catch {
        return { items: [], total: 0, limit: 50, offset: 0, has_more: false };
      }
    },
  });

  const { data: keysData } = useQuery({
    queryKey: ["user-keys"],
    queryFn: async () => {
      try {
        return await api.get<PageResponse<UserDigitalKey>>("/user/purchases", { limit: 50 });
      } catch {
        return { items: [], total: 0, limit: 50, offset: 0, has_more: false };
      }
    },
  });

  const { data: billingData } = useQuery({
    queryKey: ["user-billing"],
    queryFn: async () => {
      try {
        return await api.get<PageResponse<PaymentInvoice>>("/user/purchases", { limit: 50 });
      } catch {
        return { items: [], total: 0, limit: 50, offset: 0, has_more: false };
      }
    },
  });

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

  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await api.delete(`/user/sessions?session_id=${sessionId}`);
    },
    onSuccess: () => {
      toast.success("Сессия успешно завершена");
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
    },
  });

  const services = servicesData?.items || [];
  const keys = keysData?.items || [];
  const invoices = billingData?.items || [];

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPass || !newPass) {
      toast.error("Заполните все поля");
      return;
    }
    if (newPass !== confirmPass) {
      toast.error("Новые пароли не совпадают");
      return;
    }
    try {
      setIsSubmittingPass(true);
      await api.post("/user/me/change-password", {
        old_password: oldPass,
        new_password: newPass,
      });
      toast.success("Пароль успешно обновлен");
      setIsPassModalOpen(false);
      setOldPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Не удалось сменить пароль";
      toast.error(msg);
    } finally {
      setIsSubmittingPass(false);
    }
  };

  const handleStart2FA = async () => {
    try {
      const res = await api.get<{ secret: string; otpauth_url: string }>("/user/twofa");
      setTotpSecret(res.secret);
      setTotpOtpAuth(res.otpauth_url);
      setIs2FAModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка инициализации 2FA";
      toast.error(msg);
    }
  };

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode || totpCode.length !== 6) {
      toast.error("Введите 6-значный код");
      return;
    }
    try {
      setIsEnabling2FA(true);
      await api.post("/user/twofa", { code: totpCode, secret: totpSecret });
      toast.success("Двухфакторная защита активирована");
      setIs2FAModalOpen(false);
      setTotpCode("");
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
      {/* Hero Profile Card */}
      <div className={styles.heroCard}>
        <div className={styles.userMain}>
          <div className={styles.avatarBox}>
            <div className={styles.avatar}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.login} />
              ) : (
                <span>{user?.login ? user.login[0].toUpperCase() : "U"}</span>
              )}
            </div>
          </div>
          <div className={styles.userDetails}>
            <div className={styles.nameRow}>
              <span className={styles.userName}>{user?.login}</span>
              <Badge variant="accent">
                {user?.role === "admin" ? "Администратор" : "Клиент"}
              </Badge>
            </div>
            <span className={styles.userEmail}>{user?.email || "Почта не привязана"}</span>
            <div className={styles.balanceRow}>
              <span className={styles.balanceLabel}>Баланс:</span>
              <span className={styles.balanceVal}>
                {(user?.balance ?? 0).toLocaleString("ru-RU", {
                  minimumFractionDigits: 2,
                })}{" "}
                {currency}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statTitle}>Всего покупок</span>
            <span className={styles.statCount}>{services.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statTitle}>Ключей выдано</span>
            <span className={styles.statCount}>{keys.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statTitle}>Транзакций</span>
            <span className={styles.statCount}>{invoices.length}</span>
          </div>
        </div>

        <div className={styles.levelCard}>
          <div className={styles.levelTop}>
            <span className={styles.levelRank}>Уровень 1</span>
            <span className={styles.levelDiscount}>Скидка 0%</span>
          </div>
          <div className={styles.progressWrapper}>
            <div className={styles.progressBar} style={{ width: "20%" }} />
          </div>
          <span className={styles.levelHint}>Осталось потратить 1 000 ₽ до 5%</span>
        </div>
      </div>

      {/* Horizontal Nav Tabs */}
      <div className={styles.navBar}>
        <div className={styles.tabsList}>
          <button
            className={`${styles.tabBtn} ${activeTab === "profile" ? styles.active : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <User size={16} />
            <span>Мой профиль</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "services" ? styles.active : ""}`}
            onClick={() => setActiveTab("services")}
          >
            <ShoppingBag size={16} />
            <span>Покупки ({services.length})</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "keys" ? styles.active : ""}`}
            onClick={() => setActiveTab("keys")}
          >
            <KeyRound size={16} />
            <span>Ключи ({keys.length})</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "billing" ? styles.active : ""}`}
            onClick={() => setActiveTab("billing")}
          >
            <History size={16} />
            <span>Транзакции</span>
          </button>
        </div>

        <div className={styles.navActions}>
          <Button variant="ghost" size="sm" leftIcon={<Ticket size={15} />} onClick={openPromo}>
            Промокод
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus size={15} />} onClick={openTopUp}>
            Пополнить баланс
          </Button>
        </div>
      </div>

      {/* TAB 1: Profile & Security */}
      {activeTab === "profile" && (
        <div className={styles.profileGrid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Личные данные</h2>
            </div>
            <div className={styles.dataList}>
              <div className={styles.dataRow}>
                <div className={styles.rowLeft}>
                  <span className={styles.rowLabel}>Ваш никнейм</span>
                  <span className={styles.rowVal}>{user?.login}</span>
                </div>
              </div>

              <div className={styles.dataRow}>
                <div className={styles.rowLeft}>
                  <span className={styles.rowLabel}>Ваша почта</span>
                  <span className={styles.rowVal}>{user?.email || "—"}</span>
                </div>
              </div>

              <div className={styles.dataRow}>
                <div className={styles.rowLeft}>
                  <span className={styles.rowLabel}>Пароль учетной записи</span>
                  <span className={styles.rowVal}>••••••••••••</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setIsPassModalOpen(true)}>
                  Изменить
                </Button>
              </div>

              <div className={styles.dataRow}>
                <div className={styles.rowLeft}>
                  <span className={styles.rowLabel}>Двухфакторная защита (2FA)</span>
                  <span className={styles.rowVal}>
                    {user?.totp_enabled ? "Включена" : "Отключена"}
                  </span>
                </div>
                {user?.totp_enabled ? (
                  <Badge variant="success" pulse>Защищено</Badge>
                ) : (
                  <Button size="sm" variant="primary" onClick={handleStart2FA}>
                    Включить
                  </Button>
                )}
              </div>
            </div>

            <Button
              variant="danger"
              size="sm"
              leftIcon={<LogOut size={16} />}
              onClick={() => logout()}
              style={{ marginTop: "auto" }}
            >
              Выйти из аккаунта
            </Button>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Активные сессии</h2>
            </div>
            <div className={styles.dataList}>
              {sessions.map((s) => (
                <div key={s.id} className={styles.dataRow}>
                  <div className={styles.rowLeft}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Laptop size={15} color="var(--color-accent)" />
                      <span className={styles.rowVal}>{s.browser || s.user_agent || "Браузер"}</span>
                      {s.is_current && <Badge variant="accent">Текущая</Badge>}
                    </div>
                    <span className={styles.rowLabel}>
                      IP: {s.ip} • Активность: {new Date(s.last_activity_at).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  {!s.is_current && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => revokeSessionMutation.mutate(s.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Services */}
      {activeTab === "services" && (
        <div>
          {services.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {services.map((svc) => (
                <div key={svc.id} className={styles.panel}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>{svc.name}</h3>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-text-dim)" }}>
                        {svc.category || "Услуга"}
                      </span>
                    </div>
                    <Badge variant={svc.status === "active" ? "success" : "warning"} pulse={svc.status === "active"}>
                      {svc.status === "active" ? "Активна" : svc.status}
                    </Badge>
                  </div>
                  <div style={{ marginTop: "auto" }}>
                    <Link to={`/services/${svc.id}`}>
                      <Button variant="outline" size="sm" style={{ width: "100%" }}>
                        Данные подключения
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <ShoppingBag size={44} opacity={0.3} />
              <p>Покупок пока нет</p>
              <Link to="/catalog">
                <Button variant="outline" size="sm">
                  Перейти в каталог
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Digital Keys */}
      {activeTab === "keys" && (
        <div>
          {keys.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {keys.map((k) => {
                const isRevealed = !!revealedKeys[k.id];
                const displayVal = isRevealed
                  ? k.key_value
                  : `${k.key_value.slice(0, 4)}••••••••${k.key_value.slice(-4)}`;
                return (
                  <div key={k.id} className={styles.panel} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h4 style={{ fontSize: "0.9375rem", fontWeight: 700 }}>{k.service_name || "Лицензия"}</h4>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-text-dim)" }}>
                        Выдан: {new Date(k.created_at).toLocaleDateString("ru-RU")}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ background: "rgba(0,0,0,0.4)", padding: "6px 12px", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-mono)", color: "var(--color-accent)", fontSize: "0.875rem" }}>
                        {displayVal}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setRevealedKeys(p => ({ ...p, [k.id]: !p[k.id] }))}>
                        {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copy(k.key_value, String(k.id))}>
                        {copiedKey === String(k.id) ? <Check size={14} /> : <Copy size={14} />}
                      </Button>
                      {k.instruction_md && (
                        <Button size="sm" variant="ghost" onClick={() => setActiveInstruction(k)}>
                          <BookOpen size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <KeyRound size={44} opacity={0.3} />
              <p>Лицензионных ключей пока нет</p>
              <Link to="/catalog">
                <Button variant="outline" size="sm">
                  Перейти в каталог
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Transactions */}
      {activeTab === "billing" && (
        <div>
          {invoices.length > 0 ? (
            <div className={styles.panel} style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-glass-border)", color: "var(--color-text-dim)", fontSize: "0.75rem" }}>
                    <th style={{ padding: "12px 14px" }}>ID / Дата</th>
                    <th style={{ padding: "12px 14px" }}>Назначение</th>
                    <th style={{ padding: "12px 14px" }}>Сумма</th>
                    <th style={{ padding: "12px 14px" }}>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "12px 14px" }}>
                        #{inv.id} • {new Date(inv.created_at).toLocaleDateString("ru-RU")}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        {inv.target === "balance" ? "Пополнение баланса" : "Оплата услуги"}
                      </td>
                      <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-accent)" }}>
                        {inv.amount} {inv.currency || currency}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <Badge variant={inv.status === "paid" ? "success" : "warning"}>
                          {inv.status === "paid" ? "Оплачен" : inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <History size={44} opacity={0.3} />
              <p>Транзакций пока нет</p>
            </div>
          )}
        </div>
      )}

      {/* Change Password Modal */}
      <Modal
        isOpen={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
        title="Смена пароля"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsPassModalOpen(false)}>Отмена</Button>
            <Button variant="primary" onClick={handleChangePassword} isLoading={isSubmittingPass}>
              Сохранить
            </Button>
          </>
        }
      >
        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input
            label="Текущий пароль"
            type="password"
            value={oldPass}
            onChange={(e) => setOldPass(e.target.value)}
            required
          />
          <Input
            label="Новый пароль"
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="Минимум 8 символов"
            required
          />
          <Input
            label="Повторите новый пароль"
            type="password"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            required
          />
        </form>
      </Modal>

      {/* 2FA QR Modal using sbuiSDK QRCode */}
      <Modal
        isOpen={is2FAModalOpen}
        onClose={() => setIs2FAModalOpen(false)}
        title="Настройка 2FA Authenticator"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIs2FAModalOpen(false)}>Отмена</Button>
            <Button variant="primary" onClick={handleConfirm2FA} isLoading={isEnabling2FA}>
              Подтвердить
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", textAlign: "center" }}>
            Отсканируйте QR-код в приложении аутентификатора:
          </p>

          {totpOtpAuth && (
            <div style={{ background: "#ffffff", padding: 12, borderRadius: 14, display: "flex", justifyContent: "center" }}>
              <QRCode value={totpOtpAuth} size={200} logo="UNVIDark" />
            </div>
          )}

          <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-accent)", fontSize: "0.8125rem", letterSpacing: "0.1em" }}>
            {totpSecret}
          </span>

          <Input
            label="6-значный код"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            autoFocus
          />
        </div>
      </Modal>

      {/* Instruction Modal */}
      {activeInstruction && (
        <Modal
          isOpen={!!activeInstruction}
          onClose={() => setActiveInstruction(null)}
          title={`Инструкция: ${activeInstruction.service_name}`}
          size="md"
        >
          <div style={{ whiteSpace: "pre-wrap", fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            {activeInstruction.instruction_md}
          </div>
        </Modal>
      )}
    </div>
  );
};

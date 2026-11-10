import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  get2faStatus,
  getSessions,
  setup2fa,
  enable2fa,
  disable2fa,
  changeNickname,
  changeEmail,
  changePassword,
  revokeSession,
} from "@/api/endpoints/user";
import { ApiError } from "@/api/client";
import type { UserProfile } from "@/api/types";
import { useCopy } from "@/hooks/use-copy";
import { formatDateTime } from "@/lib/format";
import { parseUserAgent } from "@/utils/ua-parser";
import { Button } from "@/components/ui/Button/Button";
import { Badge } from "@/components/ui/Badge/Badge";
import { Modal } from "@/components/ui/Modal/Modal";
import { Input } from "@/components/ui/Input/Input";
import { OTPInput } from "@/components/ui/OTPInput/OTPInput";
import { Skeleton } from "@/components/motion";
import { QRCode } from "@unvislate/sbui-sdk/components/qr/QRCode";
import { toast } from "sonner";
import {
  User,
  Mail,
  Key,
  Shield,
  Smartphone,
  Laptop,
  Trash2,
  Copy,
  AlertTriangle,
  LogOut,
  Lock,
} from "lucide-react";
import styles from "./PersonalDataTab.module.scss";

export interface PersonalDataTabProps {
  user: UserProfile;
  onUserUpdated: () => Promise<unknown>;
  onLogout: () => Promise<void>;
}

const getErrorMsg = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.detail : err instanceof Error ? err.message : fallback;

export const PersonalDataTab: React.FC<PersonalDataTabProps> = ({
  user,
  onUserUpdated,
  onLogout,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { copy } = useCopy();
  const handledQueryActionRef = useRef<string | null>(null);

  // Nickname modal
  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [savingNickname, setSavingNickname] = useState(false);

  // Email modal
  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmailDraft, setNewEmailDraft] = useState<string | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  // Password modal
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // 2FA setup / disable
  const [twoFaSetupOpen, setTwoFaSetupOpen] = useState(false);
  const [twoFaSetupData, setTwoFaSetupData] = useState<{
    secret: string;
    otpauth_url: string;
  } | null>(null);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [enabling2Fa, setEnabling2Fa] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const [twoFaDisableOpen, setTwoFaDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disabling2Fa, setDisabling2Fa] = useState(false);

  // Queries
  const {
    data: twoFaStatus,
    isLoading: twoFaLoading,
    refetch: refetch2FA,
  } = useQuery({
    queryKey: ["user-2fa-status"],
    queryFn: async () => {
      try {
        return await get2faStatus();
      } catch {
        return { enabled: Boolean(user.totp_enabled), required: false, recovery_codes_left: 0 };
      }
    },
  });

  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ["user-sessions"],
    queryFn: async () => {
      try {
        return await getSessions();
      } catch {
        return [];
      }
    },
  });

  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newNickname.trim();
    if (clean.length < 3) {
      toast.error("Никнейм должен содержать минимум 3 символа");
      return;
    }
    try {
      setSavingNickname(true);
      await changeNickname(clean);
      await onUserUpdated();
      toast.success("Никнейм обновлен");
      setNicknameOpen(false);
    } catch (err) {
      toast.error(getErrorMsg(err, "Ошибка смены никнейма"));
    } finally {
      setSavingNickname(false);
    }
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = (newEmailDraft ?? user.email ?? "").trim();
    if (!clean.includes("@")) {
      toast.error("Введите корректный email");
      return;
    }
    try {
      setSavingEmail(true);
      await changeEmail(clean);
      await onUserUpdated();
      toast.success("Почта обновлена");
      setEmailOpen(false);
      setNewEmailDraft(null);
      clearModalQueryParam();
    } catch (err) {
      toast.error(getErrorMsg(err, "Ошибка обновления почты"));
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Новый пароль должен содержать от 8 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }
    try {
      setSavingPassword(true);
      await changePassword(currentPassword, newPassword);
      toast.success("Пароль успешно изменен");
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(getErrorMsg(err, "Ошибка смены пароля"));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleStart2FA = useCallback(async () => {
    try {
      const res = await setup2fa();
      setTwoFaSetupData(res);
      setTwoFaCode("");
      setRecoveryCodes(null);
      setTwoFaSetupOpen(true);
    } catch (err) {
      toast.error(getErrorMsg(err, "Не удалось запустить настройку 2FA"));
    }
  }, []);

  const clearModalQueryParam = useCallback(() => {
    const keysToClear = ["action", "modal", "open", "email", "2fa", "totp"];
    if (!keysToClear.some((k) => searchParams.has(k))) return;
    const next = new URLSearchParams(searchParams);
    for (const k of keysToClear) {
      next.delete(k);
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const setModalQueryParam = useCallback(
    (modalKey: "email" | "2fa") => {
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      next.delete("open");
      next.delete("email");
      next.delete("2fa");
      next.delete("totp");
      next.set("modal", modalKey);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const rawAction = (
    searchParams.get("action") ||
    searchParams.get("modal") ||
    searchParams.get("open") ||
    ""
  )
    .trim()
    .toLowerCase();
  const wantsEmailFromQuery = rawAction === "email" || searchParams.has("email");
  const wants2FaFromQuery =
    rawAction === "2fa" ||
    rawAction === "totp" ||
    searchParams.has("2fa") ||
    searchParams.has("totp");

  useEffect(() => {
    if (!wants2FaFromQuery) {
      if (!wantsEmailFromQuery) {
        handledQueryActionRef.current = null;
      }
      return;
    }
    if (twoFaLoading || twoFaStatus?.enabled) return;
    if (handledQueryActionRef.current === "2fa") return;
    handledQueryActionRef.current = "2fa";
    void handleStart2FA();
  }, [wants2FaFromQuery, wantsEmailFromQuery, twoFaLoading, twoFaStatus?.enabled, handleStart2FA]);

  const effectiveEmailOpen = emailOpen || wantsEmailFromQuery;
  const effectiveNewEmail = newEmailDraft ?? (user.email || "");
  const effectiveTwoFaDisableOpen =
    twoFaDisableOpen || (wants2FaFromQuery && !twoFaLoading && Boolean(twoFaStatus?.enabled));

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFaCode.trim().length !== 6) {
      toast.error("Введите 6-значный код");
      return;
    }
    try {
      setEnabling2Fa(true);
      const res = await enable2fa(twoFaCode.trim());
      setRecoveryCodes(res.recovery_codes || []);
      toast.success("Двухфакторная защита активирована!");
      refetch2FA();
      onUserUpdated();
    } catch (err) {
      toast.error(getErrorMsg(err, "Неверный код подтверждения"));
    } finally {
      setEnabling2Fa(false);
    }
  };

  const handleConfirmDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) {
      toast.error("Введите текущий пароль");
      return;
    }
    try {
      setDisabling2Fa(true);
      await disable2fa(disablePassword);
      toast.success("Двухфакторная защита отключена");
      setTwoFaDisableOpen(false);
      clearModalQueryParam();
      setDisablePassword("");
      refetch2FA();
      onUserUpdated();
    } catch (err) {
      toast.error(getErrorMsg(err, "Не удалось отключить 2FA"));
    } finally {
      setDisabling2Fa(false);
    }
  };

  const handleRevoke = async (sessionId: string | number) => {
    try {
      await revokeSession(sessionId);
      toast.success("Сессия завершена");
      refetchSessions();
    } catch (err) {
      toast.error(getErrorMsg(err, "Ошибка завершения сессии"));
    }
  };

  const handleRevokeOthers = async () => {
    try {
      const others = sessions.filter((s) => !s.is_current);
      for (const s of others) {
        await revokeSession(s.session_id);
      }
      toast.success("Остальные сессии завершены");
      refetchSessions();
    } catch (err) {
      toast.error(getErrorMsg(err, "Ошибка завершения сессий"));
    }
  };

  const otherSessionsCount = sessions.filter((s) => !s.is_current).length;

  return (
    <div className={styles.wrapper}>
      {/* Section 1: Personal Data & Security */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>ЛИЧНЫЕ ДАННЫЕ И БЕЗОПАСНОСТЬ</h2>
          <p className={styles.sectionSubtitle}>
            Управление учетной записью, почтой, паролем и двухфакторной защитой
          </p>
        </div>

        <div className={styles.fieldsGrid}>
          {/* Nickname */}
          <div className={styles.fieldRow}>
            <div className={styles.fieldMeta}>
              <span className={styles.fieldLabel}>Ваш никнейм</span>
              <div className={styles.fieldValRow}>
                <User size={15} className={styles.fieldIcon} />
                <span className={styles.fieldValue}>{user.login}</span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setNewNickname(user.login || "");
                setNicknameOpen(true);
              }}
            >
              Изменить
            </Button>
          </div>

          {/* Email */}
          <div className={styles.fieldRow}>
            <div className={styles.fieldMeta}>
              <span className={styles.fieldLabel}>Электронная почта</span>
              <div className={styles.fieldValRow}>
                <Mail size={15} className={styles.fieldIcon} />
                <span className={styles.fieldValue}>{user.email || "Не привязана"}</span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setNewEmailDraft(user.email || "");
                setEmailOpen(true);
                setModalQueryParam("email");
              }}
            >
              Изменить
            </Button>
          </div>

          {/* Password */}
          <div className={styles.fieldRow}>
            <div className={styles.fieldMeta}>
              <span className={styles.fieldLabel}>Пароль аккаунта</span>
              <div className={styles.fieldValRow}>
                <Key size={15} className={styles.fieldIcon} />
                <span className={styles.fieldValue}>••••••••••••</span>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setPasswordOpen(true)}>
              Изменить
            </Button>
          </div>

          {/* 2FA */}
          <div className={styles.fieldRow}>
            <div className={styles.fieldMeta}>
              <span className={styles.fieldLabel}>Двухфакторная защита</span>
              <div className={styles.fieldValRow}>
                <Shield size={15} className={styles.fieldIcon} />
                <span className={styles.fieldValue}>
                  {twoFaStatus?.enabled ? "2FA активна" : "Не настроена"}
                </span>
                {twoFaStatus?.enabled && (
                  <Badge variant="success" size="sm" dot>
                    Вкл
                  </Badge>
                )}
              </div>
            </div>
            {twoFaStatus?.enabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTwoFaDisableOpen(true);
                  setModalQueryParam("2fa");
                }}
              >
                Отключить
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setModalQueryParam("2fa");
                  void handleStart2FA();
                }}
              >
                Включить
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: Active Sessions */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeadBetween}>
          <div>
            <h2 className={styles.sectionTitle}>АКТИВНЫЕ СЕССИИ</h2>
            <p className={styles.sectionSubtitle}>
              Устройства и браузеры с доступом к вашему кабинету
            </p>
          </div>
          {otherSessionsCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleRevokeOthers}>
              Завершить остальные ({otherSessionsCount})
            </Button>
          )}
        </div>

        <div
          className={styles.sessionsList}
          data-lenis-prevent
          data-lenis-prevent-wheel
        >
          {sessionsLoading ? (
            <>
              <Skeleton height={58} rounded="md" />
              <Skeleton height={58} rounded="md" />
            </>
          ) : sessions.length === 0 ? (
            <p className={styles.emptyText}>Активные сессии не найдены</p>
          ) : (
            sessions.map((sess) => {
              const parsed = parseUserAgent(sess.user_agent || "");
              const isMobile = parsed.deviceType === "mobile";

              return (
                <div key={sess.session_id} className={styles.sessionRow}>
                  <div className={styles.sessionIcon}>
                    {isMobile ? <Smartphone size={17} /> : <Laptop size={17} />}
                  </div>

                  <div className={styles.sessionInfo}>
                    <div className={styles.sessionTop}>
                      <span className={styles.sessionName}>
                        {parsed.browser} · {parsed.os}
                      </span>
                      {sess.is_current && (
                        <Badge variant="success" size="sm">
                          Текущая
                        </Badge>
                      )}
                    </div>
                    <div className={styles.sessionSub}>
                      <span>IP: {sess.ip || "Не определен"}</span>
                      <span>·</span>
                      <span>{formatDateTime(sess.created_at)}</span>
                    </div>
                  </div>

                  {!sess.is_current && (
                    <button
                      type="button"
                      className={styles.revokeBtn}
                      onClick={() => handleRevoke(sess.session_id)}
                      title="Завершить сессию"
                      aria-label="Завершить сессию"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className={styles.logoutRow}>
          <Button
            variant="danger"
            size="sm"
            icon={<LogOut size={15} />}
            onClick={onLogout}
          >
            Выйти из аккаунта
          </Button>
        </div>
      </section>

      {/* Modals via Portal */}
      <Modal
        isOpen={nicknameOpen}
        onClose={() => setNicknameOpen(false)}
        title="Смена никнейма"
        subtitle="Укажите новый никнейм для вашего профиля"
        maxWidth={420}
      >
        <form onSubmit={handleSaveNickname} className={styles.modalForm}>
          <Input
            label="Новый никнейм"
            type="text"
            value={newNickname}
            onChange={(e) => setNewNickname(e.target.value)}
            leftIcon={<User size={16} />}
            minLength={3}
            maxLength={64}
            required
            autoFocus
          />
          <Button type="submit" variant="gradient" size="lg" loading={savingNickname} className={styles.fullBtn}>
            Сохранить никнейм
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={effectiveEmailOpen}
        onClose={() => {
          setEmailOpen(false);
          setNewEmailDraft(null);
          clearModalQueryParam();
        }}
        title="Изменение почты"
        subtitle="Введите актуальный адрес электронной почты"
        maxWidth={420}
      >
        <form onSubmit={handleSaveEmail} className={styles.modalForm}>
          <Input
            label="Электронная почта"
            type="email"
            value={effectiveNewEmail}
            onChange={(e) => setNewEmailDraft(e.target.value)}
            leftIcon={<Mail size={16} />}
            required
            autoFocus
          />
          <Button type="submit" variant="gradient" size="lg" loading={savingEmail} className={styles.fullBtn}>
            Сохранить почту
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title="Смена пароля"
        subtitle="Минимальная длина нового пароля — 8 символов"
        maxWidth={430}
      >
        <form onSubmit={handleSavePassword} className={styles.modalForm}>
          <Input
            label="Текущий пароль"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            leftIcon={<Lock size={16} />}
            required
            autoFocus
          />
          <Input
            label="Новый пароль"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            leftIcon={<Key size={16} />}
            minLength={8}
            required
          />
          <Input
            label="Повторите новый пароль"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            leftIcon={<Key size={16} />}
            minLength={8}
            required
          />
          <Button type="submit" variant="gradient" size="lg" loading={savingPassword} className={styles.fullBtn}>
            Обновить пароль
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={twoFaSetupOpen}
        onClose={() => {
          setTwoFaSetupOpen(false);
          clearModalQueryParam();
        }}
        title="Настройка 2FA"
        subtitle={
          recoveryCodes
            ? "Сохраните резервные коды в надежном месте"
            : "Отсканируйте QR-код в приложении-аутентификаторе"
        }
        maxWidth={450}
      >
        {recoveryCodes ? (
          <div className={styles.recoveryWrap}>
            <div className={styles.warningAlert}>
              <AlertTriangle size={17} />
              <span>Эти коды понадобятся при потере доступа к телефону</span>
            </div>

            <div className={styles.recoveryGrid}>
              {recoveryCodes.map((c, idx) => (
                <code key={idx} className={styles.recoveryCode}>
                  {c}
                </code>
              ))}
            </div>

            <Button
              variant="gradient"
              size="lg"
              icon={<Copy size={16} />}
              onClick={() => {
                copy(recoveryCodes.join("\n"), "Все коды скопированы в буфер");
                setTwoFaSetupOpen(false);
                clearModalQueryParam();
              }}
              className={styles.fullBtn}
            >
              Скопировать коды и закрыть
            </Button>
          </div>
        ) : (
          twoFaSetupData && (
            <div className={styles.twoFaBody}>
              <div className={styles.qrWrapper}>
                <QRCode
                  value={twoFaSetupData.otpauth_url}
                  size={210}
                  plateRadius={16}
                  theme="light"
                  color="#09090b"
                  backgroundColor="#ffffff"
                  style={{ color: "#09090b" }}
                />
              </div>

              <div className={styles.secretRow}>
                <code className={styles.secretText}>{twoFaSetupData.secret}</code>
                <button
                  type="button"
                  className={styles.copySecretBtn}
                  onClick={() => copy(twoFaSetupData.secret, "Секретный ключ скопирован")}
                >
                  <Copy size={13} />
                  <span>Копировать</span>
                </button>
              </div>

              <form onSubmit={handleConfirm2FA} className={styles.modalForm}>
                <div className={styles.otpCenter}>
                  <span className={styles.otpLabel}>Код подтверждения из приложения</span>
                  <OTPInput value={twoFaCode} onChange={setTwoFaCode} length={6} autoFocus />
                </div>
                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  loading={enabling2Fa}
                  disabled={twoFaCode.length !== 6}
                  className={styles.fullBtn}
                >
                  Подтвердить и включить
                </Button>
              </form>
            </div>
          )
        )}
      </Modal>

      <Modal
        isOpen={effectiveTwoFaDisableOpen}
        onClose={() => {
          setTwoFaDisableOpen(false);
          clearModalQueryParam();
        }}
        title="Отключение 2FA"
        subtitle="Введите текущий пароль для подтверждения"
        maxWidth={410}
      >
        <form onSubmit={handleConfirmDisable2FA} className={styles.modalForm}>
          <Input
            label="Текущий пароль"
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            leftIcon={<Lock size={16} />}
            required
            autoFocus
          />
          <Button type="submit" variant="danger" size="lg" loading={disabling2Fa} className={styles.fullBtn}>
            Отключить защиту
          </Button>
        </form>
      </Modal>
    </div>
  );
};

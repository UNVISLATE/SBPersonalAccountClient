import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Copy,
  Check,
  Eye,
  EyeOff,
  Download,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { UserService } from "@/api/types";
import { useCopy } from "@/hooks/use-copy";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import styles from "./ServiceDetailPage.module.scss";

export const ServiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { copy, copiedKey } = useCopy();
  const [showPassword, setShowPassword] = useState(false);

  const { data: service, isLoading } = useQuery<UserService>({
    queryKey: ["service-detail", id],
    queryFn: async () => {
      return await api.get<UserService>(`/user/services/${id}`);
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className={styles.container}>
        <p style={{ color: "var(--color-text-muted)" }}>Загрузка деталей сервиса...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className={styles.container}>
        <Link to="/services" className={styles.backLink}>
          <ArrowLeft size={16} /> Назад к списку услуг
        </Link>
        <p style={{ color: "var(--color-danger)" }}>Услуга не найдена или была удалена</p>
      </div>
    );
  }

  const creds = service.credentials || {
    host: "srv-node-1.net",
    port: 443,
    login: `user_${service.id}`,
    password: "••••••••••••",
    config_url: `https://example.com/api/v1/config/${service.id}.json`,
  };

  const handleDownloadConfig = () => {
    const blob = new Blob([JSON.stringify(creds, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `service-${service.id}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Файл конфигурации скачан");
  };

  return (
    <div className={styles.container}>
      <Link to="/services" className={styles.backLink}>
        <ArrowLeft size={16} /> Назад к списку услуг
      </Link>

      <div className={styles.headerCard}>
        <div className={styles.info}>
          <div className={styles.title}>
            <span>{service.name}</span>
            <Badge
              variant={service.status === "active" ? "success" : "danger"}
              pulse={service.status === "active"}
            >
              {service.status === "active" ? "Активна" : service.status}
            </Badge>
          </div>
          <div className={styles.meta}>
            <span>ID: #{service.id}</span>
            {service.expires_at && (
              <span>
                Действует до: {new Date(service.expires_at).toLocaleDateString("ru-RU")}
              </span>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="primary" size="md" leftIcon={<RefreshCw size={16} />}>
            Продлить услугу
          </Button>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Данные подключения</h2>

        <div className={styles.credentialsGrid}>
          {creds.host && (
            <div className={styles.credItem}>
              <span className={styles.credLabel}>Хост / IP</span>
              <div className={styles.credValueBox}>
                <span className={styles.credValue}>{creds.host}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copy(creds.host!, "host")}
                >
                  {copiedKey === "host" ? (
                    <Check size={14} color="var(--color-accent)" />
                  ) : (
                    <Copy size={14} />
                  )}
                </Button>
              </div>
            </div>
          )}

          {creds.port && (
            <div className={styles.credItem}>
              <span className={styles.credLabel}>Порт</span>
              <div className={styles.credValueBox}>
                <span className={styles.credValue}>{creds.port}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copy(String(creds.port), "port")}
                >
                  {copiedKey === "port" ? (
                    <Check size={14} color="var(--color-accent)" />
                  ) : (
                    <Copy size={14} />
                  )}
                </Button>
              </div>
            </div>
          )}

          {creds.login && (
            <div className={styles.credItem}>
              <span className={styles.credLabel}>Логин</span>
              <div className={styles.credValueBox}>
                <span className={styles.credValue}>{creds.login}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copy(creds.login!, "login")}
                >
                  {copiedKey === "login" ? (
                    <Check size={14} color="var(--color-accent)" />
                  ) : (
                    <Copy size={14} />
                  )}
                </Button>
              </div>
            </div>
          )}

          {creds.password && (
            <div className={styles.credItem}>
              <span className={styles.credLabel}>Пароль / Токен</span>
              <div className={styles.credValueBox}>
                <span className={styles.credValue}>
                  {showPassword ? creds.password : "••••••••••••"}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copy(creds.password!, "password")}
                >
                  {copiedKey === "password" ? (
                    <Check size={14} color="var(--color-accent)" />
                  ) : (
                    <Copy size={14} />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.configCard}>
          <div className={styles.configInfo}>
            <span className={styles.configTitle}>Файл конфигурации (.json / .conf)</span>
            <span className={styles.configSub}>
              Импортируйте готовый конфиг в клиентское приложение в 1 клик
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={handleDownloadConfig}
            >
              Скачать конфиг
            </Button>
            {creds.config_url && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ExternalLink size={14} />}
                onClick={() => copy(creds.config_url!, "config_url")}
              >
                Скопировать URL
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

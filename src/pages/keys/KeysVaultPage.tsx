import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  BookOpen,
  Download,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { UserDigitalKey, PageResponse } from "@/api/types";
import { useCopy } from "@/hooks/use-copy";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Modal } from "@/components/ui/Modal/Modal";
import styles from "./KeysVaultPage.module.scss";

export const KeysVaultPage: React.FC = () => {
  const { copy, copiedKey } = useCopy();
  const [search, setSearch] = useState("");
  const [revealedKeys, setRevealedKeys] = useState<Record<number, boolean>>({});
  const [activeInstruction, setActiveInstruction] = useState<UserDigitalKey | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["user-keys"],
    queryFn: async () => {
      try {
        return await api.get<PageResponse<UserDigitalKey>>("/user/purchases", { limit: 100 });
      } catch {
        return { items: [], total: 0, limit: 100, offset: 0, has_more: false };
      }
    },
  });

  const keys = (data?.items || []).filter((k) =>
    (k.service_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleReveal = (id: number) => {
    setRevealedKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDownloadTxt = (k: UserDigitalKey) => {
    const text = `Продукт: ${k.service_name}\nКлюч активации: ${k.key_value}\nДата выдачи: ${new Date(
      k.created_at
    ).toLocaleString("ru-RU")}\n\nИнструкция:\n${
      k.instruction_md || "Инструкция не приложена"
    }`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `license-${k.service_name.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Ключ сохранен в файл .txt");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Хранилище ключей и лицензий</h1>
          <p className={styles.sub}>
            Ваши цифровые копии, серийные номера и лицензионные ключи
          </p>
        </div>

        <div className={styles.searchBar}>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию..."
            leftIcon={<Search size={16} />}
          />
        </div>
      </div>

      {isLoading ? (
        <div className={styles.empty}>
          <p>Загрузка ключей...</p>
        </div>
      ) : keys.length > 0 ? (
        <div className={styles.keysGrid}>
          {keys.map((k) => {
            const isRevealed = !!revealedKeys[k.id];
            const displayValue = isRevealed
              ? k.key_value
              : `${k.key_value.slice(0, 4)}••••••••${k.key_value.slice(-4)}`;

            return (
              <div key={k.id} className={styles.keyCard}>
                <div className={styles.leftSide}>
                  <div className={styles.nameRow}>
                    <Badge variant="accent">Лицензия</Badge>
                    <span className={styles.productName}>
                      {k.service_name || "Цифровой товар"}
                    </span>
                  </div>
                  <span className={styles.date}>
                    Выдан: {new Date(k.created_at).toLocaleDateString("ru-RU")}
                  </span>
                </div>

                <div className={styles.rightSide}>
                  <div className={styles.keyDisplay}>
                    <span>{displayValue}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleReveal(k.id)}
                      title={isRevealed ? "Скрыть" : "Показать"}
                    >
                      {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={
                      copiedKey === String(k.id) ? (
                        <Check size={14} color="var(--color-accent)" />
                      ) : (
                        <Copy size={14} />
                      )
                    }
                    onClick={() => copy(k.key_value, String(k.id))}
                  >
                    {copiedKey === String(k.id) ? "Скопировано" : "Копировать"}
                  </Button>

                  {k.instruction_md && (
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<BookOpen size={14} />}
                      onClick={() => setActiveInstruction(k)}
                    >
                      Инструкция
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    title="Скачать .txt"
                    onClick={() => handleDownloadTxt(k)}
                  >
                    <Download size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <KeyRound size={44} opacity={0.3} />
          <p>Цифровых ключей не найдено</p>
        </div>
      )}

      {/* Instruction Modal */}
      {activeInstruction && (
        <Modal
          isOpen={!!activeInstruction}
          onClose={() => setActiveInstruction(null)}
          title={`Инструкция: ${activeInstruction.service_name}`}
          size="md"
          footer={
            <Button variant="primary" onClick={() => setActiveInstruction(null)}>
              Понятно
            </Button>
          }
        >
          <div className={styles.instructionContent}>
            {activeInstruction.instruction_md}
          </div>
        </Modal>
      )}
    </div>
  );
};

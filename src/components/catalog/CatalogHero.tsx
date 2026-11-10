import React from "react";
import { MaskText } from "@/components/motion";
import { Input } from "@/components/ui/Input/Input";
import type { CatalogCategory } from "@/api/types";
import { Layers, Search, X } from "lucide-react";
import styles from "./CatalogHero.module.scss";

export interface CatalogHeroProps {
  activeCategory: CatalogCategory | null;
  bannerUrl?: string | null;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  totalCount: number;
}

export const CatalogHero: React.FC<CatalogHeroProps> = ({
  activeCategory,
  bannerUrl,
  searchQuery,
  onSearchChange,
  totalCount,
}) => {
  return (
    <section
      className={styles.hero}
      style={
        bannerUrl
          ? {
              backgroundImage: `linear-gradient(100deg, rgba(10, 10, 11, 0.94) 18%, rgba(10, 10, 11, 0.72) 65%, rgba(10, 10, 11, 0.48) 100%), url(${bannerUrl})`,
            }
          : undefined
      }
    >
      {!bannerUrl && <div className={styles.gridOverlay} aria-hidden="true" />}
      <div className={styles.ambientGlow} aria-hidden="true" />

      <div className={styles.content}>
        <div className={styles.topMeta}>
          <span className={styles.badge}>
            <Layers size={13} />
            <span>{activeCategory ? activeCategory.name : "Официальный каталог"}</span>
          </span>
          <span className={styles.counter}>{totalCount} позиций</span>
        </div>

        <h1 className={styles.title}>
          <MaskText direction="up" duration={600}>
            {activeCategory
              ? activeCategory.name.toUpperCase()
              : "КАТАЛОГ ТОВАРОВ И УСЛУГ"}
          </MaskText>
        </h1>

        <p className={styles.subtitle}>
          {activeCategory?.description ||
            "Цифровые ключи, подписки и автоматическая выдача сразу после оплаты"}
        </p>
      </div>

      <div className={styles.searchBox}>
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Найти товар или услугу..."
          leftIcon={<Search size={17} />}
          rightSlot={
            searchQuery ? (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => onSearchChange("")}
                aria-label="Очистить поиск"
              >
                <X size={15} />
              </button>
            ) : undefined
          }
        />
      </div>
    </section>
  );
};

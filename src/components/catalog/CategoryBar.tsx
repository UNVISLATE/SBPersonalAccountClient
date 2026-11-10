import React from "react";
import type { CatalogCategory } from "@/api/types";
import clsx from "clsx";
import styles from "./CategoryBar.module.scss";

export interface CategoryBarProps {
  rootCategories: CatalogCategory[];
  subCategories: CatalogCategory[];
  selectedCatId: number | "all";
  selectedSubCatId: number | "all";
  totalServicesCount: number;
  onSelectRoot: (id: number | "all") => void;
  onSelectSub: (id: number | "all") => void;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  rootCategories,
  subCategories,
  selectedCatId,
  selectedSubCatId,
  totalServicesCount,
  onSelectRoot,
  onSelectSub,
}) => {
  return (
    <div className={styles.wrap}>
      <div className={styles.scrollRow} role="tablist" aria-label="Категории каталога">
        <button
          type="button"
          role="tab"
          aria-selected={selectedCatId === "all"}
          className={clsx(styles.catPill, selectedCatId === "all" && styles.catActive)}
          onClick={() => onSelectRoot("all")}
        >
          <span>Все товары</span>
          <span className={styles.pillCount}>{totalServicesCount}</span>
        </button>

        {rootCategories.map((cat) => {
          const isActive = selectedCatId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={clsx(styles.catPill, isActive && styles.catActive)}
              onClick={() => onSelectRoot(cat.id)}
            >
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {subCategories.length > 0 && (
        <div className={styles.subRow}>
          <button
            type="button"
            className={clsx(styles.subPill, selectedSubCatId === "all" && styles.subActive)}
            onClick={() => onSelectSub("all")}
          >
            Все в разделе
          </button>
          {subCategories.map((sc) => (
            <button
              key={sc.id}
              type="button"
              className={clsx(styles.subPill, selectedSubCatId === sc.id && styles.subActive)}
              onClick={() => onSelectSub(sc.id)}
            >
              {sc.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

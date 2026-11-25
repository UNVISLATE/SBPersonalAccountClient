import React from "react";
import type { CatalogCategory } from "@/api/types";
import { ChevronRight, LayoutGrid } from "lucide-react";
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
    <nav className={styles.sidebarNav} aria-label="Категории каталога">
      <div className={styles.sidebarHeader}>
        <span className={styles.sidebarTitle}>Категории</span>
      </div>

      <div className={styles.scrollRow} role="tablist" aria-label="Категории каталога">
        <button
          type="button"
          role="tab"
          aria-selected={selectedCatId === "all"}
          className={clsx(styles.catItem, selectedCatId === "all" && styles.catActive)}
          onClick={() => onSelectRoot("all")}
        >
          <span className={styles.catLabel}>
            <LayoutGrid size={14} className={styles.catIcon} />
            <span>Все товары</span>
          </span>
          <span className={styles.pillCount}>{totalServicesCount}</span>
        </button>

        {rootCategories.map((cat) => {
          const isActive = selectedCatId === cat.id;
          return (
            <div key={cat.id} className={styles.catGroup}>
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                className={clsx(styles.catItem, isActive && styles.catActive)}
                onClick={() => onSelectRoot(cat.id)}
              >
                <span className={styles.catLabel}>{cat.name}</span>
                {isActive && subCategories.length > 0 && (
                  <ChevronRight size={14} className={styles.catChevron} />
                )}
              </button>

              {isActive && subCategories.length > 0 && (
                <div className={styles.subListDesktop}>
                  <button
                    type="button"
                    className={clsx(styles.subItem, selectedSubCatId === "all" && styles.subActive)}
                    onClick={() => onSelectSub("all")}
                  >
                    Все в разделе
                  </button>
                  {subCategories.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      className={clsx(styles.subItem, selectedSubCatId === sc.id && styles.subActive)}
                      onClick={() => onSelectSub(sc.id)}
                    >
                      {sc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {subCategories.length > 0 && (
        <div className={styles.subRowMobile}>
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
    </nav>
  );
};

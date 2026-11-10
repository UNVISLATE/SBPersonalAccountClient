import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import styles from "./Pagination.module.scss";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (nextPage: number) => void;
  disabled?: boolean;
}

function getPageRange(current: number, totalPages: number): Array<number | "..."> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: Array<number | "..."> = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(totalPages - 1, current + 1);

  if (left > 2) pages.push("...");
  for (let p = left; p <= right; p += 1) {
    pages.push(p);
  }
  if (right < totalPages - 1) pages.push("...");
  pages.push(totalPages);
  return pages;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
  disabled = false,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(total, page * pageSize);
  const pages = getPageRange(page, totalPages);

  return (
    <nav className={styles.wrap} aria-label="Пагинация">
      <span className={styles.summary}>
        Показано {startItem}–{endItem} из {total}
      </span>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.navBtn}
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Предыдущая страница"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((entry, idx) =>
          entry === "..." ? (
            <span key={`dots-${idx}`} className={styles.dots}>
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              disabled={disabled}
              className={clsx(styles.pageBtn, entry === page && styles.pageActive)}
              onClick={() => {
                if (entry !== page) onPageChange(entry);
              }}
              aria-current={entry === page ? "page" : undefined}
            >
              {entry}
            </button>
          )
        )}

        <button
          type="button"
          className={styles.navBtn}
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Следующая страница"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
};

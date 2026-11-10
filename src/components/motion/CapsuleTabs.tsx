import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import styles from "./CapsuleTabs.module.scss";

export interface CapsuleTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface CapsuleTabsProps {
  items: CapsuleTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  layoutId?: string;
  rightSlot?: React.ReactNode;
  className?: string;
}

/**
 * Ghost-style capsule navigation bar with spring sliding pill indicator (`layoutId`).
 */
export const CapsuleTabs: React.FC<CapsuleTabsProps> = ({
  items,
  activeId,
  onChange,
  layoutId = "capsule-active-pill",
  rightSlot,
  className,
}) => {
  return (
    <div className={cn(styles.bar, className)} role="tablist">
      <div className={styles.tabsTrack}>
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(item.id)}
              className={cn(styles.tab, isActive && styles.active)}
            >
              {isActive && (
                <motion.span
                  layoutId={layoutId}
                  className={styles.activePill}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              {item.icon && <span className={styles.tabIcon}>{item.icon}</span>}
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge !== null && (
                <span className={styles.badge}>{item.badge}</span>
              )}
            </button>
          );
        })}
      </div>
      {rightSlot && <div className={styles.actions}>{rightSlot}</div>}
    </div>
  );
};

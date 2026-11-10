import React from "react";
import clsx from "clsx";
import styles from "./Badge.module.scss";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "accent" | "success" | "warning" | "danger" | "muted";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "md",
  dot = false,
  className,
  style,
}) => {
  return (
    <span className={clsx(styles.badge, styles[variant], styles[size], className)} style={style}>
      {dot && <span className={styles.dot} />}
      <span className={styles.content}>{children}</span>
    </span>
  );
};

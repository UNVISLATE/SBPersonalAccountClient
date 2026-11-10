import React from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import styles from "./Button.module.scss";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "gradient";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      icon,
      iconPosition = "left",
      className,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          styles.button,
          styles[variant],
          styles[size],
          loading && styles.loading,
          className
        )}
        {...props}
      >
        {loading && <Loader2 className={styles.spinner} size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />}
        {!loading && icon && iconPosition === "left" && <span className={styles.icon}>{icon}</span>}
        {children && <span className={styles.label}>{children}</span>}
        {!loading && icon && iconPosition === "right" && <span className={styles.icon}>{icon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import clsx from "clsx"
import styles from "./Badge.module.scss"

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "neutral" | "accent"
  size?: "sm" | "md"
  dot?: boolean
  pulse?: boolean
  icon?: ReactNode
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      className,
      variant = "neutral",
      size = "md",
      dot = false,
      pulse = false,
      icon,
      ...props
    },
    ref,
  ) => {
    return (
      <span
        ref={ref}
        className={clsx(
          styles.badge,
          styles[variant],
          styles[size],
          pulse && styles.pulse,
          className,
        )}
        {...props}
      >
        {(dot || pulse) && <span className={styles.dot} />}
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className={styles.label}>{children}</span>
      </span>
    )
  },
)

Badge.displayName = "Badge"

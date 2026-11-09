import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import clsx from "clsx"
import styles from "./Button.module.scss"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  isLoading?: boolean
  icon?: ReactNode
  leftIcon?: ReactNode
  iconRight?: ReactNode
  rightIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "primary",
      size = "md",
      loading = false,
      isLoading = false,
      disabled,
      icon,
      leftIcon,
      iconRight,
      rightIcon,
      ...props
    },
    ref,
  ) => {
    const isSpinning = loading || isLoading
    const effectiveLeftIcon = icon || leftIcon
    const effectiveRightIcon = iconRight || rightIcon

    return (
      <button
        ref={ref}
        disabled={disabled || isSpinning}
        className={clsx(
          styles.button,
          styles[variant],
          styles[size],
          isSpinning && styles.loading,
          className,
        )}
        {...props}
      >
        {isSpinning ? (
          <Loader2 className={clsx(styles.spinner, styles.icon)} />
        ) : (
          effectiveLeftIcon && <span className={styles.icon}>{effectiveLeftIcon}</span>
        )}
        {children && <span className={styles.label}>{children}</span>}
        {!isSpinning && effectiveRightIcon && (
          <span className={styles.iconRight}>{effectiveRightIcon}</span>
        )}
      </button>
    )
  },
)

Button.displayName = "Button"

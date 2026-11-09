import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react"
import clsx from "clsx"
import styles from "./Input.module.scss"

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  iconLeft?: ReactNode
  leftIcon?: ReactNode
  iconRight?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      iconLeft,
      leftIcon,
      iconRight,
      rightIcon,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined)
    const effectiveLeft = iconLeft || leftIcon
    const effectiveRight = iconRight || rightIcon

    return (
      <div className={clsx(styles.wrapper, className)}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={clsx(styles.inputContainer, error && styles.hasError)}>
          {effectiveLeft && <span className={styles.iconLeft}>{effectiveLeft}</span>}
          <input
            ref={ref}
            id={inputId}
            className={clsx(styles.input, effectiveLeft && styles.paddedLeft, effectiveRight && styles.paddedRight)}
            {...props}
          />
          {effectiveRight && <span className={styles.iconRight}>{effectiveRight}</span>}
        </div>
        {error ? (
          <span className={styles.errorText}>{error}</span>
        ) : (
          helperText && <span className={styles.helperText}>{helperText}</span>
        )}
      </div>
    )
  },
)

Input.displayName = "Input"

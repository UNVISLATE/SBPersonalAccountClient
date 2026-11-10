import React, { forwardRef } from "react"
import clsx from "clsx"
import styles from "./Input.module.scss"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftIcon?: React.ReactNode
  rightSlot?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leftIcon, rightSlot, className, id, ...props }, ref) => {
    const inputId = id || (label ? `input-${Math.random().toString(36).slice(2, 9)}` : undefined)

    return (
      <div className={styles.root}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={clsx(styles.wrapper, error && styles.hasError)}>
          {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={clsx(styles.input, leftIcon && styles.withLeft, rightSlot && styles.withRight, className)}
            {...props}
          />
          {rightSlot && <span className={styles.rightSlot}>{rightSlot}</span>}
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {!error && hint && <p className={styles.hint}>{hint}</p>}
      </div>
    )
  }
)

Input.displayName = "Input"

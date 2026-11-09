import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import clsx from "clsx"
import styles from "./Card.module.scss"

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  glow?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, interactive = false, glow = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          styles.card,
          interactive && styles.interactive,
          glow && styles.glow,
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)

Card.displayName = "Card"

export function CardHeader({
  children,
  className,
  title,
  subtitle,
  action,
}: {
  children?: ReactNode
  className?: string
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className={clsx(styles.header, className)}>
      <div className={styles.titles}>
        {title && <h3 className={styles.title}>{title}</h3>}
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {children}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx(styles.body, className)}>{children}</div>
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx(styles.footer, className)}>{children}</div>
}

import React from "react";
import { cn } from "@/lib/cn";
import styles from "./MaskText.module.scss";

export interface MaskTextProps {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
  className?: string;
}

/**
 * Ghost-style clipped text slide reveal for bold display headings.
 */
export const MaskText: React.FC<MaskTextProps> = ({
  children,
  direction = "up",
  delay = 0,
  duration = 700,
  className,
}) => {
  return (
    <span className={cn(styles.maskText, className)}>
      <span
        className={styles.inner}
        data-direction={direction}
        style={
          {
            "--mask-delay": `${delay}ms`,
            "--mask-duration": `${duration}ms`,
          } as React.CSSProperties
        }
      >
        {children}
      </span>
    </span>
  );
};

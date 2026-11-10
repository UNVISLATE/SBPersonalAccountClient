import React from "react";
import { cn } from "@/lib/cn";
import styles from "./Skeleton.module.scss";

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: "rect" | "circle" | "text";
  rounded?: "xs" | "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  variant = "rect",
  rounded,
  className,
}) => {
  return (
    <div
      aria-hidden="true"
      className={cn(
        styles.skeleton,
        variant === "circle" && styles.circle,
        variant === "text" && styles.text,
        rounded && styles[`rounded_${rounded}`],
        className
      )}
      style={{ width, height }}
    />
  );
};

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import styles from "./Reveal.module.scss";

export type RevealVariant =
  | "fade"
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "fade-blur"
  | "scale";

export interface RevealProps {
  children: React.ReactNode;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  stagger?: boolean;
  staggerStep?: number;
  eager?: boolean;
  className?: string;
}

/**
 * Ghost-style viewport/mount reveal animation container.
 * When `stagger` is enabled, direct children marked with `data-reveal-item`
 * animate sequentially via `--stagger-index`.
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  variant = "fade-up",
  delay = 0,
  duration = 650,
  stagger = false,
  staggerStep = 60,
  eager = false,
  className,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [intersected, setIntersected] = useState(
    () => eager || typeof IntersectionObserver === "undefined"
  );

  const visible = eager || intersected;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (stagger) {
      const items = el.querySelectorAll<HTMLElement>(":scope > [data-reveal-item]");
      items.forEach((item, idx) => {
        item.style.setProperty("--stagger-index", String(idx));
      });
    }

    if (eager || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIntersected(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [eager, stagger]);

  return (
    <div
      ref={ref}
      data-visible={visible ? "true" : "false"}
      data-variant={variant}
      data-stagger={stagger ? "true" : "false"}
      className={cn(styles.reveal, className)}
      style={
        {
          "--reveal-delay": `${delay}ms`,
          "--reveal-duration": `${duration}ms`,
          "--stagger-step": `${staggerStep}ms`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
};

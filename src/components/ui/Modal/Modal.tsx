import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { useIsMobile } from "@/hooks/use-media-query";
import { X } from "lucide-react";
import clsx from "clsx";
import styles from "./Modal.module.scss";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number | string;
  className?: string;
  showCloseButton?: boolean;
  /** "default" = centered dialog, "sheet" = swipeable bottom-sheet without close button on mobile */
  variant?: "default" | "sheet";
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest("button, a, input, textarea, select, [role='slider'], [data-no-sheet-drag]")
  );
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 480,
  className,
  showCloseButton = true,
  variant = "default",
}) => {
  const isMobile = useIsMobile();
  const isMobileSheet = variant === "sheet" && isMobile;
  const dragControls = useDragControls();
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchCanDismissRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 85 || info.velocity.y > 380) {
      onClose();
    }
  };

  const handleContentPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobileSheet || isInteractiveTarget(e.target)) return;
    const el = contentRef.current;
    if (!el || el.scrollHeight <= el.clientHeight + 2) {
      dragControls.start(e);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobileSheet || isInteractiveTarget(e.target)) {
      touchStartYRef.current = null;
      touchCanDismissRef.current = false;
      return;
    }
    const el = contentRef.current;
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
    touchCanDismissRef.current = Boolean(!el || el.scrollTop <= 1);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobileSheet || !touchCanDismissRef.current || touchStartYRef.current === null) return;
    const el = contentRef.current;
    if (el && el.scrollTop > 1) {
      touchCanDismissRef.current = false;
      return;
    }
    const currentY = e.touches[0]?.clientY ?? touchStartYRef.current;
    if (currentY - touchStartYRef.current > 80) {
      touchStartYRef.current = null;
      touchCanDismissRef.current = false;
      onClose();
    }
  };

  const showClose = showCloseButton && !isMobileSheet;

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className={clsx(
            styles.overlay,
            isMobileSheet ? styles.overlaySheet : styles.overlayDefault
          )}
          data-lenis-prevent
          data-lenis-prevent-wheel
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className={clsx(styles.modal, styles[variant], className)}
            data-lenis-prevent
            data-lenis-prevent-wheel
            style={isMobileSheet ? undefined : { maxWidth }}
            initial={
              isMobileSheet
                ? { y: "100%", opacity: 1 }
                : { opacity: 0, y: 20, scale: 0.96 }
            }
            animate={
              isMobileSheet
                ? { y: 0, opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              isMobileSheet
                ? { y: "100%", opacity: 1 }
                : { opacity: 0, y: 14, scale: 0.96 }
            }
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            drag={isMobileSheet ? "y" : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.55 }}
            onDragEnd={isMobileSheet ? handleDragEnd : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            {isMobileSheet && (
              <div
                className={styles.dragHandleWrap}
                onPointerDown={(e) => dragControls.start(e)}
                aria-hidden="true"
              >
                <span className={styles.dragHandleBar} />
              </div>
            )}

            {(title || subtitle || showClose) && (
              <div
                className={clsx(styles.header, isMobileSheet && styles.sheetHeader)}
                onPointerDown={(e) => {
                  if (isMobileSheet && !isInteractiveTarget(e.target)) {
                    dragControls.start(e);
                  }
                }}
              >
                <div className={styles.titleWrap}>
                  {title && <h3 className={styles.title}>{title}</h3>}
                  {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                </div>
                {showClose && (
                  <button
                    type="button"
                    className={styles.closeBtn}
                    onClick={onClose}
                    aria-label="Закрыть"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            <div
              ref={contentRef}
              className={styles.content}
              data-lenis-prevent
              data-lenis-prevent-wheel
              onPointerDown={handleContentPointerDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

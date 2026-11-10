import React, { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { CustomVideoPlayer } from "./CustomVideoPlayer";
import styles from "./MediaLightbox.module.scss";

export interface MediaItem {
  id: string | number;
  url: string;
  type?: "image" | "video";
  name?: string;
}

export interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  items: MediaItem[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction >= 0 ? 44 : -44,
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction >= 0 ? -44 : 44,
    opacity: 0,
    scale: 0.96,
  }),
};

const counterVariants = {
  enter: (direction: number) => ({
    y: direction >= 0 ? 12 : -12,
    opacity: 0,
    scale: 0.82,
  }),
  center: {
    y: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    y: direction >= 0 ? -12 : 12,
    opacity: 0,
    scale: 0.82,
  }),
};

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  isOpen,
  onClose,
  items,
  currentIndex,
  onNavigate,
}) => {
  const [direction, setDirection] = useState(1);
  const currentItem = items[currentIndex];

  const handlePrev = useCallback(() => {
    if (items.length <= 1) return;
    setDirection(-1);
    const nextIdx = (currentIndex - 1 + items.length) % items.length;
    onNavigate(nextIdx);
  }, [currentIndex, items.length, onNavigate]);

  const handleNext = useCallback(() => {
    if (items.length <= 1) return;
    setDirection(1);
    const nextIdx = (currentIndex + 1) % items.length;
    onNavigate(nextIdx);
  }, [currentIndex, items.length, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (typeof document === "undefined") return null;

  const isVideo =
    Boolean(currentItem) &&
    (currentItem.type === "video" ||
      Boolean(currentItem.url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)));

  return createPortal(
    <AnimatePresence>
      {isOpen && currentItem && (
        <motion.div
          key="media-lightbox-overlay"
          className={styles.overlay}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
        >
          <motion.div
            className={styles.lightboxBody}
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 14 }}
            transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
          >
            <div className={styles.carouselRow}>
              {items.length > 1 && (
                <motion.button
                  type="button"
                  className={`${styles.navBtn} ${styles.prevBtn}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  whileHover={{ scale: 1.15, x: -2 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Предыдущий"
                >
                  <ChevronLeft size={30} />
                </motion.button>
              )}

              <div
                className={styles.mediaFrame}
                onClick={(e) => e.stopPropagation()}
              >
                <motion.button
                  type="button"
                  className={styles.closeBtn}
                  onClick={onClose}
                  whileHover={{ scale: 1.14, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                  aria-label="Закрыть"
                >
                  <X size={24} />
                </motion.button>

                <AnimatePresence mode="wait" custom={direction} initial={false}>
                  <motion.div
                    key={currentItem.id ?? currentIndex}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
                    className={styles.slideStage}
                  >
                    {isVideo ? (
                      <div className={styles.videoWrapper}>
                        <CustomVideoPlayer src={currentItem.url} autoPlay />
                      </div>
                    ) : (
                      <img
                        src={currentItem.url}
                        alt={currentItem.name || "Media preview"}
                        className={styles.image}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {items.length > 1 && (
                <motion.button
                  type="button"
                  className={`${styles.navBtn} ${styles.nextBtn}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  whileHover={{ scale: 1.15, x: 2 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Следующий"
                >
                  <ChevronRight size={30} />
                </motion.button>
              )}
            </div>

            <div
              className={styles.counterBar}
              onClick={(e) => e.stopPropagation()}
              aria-live="polite"
            >
              <div className={styles.counterSlot}>
                <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                  <motion.span
                    key={currentIndex}
                    custom={direction}
                    variants={counterVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
                    className={styles.counterCurrent}
                  >
                    {currentIndex + 1}
                  </motion.span>
                </AnimatePresence>
              </div>
              <span className={styles.counterDivider}>/</span>
              <span className={styles.counterTotal}>{items.length}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

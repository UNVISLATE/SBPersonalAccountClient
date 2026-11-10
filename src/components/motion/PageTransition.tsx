import React, { useState } from "react";
import { motion } from "motion/react";
import styles from "./PageTransition.module.scss";

export interface PageTransitionProps {
  routeKey: string;
  children: React.ReactNode;
  showIris?: boolean;
  className?: string;
}

/**
 * Ghost-style route transition combining an iris radial feather mask
 * with a subtle spring-like opacity/vertical settle.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  routeKey,
  children,
  showIris = true,
  className,
}) => {
  const [finishedKey, setFinishedKey] = useState<string | null>(null);
  const irisVisible = showIris && finishedKey !== routeKey;

  return (
    <div className={styles.wrapper}>
      {irisVisible && (
        <div
          key={`iris-${routeKey}`}
          className={styles.irisOverlay}
          aria-hidden="true"
          onAnimationEnd={() => setFinishedKey(routeKey)}
        />
      )}
      <motion.div
        key={routeKey}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        className={className}
      >
        {children}
      </motion.div>
    </div>
  );
};

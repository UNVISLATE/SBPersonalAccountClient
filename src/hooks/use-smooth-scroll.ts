import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Enables smooth inertia scrolling on desktop viewports while respecting
 * `prefers-reduced-motion` and allowing native wheel scroll inside open modals/scrollboxes.
 */
export function useSmoothScroll(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      prevent: (node) =>
        document.body.style.overflow === "hidden" ||
        Boolean(
          node.closest(
            "[data-lenis-prevent], [data-lenis-prevent-wheel], [role='dialog']"
          )
        ),
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [enabled]);
}

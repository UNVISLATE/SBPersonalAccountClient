import { useEffect, useRef } from "react"

export interface UseInfiniteSentinelOptions {
  enabled: boolean
  hasNextPage?: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
  rootMargin?: string
}

/**
 * Reusable IntersectionObserver sentinel hook for dynamic batch loading on scroll.
 */
export function useInfiniteSentinel({
  enabled,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  rootMargin = "220px",
}: UseInfiniteSentinelOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!enabled || !hasNextPage || isFetchingNextPage) return
    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore()
        }
      },
      { rootMargin }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, hasNextPage, isFetchingNextPage, onLoadMore, rootMargin])

  return sentinelRef
}

import { useSyncExternalStore } from "react"

const MOBILE_QUERY = "(max-width: 767px)"

function subscribeMobile(cb: () => void) {
  if (typeof window === "undefined") return () => {}
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener("change", cb)
  return () => mql.removeEventListener("change", cb)
}

function getMobileSnapshot(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia(MOBILE_QUERY).matches
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribeMobile, getMobileSnapshot, () => false)
}

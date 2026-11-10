#!/bin/sh
set -eu

OUT="/usr/share/nginx/html/env-config.js"

escape_js_str() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | tr -d '\r\n'
}

{
  printf 'window.__SB_CONFIG__ = {\n'
  if [ -n "${VITE_API_BASE_URL:-}" ]; then
    printf '  "VITE_API_BASE_URL": "%s",\n' "$(escape_js_str "$VITE_API_BASE_URL")"
  fi
  if [ -n "${VITE_MEDIA_BASE_URL:-}" ]; then
    printf '  "VITE_MEDIA_BASE_URL": "%s",\n' "$(escape_js_str "$VITE_MEDIA_BASE_URL")"
  fi
  if [ -n "${VITE_AUTH_BASE_URL:-}" ]; then
    printf '  "VITE_AUTH_BASE_URL": "%s",\n' "$(escape_js_str "$VITE_AUTH_BASE_URL")"
  fi
  printf '};\n'
} > "$OUT"

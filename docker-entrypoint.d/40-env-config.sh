#!/bin/sh
set -eu

HTML_DIR="/usr/share/nginx/html"
OUT_CFG="$HTML_DIR/env-config.js"
TEMPLATE="$HTML_DIR/index.template.html"
INDEX_OUT="$HTML_DIR/index.html"

if [ ! -f "$TEMPLATE" ] && [ -f "$INDEX_OUT" ]; then
  cp "$INDEX_OUT" "$TEMPLATE"
fi

escape_js_str() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | tr -d '\r\n'
}

escape_html_attr() {
  printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/"/\&quot;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' | tr -d '\r\n'
}

escape_html_text() {
  printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' | tr -d '\r\n'
}

SITE_TITLE_ENV="${CLIENT_SITE_TITLE:-${VITE_SITE_TITLE:-}}"
SITE_DESC_ENV="${CLIENT_SITE_DESCRIPTION:-${VITE_SITE_DESCRIPTION:-}}"
FAVICON_ENV="${CLIENT_FAVICON_URL:-${VITE_FAVICON_URL:-}}"
LOGO_ENV="${CLIENT_LOGO_URL:-${VITE_LOGO_URL:-}}"
OG_IMAGE_ENV="${CLIENT_OG_IMAGE_URL:-}"

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
  if [ -n "$SITE_TITLE_ENV" ]; then
    printf '  "VITE_SITE_TITLE": "%s",\n' "$(escape_js_str "$SITE_TITLE_ENV")"
  fi
  if [ -n "$SITE_DESC_ENV" ]; then
    printf '  "VITE_SITE_DESCRIPTION": "%s",\n' "$(escape_js_str "$SITE_DESC_ENV")"
  fi
  if [ -n "$FAVICON_ENV" ]; then
    printf '  "VITE_FAVICON_URL": "%s",\n' "$(escape_js_str "$FAVICON_ENV")"
  fi
  if [ -n "$LOGO_ENV" ]; then
    printf '  "VITE_LOGO_URL": "%s",\n' "$(escape_js_str "$LOGO_ENV")"
  fi
  printf '};\n'
} > "$OUT_CFG"

sync_index_html() {
  [ -f "$TEMPLATE" ] || return 0

  local api_name="" api_favicon="" api_logo="" api_desc=""
  local branding_url="${CLIENT_BRANDING_URL:-http://billing:8000/api/v1/branding/client}"

  if [ -n "$branding_url" ]; then
    local json=""
    json=$(wget -qO- -T 3 "$branding_url" 2>/dev/null || true)
    if [ -n "$json" ] && command -v jq >/dev/null 2>&1; then
      api_name=$(printf '%s' "$json" | jq -r '.name // .shop_name // empty' 2>/dev/null || true)
      api_favicon=$(printf '%s' "$json" | jq -r '.favicon_url // empty' 2>/dev/null || true)
      api_logo=$(printf '%s' "$json" | jq -r '.logo_url // empty' 2>/dev/null || true)
      api_desc=$(printf '%s' "$json" | jq -r '.settings.site_description // .settings.description // empty' 2>/dev/null || true)
    fi
  fi

  local final_title="${SITE_TITLE_ENV:-${api_name:-SaviorBill Client}}"
  local final_desc="${SITE_DESC_ENV:-${api_desc:-${final_title} — Личный кабинет покупателя}}"
  local final_favicon="${FAVICON_ENV:-${api_favicon:-/favicon.svg}}"
  local final_og_image="${OG_IMAGE_ENV:-${LOGO_ENV:-${api_logo:-/unvi/logo_1x1_128.webp}}}"

  export SB_HTML_TITLE="$(escape_html_text "$final_title")"
  export SB_HTML_TITLE_ATTR="$(escape_html_attr "$final_title")"
  export SB_HTML_DESC_ATTR="$(escape_html_attr "$final_desc")"
  export SB_HTML_FAVICON_ATTR="$(escape_html_attr "$final_favicon")"
  export SB_HTML_OG_IMAGE_ATTR="$(escape_html_attr "$final_og_image")"

  local tmp_html="$HTML_DIR/.index.html.tmp.$$"
  awk '
    {
      if ($0 ~ /<title>.*<\/title>/) {
        print "    <title>" ENVIRON["SB_HTML_TITLE"] "</title>"
      } else if ($0 ~ /<link rel="icon"/) {
        print "    <link rel=\"icon\" href=\"" ENVIRON["SB_HTML_FAVICON_ATTR"] "\" />"
      } else if ($0 ~ /<meta name="description"/) {
        print "    <meta name=\"description\" content=\"" ENVIRON["SB_HTML_DESC_ATTR"] "\" />"
      } else if ($0 ~ /<meta property="og:title"/) {
        print "    <meta property=\"og:title\" content=\"" ENVIRON["SB_HTML_TITLE_ATTR"] "\" />"
      } else if ($0 ~ /<meta property="og:description"/) {
        print "    <meta property=\"og:description\" content=\"" ENVIRON["SB_HTML_DESC_ATTR"] "\" />"
      } else if ($0 ~ /<meta property="og:image"/) {
        print "    <meta property=\"og:image\" content=\"" ENVIRON["SB_HTML_OG_IMAGE_ATTR"] "\" />"
      } else {
        print $0
      }
    }
  ' "$TEMPLATE" > "$tmp_html"

  if [ -s "$tmp_html" ]; then
    if ! cmp -s "$tmp_html" "$INDEX_OUT" 2>/dev/null; then
      mv -f "$tmp_html" "$INDEX_OUT"
    else
      rm -f "$tmp_html"
    fi
  else
    rm -f "$tmp_html"
  fi
}

sync_index_html || true

SYNC_INTERVAL="${CLIENT_BRANDING_SYNC_INTERVAL:-300}"
if [ -n "${CLIENT_BRANDING_URL:-http://billing:8000/api/v1/branding/client}" ] && [ "$SYNC_INTERVAL" -gt 0 ] 2>/dev/null; then
  (
    while true; do
      sleep "$SYNC_INTERVAL"
      sync_index_html >/dev/null 2>&1 || true
    done
  ) >/dev/null 2>&1 &
fi

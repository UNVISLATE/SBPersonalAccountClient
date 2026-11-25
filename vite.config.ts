import { defineConfig, loadEnv, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

function brandingHtmlPlugin(env: Record<string, string>): Plugin {
  const title = (env.VITE_SITE_TITLE || "").trim()
  const desc = (env.VITE_SITE_DESCRIPTION || "").trim()
  const favicon = (env.VITE_FAVICON_URL || "").trim()
  const logo = (env.VITE_LOGO_URL || "").trim()
  const esc = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  return {
    name: "sb-branding-html",
    transformIndexHtml(html) {
      let out = html
      if (title) {
        out = out
          .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
          .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
      }
      if (desc) {
        out = out
          .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
          .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
      }
      if (favicon) {
        out = out.replace(/(<link rel="icon"[^>]*href=")[^"]*(")/, `$1${esc(favicon)}$2`)
      }
      if (logo) {
        out = out.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(logo)}$2`)
      }
      return out
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiTarget = env.VITE_DEV_API_TARGET || "http://127.0.0.1:8000"
  const mediaTarget = env.VITE_DEV_MEDIA_TARGET || "http://127.0.0.1:8001"

  return {
    plugins: [react(), brandingHtmlPlugin(env)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@unvislate/sbui-sdk": path.resolve(__dirname, "./vendor/sbuiSDK/src"),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          // Modern Dart Sass API
          api: "modern-compiler",
          additionalData: `@use "@/styles/variables" as *; @use "@/styles/mixins" as *;`,
        },
      },
    },
    server: {
      port: 5174,
      proxy: {
        "/api/media": {
          target: mediaTarget,
          changeOrigin: true,
          ws: true,
        },
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: "",
          cookiePathRewrite: "/",
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            query: ["@tanstack/react-query"],
            motion: ["motion"],
            icons: ["lucide-react"],
          },
        },
      },
    },
  }
})

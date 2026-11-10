import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiTarget = env.VITE_DEV_API_TARGET || "http://127.0.0.1:8000"
  const mediaTarget = env.VITE_DEV_MEDIA_TARGET || "http://127.0.0.1:8001"

  return {
    plugins: [react()],
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

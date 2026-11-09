import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
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
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
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
})

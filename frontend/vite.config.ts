import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  // テストのカバレッジ計測設定。画面のロジックがどこまで検証されているかを見る。
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      // アプリのソースだけを対象にし、テストと生成物は除く
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.*",
        "src/**/*.d.ts",
        // レジストリ由来のUI部品と、型定義だけのファイルは分母から除く
        "src/components/ui/**",
        "src/components/reui/**",
        "src/types/**",
        "src/main.tsx",
      ],
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    // Google OAuthのコールバック先と一致させ、空きポートへの自動変更を防ぐ。
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
})

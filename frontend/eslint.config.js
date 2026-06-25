import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"
import {
  defineConfig,
  globalIgnores,
} from "eslint/config"

export default defineConfig([
  // ビルド結果の除外設定
  globalIgnores([
    "dist", // Viteのビルド結果
  ]),

  // TypeScript・React用の基本設定
  {
    files: [
      "**/*.{ts,tsx}", // TypeScriptファイル
    ],
    extends: [
      js.configs.recommended, // JavaScript推奨ルール
      tseslint.configs.recommended, // TypeScript推奨ルール
      reactHooks.configs.flat.recommended, // React Hooksルール
      reactRefresh.configs.vite, // Vite Fast Refreshルール
    ],
    languageOptions: {
      globals: globals.browser, // ブラウザ用のグローバル変数
    },
  },

  // shadcn生成ファイル用の例外設定
  {
    files: [
      "src/components/ui/**/*.{ts,tsx}", // shadcnのUIファイル
    ],
    rules: {
      "react-refresh/only-export-components": "off", // 定数との同時exportを許可
    },
  },
])
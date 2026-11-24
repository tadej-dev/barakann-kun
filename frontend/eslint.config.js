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
  // ビルド結果とE2E生成物の除外設定
  globalIgnores([
    "dist", // Viteのビルド結果
    "playwright-report", // PlaywrightのHTMLレポート
    "test-results", // Playwrightの失敗時成果物
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

  // Playwrightの設定とE2Eテスト用の設定
  {
    files: [
      "playwright.config.ts", // Playwrightの設定
      "test/e2e/**/*.ts", // E2Eのテスト・fixture・Page Object
    ],
    languageOptions: {
      // E2EはNode上で動くため、Nodeのグローバル変数も許可
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      // Playwrightのfixture関数はuse引数を取るため、React Hooksの判定を外す
      "react-hooks/rules-of-hooks": "off",
    },
  },

  // E2Eの補助スクリプト用の設定
  {
    files: [
      "test/e2e/**/*.mjs", // E2Eの補助スクリプト
    ],
    extends: [
      js.configs.recommended, // JavaScript推奨ルール
    ],
    languageOptions: {
      globals: globals.node, // Nodeのグローバル変数
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
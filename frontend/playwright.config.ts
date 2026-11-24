import { defineConfig, devices } from "@playwright/test"

// E2EのフロントエンドURL（Vite開発サーバー）
const BASE_URL = "http://localhost:5173"
// E2EのAPI URL（wrangler dev）
const API_URL = "http://localhost:8787"
// APIの起動確認に使うヘルスチェックURL
const API_HEALTH_URL = `${API_URL}/api/health`
// E2E専用D1の永続化先（apiディレクトリ基準）
const E2E_PERSIST_TO = ".wrangler/e2e"
// E2E専用のAPI環境変数ファイル（api基準・本物の秘密値なし）
const E2E_ENV_FILE = "../frontend/test/e2e/wrangler.env"
// E2E DBの初期化とマイグレーションに掛ける時間の上限
const API_START_TIMEOUT_MS = 180_000
// Vite開発サーバーの起動を待つ時間の上限
const FRONTEND_START_TIMEOUT_MS = 120_000

// API起動前にE2E専用DBを作り直し、E2E専用の環境変数でwrangler devを起動
const API_START_COMMAND = [
    // 前回のE2E DBを削除し、wrangler devに必要な空のdistを用意
    "node ../frontend/test/e2e/scripts/prepare-db.mjs",
    // 非対話でE2E専用DBへマイグレーションを適用（開発DBには触れない）
    `CI=1 npm run db:migrate:local -- --persist-to ${E2E_PERSIST_TO}`,
    // モックGoogleとE2E専用の認証設定を渡してAPIを起動
    `npx wrangler dev --local --port 8787 --persist-to ${E2E_PERSIST_TO} --env-file ${E2E_ENV_FILE}`,
].join(" && ")

// PlaywrightのE2E設定
export default defineConfig({
    // E2Eテストの配置先
    testDir: "./test/e2e",
    // 認証用モックの起動とDBの初期化をテスト前に実行
    globalSetup: "./test/e2e/global-setup.ts",
    // DBを共有するため、テストを1プロセスで直列実行
    workers: 1,
    // CIでは.onlyの残存を失敗にし、手元では再試行しない
    forbidOnly: Boolean(process.env.CI),
    // CIでは一時的な失敗を再試行
    retries: process.env.CI ? 2 : 0,
    // 初回のVite変換を待てるよう1テストの上限を延ばす
    timeout: 60_000,
    // 画面更新を待つ共通の上限
    expect: { timeout: 10_000 },
    // 失敗時だけtrace・スクリーンショット・動画を残す
    use: {
        baseURL: BASE_URL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    // ローカルでは一覧表示とHTMLレポートを出す
    reporter: [["list"], ["html", { open: "never" }]],
    // デスクトップとスマホ幅の両方で確認
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "mobile",
            use: { ...devices["Pixel 7"] },
        },
    ],
    // API起動前のDBマイグレーションと、/apiを8787へ転送するVite設定
    webServer: [
        {
            name: "api",
            command: API_START_COMMAND,
            cwd: "../api",
            url: API_HEALTH_URL,
            // 開発用APIを流用するとE2E用の環境変数とDBが使われない
            reuseExistingServer: false,
            timeout: API_START_TIMEOUT_MS,
            stdout: "pipe",
        },
        {
            name: "frontend",
            command: "npm run dev",
            cwd: ".",
            url: BASE_URL,
            // 既存Viteの再利用で別APIへ接続しないよう、毎回起動する
            reuseExistingServer: false,
            env: {...process.env, API_PROXY_TARGET: API_URL},
            timeout: FRONTEND_START_TIMEOUT_MS,
        },
    ],
})

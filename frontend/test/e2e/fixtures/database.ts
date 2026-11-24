import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const E2E_API_URL = process.env.E2E_API_URL ?? "http://localhost:8787" // E2E APIのURL
export const E2E_PERSIST_TO = ".wrangler/e2e" // E2E専用D1の永続化先（api基準）
const E2E_D1_DIR = path.join("v3", "d1", "miniflare-D1DatabaseObject") // ローカルD1の実体
const FIXTURES_DIR = path.dirname(fileURLToPath(import.meta.url)) // fixturesディレクトリ
export const API_DIR = path.resolve(FIXTURES_DIR, "../../../../api") // apiディレクトリ
const E2E_D1_PATH = path.join(API_DIR, E2E_PERSIST_TO, E2E_D1_DIR) // E2E用D1の絶対パス
const RESET_USER_DATA_SQL = [ // ユーザー関連データを消すSQL
    "DELETE FROM saved_build_parts;",
    "DELETE FROM saved_build_orders;",
    "DELETE FROM saved_builds;",
    "DELETE FROM sessions;",
    "DELETE FROM auth_accounts;",
    "DELETE FROM users;",
].join(" ")

// E2E専用D1が作られているか
export function hasE2eDatabase(): boolean {
    return existsSync(E2E_D1_PATH)
}

// D1へのSQL実行
function executeE2eD1(sql: string): void {
    // apiの依存にあるwranglerを使うため、apiディレクトリで実行
    const result = spawnSync(
        "npx",
        [
            "wrangler",
            "d1",
            "execute",
            "DB",
            "--local",
            "--persist-to",
            E2E_PERSIST_TO,
            "--command",
            sql,
        ],
        {
            cwd: API_DIR,
            encoding: "utf8",
            env: { ...process.env, CI: "1" },
        },
    )

    // 失敗時は実行したSQLとwranglerの出力を残す
    if (result.status !== 0) {
        throw new Error(
            `E2E用D1の初期化に失敗\nSQL: ${sql}\n${result.stdout}\n${result.stderr}`,
        )
    }
}

// アカウント・保存構成・セッションを消してE2E開始時の状態へ戻す
export function resetE2eUserData(): void {
    executeE2eD1(RESET_USER_DATA_SQL)
}

// APIの起動完了を待つ
export async function waitForE2eApi(timeoutMs = 30_000): Promise<void> {
    // 再試行を始めた時刻
    const startedAt = Date.now()

    // 応答が返るまで短い間隔で再試行
    while (Date.now() - startedAt < timeoutMs) {
        try {
            // ヘルスチェックの応答
            const response = await fetch(`${E2E_API_URL}/api/health`)

            // 正常応答ならAPI起動済み
            if (response.ok) {
                return
            }
        } catch {
            // 起動途中で接続できない場合は待ってから再試行
        }

        await new Promise((resolve) => setTimeout(resolve, 250))
    }

    throw new Error(
        `E2E APIが${timeoutMs}ms以内に起動しませんでした: ${E2E_API_URL}`,
    )
}

// カテゴリー初期データの投入確認
export async function assertE2eSeedData(): Promise<void> {
    // カテゴリー一覧APIの応答
    const response = await fetch(`${E2E_API_URL}/api/categories`)

    // 初期データを取得できない場合はDB初期化の失敗として扱う
    if (!response.ok) {
        throw new Error(
            `E2E用DBのカテゴリー取得に失敗: HTTP ${response.status}`,
        )
    }

    // カテゴリー一覧の本文
    const categories = await response.json() as unknown

    // 空の一覧はマイグレーション未適用の可能性がある
    if (!Array.isArray(categories) || categories.length === 0) {
        throw new Error(
            "E2E用DBにカテゴリー初期データがありません。マイグレーションを確認してください",
        )
    }
}

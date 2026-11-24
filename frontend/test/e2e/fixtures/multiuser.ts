import {readFileSync} from "node:fs"
import path from "node:path"
import {fileURLToPath} from "node:url"

import {
    DEFAULT_MOCK_PROFILE,
    type MockGoogleProfile,
} from "../mock-google-server"

export {
    DEFAULT_MOCK_PROFILE,
    type MockGoogleProfile,
}

// 複数ユーザー確認用のユーザーA
export const USER_A: MockGoogleProfile = {
    sub: "e2e-user-a",
    name: "E2E User A",
    email: "e2e-a@example.com",
}

// 複数ユーザー確認用のユーザーB
export const USER_B: MockGoogleProfile = {
    sub: "e2e-user-b",
    name: "E2E User B",
    email: "e2e-b@example.com",
}

// fixturesディレクトリ
const FIXTURES_DIR = path.dirname(fileURLToPath(import.meta.url))
// E2E用API環境変数のファイルパス
const E2E_ENV_PATH = path.resolve(FIXTURES_DIR, "../wrangler.env")
// 環境変数からモックGoogleの上書き接続先を読むときのキー
const MOCK_GOOGLE_ORIGIN_ENV = "MOCK_GOOGLE_ORIGIN"

// モックGoogleの接続先を決定
function resolveMockGoogleOrigin(): string {
    // 隔離ポートでE2Eを実行するときの上書き先
    const override = process.env[MOCK_GOOGLE_ORIGIN_ENV]

    // 上書きがある場合はその接続先を使う
    if (override) {
        return new URL(override).origin
    }

    // wrangler.envから認可エンドポイントの行を取り出す
    const authorizationLine = readFileSync(E2E_ENV_PATH, "utf8")
        .split("\n")
        .find((line) =>
            line.startsWith("GOOGLE_AUTHORIZATION_ENDPOINT="))

    // 認可エンドポイントが無い場合はモックの接続先を決められない
    if (!authorizationLine) {
        throw new Error(
            "wrangler.envにGOOGLE_AUTHORIZATION_ENDPOINTがありません",
        )
    }

    // 認可エンドポイントの接続先
    return new URL(
        authorizationLine
            .slice("GOOGLE_AUTHORIZATION_ENDPOINT=".length)
            .trim(),
    ).origin
}

// モックGoogleの接続先
const MOCK_GOOGLE_ORIGIN = resolveMockGoogleOrigin()

// 次回ログインに使うプロフィールをモックGoogleへ設定
export async function setMockGoogleProfile(
    profile: MockGoogleProfile,
): Promise<void> {
    // 制御エンドポイントの応答
    const response = await fetch(`${MOCK_GOOGLE_ORIGIN}/__control/user`, {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify(profile),
    })

    // 設定できない場合は後続のログインが別ユーザーになるため止める
    if (!response.ok) {
        throw new Error(
            `モックGoogleのプロフィール設定に失敗: HTTP ${response.status}`,
        )
    }
}

// モックGoogleが返す設定中のプロフィールを取得
export async function fetchMockGoogleProfile(): Promise<MockGoogleProfile> {
    // ユーザー情報応答
    const response = await fetch(`${MOCK_GOOGLE_ORIGIN}/userinfo`)

    // 取得できない場合は設定内容を確認できないため止める
    if (!response.ok) {
        throw new Error(
            `モックGoogleのユーザー情報取得に失敗: HTTP ${response.status}`,
        )
    }

    // ユーザー情報応答のJSON本文
    const payload = await response.json() as {
        sub?: unknown // GoogleアカウントID
        name?: unknown // 表示名
        email?: unknown // メールアドレス
    }

    // 必須項目がそろわない応答はプロフィールとして扱えない
    if (
        typeof payload.sub !== "string" ||
        typeof payload.name !== "string" ||
        typeof payload.email !== "string"
    ) {
        throw new Error("モックGoogleのユーザー情報を解釈できません")
    }

    return {
        sub: payload.sub,
        name: payload.name,
        email: payload.email,
    }
}

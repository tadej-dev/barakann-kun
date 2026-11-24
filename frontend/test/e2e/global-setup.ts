import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
    assertE2eSeedData,
    waitForE2eApi,
} from "./fixtures/database"
import { startMockGoogleServer as startGoogleMockServer } from "./mock-google-server"

const E2E_ENV_FILE = "wrangler.env" // E2E用API環境変数のファイル名
const E2E_DIR = path.dirname(fileURLToPath(import.meta.url)) // global-setup.tsの配置先

// wrangler.envのKEY=VALUEを読み取る
function readE2eEnv(): Map<string, string> {
    // E2E用API環境変数のファイルパス
    const envPath = path.join(E2E_DIR, E2E_ENV_FILE)
    // 設定ファイルが無い場合はAPIもE2E用に起動できないため止める
    if (!existsSync(envPath)) {
        throw new Error(`E2E用のAPI環境変数がありません: ${envPath}`)
    }

    // 1行ずつKEY=VALUEを読み取る
    const env = new Map<string, string>()
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
        // 空行とコメント行は設定ではないため飛ばす
        if (!line.trim() || line.trimStart().startsWith("#")) {
            continue
        }

        // 最初の=より前をキー、後ろを値として扱う
        const separatorIndex = line.indexOf("=")
        // =を含まない行は設定として解釈できないため飛ばす
        if (separatorIndex === -1) {
            continue
        }

        env.set(
            line.slice(0, separatorIndex).trim(),
            line.slice(separatorIndex + 1).trim(),
        )
    }

    return env
}

// wrangler.envの認可エンドポイントからモックの接続先を求める
function readMockGoogleOrigin(env: Map<string, string>): URL {
    // E2E用APIが参照する認可エンドポイント
    const authorizationEndpoint = env.get("GOOGLE_AUTHORIZATION_ENDPOINT")
    // 認可エンドポイントが無い場合はモックの起動先を決められない
    if (!authorizationEndpoint) {
        throw new Error(
            "wrangler.envにGOOGLE_AUTHORIZATION_ENDPOINTがありません",
        )
    }

    // モックGoogleの3つのエンドポイントが同じ接続先を指すか確認
    const mockOrigin = new URL(authorizationEndpoint)
    for (const key of ["GOOGLE_TOKEN_ENDPOINT", "GOOGLE_USERINFO_ENDPOINT"]) {
        // 別サーバーを指す場合は起動先を確定できない
        const endpoint = env.get(key)
        if (!endpoint || new URL(endpoint).origin !== mockOrigin.origin) {
            throw new Error(`${key}がGOOGLE_AUTHORIZATION_ENDPOINTと同じ接続先ではありません`)
        }
    }

    return mockOrigin
}

// モックGoogleサーバーを起動し、停止関数を返す
async function startMockGoogleServer(
    mockOrigin: URL,
): Promise<(() => Promise<void>) | undefined> {
    // wrangler.envの認可エンドポイントと同じポートで待ち受ける
    const mockServer = await startGoogleMockServer(
        Number(mockOrigin.port || 80),
    )
    // 接続先がwrangler.envのエンドポイントとずれていないか確認
    if (mockServer.origin !== mockOrigin.origin) {
        await mockServer.close()
        throw new Error(
            `モックGoogleの接続先が環境変数と一致しません: ${mockServer.origin} / ${mockOrigin.origin}`,
        )
    }

    console.log(`[E2E] モックGoogleサーバーを起動: ${mockServer.origin}`)

    // テスト終了時にモックを停止
    return async () => {
        await mockServer.close()
    }
}

// E2E全体の前処理（DB初期化・API確認・モックGoogle起動）
export default async function globalSetup(): Promise<
    (() => Promise<void>) | undefined
> {
    // APIの起動完了を待つ
    await waitForE2eApi()

    // カテゴリー初期データの投入を確認
    await assertE2eSeedData()

    // E2E用API環境変数からモックの接続先を求める
    const mockOrigin = readMockGoogleOrigin(readE2eEnv())
    // モックGoogleサーバーの停止関数
    const stopMockGoogleServer = await startMockGoogleServer(mockOrigin)

    return stopMockGoogleServer
}

import {describe, expect, it} from "vitest"

import {createAuthConfig} from "../src/auth/auth-config"
import type {Bindings} from "../src/types"

// 検証に使うGoogleプロバイダーのエンドポイント設定
type GoogleProviderConfig = {
    authorization?: {url?: string} // 認可エンドポイント
    token?: {url?: string} // トークンエンドポイント
    userinfo?: {url?: string} // ユーザー情報エンドポイント
}

// E2E用モックGoogleサーバーを指す上書き先
const MOCK_AUTHORIZATION_ENDPOINT = "http://127.0.0.1:8788/authorize"
const MOCK_TOKEN_ENDPOINT = "http://127.0.0.1:8788/token"
const MOCK_USERINFO_ENDPOINT = "http://127.0.0.1:8788/userinfo"

// テスト用のWorkers Bindings
function bindings(overrides: Partial<Bindings> = {}): Bindings {
    return {
        DB: {} as D1Database,
        AUTH_SECRET: "test-auth-secret-that-is-long-enough",
        GOOGLE_CLIENT_ID: "test-client-id",
        GOOGLE_CLIENT_SECRET: "test-client-secret",
        ...overrides,
    }
}

// 認証設定からGoogleプロバイダーのエンドポイント設定を取り出す
function googleProvider(overrides: Partial<Bindings> = {}): GoogleProviderConfig {
    // 既定のD1アダプターは生成だけならDBへ触れないため、そのまま設定を作る
    const config = createAuthConfig({env: bindings(overrides)})
    const provider = config.providers[0]

    // Googleプロバイダーの設定が無い場合は検証を続けられない
    if (!provider) {
        throw new Error("google provider is missing")
    }

    return provider as unknown as GoogleProviderConfig
}

// 上書き変数が無ければGoogle本番のエンドポイントを使う
describe("Google OAuth エンドポイントの既定値", () => {
    it("未設定時はGoogle本番のURLになる", () => {
        const provider = googleProvider()

        expect(provider.authorization?.url)
            .toBe("https://accounts.google.com/o/oauth2/v2/auth")
        expect(provider.token?.url)
            .toBe("https://oauth2.googleapis.com/token")
        expect(provider.userinfo?.url)
            .toBe("https://openidconnect.googleapis.com/v1/userinfo")
    })
})

// 上書き変数がある場合はモックGoogleサーバーへ差し替える
describe("Google OAuth エンドポイントの上書き", () => {
    it("3つの上書き変数で各接続先を差し替える", () => {
        const provider = googleProvider({
            GOOGLE_AUTHORIZATION_ENDPOINT: MOCK_AUTHORIZATION_ENDPOINT,
            GOOGLE_TOKEN_ENDPOINT: MOCK_TOKEN_ENDPOINT,
            GOOGLE_USERINFO_ENDPOINT: MOCK_USERINFO_ENDPOINT,
        })

        expect(provider.authorization?.url).toBe(MOCK_AUTHORIZATION_ENDPOINT)
        expect(provider.token?.url).toBe(MOCK_TOKEN_ENDPOINT)
        expect(provider.userinfo?.url).toBe(MOCK_USERINFO_ENDPOINT)
    })

    it("1つだけ設定した場合は残りをGoogle本番のままにする", () => {
        const provider = googleProvider({
            GOOGLE_TOKEN_ENDPOINT: MOCK_TOKEN_ENDPOINT,
        })

        expect(provider.authorization?.url)
            .toBe("https://accounts.google.com/o/oauth2/v2/auth")
        expect(provider.token?.url).toBe(MOCK_TOKEN_ENDPOINT)
        expect(provider.userinfo?.url)
            .toBe("https://openidconnect.googleapis.com/v1/userinfo")
    })

    it("空文字の設定は未設定としてGoogle本番へ戻す", () => {
        const provider = googleProvider({
            GOOGLE_AUTHORIZATION_ENDPOINT: "",
            GOOGLE_TOKEN_ENDPOINT: "",
            GOOGLE_USERINFO_ENDPOINT: "",
        })

        expect(provider.authorization?.url)
            .toBe("https://accounts.google.com/o/oauth2/v2/auth")
        expect(provider.token?.url)
            .toBe("https://oauth2.googleapis.com/token")
        expect(provider.userinfo?.url)
            .toBe("https://openidconnect.googleapis.com/v1/userinfo")
    })
})

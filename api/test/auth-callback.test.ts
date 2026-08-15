import {describe, expect, it, vi} from "vitest"
import type {Adapter} from "@auth/core/adapters"

import {createApp} from "../src/app"
import type {Bindings} from "../src/types"

function bindings(): Bindings {
    return {
        DB: {} as D1Database,
        AUTH_SECRET: "test-auth-secret-that-is-long-enough",
        GOOGLE_CLIENT_ID: "test-client-id",
        GOOGLE_CLIENT_SECRET: "test-client-secret",
    }
}

// 外部DBに依存せず、コールバック後のユーザー作成・セッション作成を通すアダプター
function adapter(): Adapter {
    return {
        createUser: async (user) => ({
            id: user.id,
            name: user.name ?? null,
            email: user.email ?? "test@example.com",
            emailVerified: user.emailVerified ?? null,
            image: user.image ?? null,
        }),
        getUser: async () => null,
        getUserByEmail: async () => null,
        getUserByAccount: async () => null,
        updateUser: async (user) => ({
            id: user.id,
            name: user.name ?? null,
            email: user.email ?? "test@example.com",
            emailVerified: user.emailVerified ?? null,
            image: user.image ?? null,
        }),
        linkAccount: async () => undefined,
        createSession: async (session) => ({
            sessionToken: session.sessionToken,
            userId: session.userId ?? "user-1",
            expires: session.expires ?? new Date(Date.now() + 3600000),
        }),
        getSessionAndUser: async () => null,
        updateSession: async (session) => ({
            sessionToken: session.sessionToken,
            userId: session.userId ?? "user-1",
            expires: session.expires ?? new Date(Date.now() + 3600000),
        }),
        deleteSession: async () => null,
    }
}

// 認証開始レスポンスで発行されたstate・PKCE Cookieを次のリクエストへ渡す
function cookieHeader(response: Response): string {
    const headers = response.headers as Headers & {
        getSetCookie?: () => string[]
    }
    const setCookies = headers.getSetCookie?.() ?? []

    return setCookies.map((cookie) => cookie.split(";", 1)[0]).join("; ")
}

describe("Google authentication callback", () => {
    it("accepts a callback without an issuer response parameter", async () => {
        const app = createApp({authAdapter: adapter()})
        const env = bindings()
        const csrf = await app.request("/api/auth/csrf", {}, env)
        const csrfPayload = await csrf.json() as {csrfToken: string}
        const csrfCookie = csrf.headers.get("set-cookie")?.split(";", 1)[0] ?? ""
        const signin = await app.request(
            "/api/auth/signin/google",
            {
                method: "POST",
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    cookie: csrfCookie,
                },
                body: new URLSearchParams({
                    csrfToken: csrfPayload.csrfToken,
                    callbackUrl: "/simulator",
                }).toString(),
            },
            env,
        )
        const location = new URL(signin.headers.get("location") ?? "")
        const cookies = `${csrfCookie}; ${cookieHeader(signin)}`

        // トークン交換とUserInfo取得だけを再現し、issのない認可コールバックを検証する
        vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input)

            if (url === "https://oauth2.googleapis.com/token") {
                return new Response(JSON.stringify({
                    access_token: "test-access-token",
                    token_type: "Bearer",
                    expires_in: 3600,
                }), {headers: {"content-type": "application/json"}})
            }

            if (url === "https://openidconnect.googleapis.com/v1/userinfo") {
                return new Response(JSON.stringify({
                    sub: "google-user-1",
                    name: "Test User",
                    email: "test@example.com",
                    picture: null,
                }), {headers: {"content-type": "application/json"}})
            }

            throw new Error(`Unexpected fetch: ${url}`)
        }))

        try {
            const callback = await app.request(
                `/api/auth/callback/google?code=test-code&state=${encodeURIComponent(location.searchParams.get("state") ?? "")}`,
                {headers: {cookie: cookies}},
                env,
            )

            expect(callback.status).toBe(302)
            expect(callback.headers.get("location")).toContain("/simulator")
        } finally {
            vi.unstubAllGlobals()
        }
    })
})

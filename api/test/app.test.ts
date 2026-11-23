import {readFileSync} from "node:fs"

import {describe, expect, it} from "vitest"
import type {Adapter} from "@auth/core/adapters"

import {createApp} from "../src/app"
import type {
    AccountRepository,
    DeleteAccountResult,
    UpdateDisplayNameResult,
} from "../src/db/account-repository"
import type {CatalogRepository} from "../src/db/catalog-repository"
import type {ConfigOrderRepository} from "../src/db/config-order-repository"
import type {
    DeleteSavedBuildResult,
    SavedBuild,
    SavedBuildPartInput,
    SavedBuildRepository,
    RenameSavedBuildResult,
    UpdateSavedBuildResult,
} from "../src/db/saved-build-repository"
import type {Category, Part} from "../src/types"
import type {Bindings} from "../src/types"

// APIレスポンスに使用するテスト用カテゴリー
const category: Category = {
    id: 1,
    key: "frame",
    displayName: "フレーム",
}

// APIレスポンスに使用するテスト用パーツ
const part: Part = {
    id: 1,
    name: "Test Frame",
    modelName: "Test Frame",
    variantName: null,
    modelYear: null,
    edition: null,
    brandName: "Test Brand",
    categoryKey: "frame",
    weight: 900,
    price: 300000,
    priceUpdatedAt: "2026-07-15 00:00:00",
    includedItems: [],
    blockedCategoryKeys: [],
    specifications: {},
}

// D1を使わずにルートの振る舞いを検証するRepositoryモック
function createRepository(): CatalogRepository {
    return {
        findCategories: async () => [category],
        findPartsByCategory: async (categoryKey) => (
            categoryKey === "frame" ? [part] : []
        ),
        findPartsByIds: async (ids) => (
            ids.includes(part.id) ? [part] : []
        ),
    }
}

// 認証ライブラリ検証用のWorkers Bindings
function createAuthBindings(): Bindings {
    return {
        DB: {} as D1Database,
        AUTH_SECRET: "test-auth-secret-that-is-long-enough",
        ACCOUNT_ID_HASH_SECRET: "test-account-id-hash-secret-long-enough",
        GOOGLE_CLIENT_ID: "test-client-id",
        GOOGLE_CLIENT_SECRET: "test-client-secret",
    }
}

// D1へ接続せずに認証ルートを検証するAuth.jsアダプター
function createAuthAdapter(
    sessionToken = "test-session-token",
    deletedTokens: string[] = [],
    userId = "user-1",
): Adapter {
    return {
        createUser: async (user) => user,
        getUser: async () => null,
        getUserByEmail: async () => null,
        getUserByAccount: async () => null,
        updateUser: async (user) => ({
            id: user.id,
            name: user.name ?? "Test User",
            email: user.email ?? "test@example.com",
            emailVerified: null,
            image: user.image ?? null,
        }),
        linkAccount: async () => undefined,
        createSession: async (session) => session,
        getSessionAndUser: async (candidateToken) => (
            candidateToken === sessionToken
                ? {
                    session: {
                        sessionToken,
                        userId,
                        expires: new Date(Date.now() + 60 * 60 * 1000),
                    },
                    user: {
                        id: userId,
                        name: "Test User",
                        email: "test@example.com",
                        emailVerified: null,
                        image: null,
                    },
                }
                : null
        ),
        updateSession: async (session) => ({
            sessionToken: session.sessionToken,
            userId: session.userId ?? userId,
            expires: session.expires ?? new Date(Date.now() + 60 * 60 * 1000),
        }),
        deleteSession: async (candidateToken) => {
            deletedTokens.push(candidateToken)

            return null
        },
    }
}

// 保存構成APIのルート検証用リポジトリ
class TestSavedBuildRepository implements SavedBuildRepository {
    // 返す保存構成
    readonly builds: SavedBuild[] = [{
        id: "11111111-1111-4111-8111-111111111111",
        name: "テスト構成",
        version: 1,
        createdAt: "2026-08-05T00:00:00.000Z",
        updatedAt: "2026-08-05T00:00:00.000Z",
        parts: [{
            slotKey: "frame",
            partId: 1,
            price: 100000,
            weight: 1000,
        }],
    }]
    // 最後に受け取ったユーザーID
    lastUserId: string | null = null
    // listAllが呼ばれたときにallへ変わるテスト用フラグ
    lastListScope: "legacy" | "all" = "legacy"
    // 初期構成の作成処理が呼ばれたか
    ensuredInitialConfig = false
    // countAllが返す構成数
    allCount = 1
    // 最後に作成・更新へ渡されたパーツ
    lastParts: SavedBuildPartInput[] = []

    // user-1ならallCount、他は0を返す
    async countAll(userId: string): Promise<number> {
        this.lastUserId = userId

        return userId === "user-1" ? this.allCount : 0
    }

    // 全構成フラグを立てて構成一覧を返す
    async listAll(userId: string): Promise<SavedBuild[]> {
        this.lastUserId = userId
        this.lastListScope = "all"

        return userId === "user-1" ? this.builds : []
    }

    // 初期構成の作成済みフラグを立てる
    async ensureInitialConfig(userId: string): Promise<void> {
        this.lastUserId = userId
        this.ensuredInitialConfig = true
    }

    // user-1の構成からID一致する1件を返す
    async findById(userId: string, buildId: string): Promise<SavedBuild | null> {
        this.lastUserId = userId

        return userId === "user-1"
            ? this.builds.find((build) => build.id === buildId) ?? null
            : null
    }

    // 受け取ったパーツに価格と重量を付けて構成を作成
    async create(
        userId: string,
        name: string,
        parts: SavedBuildPartInput[],
    ): Promise<SavedBuild> {
        this.lastUserId = userId
        this.lastParts = parts

        return {
            id: "22222222-2222-4222-8222-222222222222",
            name,
            version: 1,
            createdAt: "2026-08-05T00:00:00.000Z",
            updatedAt: "2026-08-05T00:00:00.000Z",
            parts: parts.map((part) => ({
                ...part,
                price: 200000,
                weight: 2000,
            })),
        }
    }

    // versionを検証して構成とパーツを更新
    async update(
        userId: string,
        buildId: string,
        version: number,
        name: string,
        parts: SavedBuildPartInput[],
    ): Promise<UpdateSavedBuildResult> {
        this.lastUserId = userId
        this.lastParts = parts

        // ユーザーまたは構成IDが一致しなければnot_foundを返す
        if (userId !== "user-1" || buildId !== this.builds[0]?.id) {
            return {kind: "not_found"}
        }

        // versionが1以外なら競合としてconflictを返す
        if (version !== 1) {
            return {kind: "conflict"}
        }

        return {
            kind: "updated",
            build: {
                ...this.builds[0],
                name,
                version: 2,
                parts: parts.map((part) => ({
                    ...part,
                    price: 200000,
                    weight: 2000,
                })),
            },
        }
    }

    // versionを検証して構成名だけ変更
    async rename(
        userId: string,
        buildId: string,
        version: number,
        name: string,
    ): Promise<RenameSavedBuildResult> {
        this.lastUserId = userId

        // ユーザーまたは構成IDが一致しなければnot_foundを返す
        if (userId !== "user-1" || buildId !== this.builds[0]?.id) {
            return {kind: "not_found"}
        }

        // versionが1以外なら競合としてconflictを返す
        if (version !== 1) {
            return {kind: "conflict"}
        }

        return {
            kind: "updated",
            build: {
                ...this.builds[0],
                name,
                version: 2,
            },
        }
    }

    // versionを検証して構成を削除
    async delete(
        userId: string,
        buildId: string,
        version: number,
    ): Promise<DeleteSavedBuildResult> {
        this.lastUserId = userId

        // ユーザーまたは構成IDが一致しなければnot_foundを返す
        if (userId !== "user-1" || buildId !== this.builds[0]?.id) {
            return {kind: "not_found"}
        }

        return version === 1 ? {kind: "deleted"} : {kind: "conflict"}
    }
}

// アカウント削除・表示名変更APIのルート検証用リポジトリ
class TestAccountRepository implements AccountRepository {
    // 最後に受け取ったユーザーID
    lastUserId: string | null = null
    // deleteUserの結果
    result: DeleteAccountResult = {kind: "deleted"}
    // 最後に受け取った表示名
    lastDisplayName: string | null = null
    // updateDisplayNameの結果
    updateResult: "updated" | "not_found" = "updated"

    // ユーザーIDを記録し、設定済みの削除結果を返す
    async deleteUser(userId: string): Promise<DeleteAccountResult> {
        this.lastUserId = userId

        return this.result
    }

    // 表示名を記録し、設定済みの更新結果を返す
    async updateDisplayName(
        userId: string,
        displayName: string,
    ): Promise<UpdateDisplayNameResult> {
        this.lastUserId = userId
        this.lastDisplayName = displayName

        return this.updateResult === "updated"
            ? {kind: "updated", displayName}
            : {kind: "not_found"}
    }
}

// 構成表示順APIのルート検証用リポジトリ
class TestConfigOrderRepository implements ConfigOrderRepository {
    // 保存されている構成キーの並び
    order = ["config:1", "config:2", "config:3", "config:4"]
    // 最後に受け取ったユーザーID
    lastUserId: string | null = null

    // ユーザーIDを記録し、保存済みの表示順を返す
    async list(userId: string): Promise<string[]> {
        this.lastUserId = userId

        return userId === "user-1" ? this.order : []
    }

    // 受け取った表示順を保存して返す
    async save(userId: string, itemKeys: string[]): Promise<string[]> {
        this.lastUserId = userId

        // user-1の場合だけ表示順を更新
        if (userId === "user-1") {
            this.order = itemKeys
        }

        return itemKeys
    }
}

// 変更系APIテストで使うAuth.jsのCSRFトークンとセッションCookieを取得
async function getAuthenticatedCsrfRequest(
    app: ReturnType<typeof createApp>,
    bindings: Bindings,
) {
    const csrfResponse = await app.request(
        "/api/auth/csrf",
        {},
        bindings,
    )
    const csrfPayload = await csrfResponse.json() as {csrfToken: string}
    const csrfCookie = csrfResponse.headers.get("set-cookie")
        ?.split(";", 1)[0] ?? ""

    return {
        csrfToken: csrfPayload.csrfToken,
        cookie: `${csrfCookie}; authjs.session-token=test-session-token`,
    }
}

// カタログAPIのルートテスト
describe("catalog API", () => {
    const app = createApp({
        catalogRepository: createRepository(),
        authAdapter: createAuthAdapter(),
    })

    it("returns health status with security headers", async () => {
        const response = await app.request("/api/health")

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({status: "ok"})
        expect(response.headers.get("x-content-type-options")).toBe("nosniff")
        expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN")
    })

    it("returns categories", async () => {
        const response = await app.request("/api/categories")

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual([category])
    })

    it("returns parts by category", async () => {
        const response = await app.request("/api/parts?category=frame")

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual([part])
    })

    it("rejects an invalid category", async () => {
        const response = await app.request("/api/parts?category=FRAME!")

        expect(response.status).toBe(400)
        expect(await response.json()).toMatchObject({
            error: {code: "INVALID_CATEGORY"},
        })
    })

    it("returns parts by unique IDs", async () => {
        const response = await app.request(
            "/api/parts/by-ids?ids=1&ids=1&ids=2",
        )

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual([part])
    })

    it("rejects invalid IDs", async () => {
        const response = await app.request("/api/parts/by-ids?ids=0&ids=text")

        expect(response.status).toBe(400)
        expect(await response.json()).toMatchObject({
            error: {code: "INVALID_PART_IDS"},
        })
    })

    it("rejects more than 100 IDs", async () => {
        const parameters = new URLSearchParams()

        for (let id = 1; id <= 101; id += 1) {
            parameters.append("ids", String(id))
        }

        const response = await app.request(`/api/parts/by-ids?${parameters}`)

        expect(response.status).toBe(400)
        expect(await response.json()).toMatchObject({
            error: {code: "INVALID_PART_IDS"},
        })
    })

    it("returns a JSON 404 response", async () => {
        const response = await app.request("/api/unknown")

        expect(response.status).toBe(404)
        expect(await response.json()).toMatchObject({
            error: {code: "NOT_FOUND"},
        })
    })
})

// Auth.jsとD1セッションの接続検証
describe("authentication API", () => {
    const app = createApp({
        catalogRepository: createRepository(),
        authAdapter: createAuthAdapter(),
    })

    it("returns an explicit guest session", async () => {
        const response = await app.request(
            "/api/auth/session",
            {},
            createAuthBindings(),
        )

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({
            authenticated: false,
            user: null,
        })
    })

    it("returns the authenticated user from a database session", async () => {
        const response = await app.request(
            "/api/auth/session",
            {
                headers: {
                    cookie: "authjs.session-token=test-session-token",
                },
            },
            createAuthBindings(),
        )

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({
            authenticated: true,
            user: {
                id: "user-1",
                displayName: "Test User",
            },
        })
    })

    it("provides a standard sign-in entry point for the Google login alias", async () => {
        const response = await app.request(
            "/api/auth/google?callbackUrl=%2Fsimulator",
            {},
            createAuthBindings(),
        )

        expect(response.status).toBe(302)
        expect(response.headers.get("location")).toBe(
            "http://localhost/api/auth/signin?callbackUrl=%2Fsimulator",
        )
    })

    it("returns to the simulator when the callback URL is omitted", async () => {
        const response = await app.request(
            "/api/auth/google",
            {},
            createAuthBindings(),
        )

        expect(response.status).toBe(302)
        expect(response.headers.get("location")).toBe(
            "http://localhost/api/auth/signin?callbackUrl=%2F",
        )
    })

    it("uses AUTH_URL for the Google login entry point", async () => {
        const response = await app.request(
            "/api/auth/google?callbackUrl=%2Fsimulator",
            {},
            {
                ...createAuthBindings(),
                AUTH_URL: "http://localhost:5173",
            },
        )

        expect(response.status).toBe(302)
        expect(response.headers.get("location")).toBe(
            "http://localhost:5173/api/auth/signin?callbackUrl=%2Fsimulator",
        )
    })

    it("falls back to the app root for an external callback URL", async () => {
        const response = await app.request(
            "/api/auth/google?callbackUrl=https%3A%2F%2Fevil.example%2Fsteal",
            {},
            {
                ...createAuthBindings(),
                AUTH_URL: "http://localhost:5173",
            },
        )

        expect(response.status).toBe(302)
        expect(response.headers.get("location")).toBe(
            "http://localhost:5173/api/auth/signin?callbackUrl=%2F",
        )
    })

    it("returns to the simulator with a retry message when Google login is cancelled", async () => {
        const response = await app.request(
            "/api/auth/callback/google?error=access_denied",
            {},
            {
                ...createAuthBindings(),
                AUTH_URL: "http://localhost:5173",
            },
        )

        expect(response.status).toBe(302)
        expect(response.headers.get("location")).toBe(
            "http://localhost:5173/?authError=google-cancelled",
        )
    })

    it("redirects to Google after the CSRF token is issued", async () => {
        const bindings = createAuthBindings()
        const csrfResponse = await app.request(
            "/api/auth/csrf",
            {},
            bindings,
        )
        const csrfPayload = await csrfResponse.json() as {csrfToken: string}
        const cookie = csrfResponse.headers.get("set-cookie")?.split(";", 1)[0]

        expect(csrfResponse.status).toBe(200)
        expect(csrfPayload.csrfToken).toEqual(expect.any(String))
        expect(cookie).toEqual(expect.any(String))

        const response = await app.request(
            "/api/auth/signin/google",
            {
                method: "POST",
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    cookie: cookie ?? "",
                },
                body: new URLSearchParams({
                    csrfToken: csrfPayload.csrfToken,
                    callbackUrl: "/simulator",
                }).toString(),
            },
            bindings,
        )

        const location = response.headers.get("location") ?? ""

        expect(response.status).toBe(302)
        expect(location).toContain("accounts.google.com")
        expect(location).toContain("state=")
        expect(location).toContain("code_challenge_method=S256")
    })

    it("reports missing AUTH_SECRET before handling auth", async () => {
        const response = await app.request(
            "/api/auth/session",
            {},
            {DB: {} as D1Database},
        )

        expect(response.status).toBe(503)
        expect(await response.json()).toEqual({
            error: {
                code: "AUTH_NOT_CONFIGURED",
                message:
                    "認証設定が未完了です。api/.dev.varsにAUTH_SECRETを設定してください。",
            },
        })
    })

    it("reports missing Google credentials at the login entry point", async () => {
        const response = await app.request(
            "/api/auth/google?callbackUrl=%2Fsimulator",
            {},
            {
                ...createAuthBindings(),
                GOOGLE_CLIENT_ID: "",
                GOOGLE_CLIENT_SECRET: "",
            },
        )

        expect(response.status).toBe(503)
        expect(await response.json()).toEqual({
            error: {
                code: "AUTH_NOT_CONFIGURED",
                message:
                    "Googleログイン設定が未完了です。GOOGLE_CLIENT_IDとGOOGLE_CLIENT_SECRETを設定してください。",
            },
        })
    })

    it("deletes the database session through the logout alias", async () => {
        const deletedTokens: string[] = []
        const logoutApp = createApp({
            catalogRepository: createRepository(),
            authAdapter: createAuthAdapter("test-session-token", deletedTokens),
        })
        const csrfResponse = await logoutApp.request(
            "/api/auth/csrf",
            {},
            createAuthBindings(),
        )
        const csrfPayload = await csrfResponse.json() as {csrfToken: string}
        const csrfCookie = csrfResponse.headers.get("set-cookie")
            ?.split(";", 1)[0] ?? ""

        const response = await logoutApp.request(
            "/api/auth/logout",
            {
                method: "POST",
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    cookie: `${csrfCookie}; authjs.session-token=test-session-token`,
                },
                body: new URLSearchParams({
                    csrfToken: csrfPayload.csrfToken,
                    callbackUrl: "/simulator",
                }).toString(),
            },
            createAuthBindings(),
        )

        expect(response.status).toBe(302)
        expect(deletedTokens).toEqual(["test-session-token"])
    })
})

// 構成の表示順を保存・取得するAPI検証
describe("config order API", () => {
    const configOrderRepository = new TestConfigOrderRepository()
    const app = createApp({
        catalogRepository: createRepository(),
        authAdapter: createAuthAdapter(),
        configOrderRepository,
    })

    it("returns the saved order for the authenticated user", async () => {
        const response = await app.request(
            "/api/config-order",
            {
                headers: {
                    cookie: "authjs.session-token=test-session-token",
                },
            },
            createAuthBindings(),
        )

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({
            items: ["config:1", "config:2", "config:3", "config:4"],
        })
        expect(configOrderRepository.lastUserId).toBe("user-1")
    })

    it("saves the order with CSRF protection", async () => {
        const bindings = createAuthBindings()
        const csrf = await getAuthenticatedCsrfRequest(app, bindings)
        const nextOrder = [
            "config:3",
            "config:1",
            "config:4",
            "config:2",
            "build:custom-build",
        ]
        const response = await app.request(
            "/api/config-order",
            {
                method: "PUT",
                headers: {
                    cookie: csrf.cookie,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    items: nextOrder,
                    csrfToken: csrf.csrfToken,
                }),
            },
            bindings,
        )

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({items: nextOrder})
        expect(configOrderRepository.order).toEqual(nextOrder)
    })

    // 構成が1件でも表示順を保存できる(1〜20件のモデル)
    it("accepts an order with a single item", async () => {
        const bindings = createAuthBindings()
        const csrf = await getAuthenticatedCsrfRequest(app, bindings)
        const response = await app.request(
            "/api/config-order",
            {
                method: "PUT",
                headers: {
                    cookie: csrf.cookie,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    items: ["config:1"],
                    csrfToken: csrf.csrfToken,
                }),
            },
            bindings,
        )

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({items: ["config:1"]})
    })

    it("rejects an order without a valid CSRF token", async () => {
        const response = await app.request(
            "/api/config-order",
            {
                method: "PUT",
                headers: {
                    cookie: "authjs.session-token=test-session-token",
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    items: ["config:1", "config:2", "config:3", "config:4"],
                }),
            },
            createAuthBindings(),
        )

        expect(response.status).toBe(403)
        expect(await response.json()).toMatchObject({
            error: {code: "INVALID_CSRF_TOKEN"},
        })
    })
})

// ログイン中ユーザーのアカウント削除API検証
describe("account API", () => {
    const accountRepository = new TestAccountRepository()
    const app = createApp({
        catalogRepository: createRepository(),
        authAdapter: createAuthAdapter(),
        accountRepository,
    })

    it("rejects unauthenticated account deletion", async () => {
        const response = await app.request(
            "/api/account",
            {
                method: "DELETE",
                headers: {"content-type": "application/json"},
                body: JSON.stringify({csrfToken: "invalid"}),
            },
            createAuthBindings(),
        )

        expect(response.status).toBe(401)
        expect(accountRepository.lastUserId).toBeNull()
    })

    it("rejects an invalid CSRF token", async () => {
        const response = await app.request(
            "/api/account",
            {
                method: "DELETE",
                headers: {
                    "content-type": "application/json",
                    cookie: "authjs.session-token=test-session-token",
                },
                body: JSON.stringify({csrfToken: "invalid"}),
            },
            createAuthBindings(),
        )

        expect(response.status).toBe(403)
        expect(await response.json()).toMatchObject({
            error: {code: "INVALID_CSRF_TOKEN"},
        })
        expect(accountRepository.lastUserId).toBeNull()
    })

    it("deletes only the authenticated user's account", async () => {
        const csrfResponse = await app.request(
            "/api/auth/csrf",
            {},
            createAuthBindings(),
        )
        const csrfPayload = await csrfResponse.json() as {csrfToken: string}
        const csrfCookie = csrfResponse.headers.get("set-cookie")
            ?.split(";", 1)[0] ?? ""

        const response = await app.request(
            "/api/account",
            {
                method: "DELETE",
                headers: {
                    "content-type": "application/json",
                    cookie: `${csrfCookie}; authjs.session-token=test-session-token`,
                },
                body: JSON.stringify({csrfToken: csrfPayload.csrfToken}),
            },
            createAuthBindings(),
        )

        expect(response.status).toBe(204)
        expect(accountRepository.lastUserId).toBe("user-1")
        expect(response.headers.get("set-cookie")).toContain(
            "authjs.session-token=",
        )
    })

    it("returns 404 when the authenticated account no longer exists", async () => {
        accountRepository.result = {kind: "not_found"}
        const csrfResponse = await app.request(
            "/api/auth/csrf",
            {},
            createAuthBindings(),
        )
        const csrfPayload = await csrfResponse.json() as {csrfToken: string}
        const csrfCookie = csrfResponse.headers.get("set-cookie")
            ?.split(";", 1)[0] ?? ""

        const response = await app.request(
            "/api/account",
            {
                method: "DELETE",
                headers: {
                    "content-type": "application/json",
                    cookie: `${csrfCookie}; authjs.session-token=test-session-token`,
                },
                body: JSON.stringify({csrfToken: csrfPayload.csrfToken}),
            },
            createAuthBindings(),
        )

        expect(response.status).toBe(404)
        expect(await response.json()).toMatchObject({
            error: {code: "ACCOUNT_NOT_FOUND"},
        })
    })
})

// ユーザーごとの保存構成API検証
describe("saved builds API", () => {
    const savedBuildRepository = new TestSavedBuildRepository()
    const app = createApp({
        catalogRepository: createRepository(),
        authAdapter: createAuthAdapter(),
        savedBuildRepository,
    })
    // ログイン済みセッションCookieを持つリクエスト
    const authenticatedRequest = {
        headers: {
            cookie: "authjs.session-token=test-session-token",
        },
    }

    it("rejects unauthenticated access", async () => {
        const response = await app.request(
            "/api/builds",
            {},
            createAuthBindings(),
        )

        expect(response.status).toBe(401)
        expect(await response.json()).toEqual({
            error: {
                code: "UNAUTHENTICATED",
                message: "ログインが必要です",
            },
        })
    })

    // 共有フィクスチャとAPIの応答が一致する(契約テスト)
    it("returns the shared saved-build fixture", async () => {
        const fixture = JSON.parse(readFileSync(
            new URL("../../frontend/test/fixtures/saved-build-list.json", import.meta.url),
            "utf8",
        )) as unknown

        // 偽リポジトリはフィクスチャとは独立した固定データを持つ
        const contractRepository = new TestSavedBuildRepository()
        const contractApp = createApp({
            catalogRepository: createRepository(),
            authAdapter: createAuthAdapter(),
            savedBuildRepository: contractRepository,
        })

        const response = await contractApp.request(
            "/api/builds",
            authenticatedRequest,
            createAuthBindings(),
        )

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual(fixture)
    })

    it("lists builds for the authenticated user", async () => {
        const response = await app.request(
            "/api/builds",
            authenticatedRequest,
            createAuthBindings(),
        )

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual(savedBuildRepository.builds)
        expect(savedBuildRepository.lastUserId).toBe("user-1")
    })

    // 全構成を返し、構成が無ければ初期構成を用意
    it("lists all configs with scope=all", async () => {
        savedBuildRepository.ensuredInitialConfig = false

        const response = await app.request(
            "/api/builds?scope=all",
            authenticatedRequest,
            createAuthBindings(),
        )

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual(savedBuildRepository.builds)
        expect(savedBuildRepository.ensuredInitialConfig).toBe(true)
        expect(savedBuildRepository.lastListScope).toBe("all")
    })

    // 作成は全構成が20件に達すると上限として拒否
    it("rejects a new config when all configs reached the limit", async () => {
        const limitedRepository = new TestSavedBuildRepository()
        limitedRepository.allCount = 20
        const limitedApp = createApp({
            catalogRepository: createRepository(),
            authAdapter: createAuthAdapter(),
            savedBuildRepository: limitedRepository,
        })
        const bindings = createAuthBindings()
        const csrf = await getAuthenticatedCsrfRequest(limitedApp, bindings)
        const response = await limitedApp.request(
            "/api/builds?scope=all",
            {
                method: "POST",
                headers: {
                    cookie: csrf.cookie,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    name: "追加",
                    parts: [],
                    csrfToken: csrf.csrfToken,
                }),
            },
            bindings,
        )

        expect(response.status).toBe(409)
        expect(await response.json()).toMatchObject({
            error: {code: "SAVED_BUILD_LIMIT_EXCEEDED"},
        })
    })

    it("returns migration guidance when saved-build schema is unavailable", async () => {
        const migrationApp = createApp({
            catalogRepository: createRepository(),
            authAdapter: createAuthAdapter(),
            // スキーマ未適用を再現するモックリポジトリ
            savedBuildRepository: {
                ensureInitialConfig: async () => {},
                listAll: async () => {
                    throw new Error("D1_ERROR: no such table: saved_builds")
                },
            } as unknown as SavedBuildRepository,
        })
        const response = await migrationApp.request(
            "/api/builds",
            authenticatedRequest,
            createAuthBindings(),
        )

        expect(response.status).toBe(503)
        expect(await response.json()).toMatchObject({
            error: {code: "SAVED_BUILD_MIGRATION_REQUIRED"},
        })
    })

    // 他ユーザーの構成IDを指定しても、存在有無を漏らさず404にする
    it("does not expose another user's build", async () => {
        const otherRepository = new TestSavedBuildRepository()
        const otherApp = createApp({
            catalogRepository: createRepository(),
            authAdapter: createAuthAdapter(
                "other-session-token",
                [],
                "user-2",
            ),
            savedBuildRepository: otherRepository,
        })
        const response = await otherApp.request(
            "/api/builds/11111111-1111-4111-8111-111111111111",
            {
                headers: {
                    cookie: "authjs.session-token=other-session-token",
                },
            },
            createAuthBindings(),
        )

        expect(response.status).toBe(404)
        expect(await response.json()).toMatchObject({
            error: {code: "SAVED_BUILD_NOT_FOUND"},
        })
        expect(otherRepository.lastUserId).toBe("user-2")
    })

    it("creates a build with validated slots", async () => {
        const bindings = createAuthBindings()
        const csrf = await getAuthenticatedCsrfRequest(app, bindings)
        const response = await app.request(
            "/api/builds",
            {
                method: "POST",
                headers: {
                    cookie: csrf.cookie,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    name: "新しい構成",
                    parts: [{slotKey: "frame", partId: 10}],
                    csrfToken: csrf.csrfToken,
                }),
            },
            bindings,
        )

        expect(response.status).toBe(201)
        expect(savedBuildRepository.lastUserId).toBe("user-1")
        expect(savedBuildRepository.lastParts).toEqual([
            {slotKey: "frame", partId: 10},
        ])
        expect(await response.json()).toMatchObject({
            name: "新しい構成",
            version: 1,
        })
    })

    it("rejects a new build when the user reached the storage limit", async () => {
        const limitedRepository = new TestSavedBuildRepository()
        limitedRepository.allCount = 20
        const limitedApp = createApp({
            catalogRepository: createRepository(),
            authAdapter: createAuthAdapter(),
            savedBuildRepository: limitedRepository,
        })
        const bindings = createAuthBindings()
        const csrf = await getAuthenticatedCsrfRequest(limitedApp, bindings)
        const response = await limitedApp.request(
            "/api/builds",
            {
                method: "POST",
                headers: {
                    cookie: csrf.cookie,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    name: "上限超過",
                    parts: [],
                    csrfToken: csrf.csrfToken,
                }),
            },
            bindings,
        )

        expect(response.status).toBe(409)
        expect(await response.json()).toEqual({
            error: {
                code: "SAVED_BUILD_LIMIT_EXCEEDED",
                message: "保存できる構成は20件までです",
            },
        })
    })

    it("rejects state changes without a valid CSRF token", async () => {
        const response = await app.request(
            "/api/builds",
            {
                method: "POST",
                headers: {
                    cookie: "authjs.session-token=test-session-token",
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    name: "CSRFなし",
                    parts: [],
                }),
            },
            createAuthBindings(),
        )

        expect(response.status).toBe(403)
        expect(await response.json()).toMatchObject({
            error: {code: "INVALID_CSRF_TOKEN"},
        })
    })

    it("accepts front and rear slot keys", async () => {
        const bindings = createAuthBindings()
        const csrf = await getAuthenticatedCsrfRequest(app, bindings)
        const response = await app.request(
            "/api/builds",
            {
                method: "POST",
                headers: {
                    cookie: csrf.cookie,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    name: "前後スロット構成",
                    parts: [
                        {slotKey: "tire:front", partId: 10},
                        {slotKey: "tire:rear", partId: 11},
                    ],
                    csrfToken: csrf.csrfToken,
                }),
            },
            bindings,
        )

        expect(response.status).toBe(201)
        expect(savedBuildRepository.lastParts).toEqual([
            {slotKey: "tire:front", partId: 10},
            {slotKey: "tire:rear", partId: 11},
        ])
    })

    it("rejects duplicate slots before reaching the repository", async () => {
        const bindings = createAuthBindings()
        const csrf = await getAuthenticatedCsrfRequest(app, bindings)
        const response = await app.request(
            "/api/builds",
            {
                method: "POST",
                headers: {
                    cookie: csrf.cookie,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    name: "不正な構成",
                    parts: [
                        {slotKey: "frame", partId: 1},
                        {slotKey: "frame", partId: 2},
                    ],
                    csrfToken: csrf.csrfToken,
                }),
            },
            bindings,
        )

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({
            error: {
                code: "INVALID_SAVED_BUILD",
                message: "保存構成の入力内容が正しくありません",
            },
        })
    })

    it("updates a build with the expected version", async () => {
        const bindings = createAuthBindings()
        const csrf = await getAuthenticatedCsrfRequest(app, bindings)
        const response = await app.request(
            "/api/builds/11111111-1111-4111-8111-111111111111",
            {
                method: "PUT",
                headers: {
                    cookie: csrf.cookie,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    name: "更新した構成",
                    version: 1,
                    parts: [{slotKey: "frame", partId: 3}],
                    csrfToken: csrf.csrfToken,
                }),
            },
            bindings,
        )

        expect(response.status).toBe(200)
        expect(await response.json()).toMatchObject({
            name: "更新した構成",
            version: 2,
        })
    })

    // リポジトリがconflictを返したら、楽観ロックの競合として409へ変換
    it("returns 409 when the build version is stale", async () => {
        const bindings = createAuthBindings()
        const csrf = await getAuthenticatedCsrfRequest(app, bindings)
        const response = await app.request(
            "/api/builds/11111111-1111-4111-8111-111111111111",
            {
                method: "PUT",
                headers: {
                    cookie: csrf.cookie,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    name: "古い構成",
                    version: 2,
                    parts: [],
                    csrfToken: csrf.csrfToken,
                }),
            },
            bindings,
        )

        expect(response.status).toBe(409)
        expect(await response.json()).toEqual({
            error: {
                code: "SAVED_BUILD_CONFLICT",
                message: "保存構成が先に更新されています。最新状態を取得してください",
            },
        })
    })

    it("renames a build without replacing its parts", async () => {
        const bindings = createAuthBindings()
        const csrf = await getAuthenticatedCsrfRequest(app, bindings)
        savedBuildRepository.lastParts = []
        const response = await app.request(
            "/api/builds/11111111-1111-4111-8111-111111111111",
            {
                method: "PATCH",
                headers: {
                    cookie: csrf.cookie,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    name: "名称だけ変更",
                    version: 1,
                    csrfToken: csrf.csrfToken,
                }),
            },
            bindings,
        )

        expect(response.status).toBe(200)
        expect(await response.json()).toMatchObject({
            name: "名称だけ変更",
            version: 2,
        })
        expect(savedBuildRepository.lastParts).toEqual([])
    })

    it("deletes a build with the expected version", async () => {
        // 2件ある状態で1件だけ削除
        const deleteRepository = new TestSavedBuildRepository()
        deleteRepository.builds.push({
            ...deleteRepository.builds[0]!,
            id: "33333333-3333-4333-8333-333333333333",
            name: "2件目",
        })
        const deleteApp = createApp({
            catalogRepository: createRepository(),
            authAdapter: createAuthAdapter(),
            savedBuildRepository: deleteRepository,
        })
        const bindings = createAuthBindings()
        const csrf = await getAuthenticatedCsrfRequest(deleteApp, bindings)
        const response = await deleteApp.request(
            "/api/builds/11111111-1111-4111-8111-111111111111",
            {
                method: "DELETE",
                headers: {
                    cookie: csrf.cookie,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    version: 1,
                    csrfToken: csrf.csrfToken,
                }),
            },
            bindings,
        )

        expect(response.status).toBe(204)
        expect(await response.text()).toBe("")
    })
})

// 表示名の変更APIと、アカウントID用の鍵の設定確認
describe("display name API", () => {
    const accountRepository = new TestAccountRepository()
    const app = createApp({
        catalogRepository: createRepository(),
        authAdapter: createAuthAdapter(),
        accountRepository,
    })

    // CSRFトークンとCookieを取得し、変更系リクエストに使えるようにする
    async function getCsrf() {
        const csrfResponse = await app.request("/api/auth/csrf", {}, createAuthBindings())
        const csrfPayload = await csrfResponse.json() as {csrfToken: string}
        const csrfCookie = csrfResponse.headers.get("set-cookie")?.split(";", 1)[0] ?? ""

        return {csrfToken: csrfPayload.csrfToken, csrfCookie}
    }

    // CSRFトークン付きで表示名の変更リクエストを送信
    async function patchDisplayName(displayName: unknown) {
        const {csrfToken, csrfCookie} = await getCsrf()

        return app.request(
            "/api/account",
            {
                method: "PATCH",
                headers: {
                    "content-type": "application/json",
                    cookie: `${csrfCookie}; authjs.session-token=test-session-token`,
                },
                body: JSON.stringify({csrfToken, displayName}),
            },
            createAuthBindings(),
        )
    }

    it("rejects an unauthenticated display name change", async () => {
        accountRepository.lastDisplayName = null
        const response = await app.request(
            "/api/account",
            {
                method: "PATCH",
                headers: {"content-type": "application/json"},
                body: JSON.stringify({csrfToken: "invalid", displayName: "名前"}),
            },
            createAuthBindings(),
        )

        expect(response.status).toBe(401)
        expect(accountRepository.lastDisplayName).toBeNull()
    })

    it("rejects a display name change without a valid CSRF token", async () => {
        accountRepository.lastDisplayName = null
        const response = await app.request(
            "/api/account",
            {
                method: "PATCH",
                headers: {
                    "content-type": "application/json",
                    cookie: "authjs.session-token=test-session-token",
                },
                body: JSON.stringify({csrfToken: "invalid", displayName: "名前"}),
            },
            createAuthBindings(),
        )

        expect(response.status).toBe(403)
        expect(accountRepository.lastDisplayName).toBeNull()
    })

    it("saves a trimmed display name for the authenticated user", async () => {
        const response = await patchDisplayName("  サイクリスト  ")

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({displayName: "サイクリスト"})
        expect(accountRepository.lastUserId).toBe("user-1")
        expect(accountRepository.lastDisplayName).toBe("サイクリスト")
    })

    it.each([
        ["空の名前", "   "],
        ["101文字の名前", "あ".repeat(101)],
        ["文字列ではない名前", 123],
    ])("rejects %s", async (_label, displayName) => {
        accountRepository.lastDisplayName = null
        const response = await patchDisplayName(displayName)

        expect(response.status).toBe(400)
        expect(await response.json()).toMatchObject({
            error: {code: "INVALID_DISPLAY_NAME"},
        })
        expect(accountRepository.lastDisplayName).toBeNull()
    })

    it("accepts a 100-character display name counted by characters", async () => {
        // 文字数はDBのlength()と同じ数え方
        const response = await patchDisplayName("🚲".repeat(100))

        expect(response.status).toBe(200)
    })

    it("returns 404 when the account no longer exists", async () => {
        accountRepository.updateResult = "not_found"
        const response = await patchDisplayName("名前")
        accountRepository.updateResult = "updated"

        expect(response.status).toBe(404)
    })

    it("reports missing ACCOUNT_ID_HASH_SECRET at the login entry point", async () => {
        const response = await app.request(
            "/api/auth/google?callbackUrl=%2Fsimulator",
            {},
            {
                ...createAuthBindings(),
                ACCOUNT_ID_HASH_SECRET: "",
            },
        )

        expect(response.status).toBe(503)
        expect(await response.json()).toEqual({
            error: {
                code: "AUTH_NOT_CONFIGURED",
                message:
                    "認証設定が未完了です。api/.dev.varsにACCOUNT_ID_HASH_SECRETを設定してください。",
            },
        })
    })
})

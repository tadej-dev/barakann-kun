import {Hono} from "hono"
import {Auth} from "@auth/core"
import {
    authHandler,
    initAuthConfig,
    reqWithEnvUrl,
    setEnvDefaults,
} from "@hono/auth-js"
import {secureHeaders} from "hono/secure-headers"
import type {Context} from "hono"
import type {Adapter} from "@auth/core/adapters"

import type {AppEnv} from "./app-env"
import {createAuthConfig} from "./auth/auth-config"
import type {AccountRepository} from "./db/account-repository"
import type {CatalogRepository} from "./db/catalog-repository"
import {D1AccountRepository} from "./db/d1-account-repository"
import {D1CatalogRepository} from "./db/d1-catalog-repository"
import {D1SavedBuildRepository} from "./db/d1-saved-build-repository"
import type {SavedBuildRepository} from "./db/saved-build-repository"
import {categoriesRoute} from "./routes/categories"
import {accountRoute} from "./routes/account"
import {partsRoute} from "./routes/parts"
import {savedBuildsRoute} from "./routes/saved-builds"

// テスト時に差し替え可能なアプリケーション依存関係
type AppDependencies = {
    accountRepository?: AccountRepository
    catalogRepository?: CatalogRepository
    authAdapter?: Adapter
    savedBuildRepository?: SavedBuildRepository
}

type AuthSessionPayload = {
    user?: {
        id?: string
        name?: string | null
        email?: string | null
        image?: string | null
    } | null
} | null

const AUTH_CONFIG_ERROR_CODE = "AUTH_NOT_CONFIGURED"
const AUTH_SECRET_ERROR_MESSAGE =
    "認証設定が未完了です。api/.dev.varsにAUTH_SECRETを設定してください。"
const GOOGLE_CONFIG_ERROR_MESSAGE =
    "Googleログイン設定が未完了です。GOOGLE_CLIENT_IDとGOOGLE_CLIENT_SECRETを設定してください。"

// 認証設定不足のエラー判定
function isMissingAuthSecret(error: unknown): boolean {
    return error instanceof Error && error.message === "Missing AUTH_SECRET"
}

// 認証設定不足のAPI応答
function authConfigError(context: Context<AppEnv>, message: string) {
    return context.json(
        {
            error: {
                code: AUTH_CONFIG_ERROR_CODE,
                message,
            },
        },
        503,
    )
}

// Auth.jsの標準レスポンスをこのアプリのセッション形式へ変換
async function normalizeSessionResponse(response: Response): Promise<Response> {
    if (!response.ok) {
        return response
    }

    const payload = await response.json() as AuthSessionPayload
    const user = payload?.user
    const normalizedPayload = user?.id
        ? {
            authenticated: true,
            user: {
                id: user.id,
                displayName: user.name ?? user.email ?? "",
                email: user.email ?? "",
                image: user.image ?? null,
            },
        }
        : {
            authenticated: false,
            user: null,
        }
    const headers = new Headers(response.headers)

    headers.set("content-type", "application/json")

    return new Response(JSON.stringify(normalizedPayload), {
        status: response.status,
        statusText: response.statusText,
        headers,
    })
}

// Auth.jsへ別名パスを渡すため、リクエストのパスだけを標準パスへ置き換える
async function executeAuthAtPath(
    context: Context<AppEnv>,
    path: string,
): Promise<Response> {
    const config = context.get("authConfig")
    const authEnv = context.env as unknown as {
        AUTH_SECRET?: string
        AUTH_URL?: string
        [key: string]: string | undefined
    }

    setEnvDefaults(authEnv as {AUTH_SECRET: string; [key: string]: string | undefined}, config)

    if (!config.secret) {
        throw new Error("Missing AUTH_SECRET")
    }

    const url = new URL(context.req.raw.url)
    url.pathname = path
    const body = context.req.raw.body
        ? await context.req.blob()
        : undefined
    const request = new Request(url, {
        body,
        cache: context.req.raw.cache,
        credentials: context.req.raw.credentials,
        headers: context.req.raw.headers,
        integrity: context.req.raw.integrity,
        keepalive: context.req.raw.keepalive,
        method: context.req.raw.method,
        mode: context.req.raw.mode,
        redirect: context.req.raw.redirect,
        referrer: context.req.raw.referrer,
        referrerPolicy: context.req.raw.referrerPolicy,
        signal: context.req.raw.signal,
    })
    const response = await Auth(
        reqWithEnvUrl(request, authEnv.AUTH_URL),
        config,
    )

    return new Response(response.body, response)
}

// Honoアプリケーションの生成
export function createApp(dependencies: AppDependencies = {}) {
    const app = new Hono<AppEnv>()
    const authRequestHandler = authHandler()

    // APIと静的アセットに共通するセキュリティヘッダー
    app.use("*", secureHeaders())

    // Auth.js設定のContext登録
    const initializeAuthConfig = initAuthConfig((context) =>
        createAuthConfig(context, dependencies.authAdapter),
    )
    app.use("/api/auth/*", initializeAuthConfig)
    app.use("/api/account", initializeAuthConfig)
    app.use("/api/builds", initializeAuthConfig)
    app.use("/api/builds/*", initializeAuthConfig)

    // 互換用の入口。プロバイダー指定のGETはAuth.jsで拒否されるため標準画面へ渡す。
    app.get("/api/auth/google/callback", (context) =>
        executeAuthAtPath(context, "/api/auth/callback/google"),
    )
    app.get("/api/auth/google", (context) => {
        if (!context.env.AUTH_SECRET) {
            return authConfigError(context, AUTH_SECRET_ERROR_MESSAGE)
        }

        if (!context.env.GOOGLE_CLIENT_ID ||
            !context.env.GOOGLE_CLIENT_SECRET) {
            return authConfigError(context, GOOGLE_CONFIG_ERROR_MESSAGE)
        }

        const callbackUrl = context.req.query("callbackUrl") ?? "/"
        const baseUrl = context.env.AUTH_URL ?? context.req.url
        const signInUrl = new URL("/api/auth/signin", baseUrl)

        signInUrl.searchParams.set("callbackUrl", callbackUrl)

        return context.redirect(signInUrl.toString())
    })

    // Auth.jsの標準セッションを、未ログイン状態も明示する形式へ統一。
    app.get("/api/auth/session", async (context) => {
        const response = await authRequestHandler(context, async () => {})

        return normalizeSessionResponse(
            response ?? new Response(null, {status: 204}),
        )
    })

    // ログアウトの別名。CSRFトークンはAuth.js標準と同じく要求する。
    app.post("/api/auth/logout", (context) =>
        executeAuthAtPath(context, "/api/auth/signout"),
    )

    // Auth.js標準認証エンドポイント
    app.all("/api/auth/*", authRequestHandler)

    // APIリクエストごとにカタログリポジトリをContextへ登録
    app.use("/api/*", async (context, next) => {
        const repository = dependencies.catalogRepository
            ?? new D1CatalogRepository(context.env.DB)

        context.set("catalogRepository", repository)
        await next()
    })

    // 保存構成APIへD1リポジトリを登録
    const registerSavedBuildRepository = async (context: Context<AppEnv>, next: () => Promise<void>) => {
        const repository = dependencies.savedBuildRepository
            ?? new D1SavedBuildRepository(context.env.DB)

        context.set("savedBuildRepository", repository)
        await next()
    }
    app.use("/api/builds", registerSavedBuildRepository)
    app.use("/api/builds/*", registerSavedBuildRepository)

    // アカウントAPIへD1リポジトリを登録
    const registerAccountRepository = async (context: Context<AppEnv>, next: () => Promise<void>) => {
        const repository = dependencies.accountRepository
            ?? new D1AccountRepository(context.env.DB)

        context.set("accountRepository", repository)
        await next()
    }
    app.use("/api/account", registerAccountRepository)

    // カタログAPIのルート登録
    app.get("/api/health", (context) => context.json({status: "ok"}))
    app.route("/api/account", accountRoute)
    app.route("/api/categories", categoriesRoute)
    app.route("/api/parts", partsRoute)
    app.route("/api/builds", savedBuildsRoute)

    // 未定義のAPIパスに対するJSON応答
    app.notFound((context) => context.json(
        {
            error: {
                code: "NOT_FOUND",
                message: "指定されたAPIが見つかりません",
            },
        },
        404,
    ))

    // 予期しない例外に対する共通エラー応答
    app.onError((error, context) => {
        console.error("Unhandled API error", error)

        if (isMissingAuthSecret(error)) {
            return authConfigError(context, AUTH_SECRET_ERROR_MESSAGE)
        }

        return context.json(
            {
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "サーバーでエラーが発生しました",
                },
            },
            500,
        )
    })

    return app
}

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
import {MISSING_ACCOUNT_ID_HASH_SECRET_MESSAGE} from "./auth/d1-auth-adapter"
import {DEFAULT_DISPLAY_NAME} from "./auth/display-name"
import type {AccountRepository} from "./db/account-repository"
import type {CatalogRepository} from "./db/catalog-repository"
import type {ConfigOrderRepository} from "./db/config-order-repository"
import {D1AccountRepository} from "./db/d1-account-repository"
import {D1CatalogRepository} from "./db/d1-catalog-repository"
import {D1ConfigOrderRepository} from "./db/config-order-repository"
import {D1SavedBuildRepository} from "./db/d1-saved-build-repository"
import type {SavedBuildRepository} from "./db/saved-build-repository"
import {categoriesRoute} from "./routes/categories"
import {configOrderRoute} from "./routes/config-order"
import {accountRoute} from "./routes/account"
import {partsRoute} from "./routes/parts"
import {savedBuildsRoute} from "./routes/saved-builds"

// テスト時に差し替え可能なアプリケーション依存関係
type AppDependencies = {
    accountRepository?: AccountRepository
    catalogRepository?: CatalogRepository
    configOrderRepository?: ConfigOrderRepository
    authAdapter?: Adapter
    savedBuildRepository?: SavedBuildRepository
}

// Auth.jsセッションAPIの応答本文
type AuthSessionPayload = {
    user?: {
        id?: string
        name?: string | null
    } | null
} | null

// 認証設定不足を表すAPIエラーコード
const AUTH_CONFIG_ERROR_CODE = "AUTH_NOT_CONFIGURED"
// Google同意画面でのキャンセルを表すクエリ値
const GOOGLE_LOGIN_CANCELLED_ERROR = "google-cancelled"
// AUTH_SECRET未設定時に画面へ表示する案内文
const AUTH_SECRET_ERROR_MESSAGE =
    "認証設定が未完了です。api/.dev.varsにAUTH_SECRETを設定してください。"
// GoogleクライアントID・シークレット未設定時の案内文
const GOOGLE_CONFIG_ERROR_MESSAGE =
    "Googleログイン設定が未完了です。GOOGLE_CLIENT_IDとGOOGLE_CLIENT_SECRETを設定してください。"
// アカウントIDのハッシュ化鍵が未設定時の案内文
const ACCOUNT_ID_HASH_SECRET_ERROR_MESSAGE =
    "認証設定が未完了です。api/.dev.varsにACCOUNT_ID_HASH_SECRETを設定してください。"

// 認証設定不足のエラー判定
function isMissingAuthSecret(error: unknown): boolean {
    return error instanceof Error && error.message === "Missing AUTH_SECRET"
}

// アカウントIDのハッシュ化用の秘密鍵が未設定かの判定
function isMissingAccountIdHashSecret(error: unknown): boolean {
    return error instanceof Error &&
        error.message === MISSING_ACCOUNT_ID_HASH_SECRET_MESSAGE
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

// Googleの同意画面でキャンセルされた場合に、利用者向け画面へ戻す
function redirectFromGoogleLoginCancellation(context: Context<AppEnv>) {
    const baseUrl = context.env.AUTH_URL ?? context.req.url
    const redirectUrl = new URL("/", baseUrl)

    // 認証コードやGoogleの内部エラーは渡さず、画面表示用の固定値だけを付与
    redirectUrl.searchParams.set("authError", GOOGLE_LOGIN_CANCELLED_ERROR)

    return context.redirect(redirectUrl.toString())
}

// ログイン後の戻り先を同一オリジンのパスへ限定
function normalizeCallbackUrl(
    context: Context<AppEnv>,
    callbackUrl: string | undefined,
): string {
    const baseUrl = context.env.AUTH_URL ?? context.req.url

    // 戻り先の指定が無いログインはトップページへ戻す
    if (!callbackUrl) {
        return "/"
    }

    try {
        // 相対URLは自アプリのURLを基準に絶対URLへ変換
        // 絶対URLは同一オリジンの場合だけ戻り先として許可
        const base = new URL(baseUrl)
        const candidate = new URL(callbackUrl, base)

        // 別サイトへの遷移を防ぐため、同一オリジン以外はトップページへ戻す
        if (candidate.origin !== base.origin) {
            return "/"
        }

        return `${candidate.pathname}${candidate.search}${candidate.hash}`
    } catch {
        // URLとして解釈できない値は安全なトップページへ戻す
        return "/"
    }
}

// Auth.jsの標準レスポンスをアプリのセッション形式へ変換
async function normalizeSessionResponse(response: Response): Promise<Response> {
    // Auth.jsがエラーを返した場合は本文を変換せず、ステータスと内容を維持
    if (!response.ok) {
        return response
    }

    // Auth.jsの実装や設定によっては空の2xxレスポンスになる場合がある
    // 空の応答でもセッションAPIの契約を壊さず、未ログインとして返す
    let payload: AuthSessionPayload = null

    try {
        payload = await response.json() as AuthSessionPayload
    } catch {
        payload = null
    }
    // Auth.js固有の形式を画面が扱いやすい認証状態へ変換
    const user = payload?.user
    // 画面が扱う認証状態と表示名の形式
    const normalizedPayload = user?.id
        ? {
            authenticated: true,
            // メールアドレスと画像は保存していないため返さず、表示名は利用者が付けた名前を返す
            user: {
                id: user.id,
                displayName: user.name ?? DEFAULT_DISPLAY_NAME,
            },
        }
        : {
            authenticated: false,
            user: null,
        }
    const headers = new Headers(response.headers)

    // 本文をJSONへ置き換えるため元の長さや圧縮情報を引き継がない
    headers.set("content-type", "application/json")
    // 元本文の長さ・圧縮情報がJSON本文と食い違わないよう除去
    headers.delete("content-length")
    headers.delete("content-encoding")

    return new Response(JSON.stringify(normalizedPayload), {
        // 空の204をアプリのJSON契約へ正規化するため、返却ステータスは200へ揃える
        status: response.status === 204 ? 200 : response.status,
        statusText: response.statusText,
        headers,
    })
}

// 本番ログへ認証情報やD1の詳細スタックを出さないエラーログを作成
function logUnhandledApiError(context: Context<AppEnv>, error: unknown) {
    // 調査用の詳細ログが有効な場合だけ、例外の中身を出力
    if (context.env.AUTH_DEBUG === "true") {
        console.error("Unhandled API error", error)

        return
    }

    console.error("Unhandled API error", {
        name: error instanceof Error ? error.name : "UnknownError",
    })
}

// Auth.jsへ別名パスを渡すため、リクエストのパスだけを標準パスへ置き換える
async function executeAuthAtPath(
    context: Context<AppEnv>,
    path: string,
): Promise<Response> {
    const config = context.get("authConfig")
    // Auth.jsへ渡すAUTH_SECRETとAUTH_URLを含む環境変数
    const authEnv = context.env as unknown as {
        AUTH_SECRET?: string
        AUTH_URL?: string
        [key: string]: string | undefined
    }

    setEnvDefaults(authEnv as {AUTH_SECRET: string; [key: string]: string | undefined}, config)

    // AUTH_SECRETが無いとAuth.jsが動作しないため、処理前に検出
    if (!config.secret) {
        throw new Error("Missing AUTH_SECRET")
    }

    // 互換用ルートのパスをAuth.jsが処理できる標準パスへ置き換える
    // メソッドやCookieなど元リクエストの情報は維持
    const url = new URL(context.req.raw.url)
    url.pathname = path
    const body = context.req.raw.body
        ? await context.req.blob()
        : undefined
    // パス以外のメソッド・ヘッダー・本文を維持したリクエスト
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
    // Auth.js標準の認証処理を呼び出すハンドラー
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
    app.use("/api/config-order", initializeAuthConfig)

    // 旧クライアントのコールバックURLをAuth.js標準URLへ中継
    // 互換用の入口。プロバイダー指定のGETはAuth.jsで拒否されるため標準画面へ渡す
    app.get("/api/auth/google/callback", async (context) => {
        // Google側でキャンセルされた場合は同意画面ではなくアプリへ戻す
        if (context.req.query("error") === "access_denied") {
            return redirectFromGoogleLoginCancellation(context)
        }

        return executeAuthAtPath(context, "/api/auth/callback/google")
    })
    // Googleログインの開始と必須設定の確認
    app.get("/api/auth/google", (context) => {
        // OAuthを開始する前に必須設定を確認して原因の分かる応答を返す
        if (!context.env.AUTH_SECRET) {
            return authConfigError(context, AUTH_SECRET_ERROR_MESSAGE)
        }

        // 未設定のままだとログイン後のアカウント保存で失敗するため、開始前に止める
        if (!context.env.ACCOUNT_ID_HASH_SECRET) {
            return authConfigError(context, ACCOUNT_ID_HASH_SECRET_ERROR_MESSAGE)
        }

        // Googleログインに必要なクライアントIDとシークレットの設定有無を確認
        if (!context.env.GOOGLE_CLIENT_ID ||
            !context.env.GOOGLE_CLIENT_SECRET) {
            return authConfigError(context, GOOGLE_CONFIG_ERROR_MESSAGE)
        }

        // ログイン完了後の戻り先（同一オリジンのパス・クエリ・ハッシュのみ）
        const callbackUrl = normalizeCallbackUrl(
            context,
            context.req.query("callbackUrl"),
        )
        // 認証URLの基準となるアプリのURL
        const baseUrl = context.env.AUTH_URL ?? context.req.url
        // Google同意画面へ遷移するためのAuth.jsサインインURL
        const signInUrl = new URL("/api/auth/signin", baseUrl)

        signInUrl.searchParams.set("callbackUrl", callbackUrl)

        return context.redirect(signInUrl.toString())
    })

    // Auth.jsの標準セッションを、未ログイン状態も明示する形式へ統一
    app.get("/api/auth/session", async (context) => {
        // Auth.jsが空の応答を返しても画面には共通のJSON形式を返す
        const response = await authRequestHandler(context, async () => {})

        return normalizeSessionResponse(
            response ?? new Response(null, {status: 204}),
        )
    })

    // ログアウトの別名。CSRFトークンはAuth.js標準と同じく要求
    app.post("/api/auth/logout", (context) =>
        executeAuthAtPath(context, "/api/auth/signout"),
    )

    // Googleが返すaccess_deniedは、Auth.jsのエラー画面ではなく再試行可能な画面へ戻す
    app.use("/api/auth/callback/google", async (context, next) => {
        // Googleのキャンセル応答はAuth.jsのエラー画面へ渡さずアプリへ戻す
        if (context.req.query("error") === "access_denied") {
            return redirectFromGoogleLoginCancellation(context)
        }

        await next()
    })

    // Auth.js標準認証エンドポイント
    app.all("/api/auth/*", authRequestHandler)

    // すべてのAPIから同じカタログRepositoryを参照できるよう登録
    // APIリクエストごとにカタログリポジトリをContextへ登録
    app.use("/api/*", async (context, next) => {
        // テスト用に差し替えられたカタログRepositoryを優先
        const repository = dependencies.catalogRepository
            ?? new D1CatalogRepository(context.env.DB)

        context.set("catalogRepository", repository)
        await next()
    })

    // 保存構成APIへD1リポジトリを登録
    const registerSavedBuildRepository = async (context: Context<AppEnv>, next: () => Promise<void>) => {
        // テスト用に差し替えられた保存構成Repositoryを優先
        const repository = dependencies.savedBuildRepository
            ?? new D1SavedBuildRepository(context.env.DB)

        context.set("savedBuildRepository", repository)
        await next()
    }
    app.use("/api/builds", registerSavedBuildRepository)
    app.use("/api/builds/*", registerSavedBuildRepository)

    // 構成表示順APIへD1リポジトリを登録
    const registerConfigOrderRepository = async (context: Context<AppEnv>, next: () => Promise<void>) => {
        // テスト用に差し替えられた構成表示順Repositoryを優先
        const repository = dependencies.configOrderRepository
            ?? new D1ConfigOrderRepository(context.env.DB)

        context.set("configOrderRepository", repository)
        await next()
    }
    app.use("/api/config-order", registerConfigOrderRepository)

    // アカウントAPI(表示名変更・削除)で使用するRepositoryをContextへ登録
    const registerAccountRepository = async (context: Context<AppEnv>, next: () => Promise<void>) => {
        // テスト用に差し替えられたアカウントRepositoryを優先
        const repository = dependencies.accountRepository
            ?? new D1AccountRepository(context.env.DB)

        context.set("accountRepository", repository)
        await next()
    }
    app.use("/api/account", registerAccountRepository)

    // ヘルスチェックと機能別ルートの登録
    // 機能ごとに分けたルートを最終的なAPIパスへ組み込む
    app.get("/api/health", (context) => context.json({status: "ok"}))
    app.route("/api/account", accountRoute)
    app.route("/api/categories", categoriesRoute)
    app.route("/api/config-order", configOrderRoute)
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
        logUnhandledApiError(context, error)

        // 認証秘密鍵の不足は設定で解決できるため専用の503応答にする
        if (isMissingAuthSecret(error)) {
            return authConfigError(context, AUTH_SECRET_ERROR_MESSAGE)
        }

        // アカウントIDのハッシュ化鍵が無い場合も設定不足として503を返す
        if (isMissingAccountIdHashSecret(error)) {
            return authConfigError(context, ACCOUNT_ID_HASH_SECRET_ERROR_MESSAGE)
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

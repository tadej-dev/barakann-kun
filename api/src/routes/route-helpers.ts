import {getAuthUser} from "@hono/auth-js"
import type {Context} from "hono"

import type {AppEnv} from "../app-env"
import {
    parseCsrfToken,
    verifyCsrfToken,
} from "../auth/csrf"

// 認証・CSRFを使うAPIルートで共通利用するContext型
export type ApiRouteContext = Context<AppEnv>

// 未ログイン状態の共通応答
export function unauthenticated(context: ApiRouteContext) {
    return context.json(
        {
            error: {
                code: "UNAUTHENTICATED",
                message: "ログインが必要です",
            },
        },
        401,
    )
}

// 変更系APIのCSRF検証エラー応答
export function invalidCsrf(context: ApiRouteContext) {
    return context.json(
        {
            error: {
                code: "INVALID_CSRF_TOKEN",
                message: "不正なリクエストです。ページを再読み込みして再試行してください",
            },
        },
        403,
    )
}

// リクエストJSONを読み取り、本文不正をnullへ統一
export async function readJson(context: ApiRouteContext): Promise<unknown> {
    try {
        return await context.req.json()
    } catch {
        return null
    }
}

// 現在のセッションからアプリ内ユーザーIDを取得
export async function getUserId(
    context: ApiRouteContext,
): Promise<string | null> {
    const authUser = await getAuthUser(context)

    return authUser?.user?.id ?? null
}

// 本文のCSRFトークンとAuth.jsのCookieを照合
export async function hasValidCsrfToken(
    context: ApiRouteContext,
    payload: unknown,
): Promise<boolean> {
    const csrfToken = parseCsrfToken(payload)

    return Boolean(
        csrfToken && await verifyCsrfToken(
            context.req.raw,
            context.env.AUTH_SECRET,
            csrfToken,
        ),
    )
}

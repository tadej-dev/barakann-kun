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
        // 空本文や不正JSONは呼び出し元のスキーマ検証で処理できる形へ揃える
        return null
    }
}

// 現在のセッションからアプリ内ユーザーIDを取得
export async function getUserId(
    context: ApiRouteContext,
): Promise<string | null> {
    // ユーザーIDはリクエスト本文ではなくAuth.jsのセッションから取得する
    const authUser = await getAuthUser(context)

    return authUser?.user?.id ?? null
}

// 変更系APIが受け付ける本文のContent-Typeか判定する。
//
// application/json以外(form-urlencoded・multipart/form-data・text/plain)は、
// クロスサイトの<form>からも送信でき、プリフライトも発生しない。本文のCSRFトークン
// 検証だけに頼らず、そもそも受け付けないことで多層防御にする。
export function isJsonContentType(contentType: string | null): boolean {
    return contentType?.toLowerCase().startsWith("application/json") ?? false
}

// 本文のCSRFトークンとAuth.jsのCookieを照合
export async function hasValidCsrfToken(
    context: ApiRouteContext,
    payload: unknown,
): Promise<boolean> {
    // JSON以外の本文は、CSRF検証の対象にしない
    if (!isJsonContentType(context.req.header("content-type") ?? null)) {
        return false
    }

    const csrfToken = parseCsrfToken(payload)

    // 本文にトークンがなければ暗号学的な検証を行わず失敗として返す
    return Boolean(
        csrfToken && await verifyCsrfToken(
            context.req.raw,
            context.env.AUTH_SECRET,
            csrfToken,
        ),
    )
}

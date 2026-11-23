import {Hono} from "hono"

import type {AppEnv} from "../app-env"
import {
    MAX_DISPLAY_NAME_LENGTH,
    normalizeDisplayName,
} from "../auth/display-name"
import {
    getUserId,
    hasValidCsrfToken,
    invalidCsrf,
    readJson,
    unauthenticated,
    type ApiRouteContext,
} from "./route-helpers"

// アカウントAPI(表示名の変更・アカウント削除)
export const accountRoute = new Hono<AppEnv>()
// アカウントAPIのContext型
type AccountContext = ApiRouteContext

// アカウントが既に存在しない場合の応答
function accountNotFound(context: AccountContext) {
    return context.json(
        {
            error: {
                code: "ACCOUNT_NOT_FOUND",
                message: "アカウントが見つかりません",
            },
        },
        404,
    )
}

// 表示名が空・長すぎる・文字列でない場合の応答
function invalidDisplayName(context: AccountContext) {
    return context.json(
        {
            error: {
                code: "INVALID_DISPLAY_NAME",
                message: `表示名は1〜${MAX_DISPLAY_NAME_LENGTH}文字で入力してください`,
            },
        },
        400,
    )
}

// Auth.jsのセッションCookieを削除し、削除後に古いCookieを使い続けないようにする
function clearSessionCookies(context: AccountContext) {
    // HTTPS配信時だけCookieへSecure属性を付けるための判定フラグ
    const secure = context.req.url.startsWith("https:")
    // セッションCookieの削除候補名（接頭辞なし・__Host-・__Secure-）
    const cookieNames = [
        "authjs.session-token",
        "__Host-authjs.session-token",
        "__Secure-authjs.session-token",
    ]

    for (const cookieName of cookieNames) {
        // Set-Cookieへ連結する属性（空値・失効・パス・SameSite）
        const attributes = [
            `${cookieName}=`,
            "Max-Age=0",
            "Path=/",
            "SameSite=Lax",
        ]

        // ローカル開発のhttpでもCookieを送れるようHTTPS時だけSecureを付ける
        if (secure) {
            attributes.push("Secure")
        }

        context.header("Set-Cookie", attributes.join("; "), {append: true})
    }
}

// ログイン中の本人の表示名を変更
accountRoute.patch("/", async (context) => {
    // 変更対象は本文で受け取らずログイン中のユーザーに固定
    const userId = await getUserId(context)

    // 未ログイン時の401応答
    if (!userId) {
        return unauthenticated(context)
    }

    const payload = await readJson(context)

    // 表示名の変更は状態変更のためCSRFトークンを検証
    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    // 前後空白を除いた1〜100文字の表示名（空・長すぎる・文字列以外はnull）
    const displayName = normalizeDisplayName(
        typeof payload === "object" && payload !== null
            ? (payload as Record<string, unknown>).displayName
            : undefined,
    )

    // 表示名が文字列でない、または1〜100文字の範囲外の場合の400応答
    if (displayName === null) {
        return invalidDisplayName(context)
    }

    // 表示名更新の結果（更新後の表示名またはnot_found）
    const result = await context.var.accountRepository.updateDisplayName(
        userId,
        displayName,
    )

    // 更新対象のユーザー行が無い場合の404応答
    if (result.kind === "not_found") {
        return accountNotFound(context)
    }

    return context.json({displayName: result.displayName})
})

// ログイン中の本人のアカウントを削除
accountRoute.delete("/", async (context) => {
    // 削除対象は本文で受け取らずログイン中のユーザーに固定
    const userId = await getUserId(context)

    // 未ログイン時の401応答
    if (!userId) {
        return unauthenticated(context)
    }

    const payload = await readJson(context)

    // アカウント削除は状態変更のためCSRFトークンを検証
    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    // アカウント削除の結果（削除済みまたはnot_found）
    const result = await context.var.accountRepository.deleteUser(
        userId,
    )

    // 削除対象のユーザー行が無い場合の404応答
    if (result.kind === "not_found") {
        return accountNotFound(context)
    }

    // D1の削除後にブラウザへ残っているセッションCookieも無効化
    clearSessionCookies(context)

    return context.body(null, 204)
})

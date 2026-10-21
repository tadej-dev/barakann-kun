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
    const secure = context.req.url.startsWith("https:")
    const cookieNames = [
        "authjs.session-token",
        "__Host-authjs.session-token",
        "__Secure-authjs.session-token",
    ]

    for (const cookieName of cookieNames) {
        const attributes = [
            `${cookieName}=`,
            "Max-Age=0",
            "Path=/",
            "SameSite=Lax",
        ]

        if (secure) {
            attributes.push("Secure")
        }

        context.header("Set-Cookie", attributes.join("; "), {append: true})
    }
}

// ログイン中の本人の表示名を変更
accountRoute.patch("/", async (context) => {
    // 変更対象は本文で受け取らずログイン中のユーザーに固定する
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    const payload = await readJson(context)

    // 表示名の変更は状態変更のためCSRFトークンを検証する
    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const displayName = normalizeDisplayName(
        typeof payload === "object" && payload !== null
            ? (payload as Record<string, unknown>).displayName
            : undefined,
    )

    if (displayName === null) {
        return invalidDisplayName(context)
    }

    const result = await context.var.accountRepository.updateDisplayName(
        userId,
        displayName,
    )

    if (result.kind === "not_found") {
        return accountNotFound(context)
    }

    return context.json({displayName: result.displayName})
})

// ログイン中の本人のアカウントを削除
accountRoute.delete("/", async (context) => {
    // 削除対象は本文で受け取らずログイン中のユーザーに固定する
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    const payload = await readJson(context)

    // アカウント削除は状態変更のためCSRFトークンを検証する
    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const result = await context.var.accountRepository.deleteUser(
        userId,
    )

    if (result.kind === "not_found") {
        return accountNotFound(context)
    }

    // D1の削除後にブラウザへ残っているセッションCookieも無効化する
    clearSessionCookies(context)

    return context.body(null, 204)
})

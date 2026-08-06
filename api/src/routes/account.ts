import {getAuthUser} from "@hono/auth-js"
import {Hono} from "hono"
import type {Context} from "hono"

import type {AppEnv} from "../app-env"
import {
    parseCsrfToken,
    verifyCsrfToken,
} from "../auth/csrf"

// アカウント削除API
export const accountRoute = new Hono<AppEnv>()
type AccountContext = Context<AppEnv>

// 未ログイン状態の共通応答
function unauthenticated(context: AccountContext) {
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

// CSRFトークン不正時の応答
function invalidCsrf(context: AccountContext) {
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

// Auth.jsのセッションCookieを削除し、削除後に古いCookieを使い続けないようにする
function clearSessionCookies(context: AccountContext) {
    const secure = context.req.url.startsWith("https:")
    const cookieNames = [
        "authjs.session-token",
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

// ログイン中の本人のアカウントを削除
accountRoute.delete("/", async (context) => {
    const authUser = await getAuthUser(context)

    if (!authUser?.user?.id) {
        return unauthenticated(context)
    }

    let payload: unknown

    try {
        payload = await context.req.json()
    } catch {
        payload = null
    }
    const csrfToken = parseCsrfToken(payload)

    if (!csrfToken || !(await verifyCsrfToken(
        context.req.raw,
        context.env.AUTH_SECRET,
        csrfToken,
    ))) {
        return invalidCsrf(context)
    }

    const result = await context.var.accountRepository.deleteUser(
        authUser.user.id,
    )

    if (result.kind === "not_found") {
        return accountNotFound(context)
    }

    clearSessionCookies(context)

    return context.body(null, 204)
})

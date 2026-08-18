import {Hono} from "hono"

import type {AppEnv} from "../app-env"
import {
    getUserId,
    hasValidCsrfToken,
    invalidCsrf,
    readJson,
    unauthenticated,
    type ApiRouteContext,
} from "./route-helpers"

// アカウント削除API
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

// ログイン中の本人のアカウントを削除
accountRoute.delete("/", async (context) => {
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    const payload = await readJson(context)

    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const result = await context.var.accountRepository.deleteUser(
        userId,
    )

    if (result.kind === "not_found") {
        return accountNotFound(context)
    }

    clearSessionCookies(context)

    return context.body(null, 204)
})

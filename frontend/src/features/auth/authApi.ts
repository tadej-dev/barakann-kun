// 認証APIのレスポンス型
export type AuthUser = {
    id: string
    displayName: string
    email: string
    image: string | null
}

export type AuthSession =
    | {
        authenticated: true
        user: AuthUser
    }
    | {
        authenticated: false
        user: null
    }

type CsrfResponse = {
    csrfToken?: unknown
}

type ApiErrorPayload = {
    error?: {
        message?: unknown
    }
}

// 認証API共通のエラー生成
function createAuthApiError(message: string): Error {
    return new Error(message)
}

// JSONレスポンスの取得
async function readJson(response: Response, message: string): Promise<unknown> {
    if (!response.ok) {
        let responseMessage = message

        try {
            const payload = await response.json() as ApiErrorPayload

            if (typeof payload.error?.message === "string") {
                responseMessage = payload.error.message
            }
        } catch {
            // エラー形式が異なる場合は呼び出し元のメッセージを使う
        }

        throw createAuthApiError(responseMessage)
    }

    try {
        return await response.json() as unknown
    } catch {
        throw createAuthApiError(message)
    }
}

// 認証状態の型判定
function parseAuthSession(payload: unknown): AuthSession {
    if (
        typeof payload !== "object" ||
        payload === null ||
        !("authenticated" in payload) ||
        !("user" in payload)
    ) {
        throw createAuthApiError("ログイン状態の取得に失敗しました")
    }

    const payloadRecord = payload as Record<string, unknown>
    const userValue = payloadRecord.user

    if (payloadRecord.authenticated === false && userValue === null) {
        return {
            authenticated: false,
            user: null,
        }
    }

    const userRecord = typeof userValue === "object" && userValue !== null
        ? userValue as Record<string, unknown>
        : null

    if (
        payloadRecord.authenticated !== true ||
        !userRecord ||
        typeof userRecord.id !== "string" ||
        typeof userRecord.displayName !== "string" ||
        typeof userRecord.email !== "string" ||
        (userRecord.image !== null &&
            typeof userRecord.image !== "string")
    ) {
        throw createAuthApiError("ログイン状態の取得に失敗しました")
    }

    return {
        authenticated: true,
        user: {
            id: userRecord.id,
            displayName: userRecord.displayName,
            email: userRecord.email,
            image: userRecord.image,
        },
    }
}

// 現在画面へ戻るための相対URL
export function getCurrentCallbackUrl(): string {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

// 現在のログイン状態を取得
export async function fetchAuthSession(
    signal?: AbortSignal,
): Promise<AuthSession> {
    const response = await fetch("/api/auth/session", {
        signal,
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
        },
    })
    const payload = await readJson(
        response,
        "ログイン状態の取得に失敗しました",
    )

    return parseAuthSession(payload)
}

// Auth.jsの変更系APIで共通利用するCSRFトークンを取得
export async function fetchCsrfToken(): Promise<string> {
    const response = await fetch("/api/auth/csrf", {
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
        },
    })
    const payload = await readJson(
        response,
        "変更操作の準備に失敗しました",
    ) as CsrfResponse

    if (typeof payload.csrfToken !== "string" || payload.csrfToken.length === 0) {
        throw createAuthApiError("変更操作の準備に失敗しました")
    }

    return payload.csrfToken
}

// CSRF検証付きログアウト
export async function logout(): Promise<void> {
    const csrfToken = await fetchCsrfToken()
    const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        // セッション削除後の遷移先をセッションAPIにして、画面遷移を発生させない
        body: new URLSearchParams({
            csrfToken,
            callbackUrl: "/api/auth/session",
        }).toString(),
    })

    if (!response.ok) {
        throw createAuthApiError("ログアウトに失敗しました")
    }
}

// CSRF検証付きで、現在のユーザーと関連データを削除
export async function deleteAccount(): Promise<void> {
    const csrfToken = await fetchCsrfToken()
    const response = await fetch("/api/account", {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({csrfToken}),
    })

    if (!response.ok) {
        await readJson(response, "アカウントの削除に失敗しました")
    }
}

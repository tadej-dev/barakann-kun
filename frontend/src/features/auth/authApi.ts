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

// Auth.jsのレスポンスを直接UIへ渡さず、必要なフィールドだけを型付けする。

type CsrfResponse = {
    csrfToken?: unknown
}

type ApiErrorPayload = {
    error?: {
        message?: unknown
    }
}

type AuthRedirectPayload = {
    url?: unknown
}

// 認証API共通のエラー生成
function createAuthApiError(message: string): Error {
    return new Error(message)
}

// JSONレスポンスの取得
async function readJson(response: Response, message: string): Promise<unknown> {
    // 認証APIはエラー本文の形式が一定でないため、既定メッセージを先に用意する。
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
    // authenticatedとuserの組み合わせを同時に確認し、片方だけの曖昧な状態を排除する。
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
        // 未ログインはuserを必ずnullに揃え、前回のユーザー情報を残さない。
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
    // 外部プロバイダーから戻った後も、検索条件・ハッシュを含めて現在画面を復元する。
    return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

// 現在のログイン状態を取得
export async function fetchAuthSession(
    signal?: AbortSignal,
): Promise<AuthSession> {
    // no-cacheを指定し、ログアウト直後に古いセッションを表示しない。
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
    // 変更系リクエストの前に、Auth.jsが発行したCSRFトークンを取得する。
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
        // トークンがない場合は変更系APIを呼ばず、認証準備エラーとして止める。
        throw createAuthApiError("変更操作の準備に失敗しました")
    }

    return payload.csrfToken
}

// Auth.jsのプロバイダー指定ログインはCSRF付きPOSTで開始する
export async function startGoogleLogin(callbackUrl: string): Promise<string> {
    // リダイレクト先を相対URLとして渡し、ログイン後に現在の画面へ戻す。
    const csrfToken = await fetchCsrfToken()
    const response = await fetch("/api/auth/signin/google", {
        method: "POST",
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Auth-Return-Redirect": "1",
        },
        body: new URLSearchParams({
            csrfToken,
            callbackUrl,
        }).toString(),
    })
    const payload = await readJson(
        response,
        "Googleログインの開始に失敗しました",
    ) as AuthRedirectPayload

    if (typeof payload.url !== "string" || payload.url.length === 0) {
        // リダイレクト先がない場合はwindow.locationを変更せず、ログイン開始失敗にする。
        throw createAuthApiError("Googleログインの開始に失敗しました")
    }

    return payload.url
}

// CSRF検証付きログアウト
export async function logout(): Promise<void> {
    // Auth.jsのセッションCookie削除をサーバー側で行い、クライアントは完了後に再取得する。
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
        // 204以外の応答はログアウト未完了としてAuthProviderへ返す。
        throw createAuthApiError("ログアウトに失敗しました")
    }
}

// CSRF検証付きで、現在のユーザーと関連データを削除
export async function deleteAccount(): Promise<void> {
    // アカウントと関連するD1データの削除を1リクエストにまとめる。
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
        // エラー本文を共通パーサーで読み、設定・CSRF・サーバーエラーを同じ形式で伝える。
        await readJson(response, "アカウントの削除に失敗しました")
    }
}

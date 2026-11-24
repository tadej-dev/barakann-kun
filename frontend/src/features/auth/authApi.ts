// 認証APIのレスポンス型
// メールアドレスとプロフィール画像は保存していないため、IDと表示名だけを持つ。
export type AuthUser = {
    id: string
    displayName: string
}

// 認証済みか未認証かの組み合わせで表すセッション
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

// CSRFトークン取得APIのレスポンス
type CsrfResponse = {
    csrfToken?: unknown
}

// エラー応答の本文（messageだけを読む）
type ApiErrorPayload = {
    error?: {
        message?: unknown
    }
}

// ログイン開始APIが返す遷移先URL
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
        // 画面に返すエラーメッセージ（APIの文言で上書き）
        let responseMessage = message

        try {
            // エラー応答のJSON本文
            const payload = await response.json() as ApiErrorPayload

            // エラー本文のmessageが文字列ならAPIの文言を優先
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

    // レスポンス本文をキーで読める形にした値
    const payloadRecord = payload as Record<string, unknown>
    // userキーの値（オブジェクト以外もあり得る）
    const userValue = payloadRecord.user

    // 未ログインの応答ならuserをnullに揃えて確定
    if (payloadRecord.authenticated === false && userValue === null) {
        // 未ログインはuserを必ずnullに揃え、前回のユーザー情報を残さない。
        return {
            authenticated: false,
            user: null,
        }
    }

    // ユーザー情報をキーで読める形にした値（オブジェクト以外はnull）
    const userRecord = typeof userValue === "object" && userValue !== null
        ? userValue as Record<string, unknown>
        : null

    // 認証済みの形式が揃わなければログイン状態の取得失敗
    if (
        payloadRecord.authenticated !== true ||
        !userRecord ||
        typeof userRecord.id !== "string" ||
        typeof userRecord.displayName !== "string"
    ) {
        throw createAuthApiError("ログイン状態の取得に失敗しました")
    }

    return {
        authenticated: true,
        user: {
            id: userRecord.id,
            displayName: userRecord.displayName,
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
    // セッション取得APIの応答
    const response = await fetch("/api/auth/session", {
        signal,
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
        },
    })
    // セッション取得APIのJSON本文
    const payload = await readJson(
        response,
        "ログイン状態の取得に失敗しました",
    )

    return parseAuthSession(payload)
}

// Auth.jsの変更系APIで共通利用するCSRFトークンを取得
export async function fetchCsrfToken(): Promise<string> {
    // 変更系リクエストの前に、Auth.jsが発行したCSRFトークンを取得する。
    // CSRFトークン取得APIの応答
    const response = await fetch("/api/auth/csrf", {
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
        },
    })
    // CSRFトークン取得APIのJSON本文
    const payload = await readJson(
        response,
        "変更操作の準備に失敗しました",
    ) as CsrfResponse

    // トークンが空・文字列以外なら変更操作を開始しない
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
    // Googleログイン開始APIの応答
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
    // Googleログイン開始APIのJSON本文
    const payload = await readJson(
        response,
        "Googleログインの開始に失敗しました",
    ) as AuthRedirectPayload

    // 遷移先URLが空・文字列以外ならログイン開始失敗
    if (typeof payload.url !== "string" || payload.url.length === 0) {
        // リダイレクト先がない場合はwindow.locationを変更せず、ログイン開始失敗にする。
        throw createAuthApiError("Googleログインの開始に失敗しました")
    }

    return payload.url
}

// CSRF検証付きログアウト
export async function logout(): Promise<void> {
    // Auth.jsのセッションCookie削除をサーバー側で行い、クライアントは完了後に再取得する。
    // ログアウトに付与するCSRFトークン
    const csrfToken = await fetchCsrfToken()
    // ログアウトAPIの応答
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

    // 成功応答以外はログアウト未完了としてエラーにする
    if (!response.ok) {
        // 204以外の応答はログアウト未完了としてAuthProviderへ返す。
        throw createAuthApiError("ログアウトに失敗しました")
    }
}

// CSRF検証付きで、現在のユーザーと関連データを削除
export async function deleteAccount(): Promise<void> {
    // アカウントと関連するD1データの削除を1リクエストにまとめる。
    // アカウント削除に付与するCSRFトークン
    const csrfToken = await fetchCsrfToken()
    // アカウント削除APIの応答
    const response = await fetch("/api/account", {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({csrfToken}),
    })

    // 失敗応答は共通のエラー読み取りで例外へ変換
    if (!response.ok) {
        // エラー本文を共通パーサーで読み、設定・CSRF・サーバーエラーを同じ形式で伝える。
        await readJson(response, "アカウントの削除に失敗しました")
    }
}

// CSRF検証付きで、ログイン中のユーザーの表示名を変更し、保存された表示名を返す
export async function updateDisplayName(displayName: string): Promise<string> {
    // 表示名変更に付与するCSRFトークン
    const csrfToken = await fetchCsrfToken()
    // 表示名変更APIの応答
    const response = await fetch("/api/account", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({csrfToken, displayName}),
    })
    // 表示名変更APIのJSON本文
    const payload = await readJson(
        response,
        "表示名の変更に失敗しました",
    ) as {displayName?: unknown}

    // サーバーが前後の空白を除いた値を返すため、画面にはその値を表示する
    if (typeof payload.displayName !== "string") {
        throw createAuthApiError("表示名の変更に失敗しました")
    }

    return payload.displayName
}

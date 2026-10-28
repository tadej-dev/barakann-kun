// JSON本文からAuth.jsのCSRFトークンを取り出す
export function parseCsrfToken(payload: unknown): string | null {
    if (
        typeof payload !== "object" ||
        payload === null
    ) {
        return null
    }

    const token = (payload as Record<string, unknown>).csrfToken

    return typeof token === "string" && token.length > 0
        ? token
        : null
}


// リクエストCookieから指定名の値を取り出す
function readCookie(cookieHeader: string, name: string): string | null {
    for (const item of cookieHeader.split(";")) {
        const separatorIndex = item.indexOf("=")

        if (separatorIndex === -1) {
            continue
        }

        const cookieName = item.slice(0, separatorIndex).trim()

        if (cookieName !== name) {
            continue
        }

        return item.slice(separatorIndex + 1).trim()
    }

    return null
}

// リクエストのスキームに応じたAuth.jsのCSRF Cookie名を返す。
//
// HTTPSではAuth.jsは __Host- 接頭辞のCookieだけを発行する。__Host- は
// 「Secure・Path=/・Domain属性なし」を条件とするため、同じ登録ドメイン配下の
// 別サブドメインからは発行できない。接頭辞なしの同名Cookieを候補に入れると、
// サブドメインから差し込まれた値が先に採用され、この保護が効かなくなる。
// そのためHTTPSでは __Host- だけを読み、接頭辞なしの名前はHTTP(ローカル開発)
// のときだけ読む。__Secure- は接頭辞だけでは発行元を制限できないため候補にしない。
function csrfCookieName(request: Request): string {
    const isHttps = new URL(request.url).protocol === "https:"

    return isHttps ? "__Host-authjs.csrf-token" : "authjs.csrf-token"
}

// Auth.jsのCSRF Cookieに保存されるトークンとハッシュを検証
export async function verifyCsrfToken(
    request: Request,
    secret: string | undefined,
    requestToken: string,
): Promise<boolean> {
    // 秘密鍵がない状態ではCSRF検証を成立させない
    if (!secret) {
        return false
    }

    const cookieHeader = request.headers.get("cookie") ?? ""
    const cookieValue = readCookie(cookieHeader, csrfCookieName(request))

    if (!cookieValue) {
        return false
    }

    try {
        // Cookieに保存されたトークン本体とハッシュを分けて検証する
        const decodedCookieValue = decodeURIComponent(cookieValue)
        const [cookieToken, cookieHash] = decodedCookieValue.split("|")

        if (!cookieToken || !cookieHash || cookieToken !== requestToken) {
            return false
        }

        // Auth.jsと同じ入力からハッシュを再計算して改ざんを検出する
        const data = new TextEncoder().encode(`${cookieToken}${secret}`)
        const digest = await crypto.subtle.digest("SHA-256", data)
        const expectedHash = Array.from(
            new Uint8Array(digest),
            (byte) => byte.toString(16).padStart(2, "0"),
        ).join("")

        return cookieHash === expectedHash
    } catch {
        // 壊れたCookieや不正なエンコードは検証失敗として扱う
        return false
    }
}

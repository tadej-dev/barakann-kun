// JSON本文からAuth.jsのCSRFトークンを取り出す
export function parseCsrfToken(payload: unknown): string | null {
    // オブジェクト以外やnullはトークンを取り出せないため失敗
    if (
        typeof payload !== "object" ||
        payload === null
    ) {
        return null
    }

    // 本文に含まれるCSRFトークン
    const token = (payload as Record<string, unknown>).csrfToken

    return typeof token === "string" && token.length > 0
        ? token
        : null
}


// リクエストCookieから指定名の値を取り出す
function readCookie(cookieHeader: string, name: string): string | null {
    for (const item of cookieHeader.split(";")) {
        // Cookie要素内の名前と値の区切り位置
        const separatorIndex = item.indexOf("=")

        // 区切り文字の無いCookie要素は名前と値に分解できないため読み飛ばす
        if (separatorIndex === -1) {
            continue
        }

        // 区切り位置より前のCookie名
        const cookieName = item.slice(0, separatorIndex).trim()

        // 名前が一致しないCookieは対象外
        if (cookieName !== name) {
            continue
        }

        return item.slice(separatorIndex + 1).trim()
    }

    return null
}

// リクエストのスキームに応じたAuth.jsのCSRF Cookie名を返す
function csrfCookieName(request: Request): string {
    // __Host-はSecure・Path=/・Domain属性なしが条件で、別サブドメインから発行できない
    // 接頭辞なしの同名CookieをHTTPSで候補にすると、サブドメインから差し込まれた値が優先される
    // __Secure-は接頭辞だけでは発行元を制限できないため候補にしない
    // リクエストがHTTPSかどうか
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

    // リクエストのCookieヘッダー値（未設定は空文字）
    const cookieHeader = request.headers.get("cookie") ?? ""
    // Auth.jsのCSRF Cookieの値
    const cookieValue = readCookie(cookieHeader, csrfCookieName(request))

    // CSRF Cookieが無い場合は照合できないため失敗
    if (!cookieValue) {
        return false
    }

    try {
        // Cookieに保存されたトークン本体とハッシュを分けて検証
        // URLデコードしたCSRF Cookieの値
        const decodedCookieValue = decodeURIComponent(cookieValue)
        // Cookie内のトークン本体と改ざん検証用ハッシュ
        const [cookieToken, cookieHash] = decodedCookieValue.split("|")

        // トークン・ハッシュの欠落やトークン不一致は失敗
        if (!cookieToken || !cookieHash || cookieToken !== requestToken) {
            return false
        }

        // Auth.jsと同じ入力からハッシュを再計算して改ざんを検出
        // ハッシュ計算の入力（トークンと秘密鍵の連結）
        const data = new TextEncoder().encode(`${cookieToken}${secret}`)
        // SHA-256で計算したダイジェスト
        const digest = await crypto.subtle.digest("SHA-256", data)
        // 16進数文字列へ変換したハッシュの期待値
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

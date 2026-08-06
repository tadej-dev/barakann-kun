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

// Auth.jsのCSRF Cookieに保存されるトークンとハッシュを検証
export async function verifyCsrfToken(
    request: Request,
    secret: string | undefined,
    requestToken: string,
): Promise<boolean> {
    if (!secret) {
        return false
    }

    const cookieHeader = request.headers.get("cookie") ?? ""
    const cookieNames = [
        "authjs.csrf-token",
        "__Host-authjs.csrf-token",
        "__Secure-authjs.csrf-token",
    ]
    const cookieValue = cookieNames
        .map((name) => readCookie(cookieHeader, name))
        .find((value): value is string => Boolean(value))

    if (!cookieValue) {
        return false
    }

    try {
        const decodedCookieValue = decodeURIComponent(cookieValue)
        const [cookieToken, cookieHash] = decodedCookieValue.split("|")

        if (!cookieToken || !cookieHash || cookieToken !== requestToken) {
            return false
        }

        const data = new TextEncoder().encode(`${cookieToken}${secret}`)
        const digest = await crypto.subtle.digest("SHA-256", data)
        const expectedHash = Array.from(
            new Uint8Array(digest),
            (byte) => byte.toString(16).padStart(2, "0"),
        ).join("")

        return cookieHash === expectedHash
    } catch {
        return false
    }
}


import {describe, expect, it} from "vitest"

import {verifyCsrfToken} from "../src/auth/csrf"
import {isJsonContentType} from "../src/routes/route-helpers"

const SECRET = "test-secret"
const TOKEN = "csrf-token-value"

// Auth.jsと同じ手順で、Cookieへ保存される「トークン|ハッシュ」を作る
async function createCookieValue(token: string, secret: string) {
    const data = new TextEncoder().encode(`${token}${secret}`)
    const digest = await crypto.subtle.digest("SHA-256", data)
    const hash = Array.from(
        new Uint8Array(digest),
        (byte) => byte.toString(16).padStart(2, "0"),
    ).join("")

    return `${token}|${hash}`
}

function createRequest(url: string, cookies: string[]) {
    return new Request(url, {
        headers: {cookie: cookies.join("; ")},
    })
}

describe("verifyCsrfToken", () => {
    it("HTTPSでは__Host- Cookieで検証する", async () => {
        const value = await createCookieValue(TOKEN, SECRET)
        const request = createRequest("https://example.com/api/saved-builds", [
            `__Host-authjs.csrf-token=${encodeURIComponent(value)}`,
        ])

        await expect(verifyCsrfToken(request, SECRET, TOKEN)).resolves.toBe(true)
    })

    // サブドメインから差し込める接頭辞なしCookieを、HTTPSで読んではならない。
    it("HTTPSでは接頭辞なしCookieを読まない", async () => {
        const value = await createCookieValue(TOKEN, SECRET)
        const request = createRequest("https://example.com/api/saved-builds", [
            `authjs.csrf-token=${encodeURIComponent(value)}`,
        ])

        await expect(verifyCsrfToken(request, SECRET, TOKEN)).resolves.toBe(false)
    })

    it("HTTPSでは__Host- Cookieを接頭辞なしCookieより優先する", async () => {
        const validValue = await createCookieValue(TOKEN, SECRET)
        const request = createRequest("https://example.com/api/saved-builds", [
            `authjs.csrf-token=${encodeURIComponent("injected|invalid")}`,
            `__Host-authjs.csrf-token=${encodeURIComponent(validValue)}`,
        ])

        await expect(verifyCsrfToken(request, SECRET, TOKEN)).resolves.toBe(true)
    })

    // __Secure- は接頭辞だけでは発行元を制限できないため候補にしない。
    it("HTTPSでは__Secure- Cookieを読まない", async () => {
        const value = await createCookieValue(TOKEN, SECRET)
        const request = createRequest("https://example.com/api/saved-builds", [
            `__Secure-authjs.csrf-token=${encodeURIComponent(value)}`,
        ])

        await expect(verifyCsrfToken(request, SECRET, TOKEN)).resolves.toBe(false)
    })

    it("HTTPでは接頭辞なしCookieで検証する", async () => {
        const value = await createCookieValue(TOKEN, SECRET)
        const request = createRequest("http://localhost:8787/api/saved-builds", [
            `authjs.csrf-token=${encodeURIComponent(value)}`,
        ])

        await expect(verifyCsrfToken(request, SECRET, TOKEN)).resolves.toBe(true)
    })

    it("HTTPでは__Host- Cookieを読まない", async () => {
        const value = await createCookieValue(TOKEN, SECRET)
        const request = createRequest("http://localhost:8787/api/saved-builds", [
            `__Host-authjs.csrf-token=${encodeURIComponent(value)}`,
        ])

        await expect(verifyCsrfToken(request, SECRET, TOKEN)).resolves.toBe(false)
    })

    it("本文のトークンがCookieと違えば失敗する", async () => {
        const value = await createCookieValue(TOKEN, SECRET)
        const request = createRequest("https://example.com/api/saved-builds", [
            `__Host-authjs.csrf-token=${encodeURIComponent(value)}`,
        ])

        await expect(
            verifyCsrfToken(request, SECRET, "another-token"),
        ).resolves.toBe(false)
    })

    it("秘密鍵が無ければ失敗する", async () => {
        const request = createRequest("https://example.com/api/saved-builds", [])

        await expect(verifyCsrfToken(request, undefined, TOKEN)).resolves.toBe(false)
    })
})

describe("isJsonContentType", () => {
    it("application/jsonとcharset付きを受け付ける", () => {
        expect(isJsonContentType("application/json")).toBe(true)
        expect(isJsonContentType("Application/JSON; charset=utf-8")).toBe(true)
    })

    // フォーム送信・text/plainはクロスサイトから送信できるため受け付けない。
    it("JSON以外のContent-Typeは受け付けない", () => {
        expect(isJsonContentType("application/x-www-form-urlencoded")).toBe(false)
        expect(isJsonContentType("multipart/form-data; boundary=x")).toBe(false)
        expect(isJsonContentType("text/plain")).toBe(false)
        expect(isJsonContentType(null)).toBe(false)
    })
})

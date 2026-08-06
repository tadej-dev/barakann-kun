import {afterEach, describe, expect, it, vi} from "vitest"

import {
    deleteAccount,
    fetchAuthSession,
    logout,
} from "@/features/auth/authApi"

describe("authApi", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("未ログイン状態を取得する", async () => {
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            authenticated: false,
            user: null,
        }), {
            headers: {"content-type": "application/json"},
        }))
        vi.stubGlobal("fetch", fetchMock)

        await expect(fetchAuthSession()).resolves.toEqual({
            authenticated: false,
            user: null,
        })
    })

    it("ログイン済みユーザーを取得する", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            authenticated: true,
            user: {
                id: "user-1",
                displayName: "Test User",
                email: "test@example.com",
                image: null,
            },
        }), {
            headers: {"content-type": "application/json"},
        })))

        await expect(fetchAuthSession()).resolves.toEqual({
            authenticated: true,
            user: {
                id: "user-1",
                displayName: "Test User",
                email: "test@example.com",
                image: null,
            },
        })
    })

    it("APIの認証設定エラーを画面表示用メッセージへ変換する", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            error: {
                code: "AUTH_NOT_CONFIGURED",
                message:
                    "認証設定が未完了です。api/.dev.varsにAUTH_SECRETを設定してください。",
            },
        }), {
            status: 503,
            headers: {"content-type": "application/json"},
        })))

        await expect(fetchAuthSession()).rejects.toThrow(
            "認証設定が未完了です。api/.dev.varsにAUTH_SECRETを設定してください。",
        )
    })

    it("CSRFトークンを使ってログアウトする", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({
                csrfToken: "csrf-token",
            }), {
                headers: {"content-type": "application/json"},
            }))
            .mockResolvedValueOnce(new Response(null, {status: 204}))
        vi.stubGlobal("fetch", fetchMock)

        await expect(logout()).resolves.toBeUndefined()

        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "/api/auth/logout",
            expect.objectContaining({
                method: "POST",
                body: "csrfToken=csrf-token&callbackUrl=%2Fapi%2Fauth%2Fsession",
            }),
        )
    })

    it("CSRFトークンを使ってアカウントを削除する", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({
                csrfToken: "csrf-token",
            }), {
                headers: {"content-type": "application/json"},
            }))
            .mockResolvedValueOnce(new Response(null, {status: 204}))
        vi.stubGlobal("fetch", fetchMock)

        await expect(deleteAccount()).resolves.toBeUndefined()

        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "/api/account",
            expect.objectContaining({
                method: "DELETE",
                body: JSON.stringify({csrfToken: "csrf-token"}),
            }),
        )
    })
})

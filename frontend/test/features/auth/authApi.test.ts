import {afterEach, describe, expect, it, vi} from "vitest"

import {
    deleteAccount,
    fetchAuthSession,
    logout,
    startGoogleLogin,
    updateDisplayName,
} from "@/features/auth/authApi"

// セッション取得とCSRF付きのログイン・ログアウト・アカウント削除を確認
describe("authApi", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    // セッションなしはエラーではなく、認証済みfalseとしてUIへ渡す
    it("未ログイン状態を取得する", async () => {
        // 未ログインのセッションを返すモック
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

    // セッションからはIDと表示名だけを保持し、メールアドレスや画像は受け取っても残さない
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
            },
        })
    })

    // Auth.jsの設定不足は、スタックトレースではなく利用者向けメッセージに変換
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

    // Googleログイン開始前にCSRFを取得し、Auth.jsへ安全な戻り先を渡す
    it("CSRFトークン付きPOSTでGoogleログインURLを取得する", async () => {
        // CSRF取得とログインURL取得の応答を順に返すモック
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({
                csrfToken: "csrf-token",
            }), {
                headers: {"content-type": "application/json"},
            }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                url: "https://accounts.google.com/o/oauth2/v2/auth?...",
            }), {
                headers: {"content-type": "application/json"},
            }))
        vi.stubGlobal("fetch", fetchMock)

        await expect(startGoogleLogin("/simulator")).resolves.toBe(
            "https://accounts.google.com/o/oauth2/v2/auth?...",
        )

        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "/api/auth/signin/google",
            expect.objectContaining({
                method: "POST",
                credentials: "same-origin",
                headers: expect.objectContaining({
                    "X-Auth-Return-Redirect": "1",
                }),
                body: "csrfToken=csrf-token&callbackUrl=%2Fsimulator",
            }),
        )
    })

    // ログアウトもGETではなくCSRF付きPOSTでセッションを終了
    it("CSRFトークンを使ってログアウトする", async () => {
        // CSRF取得とログアウトの応答を順に返すモック
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

    // アカウント削除は確認ダイアログから呼ばれる破壊的操作としてCSRFを要求
    it("CSRFトークンを使ってアカウントを削除する", async () => {
        // CSRF取得とアカウント削除の応答を順に返すモック
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

    // 表示名の変更は、CSRFトークンを付けて送り、サーバーが保存した値を返す
    it("CSRFトークンを使って表示名を変更する", async () => {
        // CSRF取得と表示名変更の応答を順に返すモック
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({
                csrfToken: "csrf-token",
            }), {
                headers: {"content-type": "application/json"},
            }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                displayName: "サイクリスト",
            }), {
                headers: {"content-type": "application/json"},
            }))
        vi.stubGlobal("fetch", fetchMock)

        await expect(updateDisplayName("サイクリスト")).resolves.toBe("サイクリスト")

        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "/api/account",
            expect.objectContaining({
                method: "PATCH",
                body: JSON.stringify({
                    csrfToken: "csrf-token",
                    displayName: "サイクリスト",
                }),
            }),
        )
    })

    // 入力エラーは、サーバーのメッセージを加工せずダイアログに出せる形で返す
    it("表示名の入力エラーをメッセージとして返す", async () => {
        // CSRF取得と入力エラーの応答を順に返すモック
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({
                csrfToken: "csrf-token",
            }), {
                headers: {"content-type": "application/json"},
            }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                error: {
                    code: "INVALID_DISPLAY_NAME",
                    message: "表示名は1〜100文字で入力してください",
                },
            }), {
                status: 400,
                headers: {"content-type": "application/json"},
            }))
        vi.stubGlobal("fetch", fetchMock)

        await expect(updateDisplayName("")).rejects.toThrow(
            "表示名は1〜100文字で入力してください",
        )
    })
})

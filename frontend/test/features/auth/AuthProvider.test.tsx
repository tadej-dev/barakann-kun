// @vitest-environment jsdom

import {act, cleanup, fireEvent, render, screen} from "@testing-library/react"
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"

import {AuthProvider} from "@/features/auth/AuthProvider"
import {useAuth} from "@/features/auth/useAuth"

// 認証APIを差し替え、ログアウトの成否だけを検証する
const {logoutApi} = vi.hoisted(() => ({logoutApi: vi.fn()}))

// 各テストで使うAPIの最小限の実装

vi.mock("@/features/auth/authApi", () => ({
    deleteAccount: vi.fn(),
    fetchAuthSession: vi.fn(async () => ({
        authenticated: false,
        user: null,
    })),
    getCurrentCallbackUrl: vi.fn(() => "/"),
    login: vi.fn(),
    logout: logoutApi,
    startGoogleLogin: vi.fn(),
    updateDisplayName: vi.fn(),
}))

// ログアウトの戻り値を画面に出すだけの確認用コンポーネント
function Probe() {
    const {logout} = useAuth()

    return (
        <button
            type="button"
            onClick={() => {
                void logout().then((ok) => {
                    document.title = ok ? "ok" : "failed"
                })
            }}
        >
            ログアウト
        </button>
    )
}

describe("AuthProvider", () => {
    beforeEach(() => {
        // 前のテストの呼び出し履歴を消す
        logoutApi.mockReset()
    })

    afterEach(() => {
        cleanup()
        document.title = ""
    })

    // 成功したときはtrueを返す
    it("ログアウト成功時はtrueを返す", async () => {
        logoutApi.mockResolvedValue(undefined)
        render(<AuthProvider><Probe /></AuthProvider>)

        await act(async () => {
            fireEvent.click(screen.getByRole("button", {name: "ログアウト"}))
        })

        expect(document.title).toBe("ok")
    })

    // 失敗したときはfalseを返す
    it("ログアウト失敗時はfalseを返す", async () => {
        logoutApi.mockRejectedValue(new Error("failed"))
        render(<AuthProvider><Probe /></AuthProvider>)

        await act(async () => {
            fireEvent.click(screen.getByRole("button", {name: "ログアウト"}))
        })

        expect(document.title).toBe("failed")
    })
})

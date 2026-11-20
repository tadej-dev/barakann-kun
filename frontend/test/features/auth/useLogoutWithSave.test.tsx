// @vitest-environment jsdom

import {act, cleanup, renderHook, waitFor} from "@testing-library/react"
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"

import {
    AUTH_LOGOUT_FLUSH_EVENT,
    type LogoutFlushDetail,
} from "@/features/auth/authEvents"
import {useLogoutWithSave} from "@/features/auth/useLogoutWithSave"
import {loadLocalOrigin} from "@/lib/local-config-sync"
import {loadLocalConfigCollection} from "@/lib/simulator-storage"

// useAuthを差し替え、ログアウトが呼ばれたかだけを見る
const {logoutMock} = vi.hoisted(() => ({logoutMock: vi.fn()}))

vi.mock("@/features/auth/useAuth", () => ({
    useAuth: () => ({
        user: {id: "user-1", displayName: "テスト"},
        logout: logoutMock,
    }),
}))

// 自動保存の確定依頼に、指定した結果で応答する
function respondToFlush(ok: boolean) {
    window.addEventListener(AUTH_LOGOUT_FLUSH_EVENT, (event) => {
        const detail = (event as CustomEvent<LogoutFlushDetail>).detail

        detail.handled = true
        detail.respond(ok)
    }, {once: true})
}

// ログアウト保存で取得するAPIを空データで返す
function stubFetch() {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)

        if (url.includes("/api/config-order")) {
            return new Response(JSON.stringify({items: ["config:1"]}), {
                status: 200,
                headers: {"content-type": "application/json"},
            })
        }

        if (url.includes("/api/builds")) {
            return new Response(JSON.stringify([{
                id: "c1",
                name: "保存済み",
                version: 1,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
                parts: [],
            }]), {
                status: 200,
                headers: {"content-type": "application/json"},
            })
        }

        return new Response(JSON.stringify([]), {
            status: 200,
            headers: {"content-type": "application/json"},
        })
    }))
}

describe("useLogoutWithSave", () => {
    beforeEach(() => {
        logoutMock.mockReset()
        window.localStorage.clear()
    })

    afterEach(() => {
        cleanup()
        vi.unstubAllGlobals()
    })

    // 自動保存を確定できなければ、ログアウトしない
    it("自動保存を確定できないときはログアウトしない", async () => {
        respondToFlush(false)
        const {result} = renderHook(() => useLogoutWithSave())

        act(() => {
            void result.current.saveAndLogout()
        })

        await waitFor(() => {
            expect(result.current.status).toBe("failed")
        })
        expect(result.current.errorMessage)
            .toContain("自動保存を確定できませんでした")
        expect(logoutMock).not.toHaveBeenCalled()
    })

    // 保存できたらログアウトする
    it("保存できたらログアウトする", async () => {
        stubFetch()
        respondToFlush(true)
        const {result} = renderHook(() => useLogoutWithSave())

        act(() => {
            void result.current.saveAndLogout()
        })

        await waitFor(() => {
            expect(logoutMock).toHaveBeenCalledTimes(1)
        })
        expect(result.current.status).toBe("idle")
        // 構成と由来がブラウザへ保存されている
        expect(loadLocalConfigCollection().configs[0]?.name).toBe("保存済み")
        expect(loadLocalOrigin()).toBe("user-1")
    })

    // 自動保存がマウントされていない画面では、保留が無いものとして進む
    it("自動保存が無い画面でもログアウトできる", async () => {
        stubFetch()
        const {result} = renderHook(() => useLogoutWithSave())

        act(() => {
            void result.current.saveAndLogout()
        })

        await waitFor(() => {
            expect(logoutMock).toHaveBeenCalledTimes(1)
        })
        expect(result.current.status).toBe("idle")
    })

    // キャンセルした後は、完了イベントが来てもログアウトしない
    it("キャンセル後はログアウトしない", async () => {
        stubFetch()
        respondToFlush(true)
        const {result} = renderHook(() => useLogoutWithSave())

        act(() => {
            void result.current.saveAndLogout()
        })
        act(() => {
            result.current.cancel()
        })

        await act(async () => {
            await Promise.resolve()
        })

        expect(logoutMock).not.toHaveBeenCalled()
        expect(result.current.status).toBe("idle")
    })
})

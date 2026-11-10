// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {cleanup, fireEvent, render, screen, within} from "@testing-library/react"
import {MemoryRouter} from "react-router"

import {Header} from "@/components/layout/Header"
import {useAuth} from "@/features/auth/useAuth"
import type {AuthContextValue} from "@/features/auth/authContext"

// テストごとに描画したDOMを破棄し、次のテストへ持ち越さない
afterEach(cleanup)

// 認証状態はContextから供給されるため、フックを差し替えて状態ごとの表示を確かめる
vi.mock("@/features/auth/useAuth", () => ({
    useAuth: vi.fn(),
}))

// アカウントメニューはbase-uiのポップアップで、テストではクリックで開いて項目を選べる。
const mockedUseAuth = vi.mocked(useAuth)

// 認証Contextの値を、必要な項目だけ差し替えて作る
function createAuthValue(
    overrides: Partial<AuthContextValue> = {},
): AuthContextValue {
    return {
        status: "unauthenticated",
        user: null,
        errorMessage: null,
        isDeletingAccount: false,
        isLoggingOut: false,
        deleteAccount: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        refreshSession: vi.fn(),
        updateDisplayName: vi.fn(),
        ...overrides,
    }
}

function renderHeader(value: AuthContextValue = createAuthValue()) {
    mockedUseAuth.mockReturnValue(value)

    return render(
        <MemoryRouter>
            <Header />
        </MemoryRouter>,
    )
}

// 各テストで差し替えた認証状態を戻す
beforeEach(() => {
    mockedUseAuth.mockReset()
    mockedUseAuth.mockReturnValue(createAuthValue())
})

describe("Header", () => {
    // 認証確認が終わるまでは、ログインボタンを一瞬出さない。
    it("認証状態の確認中は待機表示だけを出す", () => {
        renderHeader(createAuthValue({status: "loading"}))

        expect(screen.getByText("認証状態を確認中…")).toBeTruthy()
        expect(screen.queryByText("Googleでログイン")).toBeNull()
    })

    // 未ログインでは、ログインへ進むボタンを出す。
    it("未ログインのときはログインボタンを表示する", () => {
        renderHeader()

        expect(screen.getByText("Googleでログイン")).toBeTruthy()
        // 待機表示とは排他にする。
        expect(screen.queryByText("認証状態を確認中…")).toBeNull()
    })

    // ログイン操作は、認証の入口へつなぐ。
    it("ログインボタンのクリックでログインを開始する", () => {
        const login = vi.fn()
        renderHeader(createAuthValue({login}))

        // 表示しただけでは呼ばない。
        expect(login).not.toHaveBeenCalled()

        fireEvent.click(screen.getByText("Googleでログイン"))

        expect(login).toHaveBeenCalledTimes(1)
    })

    // 認証エラーでも、再試行できるようログイン導線と理由を残す。
    it("認証エラーのときはログイン導線とエラーを表示する", () => {
        renderHeader(createAuthValue({
            status: "error",
            errorMessage: "セッションの取得に失敗しました",
        }))

        expect(screen.getByRole("alert").textContent).toContain(
            "セッションの取得に失敗しました",
        )
        expect(screen.getByText("Googleでログイン")).toBeTruthy()
        // 待機表示は出さない。
        expect(screen.queryByText("認証状態を確認中…")).toBeNull()
    })

    // ログイン済みでは、表示名とアカウントのメニューへ切り替える。
    it("ログイン済みのときは表示名とアカウントメニューを表示する", () => {
        renderHeader(createAuthValue({
            status: "authenticated",
            user: {id: "user-1", displayName: "テスト 太郎"},
        }))

        const menuButton = screen.getByRole("button", {
            name: "アカウントメニューを開く",
        })

        // 表示名と、その頭文字（アバターのフォールバック）を出す。
        expect(within(menuButton).getByText("テ太")).toBeTruthy()
        expect(screen.getByText("テスト 太郎")).toBeTruthy()
        // ログイン導線とは排他にする。
        expect(screen.queryByText("Googleでログイン")).toBeNull()
        expect(screen.queryByText("認証状態を確認中…")).toBeNull()
    })

    // 半角英字の名前は、頭文字を大文字にそろえる。
    it("英字の表示名は大文字の頭文字にする", () => {
        renderHeader(createAuthValue({
            status: "authenticated",
            user: {id: "user-2", displayName: "taro yamada"},
        }))

        expect(
            within(screen.getByRole("button", {
                name: "アカウントメニューを開く",
            })).getByText("TY"),
        ).toBeTruthy()
    })

    // 頭文字は2文字までにそろえる（3語名でも増やさない）。
    it("3語の表示名でも頭文字は2文字までにする", () => {
        renderHeader(createAuthValue({
            status: "authenticated",
            user: {id: "user-4", displayName: "John Ronald Reuel"},
        }))

        expect(
            within(screen.getByRole("button", {
                name: "アカウントメニューを開く",
            })).getByText("JR"),
        ).toBeTruthy()
    })

    // 表示名が空でも、アバターのフォールバックを出す。
    it("表示名が空のときは既定の頭文字を表示する", () => {
        renderHeader(createAuthValue({
            status: "authenticated",
            user: {id: "user-3", displayName: ""},
        }))

        expect(
            within(screen.getByRole("button", {
                name: "アカウントメニューを開く",
            })).getByText("U"),
        ).toBeTruthy()
    })

    // 処理中はメニューの操作を止め、二重送信を防ぐ。
    it("ログアウト中はメニューの項目をすべて操作できない", async () => {
        renderHeader(createAuthValue({
            status: "authenticated",
            user: {id: "user-1", displayName: "テスト 太郎"},
            isLoggingOut: true,
        }))

        fireEvent.click(
            screen.getByRole("button", {name: "アカウントメニューを開く"}),
        )

        // 処理中はラベルも変わり、3項目とも操作できない。
        for (const label of ["表示名を変更", "ログアウト中…", "アカウントを削除"]) {
            expect(
                (await screen.findByText(label)).closest("[role='menuitem']")
                    ?.getAttribute("aria-disabled"),
            ).toBe("true")
        }
    })

    // 削除処理中も、他の操作を止める。
    it("削除処理中はメニューの項目を操作できない", async () => {
        renderHeader(createAuthValue({
            status: "authenticated",
            user: {id: "user-1", displayName: "テスト 太郎"},
            isDeletingAccount: true,
        }))

        fireEvent.click(
            screen.getByRole("button", {name: "アカウントメニューを開く"}),
        )

        expect(
            (await screen.findByText("アカウントを削除")).closest("[role='menuitem']")
                ?.getAttribute("aria-disabled"),
        ).toBe("true")
    })

    // アカウントメニューを開き、ログアウトを実行できる。
    it("アカウントメニューからログアウトできる", async () => {
        const logout = vi.fn()
        renderHeader(createAuthValue({
            status: "authenticated",
            user: {id: "user-1", displayName: "テスト 太郎"},
            logout,
        }))

        fireEvent.click(
            screen.getByRole("button", {name: "アカウントメニューを開く"}),
        )
        fireEvent.click(await screen.findByText("ログアウト"))

        expect(logout).toHaveBeenCalledTimes(1)
    })

    // ログイン済みでも操作に失敗したときは、理由を添えて知らせる。
    it("ログイン済みでエラーがあるときは理由を添えて表示する", () => {
        renderHeader(createAuthValue({
            status: "authenticated",
            user: {id: "user-1", displayName: "テスト 太郎"},
            errorMessage: "ログアウトに失敗しました",
        }))

        expect(screen.getByRole("alert").textContent).toContain(
            "ログアウトに失敗しました",
        )
        expect(
            screen.getByRole("button", {name: "アカウントメニューを開く"}),
        ).toBeTruthy()
    })

    // エラーが無いときは、警告の領域そのものを出さない。
    it("エラーが無いときは警告を表示しない", () => {
        renderHeader(createAuthValue({
            status: "authenticated",
            user: {id: "user-1", displayName: "テスト 太郎"},
        }))

        expect(screen.queryByRole("alert")).toBeNull()
    })

    // 認証済みでも利用者が取れない場合は、アカウントの表示を出さない。
    it("認証済みでも利用者が無いときはアカウント表示を出さない", () => {
        renderHeader(createAuthValue({status: "authenticated", user: null}))

        expect(
            screen.queryByRole("button", {name: "アカウントメニューを開く"}),
        ).toBeNull()
        // 未ログイン向けの導線も出さない（状態は認証済みのため）。
        expect(screen.queryByText("Googleでログイン")).toBeNull()
        // 待機表示にも戻さない。
        expect(screen.queryByText("認証状態を確認中…")).toBeNull()
    })
})

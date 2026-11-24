// @vitest-environment jsdom

import {cleanup, render, screen} from "@testing-library/react"
import {afterEach, describe, expect, it, vi} from "vitest"
import {MemoryRouter} from "react-router"

import App from "@/App"

// ヘッダーが認証Providerを要求するため、未ログイン状態を差し替える
vi.mock("@/features/auth/useAuth", () => ({
    useAuth: () => ({
        deleteAccount: vi.fn(),
        errorMessage: "",
        isDeletingAccount: false,
        isLoggingOut: false,
        login: vi.fn(),
        logout: vi.fn(async () => true),
        status: "unauthenticated",
        updateDisplayName: vi.fn(),
        user: null,
    }),
}))

// テストごとに描画したDOMを破棄
afterEach(cleanup)

// 使い方ページのルート表示を保証
describe("App", () => {
    // 使い方ページのルートが表示される
    it("/guide で使い方ページを表示する", () => {
        render(
            <MemoryRouter initialEntries={["/guide"]}>
                <App />
            </MemoryRouter>,
        )

        expect(screen.getByRole("heading", {name: "使い方"})).toBeTruthy()
    })
})

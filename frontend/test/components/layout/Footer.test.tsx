// @vitest-environment jsdom
import {afterEach, describe, expect, it} from "vitest"
import {cleanup, render, screen, within} from "@testing-library/react"
import {MemoryRouter} from "react-router"

import {Footer} from "@/components/layout/Footer"

// テストごとに描画したDOMを破棄し、次のテストへ持ち越さない
afterEach(cleanup)

// フッターのリンク先とナビゲーションのまとまりを保証
describe("Footer", () => {
    // 使い方・利用規約・プライバシーポリシーのリンク先が正しいことを確認
    it("各ページへのリンク先を設定する", () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        )

        expect(
            screen.getByText("使い方").closest("a")?.getAttribute("href"),
        ).toBe("/guide")
        expect(
            screen.getByText("利用規約").closest("a")?.getAttribute("href"),
        ).toBe("/terms")
        expect(
            screen.getByText("プライバシーポリシー").closest("a")?.getAttribute("href"),
        ).toBe("/privacy")
    })

    // リンクはナビゲーションとしてまとめ、支援技術からも辿れるようにする
    it("リンクをナビゲーションとしてまとめる", () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        )

        // フッター内のナビゲーション領域
        const nav = screen.getByRole("navigation", {
            name: "フッターナビゲーション",
        })

        expect(within(nav).getAllByRole("link")).toHaveLength(3)
    })
})

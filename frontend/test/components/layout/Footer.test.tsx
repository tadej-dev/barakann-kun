// @vitest-environment jsdom
import {afterEach, describe, expect, it} from "vitest"
import {cleanup, render, screen, within} from "@testing-library/react"
import {MemoryRouter} from "react-router"

import {Footer} from "@/components/layout/Footer"

// テストごとに描画したDOMを破棄し、次のテストへ持ち越さない
afterEach(cleanup)

describe("Footer", () => {
    // 利用規約・プライバシーポリシーのリンク先が正しいことを確認する。
    it("規約ページへのリンク先を設定する", () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        )

        expect(
            screen.getByText("利用規約").closest("a")?.getAttribute("href"),
        ).toBe("/terms")
        expect(
            screen.getByText("プライバシーポリシー").closest("a")?.getAttribute("href"),
        ).toBe("/privacy")
    })

    // リンクはナビゲーションとしてまとめ、支援技術からも辿れるようにする。
    it("リンクをナビゲーションとしてまとめる", () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        )

        const nav = screen.getByRole("navigation", {
            name: "フッターナビゲーション",
        })

        expect(within(nav).getAllByRole("link")).toHaveLength(2)
    })
})

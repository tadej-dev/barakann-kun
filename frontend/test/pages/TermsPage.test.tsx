// @vitest-environment jsdom

import {cleanup, render, screen} from "@testing-library/react"
import {afterEach, describe, expect, it} from "vitest"

import {TermsPage} from "@/pages/TermsPage"

// テストごとに描画したDOMを破棄
afterEach(cleanup)

// 利用規約ページの見出しと補助見出しの読みやすさを保証
describe("TermsPage", () => {
    // 補助見出しは、明るい背景でもコントラスト比を満たす色にする
    it("補助見出しに読み取りやすい色を使う", () => {
        render(<TermsPage />)

        expect(
            screen.getByRole("heading", {name: "利用規約", level: 1}),
        ).toBeTruthy()
        // 背景色#f8fafcに対してコントラスト比4.5以上になる色
        expect(screen.getByText("Terms of Service").className)
            .toContain("text-sky-700")
    })
})

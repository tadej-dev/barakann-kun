// @vitest-environment jsdom

import {cleanup, render, screen} from "@testing-library/react"
import {afterEach, describe, expect, it} from "vitest"

import {PrivacyPage} from "@/pages/PrivacyPage"

// テストごとに描画したDOMを破棄
afterEach(cleanup)

// プライバシーポリシーページの見出しと補助見出しの読みやすさを保証
describe("PrivacyPage", () => {
    // 補助見出しは、明るい背景でもコントラスト比を満たす色にする
    it("補助見出しに読み取りやすい色を使う", () => {
        render(<PrivacyPage />)

        expect(
            screen.getByRole("heading", {
                name: "プライバシーポリシー",
                level: 1,
            }),
        ).toBeTruthy()
        // 背景色#f8fafcに対してコントラスト比4.5以上になる色
        expect(screen.getByText("Privacy Policy").className)
            .toContain("text-sky-700")
    })
})

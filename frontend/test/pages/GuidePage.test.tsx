// @vitest-environment jsdom

import {cleanup, render, screen} from "@testing-library/react"
import {afterEach, describe, expect, it} from "vitest"

import {GuidePage} from "@/pages/GuidePage"

// テストごとに描画したDOMを破棄
afterEach(cleanup)

// 使い方ページの見出し・保存先・引き継ぎ説明の表示を保証
describe("GuidePage", () => {
    // 利用者向けの見出しと保存先を表示
    it("見出しと保存先を表示する", () => {
        render(<GuidePage />)

        expect(screen.getByRole("heading", {name: "使い方"})).toBeTruthy()
        expect(screen.getByText(/1台の端末を1人で使う前提/)).toBeTruthy()
        expect(screen.getByText("ブラウザ（localStorage）")).toBeTruthy()
        expect(screen.getByText("アカウント（サーバー）")).toBeTruthy()
    })

    // 引き継ぎとログアウト時の保存を説明
    it("引き継ぎとログアウト保存を説明する", () => {
        render(<GuidePage />)

        expect(screen.getByRole("heading", {name: /ログインすると/}))
            .toBeTruthy()
        expect(screen.getByRole("heading", {name: /ログアウトすると/}))
            .toBeTruthy()
        expect(screen.getByText(/最大20件/)).toBeTruthy()
        expect(screen.getByText(/約0.8秒後/)).toBeTruthy()
        expect(screen.getByText(/新規の構成（残り枠に収まる構成）が選ばれています/))
            .toBeTruthy()
        expect(screen.getByText(/アカウントの構成で置き換えます/)).toBeTruthy()
        expect(screen.getByText(/自動で再試行されます/)).toBeTruthy()
    })
})

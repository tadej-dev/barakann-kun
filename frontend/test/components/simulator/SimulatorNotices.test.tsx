// @vitest-environment jsdom

import {afterEach, describe, expect, it} from "vitest"
import {cleanup, render, screen} from "@testing-library/react"

import {SimulatorNotices} from "@/components/simulator/SimulatorNotices"

// テストごとに描画したDOMを破棄する
afterEach(cleanup)

describe("SimulatorNotices", () => {
    // エラーは再読み込みを案内する
    it("復元エラーは再読み込みを案内する", () => {
        render(
            <SimulatorNotices
                restoreError="保存済み構成の復元に失敗しました"
                restoreWarning=""
            />,
        )

        expect(screen.getByText(/復元に失敗しました/)).toBeTruthy()
        expect(screen.getByText(/ページを再読み込みしてください/)).toBeTruthy()
    })

    // 非互換の警告は保持した構成の確認を促し、再読み込みを案内しない
    it("非互換の警告は再読み込みを案内しない", () => {
        render(
            <SimulatorNotices
                restoreError=""
                restoreWarning="規格が一致しないパーツがあります。比較画面で確認してください"
            />,
        )

        expect(screen.getByText(/比較画面で確認してください/)).toBeTruthy()
        expect(screen.queryByText(/ページを再読み込みしてください/)).toBeNull()
    })

    // どちらも無ければ何も表示しない
    it("通知が無ければ何も表示しない", () => {
        const {container} = render(
            <SimulatorNotices restoreError="" restoreWarning="" />,
        )

        expect(container.textContent).toBe("")
    })
})

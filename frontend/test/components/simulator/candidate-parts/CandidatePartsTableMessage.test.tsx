// @vitest-environment jsdom
import {afterEach, describe, expect, it} from "vitest"
import {cleanup, render, screen} from "@testing-library/react"

import {CandidatePartsTableMessage} from "@/components/simulator/candidate-parts/CandidatePartsTableMessage"

// テストごとに描画したDOMを破棄し、次のテストへ持ち越さない
afterEach(cleanup)

describe("CandidatePartsTableMessage", () => {
    // メッセージ行は、通常の表と同じ列数を使ってレイアウトのずれを防ぐ。
    it("メッセージを全列にまたがって表示する", () => {
        render(<CandidatePartsTableMessage message="該当するパーツがありません" />)

        const cell = screen.getByRole("cell")

        expect(cell.textContent).toContain("該当するパーツがありません")
        expect(cell.getAttribute("colspan")).toBe("5")
        expect(screen.getAllByRole("columnheader")).toHaveLength(5)
    })

    // バリエーション列を出さないときは、見出しごと減らして列数を合わせる。
    it("バリエーション列が無いときは見出しも列数も減らす", () => {
        render(
            <CandidatePartsTableMessage
                message="読み込み中です"
                showVariantColumn={false}
            />,
        )

        expect(screen.queryByText("バリエーション")).toBeNull()
        expect(screen.getAllByRole("columnheader")).toHaveLength(4)
        expect(screen.getByRole("cell").getAttribute("colspan")).toBe("4")
    })

    // 解除ボタンなどの操作は、メッセージの下へ並べて出す。
    it("子要素の操作をメッセージと一緒に表示する", () => {
        render(
            <CandidatePartsTableMessage message="条件を変えてください">
                <button type="button">条件を解除</button>
            </CandidatePartsTableMessage>,
        )

        expect(screen.getByRole("button", {name: "条件を解除"})).toBeTruthy()
    })
})

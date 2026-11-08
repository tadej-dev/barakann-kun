// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from "vitest"
import {cleanup, fireEvent, render, screen} from "@testing-library/react"

import type {
    CandidatePartsSortDescriptor,
    CandidatePartsSortKey,
} from "@/components/simulator/candidate-parts/useCandidatePartsTable"
import {CandidatePartsTableHeader} from "@/components/simulator/candidate-parts/CandidatePartsTableHeader"

// テストごとに描画したDOMを破棄し、次のテストへ持ち越さない
afterEach(cleanup)

type HeaderOptions = {
    showVariantColumn?: boolean
    onSort?: (column: CandidatePartsSortKey) => void
}

// ヘッダーは表の一部のため、表の中に入れて描画する
function renderHeader(
    sortDescriptor: CandidatePartsSortDescriptor,
    options: HeaderOptions = {},
) {
    return render(
        <table>
            <CandidatePartsTableHeader
                sortDescriptor={sortDescriptor}
                showVariantColumn={options.showVariantColumn ?? false}
                onSort={options.onSort ?? (() => {})}
            />
        </table>,
    )
}

// 並び順アイコンの種類を、SVGのクラス名から取り出す
function sortIconClass(button: HTMLElement) {
    return button.querySelector("svg")?.getAttribute("class") ?? ""
}

describe("CandidatePartsTableHeader", () => {
    // 列見出しは表の列と一致させる。
    it("列見出しを表示する", () => {
        renderHeader({column: "brand", direction: "ascending"})

        for (const label of ["メーカー", "製品名", "重量", "価格"]) {
            expect(screen.getByText(label)).toBeTruthy()
        }
        // バリエーション列は表示が有効なときだけ出す。
        expect(screen.queryByText("バリエーション")).toBeNull()
    })

    // バリエーション列を表示する設定では、見出しも追加する。
    it("バリエーション列を表示する設定では見出しを出す", () => {
        renderHeader({column: "brand", direction: "ascending"}, {
            showVariantColumn: true,
        })

        expect(screen.getByText("バリエーション")).toBeTruthy()
    })

    // 並び順は、現在の列と昇順・降順が分かるアイコンで示す。
    it("並び順に応じたアイコンを表示する", () => {
        renderHeader({column: "brand", direction: "ascending"})

        // 並び替え中の列だけ矢印、それ以外は未選択のアイコン。
        expect(
            sortIconClass(screen.getByRole("button", {name: "メーカー"})),
        ).toContain("arrow-up")
        expect(
            sortIconClass(screen.getByRole("button", {name: "製品名"})),
        ).toContain("chevrons-up-down")
    })

    // 降順のときは下向きの矢印にする。
    it("降順のときは下向きのアイコンを表示する", () => {
        renderHeader({column: "weight", direction: "descending"})

        expect(
            sortIconClass(screen.getByRole("button", {name: "重量"})),
        ).toContain("arrow-down")
    })

    // 見出しはボタンとして押せるようにし、その列の並び替えを要求する。
    it("列見出しのクリックで並び替えを要求する", () => {
        const onSort = vi.fn()
        renderHeader({column: "brand", direction: "ascending"}, {onSort})

        fireEvent.click(screen.getByRole("button", {name: "価格"}))

        expect(onSort).toHaveBeenCalledWith("price")
    })
})

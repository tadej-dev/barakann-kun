// @vitest-environment jsdom
import {afterEach, describe, expect, it} from "vitest"
import {cleanup, fireEvent, render, screen, within} from "@testing-library/react"

import {SummaryCards} from "@/components/simulator/SummaryCards"
import {lockDragAxis} from "@/features/simulator/dragAxis"
import type {TotalsBreakdown} from "@/features/simulator/partCompatibility"

// テストごとに描画したDOMを破棄し、次のテストへ持ち越さない
afterEach(cleanup)

// テスト用の合計内訳を作る
function createBreakdown(
    overrides: Partial<TotalsBreakdown> = {},
): TotalsBreakdown {
    return {
        totalPrice: 0,
        totalWeight: 0,
        basePrice: 0,
        baseWeight: 0,
        includedItems: [],
        setComponents: [],
        excludedItems: [],
        referencePrices: [],
        ...overrides,
    }
}

// 合計金額・完成重量・選択中構成名の表示を保証
describe("SummaryCards", () => {
    // 金額と重量は、どちらのカードの値か分かる形で桁区切り付きで表示
    it("金額と重量を桁区切り付きで表示する", () => {
        render(
            <SummaryCards
                totalsBreakdown={createBreakdown({
                    totalPrice: 1234567,
                    totalWeight: 7450,
                })}
                activeConfigName="構成1"
            />,
        )

        // 値は必ず該当するカードの中に出る（金額と重量の取り違えを検出する）
        expect(
            screen.getByText("合計金額").closest('[data-slot="card"]')?.textContent,
        ).toContain("1,234,567")
        expect(
            screen.getByText("完成重量").closest('[data-slot="card"]')?.textContent,
        ).toContain("7,450")
    })

    // 金額・重量がどの構成の値か分かるよう、構成名も並べる
    it("選択中の構成名を表示する", () => {
        render(
            <SummaryCards
                totalsBreakdown={createBreakdown()}
                activeConfigName="通勤用"
            />,
        )

        expect(screen.getByText("通勤用")).toBeTruthy()
    })

    // カード自体をボタンにせず、並べ替えはカード内のボタンだけで受ける
    it("カードをボタンにせず、カード内の並べ替えボタンで操作する", () => {
        const {container} = render(
            <SummaryCards
                totalsBreakdown={createBreakdown()}
                activeConfigName="構成1"
            />,
        )

        // 並べ替え対象の最初のカード（選択中の構成）
        const item = container.querySelector<HTMLElement>(
            '[data-slot="sortable-item"]',
        ) as HTMLElement

        expect(item.getAttribute("role")).toBeNull()
        expect(item.hasAttribute("tabindex")).toBe(false)
        expect(within(item).getAllByRole("button")).toHaveLength(1)
        expect(
            within(item).getByRole("button", {
                name: "選択中の構成カードを移動",
            }),
        ).toBeTruthy()
    })

    // 合計金額のⓘから内訳ダイアログを開ける
    it("ⓘから合計の内訳を開く", () => {
        render(
            <SummaryCards
                totalsBreakdown={createBreakdown({
                    totalPrice: 1000,
                    totalWeight: 2000,
                    basePrice: 1000,
                    baseWeight: 2000,
                })}
                activeConfigName="構成1"
            />,
        )

        const infoButton = screen.getByRole("button", {
            name: "合計金額の内訳を表示",
        })

        expect(infoButton.getAttribute("aria-haspopup")).toBe("dialog")
        fireEvent.click(infoButton)

        expect(screen.getByText("合計金額の内訳")).toBeTruthy()
        expect(screen.getByText("パーツ本体")).toBeTruthy()
    })

    // 3列表示は横方向、1列表示は縦方向にだけ動かす
    it("ドラッグの移動軸を固定する", () => {
        const transform = {x: 10, y: 20, scaleX: 1, scaleY: 1}

        expect(lockDragAxis(transform, true)).toEqual({
            x: 10,
            y: 0,
            scaleX: 1,
            scaleY: 1,
        })
        expect(lockDragAxis(transform, false)).toEqual({
            x: 0,
            y: 20,
            scaleX: 1,
            scaleY: 1,
        })
    })

})

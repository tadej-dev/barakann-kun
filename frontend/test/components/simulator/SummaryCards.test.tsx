// @vitest-environment jsdom
import {afterEach, describe, expect, it} from "vitest"
import {cleanup, render, screen, within} from "@testing-library/react"

import {SummaryCards} from "@/components/simulator/SummaryCards"

// テストごとに描画したDOMを破棄し、次のテストへ持ち越さない
afterEach(cleanup)

// 合計金額・完成重量・選択中構成名の表示を保証
describe("SummaryCards", () => {
    // 金額と重量は、どちらのカードの値か分かる形で桁区切り付きで表示
    it("金額と重量を桁区切り付きで表示する", () => {
        render(
            <SummaryCards
                totalPrice={1234567}
                totalWeight={7450}
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
                totalPrice={0}
                totalWeight={0}
                activeConfigName="通勤用"
            />,
        )

        expect(screen.getByText("通勤用")).toBeTruthy()
    })

    // カード自体をボタンにせず、並べ替えはカード内のボタンだけで受ける
    it("カードをボタンにせず、カード内の並べ替えボタンで操作する", () => {
        const {container} = render(
            <SummaryCards
                totalPrice={0}
                totalWeight={0}
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
})

// @vitest-environment jsdom
import {afterEach, describe, expect, it} from "vitest"
import {cleanup, render, screen} from "@testing-library/react"

import {SummaryCards} from "@/components/simulator/SummaryCards"

// テストごとに描画したDOMを破棄し、次のテストへ持ち越さない
afterEach(cleanup)

describe("SummaryCards", () => {
    // 金額と重量は、どちらのカードの値か分かる形で桁区切り付きで表示する。
    it("金額と重量を桁区切り付きで表示する", () => {
        render(
            <SummaryCards
                totalPrice={1234567}
                totalWeight={7450}
                activeConfigName="構成1"
            />,
        )

        // 値は必ず該当するカードの中に出る（金額と重量の取り違えを検出する）。
        expect(
            screen.getByText("合計金額").closest('[data-slot="card"]')?.textContent,
        ).toContain("1,234,567")
        expect(
            screen.getByText("完成重量").closest('[data-slot="card"]')?.textContent,
        ).toContain("7,450")
    })

    // 金額・重量がどの構成の値か分かるよう、構成名も並べる。
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
})

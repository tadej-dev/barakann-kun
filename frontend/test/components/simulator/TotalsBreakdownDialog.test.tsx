// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from "vitest"
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react"

import {TotalsBreakdownDialog} from "@/components/simulator/TotalsBreakdownDialog"
import type {
    TotalsBreakdown,
    TotalsIncludedItem,
} from "@/features/simulator/partCompatibility"

// テストごとに描画したDOMを破棄する
afterEach(cleanup)

// 内訳の1件分
function createItem(
    name: string,
    overrides: Partial<TotalsIncludedItem> = {},
) {
    return {
        name,
        quantity: 1,
        unitWeight: 100,
        totalWeight: 100,
        unitPrice: 1000,
        totalPrice: 1000,
        sourcePartName: "フレーム",
        categoryKey: "handlebar",
        isSetComponent: false,
        ...overrides,
    }
}

// 表示する内訳
const breakdown: TotalsBreakdown = {
    totalPrice: 1200,
    totalWeight: 1100,
    basePrice: 1000,
    baseWeight: 1000,
    includedItems: [createItem("ハンドル", {
        quantity: 2,
        unitWeight: 100,
        totalWeight: 200,
        unitPrice: 500,
        totalPrice: 1000,
    })],
    setComponents: [createItem("RD", {isSetComponent: true, categoryKey: "rear_derailleur"})],
    excludedItems: [createItem("クリート", {categoryKey: null})],
    referencePrices: [createItem("参考ハンドル", {
        quantity: 2,
        unitWeight: 100,
        totalWeight: 200,
        unitPrice: 350,
        totalPrice: 700,
    })],
}

describe("TotalsBreakdownDialog", () => {
    // 合計と各セクションを表示する
    it("合計と内訳のセクションを表示する", () => {
        render(
            <TotalsBreakdownDialog
                open
                metric="weight"
                breakdown={breakdown}
                onOpenChange={vi.fn()}
            />,
        )

        expect(screen.getByText("完成重量の内訳")).toBeTruthy()
        expect(screen.getByText("パーツ本体")).toBeTruthy()
        expect(screen.getByText("合計に加算される付属品")).toBeTruthy()
        expect(screen.getByText("セット構成品（セット重量に含む）"))
            .toBeTruthy()
        expect(screen.getByText("カテゴリーなし付属品（合計対象外）"))
            .toBeTruthy()
        expect(screen.getAllByText("ハンドル").length).toBeGreaterThan(0)
        // 合計金額・完成重量・パーツ本体の値を表示する
        expect(screen.getByText("1,100 g")).toBeTruthy()
        expect(screen.getByText("重量 1,000 g")).toBeTruthy()
        // 重量の内訳に金額は表示しない
        expect(screen.queryByText(/￥/)).toBeNull()
        // 付属品の内訳（提供元・数量・重量）
        expect(screen.getByText(/フレーム・2個/)).toBeTruthy()
        expect(screen.getByText("200 g")).toBeTruthy()
    })

    // 金額の内訳では重量のセクションを表示しない
    it("金額の内訳では重量セクションを表示しない", () => {
        render(
            <TotalsBreakdownDialog
                open
                metric="price"
                breakdown={breakdown}
                onOpenChange={vi.fn()}
            />,
        )

        expect(screen.getByText("合計金額の内訳")).toBeTruthy()
        expect(screen.getByText(/1,200/)).toBeTruthy()
        expect(screen.getByText("金額 ￥1,000")).toBeTruthy()
        // 金額の内訳に重量は表示しない
        expect(screen.queryByText(/1,000 g/)).toBeNull()
        // 参考価格は合計と混同しない値で表示する
        expect(screen.getByText(/700/)).toBeTruthy()
        expect(screen.queryByText("合計に加算される付属品")).toBeNull()
        expect(screen.queryByText("セット構成品（セット重量に含む）")).toBeNull()
        expect(screen.getByText("参考価格（合計に加算しない）")).toBeTruthy()
    })

    // 内訳が空のセクションは表示しない
    it("空のセクションを表示しない", () => {
        render(
            <TotalsBreakdownDialog
                open
                metric="weight"
                breakdown={{
                    totalPrice: 0,
                    totalWeight: 0,
                    basePrice: 0,
                    baseWeight: 0,
                    includedItems: [],
                    setComponents: [],
                    excludedItems: [],
                    referencePrices: [],
                }}
                onOpenChange={vi.fn()}
            />,
        )

        expect(screen.queryByText("合計に加算される付属品")).toBeNull()
        expect(screen.queryByText("セット構成品（セット重量に含む）"))
            .toBeNull()
        expect(screen.queryByText("カテゴリーなし付属品（合計対象外）"))
            .toBeNull()
        expect(screen.queryByText("参考価格（合計に加算しない）")).toBeNull()
    })

    // 参考価格が無い付属品は「-」で表示する
    it("参考価格が無い場合は-を表示する", () => {
        render(
            <TotalsBreakdownDialog
                open
                metric="price"
                breakdown={{
                    ...breakdown,
                    referencePrices: [createItem("価格なし", {
                        totalPrice: null,
                        unitPrice: null,
                    })],
                }}
                onOpenChange={vi.fn()}
            />,
        )

        // 参考価格セクションの行
        const row = screen.getByText("価格なし").closest("li") as HTMLElement

        expect(row.textContent).toContain("-")
    })

    // Escapeキーで閉じる
    it("Escapeキーで閉じる", async () => {
        const onOpenChange = vi.fn()

        render(
            <TotalsBreakdownDialog
                open
                metric="weight"
                breakdown={breakdown}
                onOpenChange={onOpenChange}
            />,
        )

        const dialog = screen.getByRole("dialog")
        dialog.focus()
        fireEvent.keyDown(dialog, {
            key: "Escape",
            code: "Escape",
            keyCode: 27,
        })

        await waitFor(() => {
            expect(onOpenChange).toHaveBeenCalled()
        })
        expect(onOpenChange.mock.calls[0][0]).toBe(false)
    })

    // 閉じるボタンで表示状態を変更する
    it("閉じるボタンで閉じる", () => {
        const onOpenChange = vi.fn()

        render(
            <TotalsBreakdownDialog
                open
                metric="weight"
                breakdown={breakdown}
                onOpenChange={onOpenChange}
            />,
        )

        fireEvent.click(screen.getByRole("button", {name: "閉じる"}))

        expect(onOpenChange).toHaveBeenCalledWith(false)
    })

})

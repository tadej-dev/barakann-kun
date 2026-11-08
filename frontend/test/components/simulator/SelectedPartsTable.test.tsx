// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from "vitest"
import {cleanup, fireEvent, render, screen, within} from "@testing-library/react"

import type {Category} from "@/types/category"
import type {Part} from "@/types/part"
import type {PartSlot} from "@/features/simulator/partSlots"
import {SelectedPartsTable} from "@/components/simulator/SelectedPartsTable"

// テストごとに描画したDOMを破棄し、次のテストへ持ち越さない
afterEach(cleanup)

const categories: Category[] = [
    {id: 1, key: "frame", displayName: "フレーム"},
    {id: 14, key: "tire", displayName: "タイヤ"},
    {id: 19, key: "seatpost", displayName: "シートポスト"},
]

// 選択済みパーツを作る
function createPart(overrides: Partial<Part> = {}): Part {
    return {
        id: 1,
        name: "Test Part",
        brandName: "Test Brand",
        categoryKey: "frame",
        weight: 200,
        price: 10000,
        blockedCategoryKeys: [],
        ...overrides,
    }
}

type TableOptions = {
    activeSlotKey?: string
    blockedCategoryKeys?: string[]
    onSlotChange?: (slot: PartSlot) => void
}

function renderTable(
    selectedParts: Record<string, Part>,
    options: TableOptions = {},
) {
    return render(
        <SelectedPartsTable
            categories={categories}
            activeSlotKey={options.activeSlotKey ?? "frame"}
            selectedParts={selectedParts}
            blockedCategoryKeys={new Set(options.blockedCategoryKeys ?? [])}
            onSlotChange={options.onSlotChange ?? (() => {})}
        />,
    )
}

describe("SelectedPartsTable", () => {
    // 選択済みのパーツと、まだ選んでいない枠を同じ表に並べる。
    it("選択済みのパーツと未選択の枠を表示する", () => {
        renderTable({
            frame: createPart({
                id: 1,
                name: "Madone",
                brandName: "Trek",
                categoryKey: "frame",
                weight: 1133,
                price: 500000,
            }),
        })

        expect(screen.getByText("フレーム")).toBeTruthy()
        expect(screen.getByText("Madone")).toBeTruthy()
        // タイヤ（前後）とシートポストは未選択のまま枠だけを表示する。
        expect(screen.getAllByText("未選択")).toHaveLength(3)
    })

    // 選択中の枠は、指定した行だけを強調する。
    it("選択中の枠だけを選択状態にする", () => {
        renderTable({}, {activeSlotKey: "tire:rear"})

        const selectedRows = screen.getAllByRole("row", {selected: true})

        expect(selectedRows).toHaveLength(1)
        // 指定した枠（後輪）の行だけが選択状態になる。
        expect(within(selectedRows[0]).getByText("タイヤ")).toBeTruthy()
        expect(within(selectedRows[0]).getByText("後輪")).toBeTruthy()
    })

    // 行のクリックで、その枠を選択対象にする。
    it("行のクリックで選択枠を切り替える", () => {
        const onSlotChange = vi.fn()
        renderTable({}, {onSlotChange})

        fireEvent.click(screen.getByText("フレーム"))

        expect(onSlotChange).toHaveBeenCalledTimes(1)
        expect(onSlotChange.mock.calls[0]?.[0]).toMatchObject({
            key: "frame",
            categoryKey: "frame",
        })
    })

    // キーボードでも枠を選べるようにする。
    it("EnterとSpaceキーで選択枠を切り替える", () => {
        const onSlotChange = vi.fn()
        renderTable({}, {onSlotChange})

        const row = screen.getByText("フレーム").closest("tr") as HTMLElement

        // キーボードで辿れる行にし、規定の動作（スクロールなど）は止める。
        expect(row.tabIndex).toBe(0)
        expect(fireEvent.keyDown(row, {key: "Enter"})).toBe(false)
        expect(fireEvent.keyDown(row, {key: " "})).toBe(false)

        expect(onSlotChange).toHaveBeenCalledTimes(2)
        expect(onSlotChange).toHaveBeenNthCalledWith(1, {
            key: "frame",
            categoryKey: "frame",
            position: "single",
        })
    })

    // 他のパーツが枠を占有しているカテゴリは、占有元の付属品を示す。
    it("占有しているカテゴリは付属品として示す", () => {
        renderTable({
            frame: createPart({
                id: 1,
                name: "Madone",
                brandName: "Trek",
                categoryKey: "frame",
                includedItems: [{
                    name: "専用シートポスト",
                    quantity: 1,
                    categoryKey: "seatpost",
                    weight: 200,
                    price: 30000,
                }],
            }),
        }, {blockedCategoryKeys: ["seatpost"]})

        const row = screen.getByText("シートポスト").closest("tr") as HTMLElement

        expect(within(row).getByText("専用シートポスト")).toBeTruthy()
        expect(within(row).getByText("付属品")).toBeTruthy()
        // 単品定価は合計に含めないため、参考値として示す。
        expect(within(row).getByText(/30,000/)).toBeTruthy()
    })
})

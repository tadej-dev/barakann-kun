// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react"

import type {Category} from "@/types/category"
import type {Part} from "@/types/part"
import {fetchPartsByIds} from "@/api/parts"
import {
    BuildComparisonDialog,
    type ComparisonBuild,
} from "@/components/simulator/BuildComparisonDialog"

// 比較対象のパーツ取得をモックする
vi.mock("@/api/parts", () => ({
    fetchPartsByIds: vi.fn(),
}))

const mockedFetchPartsByIds = vi.mocked(fetchPartsByIds)

// テストごとに描画したDOMを破棄し、次のテストへ持ち越さない
afterEach(cleanup)

// 各テストで差し替えたモックを戻す
beforeEach(() => {
    mockedFetchPartsByIds.mockReset()
    mockedFetchPartsByIds.mockResolvedValue([])
})

const categories: Category[] = [
    {id: 1, key: "frame", displayName: "フレーム"},
]

// 比較に使うパーツを作る
function createPart(id: number, name: string): Part {
    return {
        id,
        name,
        brandName: "Trek",
        categoryKey: "frame",
        weight: 1133,
        price: 500000,
        blockedCategoryKeys: [],
    }
}

// 比較する構成を作る（構成ごとに別のフレームを持つ）
function createBuild(
    key: string,
    name: string,
    partId = 1,
    price = 500000,
    weight = 1133,
): ComparisonBuild {
    return {
        key,
        name,
        parts: [{slotKey: "frame", partId, price, weight}],
    }
}

// 見出し行のセルを、構成の並び順で取り出す
function rowCells(label: string) {
    const row = screen.getByText(label).closest("tr")

    return row ? within(row).getAllByRole("cell").map((cell) => cell.textContent) : []
}

describe("BuildComparisonDialog", () => {
    // 比較には2件以上の構成が要るため、足りないときは押せない。
    it("構成が2件未満のときは比較ボタンを押せない", () => {
        render(
            <BuildComparisonDialog
                builds={[createBuild("a", "構成1")]}
                categories={categories}
            />,
        )

        const button = screen.getByRole("button", {name: "比較"})

        expect(button.hasAttribute("disabled")).toBe(true)
        expect(button.getAttribute("title")).toBe(
            "比較には2件以上の構成が必要です",
        )
    })

    // 2件以上あればダイアログを開き、先頭2件を選択済みにする。
    it("ダイアログを開くと構成の選択肢を選択済みで表示する", async () => {
        const builds = [createBuild("a", "通勤用", 1), createBuild("b", "レース用", 2)]
        render(<BuildComparisonDialog builds={builds} categories={categories} />)

        fireEvent.click(screen.getByRole("button", {name: "比較"}))

        expect(await screen.findByText("構成を比較")).toBeTruthy()

        const checkboxes = screen.getAllByRole("checkbox")

        expect(checkboxes).toHaveLength(2)
        // 開いた時点で先頭2件が選ばれている。
        for (const checkbox of checkboxes) {
            expect(checkbox.getAttribute("aria-checked")).toBe("true")
        }
    })

    // 開くと、選択中の構成が使うパーツをまとめて取得する。
    it("開くと選択中の構成のパーツをまとめて取得する", async () => {
        const builds = [createBuild("a", "通勤用", 1), createBuild("b", "レース用", 2)]
        render(<BuildComparisonDialog builds={builds} categories={categories} />)

        fireEvent.click(screen.getByRole("button", {name: "比較"}))

        await waitFor(() => {
            expect(mockedFetchPartsByIds).toHaveBeenCalledTimes(1)
        })
        // 2件の構成それぞれのパーツを取りに行く。
        expect(mockedFetchPartsByIds.mock.calls[0]?.[0]).toEqual([1, 2])
    })

    // 取得したパーツと、構成ごとの金額・重量・診断を各列に反映する。
    it("取得したパーツと構成ごとの値を比較表に反映する", async () => {
        mockedFetchPartsByIds.mockResolvedValue([
            createPart(1, "Madone"),
            createPart(2, "Émonda"),
        ])
        const builds = [
            createBuild("a", "通勤用", 1, 500000, 1133),
            createBuild("b", "レース用", 2, 600000, 1200),
        ]
        render(<BuildComparisonDialog builds={builds} categories={categories} />)

        fireEvent.click(screen.getByRole("button", {name: "比較"}))

        // パーツ名は各列のパーツから引く。
        expect(await screen.findByText("Trek Madone")).toBeTruthy()
        expect(screen.getByText("Trek Émonda")).toBeTruthy()
        // 金額と重量は、構成ごとの値がその列に出る。
        expect(rowCells("合計金額")).toEqual([
            expect.stringContaining("500,000"),
            expect.stringContaining("600,000"),
        ])
        expect(rowCells("完成重量")).toEqual([
            expect.stringContaining("1,133 g"),
            expect.stringContaining("1,200 g"),
        ])
        // 構成診断は、パーツが揃っていないことを示す。
        expect(rowCells("構成診断")[0]).toContain("未選択")
    })

    // 選択が2件未満になると、比較できないことを伝える。
    it("選択が2件未満のときは比較できないと伝える", async () => {
        const builds = [createBuild("a", "通勤用", 1), createBuild("b", "レース用", 2)]
        render(<BuildComparisonDialog builds={builds} categories={categories} />)

        fireEvent.click(screen.getByRole("button", {name: "比較"}))

        const checkboxes = await screen.findAllByRole("checkbox")

        // 片方を外すとメッセージが出て、選び直すと消える。
        fireEvent.click(checkboxes[0])

        expect(
            await screen.findByText("比較する構成を2件以上選択してください"),
        ).toBeTruthy()

        fireEvent.click(checkboxes[0])

        await waitFor(() => {
            expect(
                screen.queryByText("比較する構成を2件以上選択してください"),
            ).toBeNull()
        })
    })

    // 比較できるのは4件までで、5件目からは選べない。
    it("構成は4件までしか選べない", async () => {
        const builds = [
            createBuild("a", "構成1", 1),
            createBuild("b", "構成2", 2),
            createBuild("c", "構成3", 3),
            createBuild("d", "構成4", 4),
            createBuild("e", "構成5", 5),
        ]
        render(<BuildComparisonDialog builds={builds} categories={categories} />)

        fireEvent.click(screen.getByRole("button", {name: "比較"}))

        const checkboxes = await screen.findAllByRole("checkbox")

        // 3件目を足すと、その構成のパーツも取り直す。
        fireEvent.click(checkboxes[2])

        await waitFor(() => {
            expect(mockedFetchPartsByIds).toHaveBeenLastCalledWith(
                [1, 2, 3],
                expect.anything(),
            )
        })

        // 4件目を足すと上限に達する。
        fireEvent.click(checkboxes[3])

        await waitFor(() => {
            expect(checkboxes[4].getAttribute("aria-disabled")).toBe("true")
        })
    })

    // 取得に失敗したときは、理由を添えて知らせる。
    it("パーツの取得に失敗したときはエラーを表示する", async () => {
        // 例外の理由が、そのまま利用者へ伝わることを確かめる。
        mockedFetchPartsByIds.mockRejectedValueOnce(new Error("502 Bad Gateway"))
        const builds = [createBuild("a", "通勤用", 1), createBuild("b", "レース用", 2)]
        render(<BuildComparisonDialog builds={builds} categories={categories} />)

        fireEvent.click(screen.getByRole("button", {name: "比較"}))

        expect((await screen.findByRole("alert")).textContent).toContain(
            "502 Bad Gateway",
        )
    })

    // 呼び出し側のボタンでも、同じ条件で開ける。
    it("呼び出し側のボタンに状態を渡して開ける", async () => {
        const builds = [createBuild("a", "通勤用", 1), createBuild("b", "レース用", 2)]
        render(
            <BuildComparisonDialog
                builds={builds}
                categories={categories}
                renderTrigger={(trigger) => (
                    <button
                        type="button"
                        disabled={trigger.disabled}
                        title={trigger.title}
                        onClick={trigger.onOpen}
                    >
                        比較を開く
                    </button>
                )}
            />,
        )

        const button = screen.getByRole("button", {name: "比較を開く"})

        expect(button.getAttribute("title")).toBe("複数構成を比較")

        fireEvent.click(button)

        expect(await screen.findByText("構成を比較")).toBeTruthy()
    })
})

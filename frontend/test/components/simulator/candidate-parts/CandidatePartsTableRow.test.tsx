// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from "vitest"
import {cleanup, fireEvent, render, screen} from "@testing-library/react"

import type {Part} from "@/types/part"
import type {CompatibilityResult} from "@/features/simulator/partCompatibility"
import {CandidatePartsTableRow} from "@/components/simulator/candidate-parts/CandidatePartsTableRow"

// テストごとに描画したDOMを破棄し、次のテストへ持ち越さない
afterEach(cleanup)

// 候補行に必要な最小限のパーツを作る
function createPart(overrides: Partial<Part> = {}): Part {
    return {
        id: 1,
        name: "Test Part",
        brandName: "Test Brand",
        categoryKey: "handlebar",
        weight: 200,
        price: 10000,
        blockedCategoryKeys: [],
        ...overrides,
    }
}

// 比較相手がいない非互換（前後位置の制約など）を表す判定結果
function createBlockedResult(reason: string): CompatibilityResult {
    return {
        status: "incompatible",
        reasons: [reason],
        counterparts: [],
        conflictingSlotKeys: [],
        selectionBlocked: true,
    }
}

type RowOptions = {
    compatibility?: CompatibilityResult | null
    isSelected?: boolean
    showVariantColumn?: boolean
    canSelectBoth?: boolean
    onSelect?: (part: Part) => void
    onSelectBoth?: (part: Part) => void
}

// 行は tr のため、表の中に入れて描画する
function renderRow(part: Part, options: RowOptions = {}) {
    return render(
        <table>
            <tbody>
                <CandidatePartsTableRow
                    part={part}
                    variants={[part]}
                    modelKey="model"
                    onVariantChange={() => {}}
                    isSelected={options.isSelected ?? false}
                    showVariantColumn={options.showVariantColumn ?? false}
                    compatibility={options.compatibility ?? null}
                    categoryDisplayNames={{}}
                    canSelectBoth={options.canSelectBoth ?? false}
                    enableContentVisibility={false}
                    onSelect={options.onSelect ?? (() => {})}
                    onSelectBoth={options.onSelectBoth ?? (() => {})}
                />
            </tbody>
        </table>,
    )
}

describe("CandidatePartsTableRow", () => {
    // 規格キーと値が、画面では日本語ラベルで表示されることを確認する。
    it("規格一覧を日本語ラベルで表示する", () => {
        // 規格一覧は「バリエーション」列の中に表示する。
        renderRow(createPart({
            specifications: {
                cockpit_replaceable: "true",
                bb_standard: "bb30a",
            },
        }), {showVariantColumn: true})

        // ラベルで要素を引き、値が日本語で出ていることを確認する。
        expect(
            screen.getByText(/コックピット交換可否/).textContent,
        ).toContain("交換可")
        expect(screen.getByText(/BB規格/).textContent).toContain("BB30A")
        // 生の規格値がそのまま出ていないこと。
        expect(screen.queryByText(/bb30a/)).toBeNull()
    })

    // フレームの重量は、合計と内訳、そしてフォークを含むことを示す2行で表す。
    it("フレームの重量欄に合計・内訳・フォーク込みバッジを表示する", () => {
        renderRow(createPart({
            categoryKey: "frame",
            weight: 1133,
            specifications: {
                weight_scope: "frame_and_fork",
                frame_weight_g: "755",
                fork_weight_g: "378",
            },
        }))

        expect(screen.getByText("1,133g")).toBeTruthy()
        expect(screen.getByText("(755g + 378g)")).toBeTruthy()
        expect(screen.getByText("フォーク込み")).toBeTruthy()
    })

    // 出典が非公式・別条件の重量は、参考値であることを併記する。
    it("参考値の重量にはフォーク込み・参考値と表示する", () => {
        renderRow(createPart({
            categoryKey: "frame",
            weight: 1133,
            specifications: {
                weight_scope: "frame_and_fork",
                frame_weight_g: "755",
                fork_weight_g: "378",
                weight_source: "reference",
            },
        }))

        expect(screen.getByText("フォーク込み・参考値")).toBeTruthy()
    })

    // 取り付けできない候補はバッジで示し、比較相手がいなければ理由も併記する。
    it("非互換の候補にバッジと理由を表示する", () => {
        renderRow(createPart(), {
            compatibility: createBlockedResult("コックピット規格が一致しません"),
        })

        expect(screen.getByText("非互換")).toBeTruthy()
        expect(screen.getByText("コックピット規格が一致しません")).toBeTruthy()
    })

    // フレームは全パーツ互換の基準のため、候補行では互換バッジを出さない。
    it("フレームの行には互換バッジを表示しない", () => {
        renderRow(createPart({categoryKey: "frame", weight: 900}), {
            compatibility: createBlockedResult("規格が一致しません"),
        })

        expect(screen.queryByText("非互換")).toBeNull()
    })

    // 選択中の行は aria-selected で状態を伝える。
    it("選択中の行は aria-selected を立てる", () => {
        renderRow(createPart(), {isSelected: true})

        expect(screen.getByRole("row").getAttribute("aria-selected")).toBe("true")
    })

    // 行のクリックで、そのパーツを選択する。
    it("行のクリックでパーツを選択する", () => {
        const onSelect = vi.fn()
        renderRow(createPart(), {onSelect})

        fireEvent.click(screen.getByRole("row"))

        expect(onSelect).toHaveBeenCalledTimes(1)
    })

    // 取り付けできない候補は、クリックしても選択しない。
    it("選択できない行のクリックでは選択しない", () => {
        const onSelect = vi.fn()
        renderRow(createPart(), {
            onSelect,
            compatibility: createBlockedResult("規格が一致しません"),
        })

        fireEvent.click(screen.getByRole("row"))

        expect(onSelect).not.toHaveBeenCalled()
    })

    // 前後セットで選べるカテゴリは、行とは別に「前後に選択」を出す。
    it("前後に選択のボタンで両側の枠へ選択する", () => {
        const onSelect = vi.fn()
        const onSelectBoth = vi.fn()
        renderRow(createPart(), {canSelectBoth: true, onSelect, onSelectBoth})

        fireEvent.click(screen.getByText("前後に選択"))

        expect(onSelectBoth).toHaveBeenCalledTimes(1)
        // 行のクリックへ伝播させない。
        expect(onSelect).not.toHaveBeenCalled()
    })
})

// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from "vitest"
import {cleanup, fireEvent, render, screen} from "@testing-library/react"

import {
    initialCandidateFilterState,
    type CandidateFilterState,
} from "@/features/simulator/candidatePartsFilter"
import {CandidatePartsFilters} from "@/components/simulator/candidate-parts/CandidatePartsFilters"

// テストごとに描画したDOMを破棄し、次のテストへ持ち越さない
afterEach(cleanup)

type FiltersOptions = {
    searchQuery?: string
    resultCount?: number
    slotPositionLabel?: string | null
    brands?: string[]
    filters?: CandidateFilterState
    showViewFilter?: boolean
    onSearchQueryChange?: (query: string) => void
    onFiltersChange?: (next: CandidateFilterState) => void
}

// 絞り込み欄のpropsをまとめて作る（rerenderでも同じ形を使い回す）
function createFiltersProps(options: FiltersOptions = {}) {
    return {
        filters: options.filters ?? structuredClone(initialCandidateFilterState),
        brands: options.brands ?? [],
        specFilters: [],
        showViewFilter: options.showViewFilter ?? true,
        cockpitStatuses: [],
        modelYears: [],
        showIntegratedHandlebarFilter: false,
        onFiltersChange: options.onFiltersChange ?? (() => {}),
        searchQuery: options.searchQuery ?? "",
        resultCount: options.resultCount ?? 0,
        onSearchQueryChange: options.onSearchQueryChange ?? (() => {}),
        slotPositionLabel: options.slotPositionLabel ?? null,
    }
}

function renderFilters(options: FiltersOptions = {}) {
    return render(<CandidatePartsFilters {...createFiltersProps(options)} />)
}

describe("CandidatePartsFilters", () => {
    // 絞り込み結果の件数・絞り込みメニュー・検索欄を並べる。
    it("件数と絞り込みメニューと検索欄を表示する", () => {
        renderFilters({resultCount: 12})

        expect(screen.getByText("12件")).toBeTruthy()
        expect(screen.getByRole("button", {name: "絞り込み"})).toBeTruthy()
        expect(screen.getByRole("searchbox", {name: "検索"})).toBeTruthy()
    })

    // 絞り込みメニューを開くと、メーカーの選択肢が並ぶ。
    it("絞り込みメニューにメーカーの選択肢を出す", async () => {
        renderFilters({brands: ["Trek", "Giant"]})

        fireEvent.click(screen.getByRole("button", {name: "絞り込み"}))
        // メーカーはサブメニューの中に並ぶ。
        fireEvent.click(await screen.findByText("メーカー"))

        expect(await screen.findByText("Trek")).toBeTruthy()
        expect(screen.getByText("Giant")).toBeTruthy()
    })

    // メーカーを選ぶと、その条件だけを変えて他の条件は保持する。
    it("メーカーを選ぶと他の絞り込み条件を保持したまま通知する", async () => {
        const onFiltersChange = vi.fn()
        // 既に別の条件が設定されている状態から選ぶ。
        const filters = {
            ...structuredClone(initialCandidateFilterState),
            viewMode: "compatibleOnly" as const,
            modelYears: [2025],
            specs: {freehub_body: ["sram_xdr"]},
        }
        renderFilters({brands: ["Trek", "Giant"], filters, onFiltersChange})

        fireEvent.click(screen.getByRole("button", {name: "絞り込み"}))
        fireEvent.click(await screen.findByText("メーカー"))
        fireEvent.click(await screen.findByText("Trek"))

        expect(onFiltersChange).toHaveBeenCalledTimes(1)
        // 選んだ条件だけが変わり、他の条件は保持されること。
        expect(onFiltersChange.mock.calls[0]?.[0]).toEqual({
            ...filters,
            brands: ["Trek"],
        })
    })

    // 適用中の条件数を、カテゴリをまたいで合算してバッジで示す。
    it("適用中の絞り込み件数をバッジで示す", () => {
        renderFilters({
            filters: {
                ...structuredClone(initialCandidateFilterState),
                brands: ["Trek"],
                modelYears: [2025],
            },
        })

        expect(screen.getByLabelText("適用中2件")).toBeTruthy()
    })

    // 条件が無いときは、バッジ自体を出さない。
    it("絞り込み条件が無いときはバッジを表示しない", () => {
        renderFilters()

        expect(screen.queryByLabelText(/^適用中/)).toBeNull()
    })

    // 絞り込みを解除すると、条件をすべて空に戻す。
    it("絞り込みを解除すると条件を空に戻す", async () => {
        const onFiltersChange = vi.fn()
        renderFilters({
            brands: ["Trek"],
            filters: {
                ...structuredClone(initialCandidateFilterState),
                brands: ["Trek"],
            },
            onFiltersChange,
        })

        fireEvent.click(screen.getByRole("button", {name: "絞り込み"}))
        fireEvent.click(await screen.findByText("絞り込みを解除"))

        expect(onFiltersChange).toHaveBeenCalledTimes(1)
        expect(onFiltersChange.mock.calls[0]?.[0]).toEqual(
            initialCandidateFilterState,
        )
    })

    // 表示モードは、比較相手がいるときだけ選べる。
    it("表示モードを選ぶと絞り込み条件を通知する", async () => {
        const onFiltersChange = vi.fn()
        renderFilters({onFiltersChange})

        fireEvent.click(screen.getByRole("button", {name: "絞り込み"}))
        fireEvent.click(await screen.findByText("表示"))
        fireEvent.click(await screen.findByText("適合のみ"))

        expect(onFiltersChange.mock.calls[0]?.[0]).toEqual({
            ...initialCandidateFilterState,
            viewMode: "compatibleOnly",
        })
    })

    // 表示モードは、現在の設定にチェックを付けて示す。
    it("表示モードの現在の設定にチェックを付ける", async () => {
        renderFilters({
            filters: {
                ...structuredClone(initialCandidateFilterState),
                viewMode: "compatibleOnly",
            },
        })

        fireEvent.click(screen.getByRole("button", {name: "絞り込み"}))
        fireEvent.click(await screen.findByText("表示"))

        expect(
            (await screen.findByText("適合のみ")).closest("[role='menuitemradio']")
                ?.getAttribute("aria-checked"),
        ).toBe("true")
    })

    // 表示モードが使えない画面では、その選択肢を出さない。
    it("表示モードを使わない画面では選択肢を出さない", async () => {
        renderFilters({showViewFilter: false})

        fireEvent.click(screen.getByRole("button", {name: "絞り込み"}))

        expect(await screen.findByText("メーカー")).toBeTruthy()
        expect(screen.queryByText("表示")).toBeNull()
    })

    // 検索語は入力のたびに親へ渡し、候補の絞り込みに使う。
    it("検索語の入力で親へ通知する", () => {
        const onSearchQueryChange = vi.fn()
        renderFilters({onSearchQueryChange})

        // 表示しただけでは通知しない。
        expect(onSearchQueryChange).not.toHaveBeenCalled()

        fireEvent.change(screen.getByRole("searchbox", {name: "検索"}), {
            target: {value: "Madone"},
        })

        expect(onSearchQueryChange).toHaveBeenCalledTimes(1)
        expect(onSearchQueryChange).toHaveBeenCalledWith("Madone")
    })

    // 検索欄は親の状態を映す（入力値の取りこぼしを防ぐ）。
    it("検索欄に現在の検索語を表示する", () => {
        renderFilters({searchQuery: "Madone"})

        expect(
            (screen.getByRole("searchbox", {name: "検索"}) as HTMLInputElement).value,
        ).toBe("Madone")
    })

    // 親の検索語が変われば、検索欄の表示も追従する。
    it("親の検索語の変更に追従する", () => {
        const {rerender} = renderFilters({searchQuery: "Madone"})

        rerender(
            <CandidatePartsFilters {...createFiltersProps({searchQuery: "Emonda"})} />,
        )

        expect(
            (screen.getByRole("searchbox", {name: "検索"}) as HTMLInputElement).value,
        ).toBe("Emonda")
    })

    // 前後で別々に選ぶカテゴリでは、どちらの枠を選んでいるかを示す。
    it("前後のスロットでは選択位置を表示する", () => {
        renderFilters({slotPositionLabel: "前輪"})

        expect(screen.getByText("選択位置")).toBeTruthy()
        expect(screen.getByText("前輪")).toBeTruthy()
    })

    // 単一枠のカテゴリでは、選択位置そのものを出さない。
    it("単一枠では選択位置を表示しない", () => {
        renderFilters({slotPositionLabel: null})

        expect(screen.queryByText("選択位置")).toBeNull()
    })
})

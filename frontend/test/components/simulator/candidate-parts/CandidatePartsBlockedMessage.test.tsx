// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from "vitest"
import {cleanup, fireEvent, render, screen} from "@testing-library/react"

import {CandidatePartsBlockedMessage} from "@/components/simulator/candidate-parts/CandidatePartsBlockedMessage"

// テストごとに描画したDOMを破棄し、次のテストへ持ち越さない
afterEach(cleanup)

type BlockedOptions = {
    showVariantColumn?: boolean
    blockingCategoryNames?: string[]
    blockingPartNames?: string[]
    onRemove?: () => void
}

// 占有しているカテゴリと、占有元のパーツを渡して描画する
function renderBlockedMessage(options: BlockedOptions = {}) {
    return render(
        <CandidatePartsBlockedMessage
            message="シートポストはフレームに付属しているため選べません"
            showVariantColumn={options.showVariantColumn ?? false}
            blockingCategoryNames={options.blockingCategoryNames ?? ["シートポスト"]}
            blockingPartNames={options.blockingPartNames ?? ["Madone"]}
            onRemove={options.onRemove ?? (() => {})}
        />,
    )
}

// 解除の入口を押して、確認ダイアログを開く
function openConfirmDialog(categoryLabel = "シートポスト") {
    fireEvent.click(
        screen.getByRole("button", {name: `${categoryLabel}を解除して選択`}),
    )
}

describe("CandidatePartsBlockedMessage", () => {
    // なぜ選べないのかと、解除への入口を示す。
    it("メッセージと解除の入口を表示する", () => {
        renderBlockedMessage()

        expect(
            screen.getByText("シートポストはフレームに付属しているため選べません"),
        ).toBeTruthy()
        expect(
            screen.getByRole("button", {name: "シートポストを解除して選択"}),
        ).toBeTruthy()
    })

    // 解除は確認してから実行する（開いただけでは何もしない）。
    it("確認ダイアログを開いただけでは解除しない", async () => {
        const onRemove = vi.fn()
        renderBlockedMessage({onRemove})

        openConfirmDialog()

        expect(
            await screen.findByText("シートポストを解除しますか？"),
        ).toBeTruthy()
        expect(screen.getByText(/Madoneを解除すると/)).toBeTruthy()
        expect(onRemove).not.toHaveBeenCalled()
    })

    // キャンセルしたときも解除しない。
    it("キャンセルしたときは解除しない", async () => {
        const onRemove = vi.fn()
        renderBlockedMessage({onRemove})

        openConfirmDialog()
        fireEvent.click(await screen.findByText("キャンセル"))

        expect(onRemove).not.toHaveBeenCalled()
        // ダイアログは閉じる。
        expect(screen.queryByText("シートポストを解除しますか？")).toBeNull()
    })

    // 確認したときだけ、1回だけ解除する。
    it("解除を確認すると1回だけ親へ通知する", async () => {
        const onRemove = vi.fn()
        renderBlockedMessage({onRemove})

        openConfirmDialog()
        fireEvent.click(await screen.findByText("解除する"))

        expect(onRemove).toHaveBeenCalledTimes(1)
        expect(screen.queryByText("シートポストを解除しますか？")).toBeNull()
    })

    // 複数のカテゴリ・パーツは区切り文字でまとめて示す。
    it("複数のカテゴリとパーツを区切って示す", async () => {
        renderBlockedMessage({
            blockingCategoryNames: ["シートポスト", "ステム"],
            blockingPartNames: ["Madone", "Émonda"],
        })

        expect(
            screen.getByRole("button", {name: "シートポスト・ステムを解除して選択"}),
        ).toBeTruthy()

        openConfirmDialog("シートポスト・ステム")

        expect(await screen.findByText(/Madone、Émondaを解除すると/)).toBeTruthy()
    })

    // バリエーション列の有無で、メッセージ行の列数を合わせる。
    it("バリエーション列に合わせて列数を変える", () => {
        const {unmount} = renderBlockedMessage({showVariantColumn: false})

        expect(screen.getAllByRole("columnheader")).toHaveLength(4)
        unmount()

        renderBlockedMessage({showVariantColumn: true})

        expect(screen.getAllByRole("columnheader")).toHaveLength(5)
    })
})

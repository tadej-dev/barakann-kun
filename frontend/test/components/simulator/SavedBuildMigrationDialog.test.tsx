// @vitest-environment jsdom

import {cleanup, fireEvent, render, screen} from "@testing-library/react"
import {afterEach, describe, expect, it, vi} from "vitest"

import {SavedBuildMigrationDialog} from "@/components/simulator/SavedBuildMigrationDialog"
import type {MigrationCandidate} from "@/lib/local-config-sync"

// テスト用の移行候補を作る
function createCandidate(
    id: string,
    name: string,
    status: MigrationCandidate["status"],
): MigrationCandidate {
    return {
        config: {id, name, parts: []},
        status,
    }
}

// 共通のprops。個別のテストで必要なものだけ上書き
function createProps() {
    return {
        open: true,
        candidates: [
            createCandidate("local-1", "通勤用", "new"),
            createCandidate("local-2", "移行済み構成", "duplicate"),
            createCandidate("local-3", "上限超過構成", "over-limit"),
        ],
        remainingSlots: 18,
        replacesInitialConfig: false,
        counts: {duplicate: 1, new: 1, overLimit: 1},
        serverConfigs: [
            {id: "server-1", name: "アカウントの構成", parts: 2},
        ],
        onDeleteServerConfig: vi.fn(),
        selectedIds: ["local-1"],
        isSubmitting: false,
        onToggle: vi.fn(),
        onConfirm: vi.fn(),
        onDismiss: vi.fn(),
    }
}

// 移行候補の表示・選択・保存可否・削除確認を保証
describe("SavedBuildMigrationDialog", () => {
    afterEach(() => {
        cleanup()
    })

    // 候補と、選択できない理由を表示
    it("候補と重複・上限超過の理由を表示する", () => {
        render(<SavedBuildMigrationDialog {...createProps()} />)

        expect(screen.getByText("通勤用")).toBeTruthy()
        expect(screen.getByText(/・移行済み/)).toBeTruthy()
        expect(screen.getByText(/・残り枠を超えています/)).toBeTruthy()
        expect(screen.getByText("保存できる残り枠: 18件")).toBeTruthy()
    })

    // 重複した構成は選択できない
    it("重複した構成は選択できない", () => {
        // 移行候補3件のダイアログprops
        const props = createProps()
        const {container} = render(<SavedBuildMigrationDialog {...props} />)
        // 候補ごとのチェックボックス
        const checkboxes = container.querySelectorAll('[data-slot="checkbox"]')

        // 2番目が重複した構成。無効なのでクリックしても通知されない
        fireEvent.click(checkboxes[1]!)

        expect(props.onToggle).not.toHaveBeenCalled()
    })

    // 選択できる構成は切り替えられる
    it("選択できる構成は切り替えられる", () => {
        // 移行候補3件のダイアログprops
        const props = createProps()
        const {container} = render(<SavedBuildMigrationDialog {...props} />)
        // 候補ごとのチェックボックス
        const checkboxes = container.querySelectorAll('[data-slot="checkbox"]')

        // 1番目が選択中の構成。クリックで解除を通知
        fireEvent.click(checkboxes[0]!)

        expect(props.onToggle).toHaveBeenCalledWith("local-1", false)
    })

    // ログイン直後の空の構成1を置き換える場合は説明を出す
    it("初期構成を置き換える場合は説明を出す", () => {
        // 初期構成の置き換えを伝えるprops
        const props = {...createProps(), replacesInitialConfig: true}

        render(<SavedBuildMigrationDialog {...props} />)

        expect(screen.getByText(/空の「構成1」は、選択した構成で置き換えます/))
            .toBeTruthy()
    })

    // 上限超過の構成も、他の選択を外せば選べる
    it("上限超過の構成も選択できる", () => {
        // 移行候補3件のダイアログprops
        const props = createProps()
        const {container} = render(<SavedBuildMigrationDialog {...props} />)
        // 候補ごとのチェックボックス
        const checkboxes = container.querySelectorAll('[data-slot="checkbox"]')

        fireEvent.click(checkboxes[2]!)

        expect(props.onToggle).toHaveBeenCalledWith("local-3", true)
    })

    // 残り枠を超える選択では保存できない
    it("残り枠を超える選択では保存できない", () => {
        // 選択3件・残り枠1件のprops
        const props = {
            ...createProps(),
            selectedIds: ["local-1", "local-2", "local-3"],
            remainingSlots: 1,
        }

        render(<SavedBuildMigrationDialog {...props} />)

        expect(screen.getByText(/残り枠を超えています。選択を減らしてください/))
            .toBeTruthy()

        // 保存ボタン
        const button = screen.getByRole("button", {
            name: "選択した構成を保存",
        }) as HTMLButtonElement

        expect(button.disabled).toBe(true)
    })

    // 選択が無い場合は保存できない
    it("選択が無い場合は保存ボタンを無効にする", () => {
        // 選択を空にしたprops
        const props = {...createProps(), selectedIds: []}

        render(<SavedBuildMigrationDialog {...props} />)

        // 保存ボタン
        const button = screen.getByRole("button", {
            name: "選択した構成を保存",
        }) as HTMLButtonElement

        expect(button.disabled).toBe(true)
    })

    // 判定結果の件数とアカウントの構成を表示
    it("差分の件数とアカウントの構成を表示する", () => {
        render(<SavedBuildMigrationDialog {...createProps()} />)

        expect(screen.getByText(/一致 1件 \/ 新規 1件 \/ 上限超過 1件/))
            .toBeTruthy()
        expect(screen.getByText("アカウントの構成（1件）")).toBeTruthy()
        expect(screen.getByText("アカウントの構成")).toBeTruthy()
    })

    // アカウントの構成は削除の確認を挟む
    it("アカウントの構成の削除は確認してから実行する", () => {
        // 移行候補3件のダイアログprops
        const props = createProps()

        render(<SavedBuildMigrationDialog {...props} />)

        fireEvent.click(screen.getByRole("button", {name: "削除"}))
        expect(props.onDeleteServerConfig).not.toHaveBeenCalled()

        fireEvent.click(screen.getByRole("button", {name: "削除する"}))
        expect(props.onDeleteServerConfig).toHaveBeenCalledWith("server-1")
    })

    // 「保存しない」で閉じる
    it("保存しないを押すと閉じる", () => {
        // 移行候補3件のダイアログprops
        const props = createProps()

        render(<SavedBuildMigrationDialog {...props} />)
        fireEvent.click(screen.getByRole("button", {name: "保存しない"}))

        expect(props.onDismiss).toHaveBeenCalled()
    })

    // 開いた直後はダイアログ自体へフォーカスを移す
    it("開いた直後にダイアログへフォーカスする", () => {
        render(<SavedBuildMigrationDialog {...createProps()} />)

        expect(screen.getByRole("dialog")).toBe(document.activeElement)
    })

    // Tabキーでダイアログ内の先頭と末尾を循環する
    it("Tabキーでダイアログ内を循環する", () => {
        render(<SavedBuildMigrationDialog {...createProps()} />)

        // ダイアログ内の操作
        const dialog = screen.getByRole("dialog")
        const closeButton = screen.getByRole("button", {
            name: "移行ダイアログを閉じる",
        })
        const saveButton = screen.getByRole("button", {
            name: "選択した構成を保存",
        })

        // ダイアログ自体からTabで先頭の操作へ移る
        fireEvent.keyDown(dialog, {key: "Tab"})
        expect(closeButton).toBe(document.activeElement)

        // 先頭からShift+Tabで末尾へ折り返す
        fireEvent.keyDown(closeButton, {key: "Tab", shiftKey: true})
        expect(saveButton).toBe(document.activeElement)

        // 末尾からTabで先頭へ折り返す
        fireEvent.keyDown(saveButton, {key: "Tab"})
        expect(closeButton).toBe(document.activeElement)
    })

    // Escapeキーでダイアログを閉じる
    it("Escapeキーで閉じる", () => {
        // 移行候補3件のダイアログprops
        const props = createProps()

        render(<SavedBuildMigrationDialog {...props} />)
        fireEvent.keyDown(screen.getByRole("dialog"), {key: "Escape"})

        expect(props.onDismiss).toHaveBeenCalledTimes(1)
    })

    // 保存中はEscapeキーでも閉じず、二重送信を防ぐ
    it("保存中はEscapeキーで閉じない", () => {
        // 保存中のダイアログprops
        const props = {...createProps(), isSubmitting: true}

        render(<SavedBuildMigrationDialog {...props} />)
        fireEvent.keyDown(screen.getByRole("dialog"), {key: "Escape"})

        expect(props.onDismiss).not.toHaveBeenCalled()
    })

    // ダイアログを閉じたら、開く前にフォーカスしていた要素へ戻す
    it("閉じると開く前の要素へフォーカスを戻す", () => {
        // ダイアログを開く操作の代わりに、事前にフォーカスしたボタン
        const trigger = document.createElement("button")
        trigger.textContent = "ダイアログを開く"
        document.body.append(trigger)

        try {
            // 移行候補3件のダイアログprops
            const props = createProps()
            // 閉じた状態から始め、フォーカスの記録先を用意する
            const {rerender} = render(
                <SavedBuildMigrationDialog {...props} open={false} />,
            )
            trigger.focus()

            // ダイアログを開くとフォーカスが移る
            rerender(<SavedBuildMigrationDialog {...props} />)
            expect(screen.getByRole("dialog")).toBe(document.activeElement)

            // 閉じると、開く前にフォーカスしていた要素へ戻る
            rerender(<SavedBuildMigrationDialog {...props} open={false} />)

            expect(trigger).toBe(document.activeElement)
        } finally {
            // 後続のテストへ余分な要素を残さない
            trigger.remove()
        }
    })

    // モーダル表示中に外へフォーカスが移ってもダイアログ内へ戻す
    it("ダイアログ外へフォーカスが移ってもダイアログ内へ戻す", () => {
        render(<SavedBuildMigrationDialog {...createProps()} />)

        // ダイアログ外のボタン
        const outsideButton = document.createElement("button")
        document.body.append(outsideButton)

        try {
            outsideButton.focus()

            expect(screen.getByRole("dialog")).toBe(document.activeElement)
        } finally {
            // 後続のテストへ余分な要素を残さない
            outsideButton.remove()
        }
    })
})

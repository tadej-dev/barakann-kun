// @vitest-environment jsdom

import {cleanup, fireEvent, render, screen} from "@testing-library/react"
import {afterEach, describe, expect, it, vi} from "vitest"

import {AccountDeleteDialog} from "@/features/auth/AccountDeleteDialog"

// アカウント削除ダイアログの表示・操作・フォーカス管理を保証
describe("AccountDeleteDialog", () => {
    afterEach(() => {
        // 描画したダイアログを片付ける
        cleanup()
    })

    // 削除の影響と取り消し・実行の操作を表示
    it("削除の影響と操作を表示する", () => {
        // 削除通知のモック
        const onConfirm = vi.fn()

        render(
            <AccountDeleteDialog
                open
                isDeleting={false}
                errorMessage={null}
                onConfirm={onConfirm}
                onDismiss={vi.fn()}
            />,
        )

        expect(
            screen.getByRole("alertdialog", {
                name: "アカウントを削除しますか？",
            }),
        ).toBeTruthy()
        expect(
            screen.getByText(
                /Googleログイン情報、ログインセッション、保存した構成/,
            ),
        ).toBeTruthy()

        fireEvent.click(screen.getByRole("button", {name: "アカウントを削除"}))
        expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    // キャンセルで削除を取り消す
    it("キャンセルで削除を取り消す", () => {
        // 取り消し通知のモック
        const onDismiss = vi.fn()

        render(
            <AccountDeleteDialog
                open
                isDeleting={false}
                errorMessage={null}
                onConfirm={vi.fn()}
                onDismiss={onDismiss}
            />,
        )

        fireEvent.click(screen.getByRole("button", {name: "キャンセル"}))
        expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    // 削除に失敗した理由を表示する
    it("削除に失敗した理由を表示する", () => {
        render(
            <AccountDeleteDialog
                open
                isDeleting={false}
                errorMessage="アカウントの削除に失敗しました"
                onConfirm={vi.fn()}
                onDismiss={vi.fn()}
            />,
        )

        expect(screen.getByRole("alert")).toBeTruthy()
        expect(screen.getByText("アカウントの削除に失敗しました")).toBeTruthy()
    })

    // 削除中は操作を無効にし、二重実行を防ぐ
    it("削除中は操作を無効にする", () => {
        render(
            <AccountDeleteDialog
                open
                isDeleting
                errorMessage={null}
                onConfirm={vi.fn()}
                onDismiss={vi.fn()}
            />,
        )

        // 削除中の表示と無効化された操作
        const cancelButton = screen.getByRole("button", {
            name: "キャンセル",
        }) as HTMLButtonElement
        const deleteButton = screen.getByRole("button", {
            name: "削除中…",
        }) as HTMLButtonElement

        expect(screen.queryByRole("button", {
            name: "アカウント削除ダイアログを閉じる",
        })).toBeNull()
        expect(cancelButton.disabled).toBe(true)
        expect(deleteButton.disabled).toBe(true)
    })

    // 削除中はEscapeキーでも閉じず、結果の確認を妨げない
    it("削除中はEscapeキーで閉じない", () => {
        // 取り消し通知のモック
        const onDismiss = vi.fn()

        render(
            <AccountDeleteDialog
                open
                isDeleting
                errorMessage={null}
                onConfirm={vi.fn()}
                onDismiss={onDismiss}
            />,
        )
        fireEvent.keyDown(screen.getByRole("alertdialog"), {key: "Escape"})

        expect(onDismiss).not.toHaveBeenCalled()
    })

    // 開いた直後はダイアログ自体へフォーカスを移す
    it("開いた直後にダイアログへフォーカスする", () => {
        render(
            <AccountDeleteDialog
                open
                isDeleting={false}
                errorMessage={null}
                onConfirm={vi.fn()}
                onDismiss={vi.fn()}
            />,
        )

        expect(screen.getByRole("alertdialog")).toBe(document.activeElement)
    })

    // Tabキーでダイアログ内の先頭と末尾を循環する
    it("Tabキーでダイアログ内を循環する", () => {
        render(
            <AccountDeleteDialog
                open
                isDeleting={false}
                errorMessage={null}
                onConfirm={vi.fn()}
                onDismiss={vi.fn()}
            />,
        )

        // ダイアログ内の操作
        const dialog = screen.getByRole("alertdialog")
        const closeButton = screen.getByRole("button", {
            name: "アカウント削除ダイアログを閉じる",
        })
        const deleteButton = screen.getByRole("button", {
            name: "アカウントを削除",
        })

        // ダイアログ自体からTabで先頭の操作へ移る
        fireEvent.keyDown(dialog, {key: "Tab"})
        expect(closeButton).toBe(document.activeElement)

        // 先頭からShift+Tabで末尾へ折り返す
        fireEvent.keyDown(closeButton, {key: "Tab", shiftKey: true})
        expect(deleteButton).toBe(document.activeElement)

        // 末尾からTabで先頭へ折り返す
        fireEvent.keyDown(deleteButton, {key: "Tab"})
        expect(closeButton).toBe(document.activeElement)
    })

    // Escapeキーで削除を取り消して閉じる
    it("Escapeキーで閉じる", () => {
        // 取り消し通知のモック
        const onDismiss = vi.fn()

        render(
            <AccountDeleteDialog
                open
                isDeleting={false}
                errorMessage={null}
                onConfirm={vi.fn()}
                onDismiss={onDismiss}
            />,
        )
        fireEvent.keyDown(screen.getByRole("alertdialog"), {key: "Escape"})

        expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    // ダイアログが閉じたら、開く前にフォーカスしていた要素へ戻す
    it("閉じると開く前の要素へフォーカスを戻す", () => {
        // ダイアログを開く操作の代わりに、事前にフォーカスしたボタン
        const trigger = document.createElement("button")
        trigger.textContent = "アカウントを削除"
        document.body.append(trigger)

        try {
            // 閉じた状態から始め、フォーカスの記録先を用意する
            const {rerender} = render(
                <AccountDeleteDialog
                    open={false}
                    isDeleting={false}
                    errorMessage={null}
                    onConfirm={vi.fn()}
                    onDismiss={vi.fn()}
                />,
            )
            trigger.focus()

            // ダイアログを開くとフォーカスが移る
            rerender(
                <AccountDeleteDialog
                    open
                    isDeleting={false}
                    errorMessage={null}
                    onConfirm={vi.fn()}
                    onDismiss={vi.fn()}
                />,
            )
            expect(screen.getByRole("alertdialog")).toBe(document.activeElement)

            // 閉じると、開く前にフォーカスしていた要素へ戻る
            rerender(
                <AccountDeleteDialog
                    open={false}
                    isDeleting={false}
                    errorMessage={null}
                    onConfirm={vi.fn()}
                    onDismiss={vi.fn()}
                />,
            )

            expect(trigger).toBe(document.activeElement)
        } finally {
            // 後続のテストへ余分な要素を残さない
            trigger.remove()
        }
    })

    // メニュー項目から開いた場合も、メニューを開いたボタンへフォーカスを戻す
    it("メニュー項目から開いた場合はメニューを開いたボタンへ戻す", () => {
        // メニューを開くボタン（aria-controlsでメニューと対応付ける）
        const trigger = document.createElement("button")
        trigger.setAttribute("aria-haspopup", "menu")
        trigger.setAttribute("aria-controls", "test-account-menu")
        // アカウントメニュー
        const menu = document.createElement("div")
        menu.id = "test-account-menu"
        menu.setAttribute("role", "menu")
        // フォーカスするメニュー項目
        const item = document.createElement("div")
        item.setAttribute("role", "menuitem")
        item.tabIndex = 0
        menu.append(item)
        document.body.append(trigger, menu)

        try {
            // 閉じた状態でメニュー項目へフォーカスし、戻り先を記録させる
            const {rerender} = render(
                <AccountDeleteDialog
                    open={false}
                    isDeleting={false}
                    errorMessage={null}
                    onConfirm={vi.fn()}
                    onDismiss={vi.fn()}
                />,
            )
            item.focus()
            // メニューを閉じたときの再描画を模して対応付けを外す
            trigger.removeAttribute("aria-controls")
            menu.remove()

            // ダイアログを開いて閉じる
            rerender(
                <AccountDeleteDialog
                    open
                    isDeleting={false}
                    errorMessage={null}
                    onConfirm={vi.fn()}
                    onDismiss={vi.fn()}
                />,
            )
            rerender(
                <AccountDeleteDialog
                    open={false}
                    isDeleting={false}
                    errorMessage={null}
                    onConfirm={vi.fn()}
                    onDismiss={vi.fn()}
                />,
            )

            expect(trigger).toBe(document.activeElement)
        } finally {
            // 後続のテストへ余分な要素を残さない
            trigger.remove()
            menu.remove()
        }
    })

    // ダイアログ表示中に外へフォーカスが移ってもダイアログ内へ戻す
    it("ダイアログ外へフォーカスが移ってもダイアログ内へ戻す", () => {
        render(
            <AccountDeleteDialog
                open
                isDeleting={false}
                errorMessage={null}
                onConfirm={vi.fn()}
                onDismiss={vi.fn()}
            />,
        )

        // ダイアログ外のボタン
        const outsideButton = document.createElement("button")
        document.body.append(outsideButton)

        try {
            outsideButton.focus()

            expect(screen.getByRole("alertdialog")).toBe(document.activeElement)
        } finally {
            // 後続のテストへ余分な要素を残さない
            outsideButton.remove()
        }
    })
})

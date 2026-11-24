// @vitest-environment jsdom

import {cleanup, fireEvent, render, screen} from "@testing-library/react"
import {afterEach, describe, expect, it, vi} from "vitest"

import {LogoutSaveDialog} from "@/features/auth/LogoutSaveDialog"

// ログアウト保存ダイアログの状態別表示と操作を保証
describe("LogoutSaveDialog", () => {
    afterEach(() => {
        // 描画したダイアログを片付ける
        cleanup()
    })

    // 保存中はキャンセルだけを出し、二重操作を防ぐ
    it("保存中はキャンセルだけを表示する", () => {
        // キャンセル通知のモック
        const onCancel = vi.fn()

        render(
            <LogoutSaveDialog
                status="saving"
                failureKind={null}
                errorMessage=""
                onRetry={vi.fn()}
                onSkip={vi.fn()}
                onCancel={onCancel}
            />,
        )

        expect(screen.getByText("構成を保存しています")).toBeTruthy()
        expect(screen.queryByRole("button", {name: "再試行"})).toBeNull()
        expect(screen.queryByRole("button", {name: "保存せずログアウト"}))
            .toBeNull()

        fireEvent.click(screen.getByRole("button", {name: "キャンセル"}))
        expect(onCancel).toHaveBeenCalled()
    })

    // 成功時は結果を表示し、閉じるボタンで閉じる
    it("成功時は閉じるボタンを表示する", () => {
        // キャンセル通知のモック
        const onCancel = vi.fn()

        render(
            <LogoutSaveDialog
                status="succeeded"
                failureKind={null}
                errorMessage=""
                onRetry={vi.fn()}
                onSkip={vi.fn()}
                onCancel={onCancel}
            />,
        )

        expect(screen.getByText("構成を保存しました")).toBeTruthy()
        expect(screen.getByText(/構成を保存してログアウトしました/))
            .toBeTruthy()

        fireEvent.click(screen.getByRole("button", {name: "閉じる"}))
        expect(onCancel).toHaveBeenCalled()
    })

    // 失敗時は再試行・保存せずログアウト・キャンセルを出す
    it("失敗時は3つの選択肢を表示する", () => {
        const onRetry = vi.fn() // 再試行通知のモック
        const onSkip = vi.fn() // 保存せずログアウトする通知のモック
        const onCancel = vi.fn() // キャンセル通知のモック

        render(
            <LogoutSaveDialog
                status="failed"
                failureKind="save"
                errorMessage="保存できませんでした"
                onRetry={onRetry}
                onSkip={onSkip}
                onCancel={onCancel}
            />,
        )

        expect(screen.getByText("構成を保存できませんでした")).toBeTruthy()
        expect(screen.getByText("保存できませんでした")).toBeTruthy()

        fireEvent.click(screen.getByRole("button", {name: "再試行"}))
        expect(onRetry).toHaveBeenCalled()

        fireEvent.click(screen.getByRole("button", {name: "保存せずログアウト"}))
        expect(onSkip).toHaveBeenCalled()

        fireEvent.click(screen.getByRole("button", {name: "キャンセル"}))
        expect(onCancel).toHaveBeenCalled()
    })

    // ログアウト失敗時は、保存済みであることを伝える
    it("ログアウト失敗時は専用の見出しを出す", () => {
        render(
            <LogoutSaveDialog
                status="failed"
                failureKind="logout"
                errorMessage="ログアウトに失敗しました。もう一度お試しください。"
                onRetry={vi.fn()}
                onSkip={vi.fn()}
                onCancel={vi.fn()}
            />,
        )

        expect(screen.getByText("ログアウトできませんでした")).toBeTruthy()
        expect(screen.getByText(/構成は保存しましたが、ログアウトに失敗しました/))
            .toBeTruthy()
        // 保存済みなので「保存せずログアウト」は出さない
        expect(screen.queryByRole("button", {name: "保存せずログアウト"}))
            .toBeNull()
    })

    // 保存せずログアウトに失敗した場合は、保存していないことを伝える
    it("保存せずログアウト失敗時は保存していないと伝える", () => {
        render(
            <LogoutSaveDialog
                status="failed"
                failureKind="skip-logout"
                errorMessage="ログアウトに失敗しました。もう一度お試しください。"
                onRetry={vi.fn()}
                onSkip={vi.fn()}
                onCancel={vi.fn()}
            />,
        )

        expect(screen.getByText(/構成を保存せずにログアウトしようとしました/))
            .toBeTruthy()
        expect(screen.queryByRole("button", {name: "保存せずログアウト"}))
            .toBeNull()
    })

    // idleでは何も描画しない
    it("idleでは何も表示しない", () => {
        const {container} = render(
            <LogoutSaveDialog
                status="idle"
                failureKind={null}
                errorMessage=""
                onRetry={vi.fn()}
                onSkip={vi.fn()}
                onCancel={vi.fn()}
            />,
        )

        expect(container.innerHTML).toBe("")
    })

    // 表示した直後はダイアログ自体へフォーカスを移す
    it("表示した直後にダイアログへフォーカスする", () => {
        render(
            <LogoutSaveDialog
                status="saving"
                failureKind={null}
                errorMessage=""
                onRetry={vi.fn()}
                onSkip={vi.fn()}
                onCancel={vi.fn()}
            />,
        )

        expect(screen.getByRole("dialog")).toBe(document.activeElement)
    })

    // Tabキーでダイアログ内の先頭と末尾を循環する
    it("Tabキーでダイアログ内を循環する", () => {
        render(
            <LogoutSaveDialog
                status="failed"
                failureKind="save"
                errorMessage="保存できませんでした"
                onRetry={vi.fn()}
                onSkip={vi.fn()}
                onCancel={vi.fn()}
            />,
        )

        // ダイアログ内の操作
        const dialog = screen.getByRole("dialog")
        const cancelButton = screen.getByRole("button", {name: "キャンセル"})
        const retryButton = screen.getByRole("button", {name: "再試行"})

        // ダイアログ自体からTabで先頭の操作へ移る
        fireEvent.keyDown(dialog, {key: "Tab"})
        expect(cancelButton).toBe(document.activeElement)

        // 先頭からShift+Tabで末尾へ折り返す
        fireEvent.keyDown(cancelButton, {key: "Tab", shiftKey: true})
        expect(retryButton).toBe(document.activeElement)

        // 末尾からTabで先頭へ折り返す
        fireEvent.keyDown(retryButton, {key: "Tab"})
        expect(cancelButton).toBe(document.activeElement)
    })

    // Escapeキーで保存処理を取り消して閉じる
    it("Escapeキーで閉じる", () => {
        // キャンセル通知のモック
        const onCancel = vi.fn()

        render(
            <LogoutSaveDialog
                status="failed"
                failureKind="save"
                errorMessage="保存できませんでした"
                onRetry={vi.fn()}
                onSkip={vi.fn()}
                onCancel={onCancel}
            />,
        )
        fireEvent.keyDown(screen.getByRole("dialog"), {key: "Escape"})

        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    // 保存中でもEscapeキーで保存を中断できる（キャンセルと同じ扱い）
    it("保存中もEscapeキーでキャンセルする", () => {
        // キャンセル通知のモック
        const onCancel = vi.fn()

        render(
            <LogoutSaveDialog
                status="saving"
                failureKind={null}
                errorMessage=""
                onRetry={vi.fn()}
                onSkip={vi.fn()}
                onCancel={onCancel}
            />,
        )
        fireEvent.keyDown(screen.getByRole("dialog"), {key: "Escape"})

        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    // ダイアログが閉じたら、表示前にフォーカスしていた要素へ戻す
    it("閉じると表示前の要素へフォーカスを戻す", () => {
        // ダイアログを開く操作の代わりに、事前にフォーカスしたボタン
        const trigger = document.createElement("button")
        trigger.textContent = "ログアウト"
        document.body.append(trigger)

        try {
            // 非表示の状態から始め、フォーカスの記録先を用意する
            const {rerender} = render(
                <LogoutSaveDialog
                    status="idle"
                    failureKind={null}
                    errorMessage=""
                    onRetry={vi.fn()}
                    onSkip={vi.fn()}
                    onCancel={vi.fn()}
                />,
            )
            trigger.focus()

            // 表示するとフォーカスが移る
            rerender(
                <LogoutSaveDialog
                    status="saving"
                    failureKind={null}
                    errorMessage=""
                    onRetry={vi.fn()}
                    onSkip={vi.fn()}
                    onCancel={vi.fn()}
                />,
            )
            expect(screen.getByRole("dialog")).toBe(document.activeElement)

            // 非表示へ戻すと、表示前にフォーカスしていた要素へ戻る
            rerender(
                <LogoutSaveDialog
                    status="idle"
                    failureKind={null}
                    errorMessage=""
                    onRetry={vi.fn()}
                    onSkip={vi.fn()}
                    onCancel={vi.fn()}
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
        trigger.setAttribute("aria-controls", "test-logout-menu")
        // アカウントメニュー
        const menu = document.createElement("div")
        menu.id = "test-logout-menu"
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
                <LogoutSaveDialog
                    status="idle"
                    failureKind={null}
                    errorMessage=""
                    onRetry={vi.fn()}
                    onSkip={vi.fn()}
                    onCancel={vi.fn()}
                />,
            )
            item.focus()
            // メニューを閉じたときの再描画を模して対応付けを外す
            trigger.removeAttribute("aria-controls")
            menu.remove()

            // ダイアログを表示して閉じる
            rerender(
                <LogoutSaveDialog
                    status="saving"
                    failureKind={null}
                    errorMessage=""
                    onRetry={vi.fn()}
                    onSkip={vi.fn()}
                    onCancel={vi.fn()}
                />,
            )
            rerender(
                <LogoutSaveDialog
                    status="idle"
                    failureKind={null}
                    errorMessage=""
                    onRetry={vi.fn()}
                    onSkip={vi.fn()}
                    onCancel={vi.fn()}
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
            <LogoutSaveDialog
                status="saving"
                failureKind={null}
                errorMessage=""
                onRetry={vi.fn()}
                onSkip={vi.fn()}
                onCancel={vi.fn()}
            />,
        )

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

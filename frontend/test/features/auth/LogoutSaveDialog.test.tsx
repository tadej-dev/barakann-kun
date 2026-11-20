// @vitest-environment jsdom

import {cleanup, fireEvent, render, screen} from "@testing-library/react"
import {afterEach, describe, expect, it, vi} from "vitest"

import {LogoutSaveDialog} from "@/features/auth/LogoutSaveDialog"

describe("LogoutSaveDialog", () => {
    afterEach(() => {
        // 描画したダイアログを片付ける
        cleanup()
    })

    // 保存中はキャンセルだけを出し、二重操作を防ぐ
    it("保存中はキャンセルだけを表示する", () => {
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
        const onRetry = vi.fn()
        const onSkip = vi.fn()
        const onCancel = vi.fn()

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
})

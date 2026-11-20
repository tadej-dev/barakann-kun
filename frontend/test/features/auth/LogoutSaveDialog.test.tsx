// @vitest-environment jsdom

import {cleanup, fireEvent, render, screen} from "@testing-library/react"
import {afterEach, describe, expect, it, vi} from "vitest"

import {LogoutSaveDialog} from "@/features/auth/LogoutSaveDialog"

describe("LogoutSaveDialog", () => {
    afterEach(() => {
        cleanup()
    })

    // 保存中はキャンセルだけを出し、二重操作を防ぐ
    it("保存中はキャンセルだけを表示する", () => {
        const onCancel = vi.fn()

        render(
            <LogoutSaveDialog
                status="saving"
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

    // 失敗時は再試行・保存せずログアウト・キャンセルを出す
    it("失敗時は3つの選択肢を表示する", () => {
        const onRetry = vi.fn()
        const onSkip = vi.fn()
        const onCancel = vi.fn()

        render(
            <LogoutSaveDialog
                status="failed"
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

    // idleでは何も描画しない
    it("idleでは何も表示しない", () => {
        const {container} = render(
            <LogoutSaveDialog
                status="idle"
                errorMessage=""
                onRetry={vi.fn()}
                onSkip={vi.fn()}
                onCancel={vi.fn()}
            />,
        )

        expect(container.innerHTML).toBe("")
    })
})

import {CloudUpload} from "lucide-react"
import {useEffect, useRef, type KeyboardEvent} from "react"

import {Button} from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import type {
    LogoutFailureKind,
    LogoutSaveStatus,
} from "@/features/auth/useLogoutWithSave"

// Tab移動の対象にする要素（無効な操作と装飾用の要素を除く）
const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
].join(",")

// ダイアログ内のフォーカス可能な要素をDOM順に返す
function getFocusableElements(dialog: HTMLElement | null): HTMLElement[] {
    // 未描画ならフォーカス対象なし
    if (!dialog) {
        return []
    }

    return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => element.getAttribute("aria-hidden") !== "true")
}

// ダイアログを閉じた後にフォーカスを戻す先を返す
function findFocusReturnTarget(
    previousFocus: HTMLElement | null,
): HTMLElement | null {
    // 開く前に操作していた要素が残っていれば、その要素へ戻す
    if (previousFocus?.isConnected) {
        return previousFocus
    }

    // メニュー項目が閉じて消えた場合は、メニューを開いたボタンへ戻す
    const menuId = previousFocus?.closest('[role="menu"]')?.id
    // メニュー由来でなければ戻す先を決められない
    if (!menuId) {
        return null
    }

    // aria-controlsでメニューと対応する開閉ボタン
    const trigger = Array.from(
        document.querySelectorAll<HTMLElement>("[aria-controls]"),
    ).find((element) => element.getAttribute("aria-controls") === menuId)

    return trigger?.isConnected ? trigger : null
}

// ログアウト保存ダイアログが受け取るプロパティ
type LogoutSaveDialogProps = {
    status: LogoutSaveStatus // ステータス（保存・失敗）
    failureKind: LogoutFailureKind // 失敗の種類
    errorMessage: string // エラー原因
    onRetry: () => void // 再試行
    onSkip: () => void // 保存なしでログアウト
    onCancel: () => void // キャンセル
}

// ログアウト前に、構成をブラウザへ保存していることを知らせるダイアログ
export function LogoutSaveDialog({
    status,
    failureKind,
    errorMessage,
    onRetry,
    onSkip,
    onCancel,
}: LogoutSaveDialogProps) {
    // 表示中か（idleでは何も描画しない）
    const isOpen = status !== "idle"
    // フォーカスを閉じ込めるダイアログ
    const dialogRef = useRef<HTMLDivElement>(null)
    // 開く前に操作していた要素（閉じた後の戻り先）
    const returnFocusRef = useRef<HTMLElement | null>(null)

    // 閉じている間は、最後にフォーカスしていた要素を戻り先として覚える
    useEffect(() => {
        // 表示中はダイアログ内の要素を戻り先にしない
        if (isOpen) {
            return
        }

        // フォーカスが移るたびに戻り先を更新する
        function rememberFocus(event: FocusEvent) {
            // フォーカスされた要素
            const target = event.target
            // 要素以外・本文への移動は戻り先に使わない
            if (!(target instanceof HTMLElement) || target === document.body) {
                return
            }

            // メニュー内の項目なら、そのメニューを開いたボタンを戻り先にする
            const menu = target.closest('[role="menu"]')
            // メニュー外の要素はそのまま戻り先にする
            if (!menu) {
                returnFocusRef.current = target
                return
            }

            // メニュー表示中は、開いたボタンのaria-controlsがメニューIDを指す
            const trigger = Array.from(
                document.querySelectorAll<HTMLElement>("[aria-controls]"),
            ).find((element) => element.getAttribute("aria-controls") === menu.id)
            returnFocusRef.current = trigger ?? target
        }

        document.addEventListener("focusin", rememberFocus)

        return () => {
            document.removeEventListener("focusin", rememberFocus)
        }
    }, [isOpen])

    // 表示したらダイアログへフォーカスを移し、閉じたら元の要素へ戻す
    useEffect(() => {
        // 非表示の間はフォーカスを動かさない
        if (!isOpen) {
            return
        }

        // ダイアログ自体へフォーカスを移し、読み上げの起点にする
        const dialog = dialogRef.current
        dialog?.focus()

        // モーダル表示中に外へフォーカスが移ったら、ダイアログへ戻す
        function keepFocusInside(event: FocusEvent) {
            // ダイアログ内への移動はそのまま許可
            if (event.target instanceof Node && dialog?.contains(event.target)) {
                return
            }

            dialog?.focus()
        }

        document.addEventListener("focusin", keepFocusInside)

        return () => {
            // 監視を外してから、開く前の要素へフォーカスを戻す
            document.removeEventListener("focusin", keepFocusInside)
            findFocusReturnTarget(returnFocusRef.current)?.focus()
        }
    }, [isOpen])

    // 保存していないときは何も描画しない
    if (!isOpen) {
        return null
    }

    // Tabキーの循環とEscapeキーでの閉じる操作を扱う
    function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        // Escapeでは保存処理を取り消して閉じる
        if (event.key === "Escape") {
            event.preventDefault()
            onCancel()
            return
        }

        // Tab以外はブラウザ標準の操作に任せる
        if (event.key !== "Tab") {
            return
        }

        // ダイアログ内のフォーカス可能な要素
        const focusables = getFocusableElements(dialogRef.current)
        // 操作できる要素が無ければダイアログへフォーカスを留める
        if (focusables.length === 0) {
            event.preventDefault()
            dialogRef.current?.focus()
            return
        }

        // 現在フォーカスしている要素の位置（ダイアログ自体なら-1）
        const currentIndex = focusables.indexOf(
            document.activeElement as HTMLElement,
        )
        // 先頭の要素
        const first = focusables[0]
        // 末尾の要素
        const last = focusables[focusables.length - 1]

        // Shift+Tabは先頭（またはダイアログ自体）から末尾へ折り返す
        if (event.shiftKey) {
            // 先頭より前へは移動させず、末尾へ移す
            if (currentIndex <= 0) {
                event.preventDefault()
                last?.focus()
            }

            return
        }

        // Tabは末尾（またはダイアログ自体）から先頭へ折り返す
        if (currentIndex === -1 || currentIndex === focusables.length - 1) {
            event.preventDefault()
            first?.focus()
        }
    }

    const isSaving = status === "saving" // 構成の保存中か
    const isSucceeded = status === "succeeded" // 保存とログアウトが完了したか
    const isLogoutFailure = failureKind === "logout" || // ログアウトだけ失敗した場合は、構成が保存済みかどうかで文言を変える
        failureKind === "skip-logout"

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
            role="presentation"
        >
            <div
                ref={dialogRef}
                className="w-full max-w-md outline-none"
                role="dialog"
                aria-modal="true"
                aria-labelledby="logout-save-title"
                tabIndex={-1}
                onKeyDown={handleDialogKeyDown}
            >
                <Card className="border-slate-200 bg-white shadow-2xl">
                    <CardHeader>
                        <CardTitle
                            id="logout-save-title"
                            className="flex items-center gap-2 text-slate-900"
                        >
                            <CloudUpload className="size-5 text-sky-600" />
                            {isSaving
                                ? "構成を保存しています"
                                : isSucceeded
                                    ? "構成を保存しました"
                                    : isLogoutFailure
                                        ? "ログアウトできませんでした"
                                        : "構成を保存できませんでした"}
                        </CardTitle>
                        <CardDescription className="mt-2 text-slate-600">
                            {isSaving
                                ? "保存が終わるとログアウトします。画面を閉じないでください。"
                                : isSucceeded
                                    ? "構成を保存してログアウトしました。"
                                    : failureKind === "logout"
                                    ? "構成は保存しましたが、ログアウトに失敗しました。再試行してください。"
                                    : failureKind === "skip-logout"
                                        ? "構成を保存せずにログアウトしようとしましたが、失敗しました。"
                                        : "このままログアウトすると、ブラウザに構成が残りません。"}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {!isSaving && errorMessage && (
                            <p
                                role="alert"
                                className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"
                            >
                                {errorMessage}
                            </p>
                        )}

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            {isSaving ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onCancel}
                                >
                                    キャンセル
                                </Button>
                            ) : isSucceeded ? (
                                <Button type="button" onClick={onCancel}>
                                    閉じる
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={onCancel}
                                    >
                                        キャンセル
                                    </Button>
                                    {failureKind === "save" && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={onSkip}
                                        >
                                            保存せずログアウト
                                        </Button>
                                    )}
                                    <Button type="button" onClick={onRetry}>
                                        再試行
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

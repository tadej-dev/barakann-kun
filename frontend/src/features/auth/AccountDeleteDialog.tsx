import {AlertTriangle, X} from "lucide-react"
import {useEffect, useRef, type KeyboardEvent} from "react"

import {Button} from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

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

// アカウント削除ダイアログが受け取るプロパティ
type AccountDeleteDialogProps = {
    open: boolean // ダイアログを開いているか
    isDeleting: boolean // 削除APIの実行中フラグ
    errorMessage: string | null // 削除に失敗した理由
    onConfirm: () => void // 削除を実行する処理
    onDismiss: () => void // 削除を取り消して閉じる処理
}

// アカウント削除前に、関連データも削除されることを明示する確認UI
export function AccountDeleteDialog({
    open,
    isDeleting,
    errorMessage,
    onConfirm,
    onDismiss,
}: AccountDeleteDialogProps) {
    // フォーカスを閉じ込めるダイアログ
    const dialogRef = useRef<HTMLDivElement>(null)
    // 開く前に操作していた要素（閉じた後の戻り先）
    const returnFocusRef = useRef<HTMLElement | null>(null)

    // 閉じている間は、最後にフォーカスしていた要素を戻り先として覚える
    useEffect(() => {
        // 表示中はダイアログ内の要素を戻り先にしない
        if (open) {
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
    }, [open])

    // 開いたらダイアログへフォーカスを移し、閉じたら元の要素へ戻す
    useEffect(() => {
        // 閉じている間はフォーカスを動かさない
        if (!open) {
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
    }, [open])

    // 親が開閉状態を管理するため、閉じている間はDOMと操作対象を生成しない。
    if (!open) {
        return null
    }

    // Tabキーの循環とEscapeキーでの閉じる操作を扱う
    function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        // Escapeでは削除中を除いて閉じる
        if (event.key === "Escape") {
            // 削除処理中に閉じると結果を確認できないため閉じない
            if (!isDeleting) {
                event.preventDefault()
                onDismiss()
            }

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

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
            role="presentation"
        >
            <div
                ref={dialogRef}
                className="w-full max-w-md outline-none"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="account-delete-title"
                aria-describedby="account-delete-description"
                tabIndex={-1}
                onKeyDown={handleDialogKeyDown}
            >
                <Card className="border-red-200 bg-white shadow-2xl">
                    <CardHeader className="border-b border-red-100">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <CardTitle
                                    id="account-delete-title"
                                    className="flex items-center gap-2 text-red-800"
                                >
                                    <AlertTriangle className="size-5" />
                                    アカウントを削除しますか？
                                </CardTitle>
                                <CardDescription
                                    id="account-delete-description"
                                    className="mt-2 text-slate-600"
                                >
                                    この操作は元に戻せません。
                                </CardDescription>
                            </div>

                            {!isDeleting && (
                                <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label="アカウント削除ダイアログを閉じる"
                                    onClick={onDismiss}
                                >
                                    <X />
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-3 py-5">
                        <p className="text-sm leading-6 text-slate-700">
                            Googleログイン情報、ログインセッション、保存した構成がすべて削除されます。
                            localStorageに残っている構成は削除されません。
                        </p>

                        {errorMessage && (
                            <p
                                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                                role="alert"
                            >
                                {errorMessage}
                            </p>
                        )}
                    </CardContent>

                    <CardFooter className="justify-end gap-2">
                        {/* API処理中は閉じる操作を止め、削除結果の表示を維持する。 */}
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isDeleting}
                            onClick={onDismiss}
                        >
                            キャンセル
                        </Button>
                        {/* 確認ボタンは親のAPI処理を呼び出し、状態更新はAuthProviderが行う。 */}
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={onConfirm}
                        >
                            {isDeleting ? "削除中…" : "アカウントを削除"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}

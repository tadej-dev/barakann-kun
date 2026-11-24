import {CloudUpload, X} from "lucide-react"
import {useEffect, useRef, useState, type KeyboardEvent} from "react"

import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Checkbox} from "@/components/ui/checkbox"
import type {MigrationCandidate} from "@/lib/local-config-sync"

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

type SavedBuildMigrationDialogProps = {
    open: boolean // 表示可否
    candidates: MigrationCandidate[] // 候補
    remainingSlots: number // 保存できる残り枠(0〜20件)
    replacesInitialConfig: boolean // 初期構成の置き換え
    counts: {duplicate: number; new: number; overLimit: number} // 判定件数
    serverConfigs: {id: string; name: string; parts: number}[] // アカウント構成
    onDeleteServerConfig: (configId: string) => void // 構成の削除
    selectedIds: string[] // 選択ID
    isSubmitting: boolean // 保存中
    errorMessage?: string // エラー理由
    onToggle: (configId: string, checked: boolean) => void // 選択切替
    onConfirm: () => void // 保存
    onDismiss: () => void // 閉じる
}

// ブラウザの構成をアカウントへ引き継ぐ確認ダイアログ
export function SavedBuildMigrationDialog({
    open,
    candidates,
    remainingSlots,
    replacesInitialConfig,
    counts,
    serverConfigs,
    onDeleteServerConfig,
    selectedIds,
    isSubmitting,
    errorMessage = "",
    onToggle,
    onConfirm,
    onDismiss,
}: SavedBuildMigrationDialogProps) {
    // 削除確認中のID
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
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

    // 閉じている間は何も描画しない
    if (!open) {
        return null
    }

    // Tabキーの循環とEscapeキーでの閉じる操作を扱う
    function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        // Escapeでは保存中を除いて閉じる
        if (event.key === "Escape") {
            // 保存中に閉じると二重送信になるため閉じない
            if (!isSubmitting) {
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

    // 選択件数が保存できる残り枠を超えているか
    const isOverCapacity = selectedIds.length > remainingSlots
    // 選択済み構成があり、残り枠内で保存中でないときだけ確定できる
    const canConfirm = selectedIds.length > 0 &&
        !isOverCapacity &&
        !isSubmitting

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
                aria-labelledby="saved-build-migration-title"
                aria-describedby="saved-build-migration-description"
                tabIndex={-1}
                onKeyDown={handleDialogKeyDown}
            >
                <Card className="border-slate-200 bg-white shadow-2xl">
                    <CardHeader className="border-b border-slate-100">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <CardTitle
                                    id="saved-build-migration-title"
                                    className="flex items-center gap-2 text-slate-900"
                                >
                                    <CloudUpload className="size-5 text-sky-600" />
                                    構成をアカウントへ保存
                                </CardTitle>
                                <CardDescription
                                    id="saved-build-migration-description"
                                    className="mt-2 text-slate-600"
                                >
                                    このブラウザに保存された構成を、ログイン中のアカウントへ保存できます。
                                    保存する構成を選んでください。
                                </CardDescription>
                            </div>

                            {!isSubmitting && (
                                <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label="移行ダイアログを閉じる"
                                    onClick={onDismiss}
                                >
                                    <X />
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4 py-5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                            <span>保存できる残り枠: {remainingSlots}件</span>
                            <span>{selectedIds.length}件を選択中</span>
                        </div>

                        <p className="text-xs text-slate-600">
                            一致 {counts.duplicate}件 / 新規 {counts.new}件 /
                            上限超過 {counts.overLimit}件
                        </p>

                        {replacesInitialConfig && (
                            <p className="rounded-md bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">
                                ログイン時に作成された空の「構成1」は、選択した構成で置き換えます。
                            </p>
                        )}

                        <ul className="max-h-72 space-y-2 overflow-auto">
                            {candidates.map(({config, status}) => {
                                // 重複だけを選べない。上限超過は他の選択を外せば選べる
                                const selectable = status !== "duplicate"
                                const checked = selectable &&
                                    selectedIds.includes(config.id)

                                return (
                                    <li key={config.id}>
                                        <label className="flex items-start gap-3 rounded-md border border-slate-200 p-3">
                                            <Checkbox
                                                checked={checked}
                                                disabled={!selectable || isSubmitting}
                                                aria-label={`${config.name}を引き継ぐ`}
                                                onCheckedChange={(next) =>
                                                    onToggle(config.id, next === true)}
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium text-slate-900">
                                                    {config.name}
                                                </span>
                                                <span className="block text-xs text-slate-500">
                                                    {config.parts.length}パーツ
                                                    {status === "duplicate" && " ・移行済み"}
                                                    {status === "over-limit" && " ・残り枠を超えています"}
                                                </span>
                                            </span>
                                        </label>
                                    </li>
                                )
                            })}
                        </ul>

                        <div className="space-y-2 rounded-md border border-slate-200 p-3">
                            <p className="text-xs font-semibold text-slate-700">
                                アカウントの構成（{serverConfigs.length}件）
                            </p>

                            {serverConfigs.length === 0 && (
                                <p className="text-xs text-slate-500">
                                    アカウントには構成がありません。
                                </p>
                            )}

                            <ul className="max-h-40 space-y-1 overflow-auto">
                                {serverConfigs.map((config) => (
                                    <li
                                        key={config.id}
                                        className="flex items-center justify-between gap-2 text-xs text-slate-700"
                                    >
                                        <span className="min-w-0 truncate">
                                            {config.name}
                                            <span className="ml-1 text-slate-400">
                                                {config.parts}パーツ
                                            </span>
                                        </span>

                                        {pendingDeleteId === config.id ? (
                                            <span className="flex shrink-0 gap-1">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => {
                                                        onDeleteServerConfig(config.id)
                                                        setPendingDeleteId(null)
                                                    }}
                                                >
                                                    削除する
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setPendingDeleteId(null)}
                                                >
                                                    やめる
                                                </Button>
                                            </span>
                                        ) : (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                disabled={isSubmitting}
                                                onClick={() => setPendingDeleteId(config.id)}
                                            >
                                                削除
                                            </Button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {errorMessage && (
                            <p
                                role="alert"
                                className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-800"
                            >
                                {errorMessage}
                            </p>
                        )}

                        {isOverCapacity && (
                            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                残り枠を超えています。選択を減らしてください。
                            </p>
                        )}

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmitting}
                                onClick={onDismiss}
                            >
                                保存しない
                            </Button>
                            <Button
                                type="button"
                                disabled={!canConfirm}
                                onClick={onConfirm}
                            >
                                {isSubmitting ? "保存中..." : "選択した構成を保存"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

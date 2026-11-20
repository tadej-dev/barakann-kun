import {CloudUpload, X} from "lucide-react"
import {useState} from "react"

import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Checkbox} from "@/components/ui/checkbox"
import type {MigrationCandidate} from "@/lib/local-config-sync"

type SavedBuildMigrationDialogProps = {
    open: boolean // 表示可否
    candidates: MigrationCandidate[] // 候補
    remainingSlots: number // 残り枠
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

    // 閉じている間は何も描画しない
    if (!open) {
        return null
    }

    // 確定可否
    const isOverCapacity = selectedIds.length > remainingSlots
    const canConfirm = selectedIds.length > 0 &&
        !isOverCapacity &&
        !isSubmitting

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
            role="presentation"
            onKeyDown={(event) => {
                // Escapeで閉じる(保存中は閉じない)
                if (event.key === "Escape" && !isSubmitting) {
                    onDismiss()
                }
            }}
        >
            <div
                className="w-full max-w-md"
                role="dialog"
                aria-modal="true"
                aria-labelledby="saved-build-migration-title"
                aria-describedby="saved-build-migration-description"
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

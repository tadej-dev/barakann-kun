import {CloudUpload, X} from "lucide-react"

import {Button} from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import type {SavedBuildMigrationResult} from "@/lib/saved-build-migration"

type SavedBuildMigrationDialogProps = {
    open: boolean
    configCount: number
    isSubmitting: boolean
    result: SavedBuildMigrationResult | null
    onConfirm: () => void
    onDismiss: () => void
}

// localStorage移行の確認と結果を表示するダイアログ
export function SavedBuildMigrationDialog({
    open,
    configCount,
    isSubmitting,
    result,
    onConfirm,
    onDismiss,
}: SavedBuildMigrationDialogProps) {
    if (!open) {
        return null
    }

    const hasFailed = Boolean(result?.failed.length)
    const isCompleted = result !== null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
            role="presentation"
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
                                    {isCompleted
                                        ? "移行結果を確認してください。"
                                        : `このブラウザに保存された${configCount}件の構成を、ログイン中のアカウントへ保存しますか？`}
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

                    <CardContent className="space-y-3 py-5">
                        {!isCompleted && (
                            <p className="text-sm leading-6 text-slate-600">
                                構成は1件ずつ保存されます。保存に失敗しても、ブラウザ内の構成は削除されません。
                            </p>
                        )}

                        {isCompleted && result && (
                            <div className="space-y-3 text-sm">
                                <p className="font-medium text-emerald-700">
                                    {result.created.length > 0
                                        ? `${result.created.length}件の構成を保存しました。`
                                        : "新しく保存した構成はありません。"}
                                </p>

                                {result.skipped.length > 0 && (
                                    <p className="text-slate-600">
                                        {result.skipped.length}件は移行済みのためスキップしました。
                                    </p>
                                )}

                                {hasFailed && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
                                        <p className="font-medium">
                                            {result.failed.length}件の保存に失敗しました。
                                        </p>
                                        <ul className="mt-2 list-disc space-y-1 pl-5">
                                            {result.failed.map((failure) => (
                                                <li key={failure.configId}>
                                                    構成{failure.configId}：{failure.message}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="justify-end gap-2">
                        {!isCompleted && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmitting}
                                onClick={onDismiss}
                            >
                                今回は移行しない
                            </Button>
                        )}
                        <Button
                            type="button"
                            disabled={isSubmitting}
                            onClick={isCompleted ? onDismiss : onConfirm}
                        >
                            {isSubmitting
                                ? "保存中…"
                                : isCompleted
                                    ? "閉じる"
                                    : "アカウントへ保存"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}


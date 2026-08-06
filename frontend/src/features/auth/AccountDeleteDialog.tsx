import {AlertTriangle, X} from "lucide-react"

import {Button} from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

type AccountDeleteDialogProps = {
    open: boolean
    isDeleting: boolean
    errorMessage: string | null
    onConfirm: () => void
    onDismiss: () => void
}

// アカウント削除前に、関連データも削除されることを明示する確認UI
export function AccountDeleteDialog({
    open,
    isDeleting,
    errorMessage,
    onConfirm,
    onDismiss,
}: AccountDeleteDialogProps) {
    if (!open) {
        return null
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
            role="presentation"
        >
            <div
                className="w-full max-w-md"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="account-delete-title"
                aria-describedby="account-delete-description"
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
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isDeleting}
                            onClick={onDismiss}
                        >
                            キャンセル
                        </Button>
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


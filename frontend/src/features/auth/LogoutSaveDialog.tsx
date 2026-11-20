import {CloudUpload} from "lucide-react"

import {Button} from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import type {LogoutSaveStatus} from "@/features/auth/useLogoutWithSave"

type LogoutSaveDialogProps = {
    status: LogoutSaveStatus // ステータス（保存・失敗）
    errorMessage: string // エラー原因
    onRetry: () => void // 再保存
    onSkip: () => void // 保存なしでログアウト
    onCancel: () => void // キャンセル
}

// ログアウト前に、構成をブラウザへ保存していることを知らせるダイアログ
export function LogoutSaveDialog({
    status,
    errorMessage,
    onRetry,
    onSkip,
    onCancel,
}: LogoutSaveDialogProps) {
    // 保存していないときは何も描画しない
    if (status === "idle") {
        return null
    }

    const isSaving = status === "saving"

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
            role="presentation"
        >
            <div
                className="w-full max-w-md"
                role="dialog"
                aria-modal="true"
                aria-labelledby="logout-save-title"
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
                                : "構成を保存できませんでした"}
                        </CardTitle>
                        <CardDescription className="mt-2 text-slate-600">
                            {isSaving
                                ? "保存が終わるとログアウトします。画面を閉じないでください。"
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
                            ) : (
                                <>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={onCancel}
                                    >
                                        キャンセル
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onSkip}
                                    >
                                        保存せずログアウト
                                    </Button>
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

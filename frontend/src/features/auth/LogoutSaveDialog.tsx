import {CloudUpload} from "lucide-react"

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
    // 保存していないときは何も描画しない
    if (status === "idle") {
        return null
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

import {Button} from "@/components/ui/button"

type ConfigListNoticesProps = {
    slotsErrorMessage: string // 固定枠の取得・保存エラー
    savedBuildsErrorMessage: string // 追加構成一覧の取得・保存エラー
    savedBuildErrorMessage: string // 追加構成の読み込みエラー
    configOrderErrorMessage: string // 表示順の取得・保存エラー
    onReloadSavedBuilds: () => void
    onReloadConfigOrder: () => void
}

// 構成一覧の下に出す通知(エラー)
export function ConfigListNotices({
    slotsErrorMessage,
    savedBuildsErrorMessage,
    savedBuildErrorMessage,
    configOrderErrorMessage,
    onReloadSavedBuilds,
    onReloadConfigOrder,
}: ConfigListNoticesProps) {
    // 複数のエラーがあっても、先に起きた順の1件だけを表示する。
    const errorMessage = slotsErrorMessage ||
        savedBuildsErrorMessage ||
        savedBuildErrorMessage ||
        configOrderErrorMessage
    // 再読み込みで回復できるのは、一覧と表示順の取得エラーだけ
    const canReload = Boolean(savedBuildsErrorMessage || configOrderErrorMessage)

    return (
        <>
            {/* API失敗を一覧の外へ逃がさず、再読み込み可能な状態として表示する。 */}
            {errorMessage && (
                <div
                    className="flex items-start justify-between gap-3 rounded-lg border border-red-200 group-data-[collapsible=icon]:hidden bg-red-50 p-3 text-sm text-red-800"
                    role="alert"
                >
                    <span>
                        {errorMessage}
                    </span>
                    {canReload && (
                        <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={() => {
                                if (savedBuildsErrorMessage) {
                                    onReloadSavedBuilds()
                                }

                                if (configOrderErrorMessage) {
                                    onReloadConfigOrder()
                                }
                            }}
                        >
                            再読み込み
                        </Button>
                    )}
                </div>
            )}
        </>
    )
}

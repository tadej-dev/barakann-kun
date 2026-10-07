import {Button} from "@/components/ui/button"
import type {
    AutoSaveConflict,
    AutoSaveConflictResolution,
} from "@/features/simulator/useConfigAutoSave"

type AutoSaveConflictAlertProps = {
    conflict: AutoSaveConflict | null // 別端末の更新とぶつかった構成
    onResolve: (resolution: AutoSaveConflictResolution) => void
}

// 自動保存の競合通知
// 別端末の更新を上書きしないため、最新取得か現在端末の上書きを選ばせる。
export function AutoSaveConflictAlert({
    conflict,
    onResolve,
}: AutoSaveConflictAlertProps) {
    if (!conflict) {
        return null
    }

    return (
        <div
            className="flex flex-col gap-3 rounded-lg border border-amber-300 group-data-[collapsible=icon]:hidden bg-amber-50 p-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
            role="alert"
        >
            <span>
                別の端末で構成が更新されています。保存方法を選択してください。
            </span>
            <div className="flex shrink-0 gap-2">
                <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => onResolve("reload")}
                >
                    最新を読み込む
                </Button>
                <Button
                    type="button"
                    size="xs"
                    variant="destructive"
                    onClick={() => onResolve("overwrite")}
                >
                    この端末で上書き
                </Button>
            </div>
        </div>
    )
}

import {AlertDialog} from "@base-ui/react/alert-dialog"
import {Columns3, Plus, Trash2} from "lucide-react"
import {useState} from "react"

import {
    BuildComparisonDialog,
    type ComparisonBuild,
} from "@/components/simulator/BuildComparisonDialog"
import {
    actionButtonClassName,
    actionButtonLabelClassName,
    RailTooltip,
} from "@/components/simulator/config-list/RailTooltip"
import {buttonVariants, Button} from "@/components/ui/button"
import type {ConfigId} from "@/features/simulator/simulatorTypes"
import type {Category} from "@/types/category"

type ConfigListActionsProps = {
    categories: Category[] // 比較画面のスロット表示名
    comparisonBuilds: ComparisonBuild[] // 比較できる構成
    isAuthenticated: boolean
    isAuthLoading: boolean
    activeConfigId: ConfigId // ログイン前のクリア対象
    canCreate: boolean // 保存枠に空きがあり、操作中でないか
    isOperating: boolean // 通信中は一括削除を止める
    selectedCount: number // 一括削除の対象件数
    onCreate: () => void // 追加ダイアログを開く
    onDeleteSelected: () => void // 一括削除の確認を開く
    onClearActiveConfig: () => void // ログイン前の構成クリア
}

// 構成一覧の操作ボタン(比較・追加・一括削除、ログイン前はクリア)
export function ConfigListActions({
    categories,
    comparisonBuilds,
    isAuthenticated,
    isAuthLoading,
    activeConfigId,
    canCreate,
    isOperating,
    selectedCount,
    onCreate,
    onDeleteSelected,
    onClearActiveConfig,
}: ConfigListActionsProps) {
    // クリア確認ダイアログの開閉状態（トリガーがツールチップ付きのボタンのため制御する）
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)
    // 認証確認が終わり、ログインしていない状態か
    const isGuest = !isAuthenticated && !isAuthLoading

    return (
        <>
            <div className="grid grid-cols-1 gap-2 px-2 group-data-[collapsible=icon]:px-0">
                <BuildComparisonDialog
                    builds={comparisonBuilds}
                    categories={categories}
                    renderTrigger={({disabled, title, onOpen}) => (
                        <RailTooltip label="比較">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className={actionButtonClassName}
                                disabled={disabled}
                                title={title}
                                onClick={onOpen}
                            >
                                <Columns3 />
                                <span className={actionButtonLabelClassName}>比較</span>
                            </Button>
                        </RailTooltip>
                    )}
                />

                {isAuthenticated && (
                    <>
                        {/* 追加ボタンは保存枠の上限、削除ボタンは選択件数に応じて操作可否を決める。 */}
                        <RailTooltip label="追加">
                            <Button
                                type="button"
                                size="sm"
                                className={actionButtonClassName}
                                disabled={!canCreate}
                                title="現在の選択パーツを新しい構成として保存"
                                aria-label="新しい構成を追加"
                                onClick={onCreate}
                            >
                                <Plus />
                                <span className={actionButtonLabelClassName}>追加</span>
                            </Button>
                        </RailTooltip>
                        <RailTooltip label="一括削除">
                            <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className={actionButtonClassName}
                                disabled={isOperating || selectedCount === 0}
                                title={
                                    selectedCount > 0
                                        ? `選択した${selectedCount}件の追加構成を削除`
                                        : "削除する追加構成を選択してください"
                                }
                                aria-label={`選択した追加構成を一括削除（${selectedCount}件）`}
                                onClick={onDeleteSelected}
                            >
                                <Trash2 />
                                <span className={actionButtonLabelClassName}>一括削除</span>
                            </Button>
                        </RailTooltip>
                    </>
                )}

                {isGuest && (
                    // 未ログイン時は現在の固定枠だけを確認ダイアログ付きでクリアできる。
                    <RailTooltip label={`構成${activeConfigId}をクリア`}>
                        <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className={actionButtonClassName}
                            onClick={() => setIsClearDialogOpen(true)}
                        >
                            <Trash2 />
                            <span className={actionButtonLabelClassName}>
                                構成{activeConfigId}をクリア
                            </span>
                        </Button>
                    </RailTooltip>
                )}
            </div>

            {isGuest && (
                <AlertDialog.Root
                    open={isClearDialogOpen}
                    onOpenChange={setIsClearDialogOpen}
                >
                    <AlertDialog.Portal>
                        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0"/>
                        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 text-foreground shadow-xl transition-[scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                            <AlertDialog.Title className="text-base font-bold">
                                構成{activeConfigId}をクリアしますか？
                            </AlertDialog.Title>
                            <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                                選択中のパーツがすべて解除されます。
                                <br/>
                                この操作は元に戻せません。
                            </AlertDialog.Description>

                            <div className="mt-5 flex justify-center gap-2">
                                <AlertDialog.Close
                                    className={buttonVariants({
                                        variant: "destructive",
                                    })}
                                    onClick={onClearActiveConfig}
                                >
                                    クリアする
                                </AlertDialog.Close>
                                <AlertDialog.Close
                                    className={buttonVariants({
                                        variant: "outline",
                                    })}
                                >
                                    キャンセル
                                </AlertDialog.Close>
                            </div>
                        </AlertDialog.Popup>
                    </AlertDialog.Portal>
                </AlertDialog.Root>
            )}
        </>
    )
}

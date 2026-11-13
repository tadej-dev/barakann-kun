import {Columns3, Plus, Trash2} from "lucide-react"

import {
    BuildComparisonDialog,
    type ComparisonBuild,
} from "@/components/simulator/BuildComparisonDialog"
import {
    actionButtonClassName,
    actionButtonLabelClassName,
    RailTooltip,
} from "@/components/simulator/config-list/RailTooltip"
import {Button} from "@/components/ui/button"
import type {Category} from "@/types/category"

type ConfigListActionsProps = {
    categories: Category[] // 比較画面のスロット表示名
    comparisonBuilds: ComparisonBuild[] // 比較できる構成
    isAuthenticated: boolean
    canCreate: boolean // 保存枠に空きがあり、操作中でないか
    isOperating: boolean // 通信中は一括削除を止める
    selectedCount: number // 一括削除の対象件数
    onCreate: () => void // 追加ダイアログを開く
    onDeleteSelected: () => void // 一括削除の確認を開く
}

// 構成一覧の操作ボタン(比較・追加・一括削除)
export function ConfigListActions({
    categories,
    comparisonBuilds,
    isAuthenticated,
    canCreate,
    isOperating,
    selectedCount,
    onCreate,
    onDeleteSelected,
}: ConfigListActionsProps) {
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

                {/* 未ログイン時もログイン時と同じ位置に並べ、保存先が無い間は無効にする。 */}
                        {/* 追加ボタンは保存枠の上限、削除ボタンは選択件数に応じて操作可否を決める。 */}
                <RailTooltip label={isAuthenticated ? "追加" : "ログインすると保存できます"}>
                    <Button
                        type="button"
                        size="sm"
                        className={actionButtonClassName}
                        disabled={!isAuthenticated || !canCreate}
                        title={isAuthenticated
                            ? "現在の選択パーツを新しい構成として保存"
                            : "保存はログイン後に利用できます"}
                        aria-label="新しい構成を追加"
                        onClick={onCreate}
                    >
                        <Plus />
                        <span className={actionButtonLabelClassName}>追加</span>
                    </Button>
                </RailTooltip>
                <RailTooltip label={isAuthenticated ? "一括削除" : "ログインすると削除できます"}>
                    <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className={actionButtonClassName}
                        disabled={!isAuthenticated || isOperating || selectedCount === 0}
                        title={
                            !isAuthenticated
                                ? "一括削除はログイン後に利用できます"
                                : selectedCount > 0
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

            </div>

        </>
    )
}

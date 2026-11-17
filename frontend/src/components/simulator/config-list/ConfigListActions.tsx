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
    isAuthLoading: boolean // 認証確認中は操作させない
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
    isAuthLoading,
    canCreate,
    isOperating,
    selectedCount,
    onCreate,
    onDeleteSelected,
}: ConfigListActionsProps) {
    return (
        <>
            {/* 余白はSidebarHeaderのp-2に任せ、一覧のカードと横幅を揃える */}
            <div className="grid w-full min-w-0 grid-cols-1 gap-2 group-data-[collapsible=icon]:justify-items-center">
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

                {/* 追加ボタンは保存枠の上限、削除ボタンは選択件数に応じて操作可否を決める。 */}
                <RailTooltip label="追加">
                    <Button
                        type="button"
                        size="sm"
                        className={actionButtonClassName}
                        disabled={isAuthLoading || !canCreate}
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
                        disabled={isAuthLoading || isOperating || selectedCount === 0}
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

            </div>

        </>
    )
}

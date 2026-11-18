import type {ReactNode} from "react"

import type {SavedBuild} from "@/api/savedBuilds"
import type {ComparisonBuild} from "@/components/simulator/BuildComparisonDialog"
import {ConfigListActions} from "@/components/simulator/config-list/ConfigListActions"
import {ConfigListDialogs} from "@/components/simulator/config-list/ConfigListDialogs"
import {ConfigListNotices} from "@/components/simulator/config-list/ConfigListNotices"
import {SavedBuildListItem} from "@/components/simulator/config-list/SavedBuildListItem"
import {Sortable} from "@/components/reui/sortable"
import {Badge} from "@/components/ui/badge"
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarRail,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import type {Category} from "@/types/category"
import type {
    ConfigId,
    SelectedParts,
} from "@/features/simulator/simulatorTypes"
import {configItemKey} from "@/features/saved-builds/configRules"
import type {ConfigCollection} from "@/features/simulator/useConfigCollection"
import {useConfigListController} from "@/features/simulator/useConfigListController"

type ConfigListProps = {
    categories: Category[] // 比較画面のスロット表示名
    collection: ConfigCollection // 構成データと保存処理
    activeConfigId: ConfigId // 選択中の構成ID
    selectedParts: SelectedParts // 現在選択中の構成のパーツ
    isConfigLoading: boolean // 構成の読み込み状態
    configErrorMessage: string // 構成の読み込みエラー
    onConfigChange: (configId: ConfigId) => void // 構成の選択
    onConfigSelect: (config: SavedBuild) => void | Promise<void> // 保存済み構成の読み込み
    onConfigPrefetch: (config: SavedBuild) => void // 構成の先読み
    onClearConfig: (configId: ConfigId) => void // 編集中の構成の初期化
    children?: ReactNode // 一覧の下に差し込む通知(自動保存の競合など)
}

// 構成選択欄(サイドバー)
// 一覧の操作だけを受け持ち、データの取得と自動保存は上位(Simulator)で行う。
export function ConfigList({
    categories,
    collection,
    activeConfigId,
    selectedParts,
    isConfigLoading,
    configErrorMessage,
    onConfigChange,
    onConfigSelect,
    onConfigPrefetch,
    onClearConfig,
    children,
}: ConfigListProps) {
    const {
        isAuthLoading,
        isConfigListReady,
        isConfigsLoading,
        isLoadingConfigOrder,
        isSavingConfigOrder,
        orderedConfigs,
        totalSavedCount,
    } = collection
    const controller = useConfigListController({
        collection,
        activeConfigId,
        selectedParts,
        isConfigLoading,
        onConfigChange,
        onClearConfig,
    })

    // 比較ダイアログに渡す構成。一覧と同じ並び順で渡す
    const comparisonBuilds: ComparisonBuild[] = orderedConfigs.map((config) => ({
        key: configItemKey(config.id),
        name: config.name,
        parts: config.parts,
    }))

    // 一覧表示後の再取得中か(初回は枠の表示で代用する)
    const isReloading = isConfigListReady && (
        isConfigsLoading ||
        isLoadingConfigOrder
    )

    return (
        <Sidebar
            collapsible="icon"
            className="sticky! top-16! bottom-auto! h-[calc(100svh-4rem)]! py-4! pl-4! pr-0! group-data-[collapsible=icon]:pl-0! border-r-0! [&>[data-slot=sidebar-inner]]:overflow-hidden [&>[data-slot=sidebar-inner]]:rounded-lg [&>[data-slot=sidebar-inner]]:border [&>[data-slot=sidebar-inner]]:border-slate-300"
        >
            <SidebarHeader className="group-data-[collapsible=icon]:overflow-hidden">
                {/* 見出し(閉じたレールでは開閉ボタンだけを表示) */}
                <div className="flex min-h-8 min-w-0 items-center gap-2 px-2 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                    <SidebarTrigger
                        aria-label="構成選択を開閉"
                        className="shrink-0"
                    />
                    <span className="text-sm font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                        構成選択
                    </span>
                    {/* 構成の使用数を、上限とあわせて表示する */}
                    <Badge
                        variant="secondary"
                        className="group-data-[collapsible=icon]:hidden"
                        aria-label="構成数"
                        title="構成の使用数"
                    >
                        {isAuthLoading || isConfigsLoading
                            ? `… / ${collection.maxConfigs}`
                            : `${totalSavedCount} / ${collection.maxConfigs}`}
                    </Badge>
                </div>

                <ConfigListActions
                    categories={categories}
                    comparisonBuilds={comparisonBuilds}
                    isAuthLoading={isAuthLoading}
                    canCreate={controller.canCreate}
                    isOperating={controller.isOperating}
                    selectedCount={controller.selectedDeletableConfigs.length}
                    onCreate={controller.openCreateDialog}
                    onDeleteSelected={controller.openDeleteSelectedDialog}
                />
            </SidebarHeader>

            <SidebarContent className="gap-3 px-2 pb-2">
                {/* 初回の読み込み中(並び順が確定するまで一覧を出さない) */}
                {!isConfigListReady && (
                    <ul
                        className="grid grid-cols-1 gap-2 p-0"
                        role="status"
                        aria-label="構成を読み込んでいます"
                    >
                        <li className="h-16 animate-pulse rounded-lg border bg-slate-100 group-data-[collapsible=icon]:h-8" />
                        <li className="h-16 animate-pulse rounded-lg border bg-slate-100 group-data-[collapsible=icon]:h-8" />
                        <li className="h-16 animate-pulse rounded-lg border bg-slate-100 group-data-[collapsible=icon]:h-8" />
                    </ul>
                )}

                {isReloading && (
                    <p className="text-sm text-muted-foreground group-data-[collapsible=icon]:hidden" role="status">
                        構成を読み込んでいます…
                    </p>
                )}

                {/* すべての構成を同じカードで並べる */}
                {isConfigListReady && (
                    <div className="w-full overflow-hidden rounded-lg">
                        <Sortable
                            value={orderedConfigs}
                            onValueChange={controller.changeConfigOrder}
                            getItemValue={(config) => configItemKey(config.id)}
                            strategy="grid"
                            render={<ul className="grid grid-cols-1 gap-2 p-0" />}
                        >
                            {orderedConfigs.map((config, index) => (
                                <SavedBuildListItem
                                    key={config.id}
                                    itemKey={configItemKey(config.id)}
                                    build={config}
                                    index={index}
                                    isActive={config.id === activeConfigId}
                                    isOperating={controller.isOperating || isSavingConfigOrder}
                                    isChecked={controller.selectedConfigIds.includes(config.id)}
                                    canDelete={controller.canDelete}
                                    onSelect={() => void onConfigSelect(config)}
                                    onPrefetch={() => onConfigPrefetch(config)}
                                    onRename={() => controller.openRenameDialog(config)}
                                    onClear={() => controller.openClearDialog(config)}
                                    onDelete={() => controller.openDeleteDialog(config)}
                                    onCheckedChange={(checked) =>
                                        controller.toggleConfigSelection(config.id, checked)}
                                />
                            ))}
                        </Sortable>
                    </div>
                )}

                <ConfigListNotices
                    configsErrorMessage={collection.configsErrorMessage}
                    configErrorMessage={configErrorMessage}
                    configOrderErrorMessage={collection.configOrderErrorMessage}
                    onReloadConfigs={() => void collection.reloadConfigs()}
                    onReloadConfigOrder={() => void collection.reloadConfigOrder()}
                />

                {children}
            </SidebarContent>

            <ConfigListDialogs controller={controller} />

            <SidebarRail className="after:hidden" />
        </Sidebar>
    )
}

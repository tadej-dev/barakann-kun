import type {ReactNode} from "react"

import {MAX_SAVED_BUILDS, type SavedBuild} from "@/api/savedBuilds"
import type {ComparisonBuild} from "@/components/simulator/BuildComparisonDialog"
import {ConfigListActions} from "@/components/simulator/config-list/ConfigListActions"
import {ConfigListDialogs} from "@/components/simulator/config-list/ConfigListDialogs"
import {ConfigListNotices} from "@/components/simulator/config-list/ConfigListNotices"
import {ConfigSlotListItem} from "@/components/simulator/config-list/ConfigSlotListItem"
import {SavedBuildListItem} from "@/components/simulator/config-list/SavedBuildListItem"
import {useShareActions} from "@/components/simulator/config-list/useShareActions"
import {Sortable} from "@/components/reui/sortable"
import {Badge} from "@/components/ui/badge"
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import {
    CONFIG_IDS,
    type ConfigId,
    type ConfigStates,
    type SelectedParts,
} from "@/features/simulator/simulatorTypes"
import type {ConfigCollection} from "@/features/simulator/useConfigCollection"
import {useConfigListController} from "@/features/simulator/useConfigListController"
import type {Category} from "@/types/category"

// 構成一覧のプロパティ
type ConfigListProps = {
    categories: Category[] // 比較画面のスロット表示名
    collection: ConfigCollection // 構成データ(固定枠・追加構成・表示順)と保存処理
    activeConfigId: ConfigId // 選択中の構成ID
    activeSavedBuildId: string | null // 選択中の追加構成ID
    configStates: ConfigStates // 構成1〜4の選択パーツ(ログイン前の比較に使う)
    selectedParts: SelectedParts // 現在選択中の構成のパーツ(追加・保存に使う)
    isSavedBuildLoading: boolean // 追加構成の読み込み状態
    savedBuildErrorMessage: string // 追加構成の読み込みエラー
    onConfigChange: (configId: ConfigId) => void // 固定枠の選択
    onSavedBuildSelect: (build: SavedBuild) => void | Promise<void> // 追加構成の選択
    onSavedBuildPrefetch: (build: SavedBuild) => void // 追加構成の先読み
    onClearActiveConfig: () => void // ログイン前の選択中構成の初期化
    onClearConfig: (configId: ConfigId) => Promise<void> // 固定枠の初期化
    children?: ReactNode // 一覧の下に差し込む通知(自動保存の競合など)
}

// 構成選択欄(サイドバー)
// 一覧の操作だけを受け持ち、データの取得と自動保存は上位(Simulator)で行う。
export function ConfigList({
    categories,
    collection,
    activeConfigId,
    activeSavedBuildId,
    configStates,
    selectedParts,
    isSavedBuildLoading,
    savedBuildErrorMessage,
    onConfigChange,
    onSavedBuildSelect,
    onSavedBuildPrefetch,
    onClearActiveConfig,
    onClearConfig,
    children,
}: ConfigListProps) {
    const {
        isAuthenticated,
        isAuthLoading,
        isConfigListReady,
        isSlotsLoading,
        isLoadingConfigOrder,
        isSavedBuildsLoading,
        orderedItems,
        totalSavedCount,
    } = collection
    const controller = useConfigListController({
        collection,
        activeConfigId,
        activeSavedBuildId,
        selectedParts,
        isSavedBuildLoading,
        onConfigChange,
        onClearConfig,
    })
    const share = useShareActions(collection)

    // 比較ダイアログに渡す構成。ログイン後は保存済みの構成、ログイン前は手元の構成1〜4。
    const comparisonBuilds: ComparisonBuild[] = isAuthenticated
        ? orderedItems.map((item) => item.kind === "slot"
            ? {
                key: item.key,
                name: item.slot.name,
                parts: item.slot.parts,
            }
            : {
                key: item.key,
                name: item.build.name,
                parts: item.build.parts,
            })
        : CONFIG_IDS.map((configId) => ({
            key: `config:${configId}`,
            name: `構成${configId}`,
            parts: Object.entries(configStates[configId]).map(([
                slotKey,
                part,
            ]) => ({
                slotKey,
                partId: part.id,
                price: part.price,
                weight: part.weight,
            })),
        }))
    // 認証確認が終わり、ログインしていない状態か
    const isGuest = !isAuthenticated && !isAuthLoading
    // 一覧表示後の再取得中か(初回は枠の表示で代用する)
    const isReloading = isConfigListReady && (
        isSlotsLoading ||
        isLoadingConfigOrder ||
        isSavedBuildLoading
    )

    return (
        <Sidebar
            collapsible="icon"
            variant="floating"
            // フッターに重ならないよう、ページ本体の範囲内に収める。
            className="sticky! top-16! bottom-auto! h-[calc(100svh-4rem)]! py-4! pl-4! pr-0!"
        >
            <SidebarHeader>
                {/* 見出し(閉じたレールでは開閉ボタンだけを表示) */}
                <div className="flex min-h-8 items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                    <SidebarTrigger
                        aria-label="構成選択を開閉"
                        className="shrink-0"
                    />
                    <span className="text-sm font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                        構成選択
                    </span>
                    {/* 構成1〜4も保存枠に含める */}
                    {isAuthenticated && (
                        <Badge
                            variant="secondary"
                            className="group-data-[collapsible=icon]:hidden"
                            aria-label="保存枠使用数"
                            title="構成1〜4を含むアカウントの保存枠使用数"
                        >
                            {isSlotsLoading || isSavedBuildsLoading
                                ? `… / ${MAX_SAVED_BUILDS}`
                                : `${totalSavedCount} / ${MAX_SAVED_BUILDS}`}
                        </Badge>
                    )}
                </div>

                <ConfigListActions
                    categories={categories}
                    comparisonBuilds={comparisonBuilds}
                    isAuthenticated={isAuthenticated}
                    isAuthLoading={isAuthLoading}
                    activeConfigId={activeConfigId}
                    canCreate={controller.canCreateSavedBuild}
                    isOperating={controller.isOperating}
                    selectedCount={controller.selectedSavedBuilds.length}
                    onCreate={controller.openCreateSavedBuildDialog}
                    onDeleteSelected={controller.openDeleteSelectedBuildsDialog}
                    onClearActiveConfig={onClearActiveConfig}
                />
            </SidebarHeader>

            <SidebarContent className="gap-3 px-2 pb-2">
                {/* ログイン前の構成1〜4 */}
                {isGuest && (
                    <SidebarMenu className="gap-1">
                        {CONFIG_IDS.map((configId) => {
                            const isActive = configId === activeConfigId

                            return (
                                <SidebarMenuItem key={configId}>
                                    <SidebarMenuButton
                                        isActive={isActive}
                                        aria-selected={isActive}
                                        tooltip={`構成${configId}`}
                                        className="font-bold data-active:bg-sky-50 data-active:text-sky-950"
                                        onClick={() => onConfigChange(configId)}
                                    >
                                        <span className="flex size-4 shrink-0 items-center justify-center text-xs">
                                            {configId}
                                        </span>
                                        <span>
                                            構成{configId}
                                        </span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )
                        })}
                    </SidebarMenu>
                )}

                {/* 初回の読み込み中(並び順が確定するまで一覧を出さない) */}
                {(isAuthLoading || (isAuthenticated && !isConfigListReady)) && (
                    <ul
                        className="grid grid-cols-1 gap-2 p-0"
                        role="status"
                        aria-label="構成を読み込んでいます"
                    >
                        {CONFIG_IDS.map((configId) => (
                            <li
                                key={configId}
                                className="h-16 animate-pulse rounded-lg border bg-slate-100 group-data-[collapsible=icon]:h-8"
                            />
                        ))}
                    </ul>
                )}

                {isAuthenticated && (
                    <>
                        {isReloading && (
                            <p className="text-sm text-muted-foreground group-data-[collapsible=icon]:hidden" role="status">
                                構成を読み込んでいます…
                            </p>
                        )}

                        {/* 固定枠と追加構成を同じ並び替え対象にする */}
                        {isConfigListReady && (
                            <div className="w-full overflow-hidden rounded-lg">
                                <Sortable
                                    value={orderedItems}
                                    onValueChange={controller.changeConfigOrder}
                                    getItemValue={(item) => item.key}
                                    strategy="grid"
                                    render={<ul className="grid grid-cols-1 gap-2 p-0" />}
                                >
                                    {orderedItems.map((item, index) => item.kind === "slot"
                                        ? (
                                            <ConfigSlotListItem
                                                key={item.key}
                                                itemKey={item.key}
                                                slot={item.slot}
                                                index={index}
                                                isActive={
                                                    activeSavedBuildId === null &&
                                                    item.slot.configId === activeConfigId
                                                }
                                                isOperating={controller.isOperating}
                                                share={share}
                                                onSelect={() => onConfigChange(item.slot.configId)}
                                                onRename={() => controller.openNameDialog(item.slot)}
                                                onClear={() => controller.openClearConfirmation(item.slot)}
                                            />
                                        )
                                        : (
                                            <SavedBuildListItem
                                                key={item.key}
                                                itemKey={item.key}
                                                build={item.build}
                                                index={index}
                                                isActive={item.build.id === activeSavedBuildId}
                                                isOperating={controller.isOperating}
                                                isChecked={controller.selectedSavedBuildIds.includes(item.build.id)}
                                                share={share}
                                                onSelect={() => void onSavedBuildSelect(item.build)}
                                                onPrefetch={() => onSavedBuildPrefetch(item.build)}
                                                onSave={() => void controller.saveToSavedBuild(item.build)}
                                                onRename={() => controller.openRenameSavedBuildDialog(item.build)}
                                                onDelete={() => controller.openDeleteSavedBuildDialog(item.build)}
                                                onCheckedChange={(checked) =>
                                                    controller.toggleSavedBuildSelection(item.build.id, checked)}
                                            />
                                        ))}
                                </Sortable>
                            </div>
                        )}

                        <ConfigListNotices
                            shareNotice={share.shareNotice}
                            onDismissShareNotice={share.dismissShareNotice}
                            slotsErrorMessage={collection.slotsErrorMessage}
                            savedBuildsErrorMessage={collection.savedBuildsErrorMessage}
                            savedBuildErrorMessage={savedBuildErrorMessage}
                            configOrderErrorMessage={collection.configOrderErrorMessage}
                            onReloadSavedBuilds={() => void collection.reloadSavedBuilds()}
                            onReloadConfigOrder={() => void collection.reloadConfigOrder()}
                        />

                        {children}
                    </>
                )}
            </SidebarContent>

            <ConfigListDialogs controller={controller} />

            <SidebarRail />
        </Sidebar>
    )
}

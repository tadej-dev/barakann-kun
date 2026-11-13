import {useState} from "react"
import type {ReactNode} from "react"

import {AlertDialog} from "@base-ui/react/alert-dialog"

import type {ConfigSlot} from "@/api/configSlots"
import {MAX_SAVED_BUILDS, type SavedBuild} from "@/api/savedBuilds"
import type {ComparisonBuild} from "@/components/simulator/BuildComparisonDialog"
import {ConfigListActions} from "@/components/simulator/config-list/ConfigListActions"
import {ConfigListDialogs} from "@/components/simulator/config-list/ConfigListDialogs"
import {ConfigListNotices} from "@/components/simulator/config-list/ConfigListNotices"
import {ConfigSlotListItem} from "@/components/simulator/config-list/ConfigSlotListItem"
import {SavedBuildListItem} from "@/components/simulator/config-list/SavedBuildListItem"
import {Sortable} from "@/components/reui/sortable"
import {Badge} from "@/components/ui/badge"
import {buttonVariants} from "@/components/ui/button"
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarRail,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import {
    CONFIG_IDS,
    type ConfigId,
    type ConfigStates,
    type SelectedParts,
} from "@/features/simulator/simulatorTypes"
import {orderSlotsByIds} from "@/features/simulator/configSlotOrder"
import {
    configSlotItemKey,
    type ConfigCollection,
} from "@/features/simulator/useConfigCollection"
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

    // 未ログイン時も、ログイン時と同じカードで構成1〜4を表示する。
    // 保存先がまだ無いため、名前変更は行わず、並び順は画面内だけで保持する。
    const guestSlots: ConfigSlot[] = CONFIG_IDS.map((configId) => ({
        configId,
        name: `構成${configId}`,
        version: 0,
        updatedAt: null,
        parts: Object.entries(configStates[configId]).map(([slotKey, part]) => ({
            slotKey,
            partId: part.id,
            price: part.price,
            weight: part.weight,
        })),
    }))
    const [guestOrder, setGuestOrder] = useState<ConfigId[]>(() => [...CONFIG_IDS])
    // 未ログイン時のクリアは、カードの操作メニューから確認して実行する
    const [clearConfirmId, setClearConfirmId] = useState<ConfigId | null>(null)
    const orderedGuestSlots = orderSlotsByIds(guestSlots, guestOrder)

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
        // 未ログイン時も、一覧の並び順と同じ順で比較できるようにする
        : orderedGuestSlots.map((slot) => ({
            key: configSlotItemKey(slot.configId),
            name: slot.name,
            parts: slot.parts,
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
                    {/* 構成1〜4も保存枠に含める。未ログインでも同じ位置に出す */}
                    <Badge
                        variant="secondary"
                        className="group-data-[collapsible=icon]:hidden"
                        aria-label="保存枠使用数"
                        title="構成1〜4を含む保存枠使用数"
                    >
                        {isAuthLoading || isSlotsLoading || isSavedBuildsLoading
                            ? `… / ${MAX_SAVED_BUILDS}`
                            : `${totalSavedCount} / ${MAX_SAVED_BUILDS}`}
                    </Badge>
                </div>

                <ConfigListActions
                    categories={categories}
                    comparisonBuilds={comparisonBuilds}
                    isAuthenticated={isAuthenticated}
                    canCreate={controller.canCreateSavedBuild}
                    isOperating={controller.isOperating}
                    selectedCount={controller.selectedSavedBuilds.length}
                    onCreate={controller.openCreateSavedBuildDialog}
                    onDeleteSelected={controller.openDeleteSelectedBuildsDialog}
                />
            </SidebarHeader>

            <SidebarContent className="gap-3 px-2 pb-2">
                {/* ログイン前も同じカードで構成1〜4を並べる */}
                {isGuest && (
                    <div className="w-full overflow-hidden rounded-lg">
                        <Sortable
                            value={orderedGuestSlots}
                            onValueChange={(next) => setGuestOrder(
                                next.map((slot) => slot.configId),
                            )}
                            getItemValue={(slot) => configSlotItemKey(slot.configId)}
                            strategy="grid"
                            render={<ul className="grid grid-cols-1 gap-2 p-0" />}
                        >
                            {orderedGuestSlots.map((slot, index) => (
                                <ConfigSlotListItem
                                    key={slot.configId}
                                    itemKey={configSlotItemKey(slot.configId)}
                                    slot={slot}
                                    index={index}
                                    isActive={slot.configId === activeConfigId}
                                    isOperating={false}
                                    // 保存先ができるまでは、名前変更だけを無効にする
                                    isRenameDisabled
                                    onSelect={() => onConfigChange(slot.configId)}
                                    onRename={() => {}}
                                    onClear={() => setClearConfirmId(slot.configId)}
                                />
                            ))}
                        </Sortable>
                    </div>
                )}

                {/* 未ログイン時のクリアも、確認してから実行する */}
                {isGuest && clearConfirmId && (
                    <AlertDialog.Root
                        open
                        onOpenChange={(open) => {
                            if (!open) {
                                setClearConfirmId(null)
                            }
                        }}
                    >
                        <AlertDialog.Portal>
                            <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0"/>
                            <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 text-foreground shadow-xl transition-[scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                                <AlertDialog.Title className="text-base font-bold">
                                    構成{clearConfirmId}をクリアしますか？
                                </AlertDialog.Title>
                                <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                                    この構成のパーツがすべて解除されます。
                                    <br/>
                                    この操作は元に戻せません。
                                </AlertDialog.Description>

                                <div className="mt-5 flex justify-center gap-2">
                                    <AlertDialog.Close
                                        className={buttonVariants({
                                            variant: "destructive",
                                        })}
                                        onClick={() => {
                                            void onClearConfig(clearConfirmId)
                                            setClearConfirmId(null)
                                        }}
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

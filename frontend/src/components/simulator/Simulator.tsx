import {CandidatePartsTable} from "@/components/simulator/candidate-parts/CandidatePartsTable"
import type {CSSProperties} from "react"

import {ConfigList} from "@/components/simulator/ConfigList"
import {AutoSaveConflictAlert} from "@/components/simulator/config-list/AutoSaveConflictAlert"
import {SelectedPartsTable} from "@/components/simulator/SelectedPartsTable"
import {SummaryCards} from "@/components/simulator/SummaryCards"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import {useConfigAutoSave} from "@/features/simulator/useConfigAutoSave"
import {useConfigCollection} from "@/features/simulator/useConfigCollection"
import {
    useSimulatorController,
    type UseSimulatorControllerProps,
} from "@/features/simulator/useSimulatorController"
import type {Category} from "@/types/category"

// シミュレーター画面のプロパティ
type SimulatorProps = {
    categories: Category[]
    savedBuildsReloadKey?: number
    autoSaveEnabled?: boolean
}

// シミュレーター画面
export function Simulator({
                              categories,
                              savedBuildsReloadKey = 0,
                              autoSaveEnabled = true,
                          }: SimulatorProps) {
    const controllerProps: UseSimulatorControllerProps = {
        categories,
        autoSaveEnabled,
    }
    // controllerの戻り値を表示コンポーネントへ配線し、このファイルでは状態を直接変更しない。
    const controller = useSimulatorController(controllerProps)

    // 構成データ(固定枠・追加構成・表示順)は、構成一覧・自動保存・上部カードの構成名で共有するため、ここで1回だけ取得する。
    const collection = useConfigCollection({
        savedBuildsReloadKey,
        activeConfigId: controller.activeConfigId,
        activeSavedBuildId: controller.activeSavedBuildId,
        onConfigChange: controller.changeConfig,
    })
    // 選択中のパーツとサーバーの保存内容を同期する。構成一覧の表示とは独立した処理。
    const autoSave = useConfigAutoSave({
        collection,
        configStates: controller.configs,
        selectedParts: controller.selectedParts,
        activeConfigId: controller.activeConfigId,
        activeSavedBuildId: controller.activeSavedBuildId,
        isSavedBuildLoading: controller.isSavedBuildLoading,
        autoSaveEnabled: controller.autoSaveEnabled,
        onConfigChange: controller.changeConfig,
        onRestoreConfigSlot: controller.restoreConfigSlot,
        onRestoreSavedBuild: controller.selectSavedBuild,
    })

    // 画面レイアウトは表示だけを担当し、選択・保存・復元の状態遷移はcontrollerへ集約する。
    return (
        // サイドバーの幅と配置を、構成一覧に合わせて調整する。
        <SidebarProvider
            className="min-h-[calc(100svh-4rem)] bg-slate-100 [&_[data-slot=sidebar-gap]]:hidden"
            style={{"--sidebar-width": "19rem"} as CSSProperties}
        >
            <ConfigList
                categories={categories}
                collection={collection}
                activeConfigId={controller.activeConfigId}
                activeSavedBuildId={controller.activeSavedBuildId}
                configStates={controller.configs}
                selectedParts={controller.selectedParts}
                isSavedBuildLoading={controller.isSavedBuildLoading}
                savedBuildErrorMessage={controller.savedBuildError}
                onConfigChange={controller.changeConfig}
                onSavedBuildSelect={controller.selectSavedBuild}
                onSavedBuildPrefetch={controller.prefetchSavedBuild}
                onClearActiveConfig={controller.clearActiveConfig}
                onClearConfig={controller.clearConfig}
            >
                {/* 自動保存の競合通知 */}
                <AutoSaveConflictAlert
                    conflict={autoSave.autoSaveConflict}
                    onResolve={(resolution) => void autoSave.resolveAutoSaveConflict(resolution)}
                />
            </ConfigList>

            <SidebarInset className="min-w-0 bg-slate-100 p-4">
                <section className="min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-300 bg-white p-4">
                    {/* スマホ幅でサイドバーを開くボタン */}
                    <div className="mb-3 md:hidden">
                        <SidebarTrigger aria-label="構成選択を開く" />
                    </div>

                    <SummaryCards
                        totalPrice={controller.totalPrice}
                        totalWeight={controller.totalWeight}
                        activeConfigName={collection.activeConfigName}
                    />

                    {controller.restoreError && (
                        <p className="mt-3 text-sm font-medium text-destructive">
                            {controller.restoreError}。ページを再読み込みしてください。
                        </p>
                    )}

                    <div
                        className="mt-4 grid gap-6 [@media_(orientation:landscape)_and_(min-width:1280px)_and_(min-height:900px)]:grid-cols-2 [@media_(orientation:landscape)_and_(min-width:1280px)_and_(min-height:900px)]:gap-4">
                        <SelectedPartsTable
                            categories={categories}
                            activeSlotKey={controller.activeSlot.key}
                            selectedParts={controller.selectedParts}
                            blockedCategoryKeys={controller.blockedCategoryKeys}
                            onSlotChange={controller.changeSlot}
                        />

                        <CandidatePartsTable
                            key={controller.activeSlot.key}
                            parts={controller.activeParts}
                            categories={categories}
                            activeSlot={controller.activeSlot}
                            selectedParts={controller.selectedParts}
                            selectedPart={controller.selectedPart}
                            isLoading={controller.isLoadingParts}
                            errorMessage={controller.partsError}
                            blockedMessage={controller.blockedMessage}
                            blockingCategoryNames={controller.blockingCategoryNames}
                            blockingPartNames={controller.blockingPartNames}
                            slotPositionLabel={controller.slotPositionLabel}
                            frameSelected={Boolean(controller.selectedParts.frame)}
                            onSelectFrame={() => controller.changeCategory("frame")}
                            onSelect={controller.onSelectPart}
                            onRemoveBlockingParts={controller.onRemoveBlockingParts}
                        />
                    </div>
                </section>
            </SidebarInset>
        </SidebarProvider>
    )
}

import {CandidatePartsTable} from "@/components/simulator/candidate-parts/CandidatePartsTable"
import {useEffect} from "react"
import type {CSSProperties} from "react"

import {ConfigList} from "@/components/simulator/ConfigList"
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
    // コントローラーへ渡すカテゴリーと自動保存の有効状態
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
        onConfigChange: controller.changeConfig,
    })
    // 選択中の構成がまだ読み込まれていなければ、保存内容を取得する
    const activeConfig = collection.orderedConfigs.find((config) =>
        config.id === controller.activeConfigId)
    // 選択中構成の内容を読み込み済みか
    const isActiveConfigLoaded = controller.isConfigLoaded(
        controller.activeConfigId,
    )

    useEffect(() => {
        // 一覧準備前・構成未取得・読み込み済みなら選択処理を省略
        if (!collection.isConfigListReady || !activeConfig || isActiveConfigLoaded) {
            return
        }

        void controller.selectConfig(activeConfig)
    }, [activeConfig, collection.isConfigListReady, controller, isActiveConfigLoaded])

    // 選択中のパーツと保存内容を同期する。構成一覧の表示とは独立した処理。
    useConfigAutoSave({
        collection,
        selectedParts: controller.selectedParts,
        activeConfigId: controller.activeConfigId,
        isConfigLoading: controller.isConfigLoading,
        isActiveConfigLoaded,
        autoSaveEnabled: controller.autoSaveEnabled,
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
                selectedParts={controller.selectedParts}
                isConfigLoading={controller.isConfigLoading}
                configErrorMessage={controller.savedBuildError}
                onConfigChange={controller.changeConfig}
                onConfigSelect={controller.selectConfig}
                onConfigPrefetch={controller.prefetchConfig}
                onClearConfig={controller.clearConfig}
            />

            <SidebarInset className="min-w-0 bg-slate-100 p-4">
                <section className="min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-300 bg-white p-4">
                    {/* スマホ幅でサイドバーを開くボタン */}
                    <div className="mb-3 md:hidden">
                        <SidebarTrigger aria-label="構成選択を開く" />
                    </div>

                    <SummaryCards
                        totalsBreakdown={controller.totalsBreakdown}
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

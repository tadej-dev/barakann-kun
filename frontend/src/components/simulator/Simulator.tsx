import {CandidatePartsTable} from "@/components/simulator/candidate-parts/CandidatePartsTable"
import {CategoryList} from "@/components/simulator/CategoryList"
import {SelectedPartsTable} from "@/components/simulator/SelectedPartsTable"
import {SummaryCards} from "@/components/simulator/SummaryCards"
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

    // 画面レイアウトは表示だけを担当し、選択・保存・復元の状態遷移はcontrollerへ集約する。
    return (
        <div className="bg-slate-100 p-4">
            <main className="grid min-h-[calc(100vh-64px)] grid-cols-1 gap-4 lg:grid-cols-[230px_1fr]">
                <aside className="rounded-lg bg-[#101518] p-4 text-white">
                    <CategoryList
                        categories={categories}
                        activeCategory={controller.activeCategory}
                        blockedCategoryKeys={controller.blockedCategoryKeys}
                        onCategoryChange={controller.changeCategory}
                    />
                </aside>

                <section className="min-w-0 overflow-hidden rounded-lg border border-slate-300 bg-white p-4">
                    <SummaryCards
                        totalPrice={controller.totalPrice}
                        totalWeight={controller.totalWeight}
                        activeConfigId={controller.activeConfigId}
                        activeSavedBuildId={controller.activeSavedBuildId}
                        configStates={controller.configs}
                        selectedParts={controller.selectedParts}
                        isSavedBuildLoading={controller.isSavedBuildLoading}
                        savedBuildErrorMessage={controller.savedBuildError}
                        autoSaveEnabled={controller.autoSaveEnabled}
                        onConfigChange={controller.changeConfig}
                        onRestoreSavedBuild={controller.selectSavedBuild}
                        onSavedBuildPrefetch={controller.prefetchSavedBuild}
                        onSavedBuildSelect={controller.selectSavedBuild}
                        onClearActiveConfig={controller.clearActiveConfig}
                        onClearConfig={controller.clearConfig}
                        onRestoreConfigSlot={controller.restoreConfigSlot}
                        savedBuildsReloadKey={savedBuildsReloadKey}
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
                            activeSlot={controller.activeSlot}
                            selectedParts={controller.selectedParts}
                            selectedPart={controller.selectedPart}
                            isLoading={controller.isLoadingParts}
                            errorMessage={controller.partsError}
                            blockedMessage={controller.blockedMessage}
                            blockingCategoryNames={controller.blockingCategoryNames}
                            blockingPartNames={controller.blockingPartNames}
                            slotPositionLabel={controller.slotPositionLabel}
                            onSelect={controller.onSelectPart}
                            onRemoveBlockingParts={controller.onRemoveBlockingParts}
                        />
                    </div>
                </section>
            </main>
        </div>
    )
}

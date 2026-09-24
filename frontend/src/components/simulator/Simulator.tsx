import {CandidatePartsTable} from "@/components/simulator/candidate-parts/CandidatePartsTable"
import {useState, type CSSProperties} from "react"

import {ConfigList} from "@/components/simulator/ConfigList"
import {SelectedPartsTable} from "@/components/simulator/SelectedPartsTable"
import {SummaryCards} from "@/components/simulator/SummaryCards"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
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

    // 構成名は左カラムのConfigListが取得するため、通知を受けて上部カードへ渡す。
    // setStateは参照が安定しているので、ConfigListのuseEffectを無駄に再実行しない。
    const [activeConfigName, setActiveConfigName] = useState("")

    // 画面レイアウトは表示だけを担当し、選択・保存・復元の状態遷移はcontrollerへ集約する。
    return (
        // 構成名が切れにくいよう、開いたときの幅は標準の16remより広い19remにする。
        // stickyのSidebar本体が幅を持つため、fixed用の幅確保の要素（sidebar-gap）は非表示にする。
        // 角丸Sidebarの周りの余白を右側の本体（SidebarInset）と同じ色にし、ページ背景が透けて色の帯に見えないようにする。
        <SidebarProvider
            className="min-h-[calc(100svh-4rem)] bg-slate-100 [&_[data-slot=sidebar-gap]]:hidden"
            style={{"--sidebar-width": "19rem"} as CSSProperties}
        >
            {/* 左のSidebarは構成選択に使う。パーツのカテゴリ切り替えは選択済みパーツ表の行クリックで行う。 */}
                <ConfigList
                    categories={categories}
                    activeConfigId={controller.activeConfigId}
                    activeSavedBuildId={controller.activeSavedBuildId}
                    configStates={controller.configs}
                    selectedParts={controller.selectedParts}
                    isSavedBuildLoading={controller.isSavedBuildLoading}
                    savedBuildErrorMessage={controller.savedBuildError}
                    savedBuildsReloadKey={savedBuildsReloadKey}
                    autoSaveEnabled={controller.autoSaveEnabled}
                    onConfigChange={controller.changeConfig}
                    onRestoreSavedBuild={controller.selectSavedBuild}
                    onSavedBuildPrefetch={controller.prefetchSavedBuild}
                    onSavedBuildSelect={controller.selectSavedBuild}
                    onClearActiveConfig={controller.clearActiveConfig}
                    onClearConfig={controller.clearConfig}
                    onRestoreConfigSlot={controller.restoreConfigSlot}
                    onActiveConfigNameChange={setActiveConfigName}
                />

            <SidebarInset className="min-w-0 bg-slate-100 p-4">
                {/* 中身が短いときもサイドバーと下端がそろうよう、縦方向に伸ばす。 */}
                <section className="min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-300 bg-white p-4">
                    {/* 通常はSidebar内の見出し横の開閉ボタンを使う。 */}
                    {/* スマホ幅ではSidebarが閉じると中のボタンを押せないため、本体側にも開くボタンを置く。 */}
                    <div className="mb-3 md:hidden">
                        <SidebarTrigger aria-label="構成選択を開く" />
                    </div>

                    <SummaryCards
                        totalPrice={controller.totalPrice}
                        totalWeight={controller.totalWeight}
                        activeConfigName={activeConfigName}
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

import {useEffect, useMemo, useReducer, useState} from "react"

import {fetchParts, fetchPartsByIds} from "@/api/parts"
import type {SavedBuild} from "@/api/savedBuilds"
import {CandidatePartsTable} from "@/components/simulator/candidate-parts/CandidatePartsTable"
import {CategoryList} from "@/components/simulator/CategoryList"
import {SavedBuildPanel} from "@/components/simulator/SavedBuildPanel"
import {SelectedPartsTable} from "@/components/simulator/SelectedPartsTable"
import {SummaryCards} from "@/components/simulator/SummaryCards"
import {
    createInitialSimulatorState,
    simulatorReducer,
} from "@/features/simulator/simulatorReducer"
import {calculateSelectedPartsTotals} from "@/features/simulator/partCompatibility"
import {getPartDisplayName} from "@/features/simulator/partDisplay"
import {
    getPartSlotCategoryKey,
    getPartSlotPositionLabel,
    getPartSlots,
    type PartSlot,
} from "@/features/simulator/partSlots"
import {
    CONFIG_IDS,
    type ConfigId,
    type ConfigStates,
    type SelectedParts,
} from "@/features/simulator/simulatorTypes"
import {
    loadSimulatorState,
    saveSimulatorState,
} from "@/lib/simulator-storage"
import type {Category} from "@/types/category"
import type {Part} from "@/types/part"

// シミュレーターのプロパティ
type SimulatorProps = {
    categories: Category[] // カテゴリー一覧
    savedBuildsReloadKey?: number
}

// 空の選択済みパーツ
const EMPTY_SELECTED_PARTS: SelectedParts = {}

// シミュレーター本体
export function Simulator({
                              categories,
                              savedBuildsReloadKey = 0,
                          }: SimulatorProps) {
    const [storedState] = useState(loadSimulatorState)
    const storedPartIds = useMemo(
        () => Array.from(new Set(
            storedState
                ? Object.values(storedState.configs).flatMap((selections) =>
                    Object.values(selections),
                )
                : [],
        )),
        [storedState],
    )
    const [hasRestoredStoredParts, setHasRestoredStoredParts] = useState(
        storedPartIds.length === 0,
    )
    const [restoreError, setRestoreError] = useState("")

    // シミュレーターの状態管理
    const [simulatorState, dispatch] = useReducer(
        simulatorReducer, // 状態更新処理
        categories[0]?.key ?? "", // 初期カテゴリーキー
        (initialCategory) => {
            // 初期状態
            const initialState = createInitialSimulatorState(
                initialCategory, // 初期カテゴリーキー
            )

            if (!storedState) {
                return initialState
            }

            return {
                ...initialState, // 初期状態の引き継ぎ
                activeConfigId: storedState.activeConfigId, // 保存済み構成ID
            }
        },
    )

    // 選択中の構成ID
    const {activeConfigId} = simulatorState

    // 選択中のパーツ選択枠
    const {activeSlot} = simulatorState

    // 選択中のカテゴリー
    const {categoryKey: activeCategory} = activeSlot

    // 構成別の選択状態
    const {configs} = simulatorState

    // 保存済みIDから最新のパーツ情報を復元
    useEffect(() => {
        if (!storedState || storedPartIds.length === 0) {
            return
        }

        const controller = new AbortController()
        const stateToRestore = storedState

        async function restoreStoredParts() {
            try {
                const parts = await fetchPartsByIds(
                    storedPartIds,
                    controller.signal,
                )
                const partsById = new Map(
                    parts.map((part) => [part.id, part]),
                )
                const restoredConfigs = Object.fromEntries(
                    CONFIG_IDS.map((configId) => [
                        configId,
                        Object.fromEntries(
                            Object.entries(stateToRestore.configs[configId]).flatMap(
                                ([slotKey, partId]) => {
                                    const part = partsById.get(partId)

                                    return part?.categoryKey ===
                                        getPartSlotCategoryKey(slotKey)
                                        ? [[slotKey, part]]
                                        : []
                                },
                            ),
                        ),
                    ]),
                ) as ConfigStates

                dispatch({
                    type: "restore",
                    activeConfigId: stateToRestore.activeConfigId,
                    configs: restoredConfigs,
                })
                setRestoreError("")
                setHasRestoredStoredParts(true)
            } catch (error) {
                if (!controller.signal.aborted) {
                    setRestoreError(
                        error instanceof Error
                            ? error.message
                            : "保存済み構成の復元に失敗しました",
                    )
                }
            }
        }

        void restoreStoredParts()

        return () => controller.abort()
    }, [storedPartIds, storedState])

    // 構成変更時の保存
    useEffect(() => {
        if (!hasRestoredStoredParts) {
            return
        }

        saveSimulatorState({
            activeConfigId, // 現在の構成ID
            configs, // 現在の構成状態
        })
    }, [
        activeConfigId, // 構成切り替え時の保存
        configs, // パーツ選択時の保存
        hasRestoredStoredParts, // 保存済み構成復元後の保存
    ])

    // 現在構成の選択済みパーツ
    const selectedParts =
        configs[activeConfigId] ?? EMPTY_SELECTED_PARTS

    // 選択済みパーツが占有しているカテゴリー
    const blockedCategoryKeys = useMemo(() => {
        return new Set(
            Object.values(selectedParts).flatMap(
                (part) => part.blockedCategoryKeys ?? [],
            ),
        )
    }, [selectedParts])

    // 現在カテゴリーを占有している選択内容
    const blockingSelections = useMemo(() => {
        return Object.entries(selectedParts).filter(([, part]) =>
            (part.blockedCategoryKeys ?? []).includes(activeCategory),
        )
    }, [activeCategory, selectedParts])

    // 占有中パーツのカテゴリー名
    const blockingCategoryNames = useMemo(() => {
        return Array.from(new Set(
            blockingSelections.map(([slotKey]) => {
                const categoryKey = getPartSlotCategoryKey(slotKey)

                return categories.find(
                    (category) => category.key === categoryKey,
                )?.displayName ?? "選択済みパーツ"
            }),
        ))
    }, [blockingSelections, categories])

    // 現在カテゴリーの選択不可メッセージ
    const blockedMessage = blockingSelections.length > 0
        ? `${blockingSelections.map(([, part]) => getPartDisplayName(part)).join("、")}に含まれるため、${
            categories.find((category) => category.key === activeCategory)
                ?.displayName ?? "このカテゴリー"
        }は選択できません。`
        : undefined

    // カテゴリー別の候補パーツ
    const [partsByCategory, setPartsByCategory] = useState<
        Record<string, Part[]> // カテゴリーキーと候補パーツ一覧の対応
    >({}) // 初期状態（未取得）

    // カテゴリー別のエラーメッセージ
    const [
        partsErrorsByCategory,
        setPartsErrorsByCategory,
    ] = useState<
        Record<string, string> // カテゴリーキーとエラーメッセージの対応
    >({}) // 初期状態（エラーなし）

    useEffect(() => {
        // カテゴリー未選択・他パーツに含まれる場合の終了処理
        if (
            !activeCategory ||
            blockedCategoryKeys.has(activeCategory)
        ) {
            return
        }

        // 取得済みパーツの再利用
        if (
            Object.hasOwn(
                partsByCategory,
                activeCategory,
            )
        ) {
            return
        }

        // API通信の中断制御
        const controller = new AbortController()

        // 候補パーツの取得処理
        async function loadParts() {
            try {
                const parts = await fetchParts(
                    activeCategory, // 取得対象のカテゴリーキー
                    controller.signal, // API通信の中断シグナル
                )

                // 取得結果のカテゴリー別保存
                setPartsByCategory((current) => ({
                    ...current, // 取得済みパーツの引き継ぎ
                    [activeCategory]: parts, // 現在カテゴリーの取得結果
                }))

                // 取得成功時のエラー削除
                setPartsErrorsByCategory((current) => {
                    const next = {...current} // 現在のエラー内容をコピー

                    delete next[activeCategory] // 現在カテゴリーのエラーを削除

                    return next
                })
            } catch (error) {
                // 通信中断以外のエラー処理
                if (!controller.signal.aborted) {
                    setPartsErrorsByCategory((current) => ({
                        ...current, // ほかのカテゴリーのエラーを引き継ぐ
                        [activeCategory]:
                            error instanceof Error
                                ? error.message // Error型のメッセージ
                                : "エラーが発生しました", // Error型以外のメッセージ
                    }))
                }
            }
        }

        // 非同期処理の実行
        void loadParts()

        // カテゴリー変更・画面破棄時の通信中断
        return () => controller.abort()
    }, [
        activeCategory, // 選択中カテゴリーの変更監視
        blockedCategoryKeys, // 選択不可カテゴリーの変更監視
        partsByCategory, // 取得済みパーツの変更監視
    ])

    // 選択中カテゴリーの取得状態
    const hasLoadedActiveCategory = Object.hasOwn(
        partsByCategory,
        activeCategory,
    )

    // 選択中カテゴリーの候補パーツ
    const activeParts = partsByCategory[activeCategory] ?? []

    // 選択中カテゴリーのエラーメッセージ
    const partsError = partsErrorsByCategory[activeCategory] ?? ""

    // 候補パーツの読み込み状態
    const isLoadingParts =
        Boolean(activeCategory) &&
        !hasLoadedActiveCategory &&
        !partsError

    // 選択済みパーツの合計
    const {price: totalPrice, weight: totalWeight} = useMemo(
        () => calculateSelectedPartsTotals(selectedParts),
        [selectedParts],
    )

    // 構成変更処理
    function changeConfig(configId: ConfigId) {
        dispatch({
            type: "changeConfig", // 構成変更
            configId, // 変更先の構成ID
        })
    }

    // カテゴリー変更処理
    function changeCategory(category: string) {
        const nextSlot = activeCategory === category
            ? activeSlot
            : getPartSlots(category)[0]

        changeSlot(nextSlot)
    }

    // 選択枠変更処理
    function changeSlot(slot: PartSlot) {
        dispatch({
            type: "changeSlot", // 選択枠変更
            slot, // 変更先の選択枠
        })
    }

    // パーツ選択処理
    function selectPart(
        part: Part,
        slotKeys?: string[],
        removeSlotKeys?: string[],
    ) {
        dispatch({
            type: "selectPart", // パーツ選択
            part, // 選択対象のパーツ
            slotKeys, // 選択先の選択枠
            removeSlotKeys, // 非互換パーツの解除対象
        })
    }

    // 現在カテゴリーを占有するパーツの解除処理
    function removeBlockingParts() {
        dispatch({
            type: "removeParts", // パーツ解除
            slotKeys: blockingSelections.map(([slotKey]) => slotKey),
        })
    }

    // 現在構成の初期化処理
    function clearActiveConfig() {
        dispatch({
            type: "clearActiveConfig", // 現在構成の初期化
        })
    }

    // D1の保存構成を最新マスターデータへ解決して現在の作業枠へ復元
    async function restoreSavedBuild(build: SavedBuild) {
        const partIds = Array.from(new Set(
            build.parts.map((savedPart) => savedPart.partId),
        ))
        const parts = partIds.length > 0
            ? await fetchPartsByIds(partIds)
            : []
        const partsById = new Map(parts.map((part) => [part.id, part]))
        const restoredEntries = build.parts.map((savedPart) => {
            const part = partsById.get(savedPart.partId)

            if (!part) {
                throw new Error(
                    `保存構成のパーツID ${savedPart.partId} が見つかりません`,
                )
            }

            if (part.categoryKey !== getPartSlotCategoryKey(savedPart.slotKey)) {
                throw new Error(
                    "保存構成のカテゴリー情報が現在のマスターデータと一致しません",
                )
            }

            return [savedPart.slotKey, part] as const
        })

        dispatch({
            type: "restoreActiveConfig",
            selectedParts: Object.fromEntries(restoredEntries),
        })
    }

    return (
        <div className="bg-slate-100 p-4">
            <main className="grid min-h-[calc(100vh-64px)] grid-cols-1 gap-4 lg:grid-cols-[230px_1fr]">
                <aside className="rounded-lg bg-[#101518] p-4 text-white">
                    <CategoryList
                        categories={categories}
                        activeCategory={activeCategory}
                        blockedCategoryKeys={blockedCategoryKeys}
                        onCategoryChange={changeCategory}
                    />
                </aside>

                <section className="min-w-0 overflow-hidden rounded-lg border border-slate-300 bg-white p-4">
                    <SummaryCards
                        totalPrice={totalPrice}
                        totalWeight={totalWeight}
                        activeConfigId={activeConfigId}
                        onConfigChange={changeConfig}
                        onClearActiveConfig={clearActiveConfig}
                    />

                    <SavedBuildPanel
                        activeConfigId={activeConfigId}
                        selectedParts={selectedParts}
                        reloadKey={savedBuildsReloadKey}
                        onRestore={restoreSavedBuild}
                    />

                    {restoreError && (
                        <p className="mt-3 text-sm font-medium text-destructive">
                            {restoreError}。ページを再読み込みしてください。
                        </p>
                    )}

                    <div
                        className="mt-4 grid gap-6 [@media_(orientation:landscape)_and_(min-width:1280px)_and_(min-height:900px)]:grid-cols-2 [@media_(orientation:landscape)_and_(min-width:1280px)_and_(min-height:900px)]:gap-4">
                        <SelectedPartsTable
                            categories={categories}
                            activeSlotKey={activeSlot.key}
                            selectedParts={selectedParts}
                            blockedCategoryKeys={blockedCategoryKeys}
                            onSlotChange={changeSlot}
                        />

                        <CandidatePartsTable
                            key={activeSlot.key}
                            parts={activeParts}
                            activeSlot={activeSlot}
                            selectedParts={selectedParts}
                            selectedPart={
                                selectedParts[activeSlot.key]
                            }
                            isLoading={isLoadingParts}
                            errorMessage={partsError}
                            blockedMessage={blockedMessage}
                            blockingCategoryNames={blockingCategoryNames}
                            blockingPartNames={blockingSelections.map(
                                ([, part]) => getPartDisplayName(part),
                            )}
                            slotPositionLabel={getPartSlotPositionLabel(
                                activeSlot.position,
                            )}
                            onSelect={selectPart}
                            onRemoveBlockingParts={removeBlockingParts}
                        />
                    </div>
                </section>
            </main>
        </div>
    )
}

import {useEffect, useMemo, useReducer, useState} from "react"

import {fetchParts} from "@/api/parts"
import {CandidatePartsTable} from "@/components/simulator/CandidatePartsTable"
import {CategoryList} from "@/components/simulator/CategoryList"
import {ConfigList} from "@/components/simulator/ConfigList"
import {SelectedPartsTable} from "@/components/simulator/SelectedPartsTable"
import {SummaryCards} from "@/components/simulator/SummaryCards"
import {
    createInitialSimulatorState,
    simulatorReducer,
} from "@/features/simulator/simulatorReducer"
import {
    CONFIG_IDS,
    type ConfigId,
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
}

// 空の選択済みパーツ
const EMPTY_SELECTED_PARTS: Record<string, Part> = {}

// 構成IDの判定
function isConfigId(value: unknown): value is ConfigId {
    return (
        typeof value === "string" &&
        CONFIG_IDS.includes(value as ConfigId)
    )
}

// シミュレーター本体
export function Simulator({
                              categories,
                          }: SimulatorProps) {
    // シミュレーターの状態管理
    const [simulatorState, dispatch] = useReducer(
        simulatorReducer, // 状態更新処理
        categories[0]?.key ?? "", // 初期カテゴリーキー
        (initialCategory) => {
            // 初期状態
            const initialState = createInitialSimulatorState(
                initialCategory, // 初期カテゴリーキー
            )

            // 保存済み状態
            const savedState = loadSimulatorState()

            if (
                !savedState ||
                !savedState.configs ||
                !isConfigId(savedState.activeConfigId)
            ) {
                return initialState
            }

            return {
                ...initialState, // 初期状態の引き継ぎ
                activeConfigId: savedState.activeConfigId, // 保存済み構成ID
                configs: {
                    ...initialState.configs, // 空の構成状態
                    ...savedState.configs, // 保存済み構成状態
                },
            }
        },
    )

    // 選択中の構成ID
    const {activeConfigId} = simulatorState

    // 選択中のカテゴリー
    const {activeCategory} = simulatorState

    // 構成別の選択状態
    const {configs} = simulatorState

    // 構成変更時の保存
    useEffect(() => {
        saveSimulatorState({
            activeConfigId, // 現在の構成ID
            configs, // 現在の構成状態
        })
    }, [
        activeConfigId, // 構成切り替え時の保存
        configs, // パーツ選択時の保存
    ])

    // 現在構成の選択済みパーツ
    const selectedParts =
        configs[activeConfigId] ?? EMPTY_SELECTED_PARTS

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
        // カテゴリー未選択時の終了処理
        if (!activeCategory) {
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

    // 選択済みパーツの合計金額
    const totalPrice = useMemo(() => {
        return Object.values(selectedParts).reduce(
            (total, part) => total + part.price, // 各パーツ価格の加算
            0, // 合計金額の初期値
        )
    }, [selectedParts]) // 選択済みパーツ変更時の再計算

    // 選択済みパーツの合計重量
    const totalWeight = useMemo(() => {
        return Object.values(selectedParts).reduce(
            (total, part) => total + part.weight, // 各パーツ重量の加算
            0, // 合計重量の初期値
        )
    }, [selectedParts]) // 選択済みパーツ変更時の再計算

    // 構成変更処理
    function changeConfig(configId: ConfigId) {
        dispatch({
            type: "changeConfig", // 構成変更
            configId, // 変更先の構成ID
        })
    }

    // カテゴリー変更処理
    function changeCategory(category: string) {
        dispatch({
            type: "changeCategory", // カテゴリー変更
            category, // 変更先のカテゴリーキー
        })
    }

    // パーツ選択処理
    function selectPart(part: Part) {
        dispatch({
            type: "selectPart", // パーツ選択
            part, // 選択対象のパーツ
        })
    }

    // 現在構成の初期化処理
    function clearActiveConfig() {
        dispatch({
            type: "clearActiveConfig", // 現在構成の初期化
        })
    }

    return (
        <div className="bg-slate-50 p-4">
            <main className="grid min-h-[calc(100vh-64px)] grid-cols-1 gap-4 lg:grid-cols-[230px_1fr]">
                <aside className="rounded-lg bg-[#101518] p-4 text-white">
                    <ConfigList
                        activeConfigId={activeConfigId}
                        onConfigChange={changeConfig}
                        onClearActiveConfig={clearActiveConfig}
                    />

                    <div className="my-6 border-t border-slate-800" />

                    <CategoryList
                        categories={categories}
                        activeCategory={activeCategory}
                        onCategoryChange={changeCategory}
                    />
                </aside>

                <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <SummaryCards
                        totalPrice={totalPrice}
                        totalWeight={totalWeight}
                    />

                    <div className="mt-4 grid gap-6 [@media_(orientation:landscape)_and_(min-width:1280px)_and_(min-height:900px)]:grid-cols-2 [@media_(orientation:landscape)_and_(min-width:1280px)_and_(min-height:900px)]:gap-4">
                        <SelectedPartsTable
                            categories={categories}
                            activeCategory={activeCategory}
                            selectedParts={selectedParts}
                            onCategoryChange={changeCategory}
                        />

                        <CandidatePartsTable
                            parts={activeParts}
                            selectedPart={
                                selectedParts[activeCategory]
                            }
                            isLoading={isLoadingParts}
                            errorMessage={partsError}
                            onSelect={selectPart}
                        />
                    </div>
                </section>
            </main>
        </div>
    )
}

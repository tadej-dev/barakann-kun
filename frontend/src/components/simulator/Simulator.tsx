import {useEffect, useMemo, useState} from "react"

import {fetchParts} from "@/api/parts"
import {CandidatePartsTable} from "@/components/simulator/CandidatePartsTable"
import {CategoryList} from "@/components/simulator/CategoryList"
import {SelectedPartsTable} from "@/components/simulator/SelectedPartsTable"
import {SummaryCards} from "@/components/simulator/SummaryCards"
import type {Category} from "@/types/category"
import type {Part} from "@/types/part"

// シミュレーターのプロパティ
type SimulatorProps = {
    categories: Category[] // カテゴリー一覧
}

// シミュレーター本体
export function Simulator({
                              categories,
                          }: SimulatorProps) {
    // 選択中のカテゴリー
    const [activeCategory, setActiveCategory] = useState(
        categories[0]?.key ?? "", // 最初のカテゴリーキー
    )

    // カテゴリー別の候補パーツ
    const [partsByCategory, setPartsByCategory] = useState<
        Record<string, Part[]> // カテゴリーキーと候補パーツ一覧の対応
    >({}) // 初期状態（未取得）

    // カテゴリー別の選択済みパーツ
    const [selectedParts, setSelectedParts] = useState<
        Record<string, Part> // カテゴリーキーと選択パーツの対応
    >({}) // 初期状態（未選択）

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

    // パーツ選択処理
    function selectPart(part: Part) {
        setSelectedParts((current) => ({
            ...current, // 現在の選択内容を引き継ぐ
            [activeCategory]: part, // 現在カテゴリーのパーツを更新
        }))
    }

    return (
        <div className="grid min-h-screen gap-4 bg-muted/30 p-4 lg:grid-cols-[240px_1fr]">
            <CategoryList
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
            />

            <section className="space-y-4">
                <SummaryCards
                    totalPrice={totalPrice}
                    totalWeight={totalWeight}
                />

                <div className="grid gap-4 xl:grid-cols-2">
                    <SelectedPartsTable
                        categories={categories}
                        activeCategory={activeCategory}
                        selectedParts={selectedParts}
                        onCategoryChange={setActiveCategory}
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
        </div>
    )
}
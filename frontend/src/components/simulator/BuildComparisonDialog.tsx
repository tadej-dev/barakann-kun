import type * as React from "react"
import {Columns3} from "lucide-react"
import {useEffect, useMemo, useRef, useState} from "react"

import {fetchPartsByIds} from "@/api/parts"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {Checkbox} from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {diagnoseBuild} from "@/features/simulator/buildDiagnosis"
import {getPartVariantLabel} from "@/features/simulator/partDisplay"
import {
    getPartPackageUnit,
    sumIncludedItemsWeight,
} from "@/features/simulator/partCompatibility"
import {
    getPartSlotCategoryKey,
    getPartSlotPositionLabel,
    getPartSlotPosition,
} from "@/features/simulator/partSlots"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"
import type {Category} from "@/types/category"
import type {Part} from "@/types/part"

export type ComparisonBuildPart = {
    slotKey: string
    partId: number
    price: number
    weight: number
}

export type ComparisonBuild = {
    key: string
    name: string
    parts: ComparisonBuildPart[]
}

// 比較ダイアログを開くボタンへ渡す情報
export type BuildComparisonTriggerProps = {
    disabled: boolean // 比較対象が2件未満のときは押せない
    title: string // ボタンの補足説明
    onOpen: () => void // ダイアログを開く処理
}

type BuildComparisonDialogProps = {
    builds: ComparisonBuild[]
    categories: Category[]
    renderTrigger?: (props: BuildComparisonTriggerProps) => React.ReactNode // 比較対象の構成
}

// 価格を日本円の整数表記へ変換する書式
const currencyFormatter = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
})

// 構成の合計価格と合計重量を集計
function snapshotTotals(
    build: ComparisonBuild,
    partsById: ReadonlyMap<number, Part>,
) {
    const countedPairIds = new Set<number>()

    return build.parts.reduce((totals, snapshot) => {
        const part = partsById.get(snapshot.partId)

        // 前後ペア販売のパーツは1回だけ集計
        if (part && getPartPackageUnit(part) === "pair") {
            // 同じペアパーツを集計済みなら加算しない
            if (countedPairIds.has(part.id)) {
                return totals
            }

            countedPairIds.add(part.id)
        }

        return {
            price: totals.price + snapshot.price,
            weight: totals.weight + snapshot.weight +
                (part ? sumIncludedItemsWeight(part) : 0),
        }
    }, {price: 0, weight: 0})
}

// 最大4構成の価格・重量・パーツ差分・診断結果を横並びで比較
export function BuildComparisonDialog({
    builds,
    categories,
    renderTrigger,
}: BuildComparisonDialogProps) {
    const [open, setOpen] = useState(false) // 比較ダイアログを開いているか
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]) // 比較対象に選んだ構成キー(最大4件)
    const [partsById, setPartsById] = useState(new Map<number, Part>()) // 比較に使うパーツをIDから引く表
    const [isLoading, setIsLoading] = useState(false) // 比較用パーツの読み込み中か
    const [errorMessage, setErrorMessage] = useState("") // 比較用パーツの取得エラー
    const requestIdRef = useRef(0) // 取得の世代。古い取得の完了で新しい表示を壊さないために使う
    const selectedBuilds = useMemo(() => builds.filter((build) => // 選択済みキーに対応する構成(最大4件)
        selectedKeys.includes(build.key),
    ), [builds, selectedKeys])

    useEffect(() => {
        const requestId = ++requestIdRef.current

        // 非表示または比較対象が無い場合は取得しない
        if (!open || selectedBuilds.length === 0) {
            // 選択が無くなったら読み込み表示を下ろす
            // Effect内の同期更新を避けるため、マイクロタスクで反映する
            queueMicrotask(() => {
                // 古い取得結果で読み込み表示を変えない
                if (requestIdRef.current === requestId) {
                    setIsLoading(false)
                }
            })

            return
        }

        const partIds = Array.from(new Set(selectedBuilds.flatMap((build) =>
            build.parts.map((part) => part.partId),
        )))
        const controller = new AbortController()

        // 比較に必要なパーツを取得
        async function loadParts() {
            setIsLoading(true)
            setErrorMessage("")

            try {
                // 比較対象のパーツIDが無い場合は空の表へ戻す
                if (partIds.length === 0) {
                    // 最新の取得だけが結果を反映する
                    if (requestIdRef.current === requestId) {
                        setPartsById(new Map())
                    }

                    return
                }

                const parts = await fetchPartsByIds(
                    partIds,
                    controller.signal,
                )

                // 古い取得の結果で新しい表示を上書きしない
                if (requestIdRef.current === requestId) {
                    setPartsById(new Map(parts.map((part) => [part.id, part])))
                }
            } catch (error) {
                // 通信中断によるエラーは表示しない
                if (!controller.signal.aborted) {
                    setErrorMessage(error instanceof Error
                        ? error.message
                        : "比較用パーツの取得に失敗しました")
                }
            } finally {
                // 最新の取得だけが読み込み表示を下ろす
                if (requestIdRef.current === requestId) {
                    setIsLoading(false)
                }
            }
        }

        void loadParts()

        return () => controller.abort()
    }, [open, selectedBuilds])

    // 構成ごとの選択済みパーツをスロットキーから引く表
    const selectedPartsByBuildKey = useMemo(() => new Map(
        selectedBuilds.map((build) => {
            const selectedParts: SelectedParts = {}

            for (const snapshot of build.parts) {
                const part = partsById.get(snapshot.partId)

                // 取得済みのパーツだけを選択済みとして扱う
                if (part) {
                    selectedParts[snapshot.slotKey] = part
                }
            }

            return [build.key, selectedParts]
        }),
    ), [partsById, selectedBuilds])
    // 比較表に表示するスロットキー一覧
    const slotKeys = Array.from(new Set(selectedBuilds.flatMap((build) =>
        build.parts.map((part) => part.slotKey),
    )))
    // カテゴリーキーから表示名を引く表
    const categoriesByKey = new Map(categories.map((category) => [
        category.key,
        category.displayName,
    ]))

    // 比較対象の選択を切り替える
    function toggleBuild(key: string, checked: boolean | "indeterminate") {
        setSelectedKeys((current) => {
            // チェックが外れた場合は選択から除く
            if (checked !== true) {
                return current.filter((currentKey) => currentKey !== key)
            }

            return current.includes(key) || current.length >= 4
                ? current
                : [...current, key]
        })
    }

    // ダイアログの開閉を切り替える
    function changeOpen(nextOpen: boolean) {
        // 開くときに比較対象を2〜4件へ整える
        if (nextOpen) {
            // 削除済みのキーを外し、比較対象が足りない場合だけ先頭2件を初期選択する
            setSelectedKeys((current) => {
                const available = current.filter((key) =>
                    builds.some((build) => build.key === key),
                )

                return available.length >= 2
                    ? available.slice(0, 4)
                    : builds.slice(0, 2).map((build) => build.key)
            })
        }

        setOpen(nextOpen)
    }

    // 開くボタンの状態は既定ボタンと差し替えボタンで共通にする
    const triggerProps: BuildComparisonTriggerProps = {
        disabled: builds.length < 2,
        title: builds.length < 2
            ? "比較には2件以上の構成が必要です"
            : "複数構成を比較",
        // 比較ダイアログを開く
        onOpen: () => changeOpen(true),
    }

    return (
        <>
            {renderTrigger ? renderTrigger(triggerProps) : (
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-full gap-1 px-2 text-xs"
                    disabled={triggerProps.disabled}
                    title={triggerProps.title}
                    onClick={triggerProps.onOpen}
                >
                    <Columns3 />
                    比較
                </Button>
            )}

            <Dialog open={open} onOpenChange={changeOpen}>
                <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>構成を比較</DialogTitle>
                        <DialogDescription>
                            2〜4件を選択すると、価格・重量・パーツ・適合状態を横並びで確認できます
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {builds.map((build) => {
                            const checked = selectedKeys.includes(build.key)

                            return (
                                <label
                                    key={build.key}
                                    className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                                >
                                    <Checkbox
                                        checked={checked}
                                        disabled={!checked && selectedKeys.length >= 4}
                                        onCheckedChange={(value) =>
                                            toggleBuild(build.key, value)}
                                    />
                                    <span>{build.name}</span>
                                </label>
                            )
                        })}
                    </div>

                    {selectedBuilds.length < 2 && (
                        <p className="mt-4 text-sm text-amber-700">
                            比較する構成を2件以上選択してください
                        </p>
                    )}

                    {isLoading && (
                        <p className="mt-4 text-sm text-muted-foreground" role="status">
                            比較データを読み込んでいます…
                        </p>
                    )}

                    {errorMessage && (
                        <p className="mt-4 text-sm text-destructive" role="alert">
                            {errorMessage}
                        </p>
                    )}

                    {!isLoading && !errorMessage && selectedBuilds.length >= 2 && (
                        <div className="mt-5 overflow-x-auto rounded-lg border">
                            <table className="w-full min-w-[760px] border-collapse text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="w-44 border-b px-3 py-2 text-left font-medium text-slate-600">
                                            比較項目
                                        </th>
                                        {selectedBuilds.map((build) => (
                                            <th
                                                key={build.key}
                                                className="min-w-52 border-b px-3 py-2 text-left font-semibold"
                                            >
                                                {build.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <th className="border-b px-3 py-2 text-left font-medium text-slate-600">
                                            合計金額
                                        </th>
                                        {selectedBuilds.map((build) => (
                                            <td key={build.key} className="border-b px-3 py-2 font-semibold tabular-nums">
                                                {currencyFormatter.format(
                                                    snapshotTotals(build, partsById).price,
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <th className="border-b px-3 py-2 text-left font-medium text-slate-600">
                                            完成重量
                                        </th>
                                        {selectedBuilds.map((build) => (
                                            <td key={build.key} className="border-b px-3 py-2 font-semibold tabular-nums">
                                                {snapshotTotals(build, partsById).weight.toLocaleString("ja-JP")} g
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <th className="border-b px-3 py-2 text-left font-medium text-slate-600">
                                            構成診断
                                        </th>
                                        {selectedBuilds.map((build) => {
                                            const diagnosis = diagnoseBuild(
                                                selectedPartsByBuildKey.get(build.key) ?? {},
                                                categories,
                                            )

                                            return (
                                                <td key={build.key} className="border-b px-3 py-2">
                                                    <Badge variant={diagnosis.incompatibleCount > 0
                                                        ? "destructive"
                                                        : "secondary"}
                                                    >
                                                        {diagnosis.incompatibleCount > 0
                                                            ? `不一致 ${diagnosis.incompatibleCount}件`
                                                            : diagnosis.missingCount > 0
                                                                ? `未選択 ${diagnosis.missingCount}件`
                                                                : "確認済み"}
                                                    </Badge>
                                                </td>
                                            )
                                        })}
                                    </tr>
                                    {slotKeys.map((slotKey) => {
                                        const categoryKey = getPartSlotCategoryKey(slotKey)
                                        const positionLabel = getPartSlotPositionLabel(
                                            getPartSlotPosition(slotKey),
                                        )
                                        const label = categoriesByKey.get(categoryKey) ?? categoryKey

                                        return (
                                            <tr key={slotKey}>
                                                <th className="border-b px-3 py-2 text-left font-medium text-slate-600 last:border-b-0">
                                                    {label}{positionLabel ? `（${positionLabel}）` : ""}
                                                </th>
                                                {selectedBuilds.map((build) => {
                                                    const snapshot = build.parts.find((part) =>
                                                        part.slotKey === slotKey)
                                                    const part = snapshot
                                                        ? partsById.get(snapshot.partId)
                                                        : undefined

                                                    return (
                                                        <td key={build.key} className="border-b px-3 py-2 last:border-b-0">
                                                            {part
                                                                ? `${part.brandName} ${getPartVariantLabel(part)}`
                                                                : "—"}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}

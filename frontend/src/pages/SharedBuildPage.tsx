import {useEffect, useMemo, useState} from "react"
import {useNavigate, useParams} from "react-router"

import {
    fetchPublicSavedBuild,
    type PublicSavedBuild,
} from "@/api/savedBuilds"
import {fetchPartsByIds} from "@/api/parts"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {diagnoseBuild} from "@/features/simulator/buildDiagnosis"
import {getPartDisplayName} from "@/features/simulator/partDisplay"
import {getPartPackageUnit} from "@/features/simulator/partCompatibility"
import {
    getPartSlotCategoryKey,
    getPartSlotPosition,
    getPartSlotPositionLabel,
    getPartSlots,
} from "@/features/simulator/partSlots"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"
import type {Category} from "@/types/category"
import type {Part} from "@/types/part"
import {fetchCategories} from "@/api/categories"

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
})

function calculateSnapshotTotals(
    build: PublicSavedBuild,
    partsById: ReadonlyMap<number, Part>,
) {
    const countedPairIds = new Set<number>()

    return build.parts.reduce((totals, snapshot) => {
        const part = partsById.get(snapshot.partId)

        if (part && getPartPackageUnit(part) === "pair") {
            if (countedPairIds.has(part.id)) {
                return totals
            }

            countedPairIds.add(part.id)
        }

        return {
            price: totals.price + snapshot.price,
            weight: totals.weight + snapshot.weight,
        }
    }, {price: 0, weight: 0})
}

// 公開トークンで共有された構成を所有者情報なしで読み取り専用表示
export function SharedBuildPage() {
    const {shareToken = ""} = useParams()
    const navigate = useNavigate()
    const [build, setBuild] = useState<PublicSavedBuild | null>(null)
    const [parts, setParts] = useState<Part[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")

    useEffect(() => {
        const controller = new AbortController()

        async function loadSharedBuild() {
            try {
                const [sharedBuild, loadedCategories] = await Promise.all([
                    fetchPublicSavedBuild(shareToken, controller.signal),
                    fetchCategories(),
                ])
                const loadedParts = await fetchPartsByIds(
                    Array.from(new Set(sharedBuild.parts.map((part) =>
                        part.partId))),
                    controller.signal,
                )

                if (controller.signal.aborted) {
                    return
                }

                setBuild(sharedBuild)
                setParts(loadedParts)
                setCategories(loadedCategories)
            } catch (error) {
                if (!controller.signal.aborted) {
                    setErrorMessage(error instanceof Error
                        ? error.message
                        : "共有構成の取得に失敗しました")
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false)
                }
            }
        }

        void loadSharedBuild()

        return () => controller.abort()
    }, [shareToken])

    const partsById = useMemo(() => new Map(parts.map((part) => [
        part.id,
        part,
    ])), [parts])
    const selectedParts = useMemo(() => {
        const selections: SelectedParts = {}

        for (const snapshot of build?.parts ?? []) {
            const part = partsById.get(snapshot.partId)

            if (part) {
                selections[snapshot.slotKey] = part
            }
        }

        return selections
    }, [build, partsById])
    const categoriesByKey = new Map(categories.map((category) => [
        category.key,
        category.displayName,
    ]))
    const orderedSnapshots = useMemo(() => {
        // シミュレーターのパーツ選択と同じカテゴリー・前後スロット順を再現する
        const slotOrder = new Map(
            categories.flatMap((category) =>
                getPartSlots(category.key)).map((slot, index) => [
                slot.key,
                index,
            ]),
        )

        return [...(build?.parts ?? [])].sort((first, second) => {
            const firstOrder = slotOrder.get(first.slotKey)
            const secondOrder = slotOrder.get(second.slotKey)

            if (firstOrder !== undefined && secondOrder !== undefined) {
                return firstOrder - secondOrder
            }

            if (firstOrder !== undefined) {
                return -1
            }

            if (secondOrder !== undefined) {
                return 1
            }

            // 未知のスロットも一覧から消さず、末尾で安定した順序にする
            return first.slotKey.localeCompare(second.slotKey)
        })
    }, [build, categories])
    const diagnosis = diagnoseBuild(selectedParts, categories)
    const totals = build
        ? calculateSnapshotTotals(build, partsById)
        : {price: 0, weight: 0}

    if (isLoading) {
        return (
            <main className="mx-auto w-full max-w-6xl px-4 py-12">
                <p className="text-sm text-muted-foreground" role="status">
                    共有構成を読み込んでいます…
                </p>
            </main>
        )
    }

    if (!build) {
        return (
            <main className="mx-auto w-full max-w-3xl px-4 py-12">
                <Card>
                    <CardHeader>
                        <CardTitle>共有構成を表示できません</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            {errorMessage || "共有が停止されたか、URLが正しくありません"}
                        </p>
                        <Button type="button" onClick={() => navigate("/")}>
                            シミュレーターへ戻る
                        </Button>
                    </CardContent>
                </Card>
            </main>
        )
    }

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <Badge variant="outline">読み取り専用</Badge>
                    <h1 className="mt-2 text-2xl font-bold text-slate-950">
                        {build.name}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        共有された自転車構成
                    </p>
                </div>
            </div>

            {errorMessage && (
                <p className="mb-4 text-sm text-destructive" role="alert">
                    {errorMessage}
                </p>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <CardHeader><CardTitle className="text-sm text-muted-foreground">合計金額</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-bold tabular-nums">
                        {currencyFormatter.format(totals.price)}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-sm text-muted-foreground">完成重量</CardTitle></CardHeader>
                    <CardContent className="text-2xl font-bold tabular-nums">
                        {totals.weight.toLocaleString("ja-JP")} g
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-sm text-muted-foreground">構成診断</CardTitle></CardHeader>
                    <CardContent>
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
                    </CardContent>
                </Card>
            </div>

            <Card className="mt-4">
                <CardHeader>
                    <CardTitle>選択パーツ</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                    <table className="w-full min-w-[680px] border-collapse text-sm">
                        <thead className="bg-slate-50 text-left text-slate-600">
                            <tr>
                                <th className="border-b px-4 py-3 font-medium">カテゴリー</th>
                                <th className="border-b px-4 py-3 font-medium">メーカー</th>
                                <th className="border-b px-4 py-3 font-medium">製品名</th>
                                <th className="border-b px-4 py-3 text-right font-medium">価格</th>
                                <th className="border-b px-4 py-3 text-right font-medium">重量</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orderedSnapshots.map((snapshot) => {
                                const part = partsById.get(snapshot.partId)
                                const categoryKey = getPartSlotCategoryKey(snapshot.slotKey)
                                const positionLabel = getPartSlotPositionLabel(
                                    getPartSlotPosition(snapshot.slotKey),
                                )

                                return (
                                    <tr key={snapshot.slotKey}>
                                        <td className="border-b px-4 py-3">
                                            {categoriesByKey.get(categoryKey) ?? categoryKey}
                                            {positionLabel ? `（${positionLabel}）` : ""}
                                        </td>
                                        <td className="border-b px-4 py-3">
                                            {part?.brandName ?? "—"}
                                        </td>
                                        <td className="border-b px-4 py-3 font-medium">
                                            {part ? getPartDisplayName(part) : `パーツID ${snapshot.partId}`}
                                        </td>
                                        <td className="border-b px-4 py-3 text-right tabular-nums">
                                            {currencyFormatter.format(snapshot.price)}
                                        </td>
                                        <td className="border-b px-4 py-3 text-right tabular-nums">
                                            {snapshot.weight.toLocaleString("ja-JP")} g
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </main>
    )
}

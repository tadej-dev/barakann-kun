import { useCallback, useMemo, useState } from "react"

import {
    buildSpecFilters,
    collectBrands,
    collectModelYears,
    countActiveFilters,
    filterCandidateParts,
    hasCompatibilityInfo,
    initialCandidateFilterState,
    type CandidateFilterState,
    type CockpitStatus,
} from "@/features/simulator/candidatePartsFilter"
import { getFrameCockpitStatus } from "@/features/simulator/partCompatibility"
import type { CompatibilityResult } from "@/features/simulator/partCompatibility"
import {
    comparePartVariants,
    getPartModelKey,
    getPartDisplayName,
} from "@/features/simulator/partDisplay"
import type { Part } from "@/types/part"

// 並び替え対象
export type CandidatePartsSortKey = "brand" | "name" | "weight" | "price"

// 並び替え条件
export type CandidatePartsSortDescriptor = {
    column: CandidatePartsSortKey
    direction: "ascending" | "descending"
}

// 表示行。同一モデル（年式・エディション含む）のバリアントをまとめる。
export type CandidatePartRow = {
    key: string
    variants: Part[]
    activePart: Part
}

// 候補パーツ表の状態管理
export function useCandidatePartsTable(
    parts: Part[],
    compatibilityByPartId: ReadonlyMap<number, CompatibilityResult | null>,
    selectedPartId: number | undefined,
    activeCategoryKey: string,
) {
    // 並び替え状態
    const [sortDescriptor, setSortDescriptor] =
        useState<CandidatePartsSortDescriptor>({
            column: "brand",
            direction: "ascending",
        })
    // 製品名の検索文字列
    const [searchQuery, setSearchQuery] = useState("")

    // 絞り込み状態（メーカー・表示・コックピット・年式・一体型・規格値）
    const [filters, setFilters] = useState<CandidateFilterState>(
        initialCandidateFilterState,
    )

    // モデル行ごとに手動選択したバリアントID（未選択なら既定バリアントを使う）
    const [selectedVariantByModel, setSelectedVariantByModel] = useState<
        Record<string, number>
    >({})

    // 候補パーツに実在する規格から、複数選択フィルターを自動生成する。
    const specFilters = useMemo(() => buildSpecFilters(parts), [parts])

    // 重複・空文字を除外したブランド一覧
    const brands = useMemo(() => collectBrands(parts), [parts])

    // 候補に実在するモデルイヤー一覧
    const modelYears = useMemo(() => collectModelYears(parts), [parts])

    // 一体型ハンドル（stemを占有するパーツ）が候補に含まれるか
    const hasIntegratedHandlebars = useMemo(() => {
        return parts.some((part) =>
            (part.blockedCategoryKeys ?? []).includes("stem"),
        )
    }, [parts])

    // フレームのコックピット状態（付属/専用/オープン/標準）のうち候補に存在するもの。
    // 表示順を安定させるため固定順で返す。
    const cockpitStatuses = useMemo<CockpitStatus[]>(() => {
        const present = new Set<CockpitStatus>()

        for (const part of parts) {
            const status = getFrameCockpitStatus(part)

            if (status && status !== "unknown") {
                present.add(status)
            }
        }

        return (["included", "dedicated", "open", "standard"] as const)
            .filter((status) => present.has(status))
    }, [parts])

    // 候補の中に確定した適合/非互換があるか（＝比較相手が存在するか）。
    // false のときは「表示」フィルターを隠し、適用済みでも無効化する。
    const canEvaluateCompatibility = useMemo(
        () => hasCompatibilityInfo(parts, compatibilityByPartId),
        [parts, compatibilityByPartId],
    )

    // フレームは全パーツ互換の基準として扱うため、互換フィルター（表示）の対象外にする。
    const isFrameCategory = activeCategoryKey === "frame"

    // 「表示」フィルターを出してよいか（比較相手があり、かつフレーム以外）。
    const showViewFilter = canEvaluateCompatibility && !isFrameCategory

    // カテゴリー変更で存在しなくなった条件は無効化し、空結果を防ぐ。
    // 絞り込み・バッジ・メニューはこの実効値だけを参照する。
    const effectiveFilters = useMemo<CandidateFilterState>(() => ({
        // 候補に存在するメーカーだけを選択状態として残す。
        brands: filters.brands.filter((brand) => brands.includes(brand)),
        // 比較相手が無いときは「適合のみ」等で空にならないよう全件表示へ戻す。
        viewMode: canEvaluateCompatibility ? filters.viewMode : "all",
        // 候補に存在するコックピット状態だけを選択状態として残す。
        cockpits: filters.cockpits.filter((status) => cockpitStatuses.includes(status)),
        // 候補に存在する年式だけを選択状態として残す。
        modelYears: filters.modelYears.filter((year) => modelYears.includes(year)),
        integratedHandlebarOnly:
            filters.integratedHandlebarOnly && hasIntegratedHandlebars,
        specs: Object.fromEntries(
            Object.entries(filters.specs).filter(([key]) =>
                specFilters.some((specFilter) => specFilter.key === key),
            ),
        ),
    }), [
        brands,
        canEvaluateCompatibility,
        cockpitStatuses,
        filters,
        hasIntegratedHandlebars,
        modelYears,
        specFilters,
    ])

    // 絞り込み・モデル集約・並び替え後の候補行
    const candidateRows = useMemo(() => {
        // 全角・半角、大文字・小文字を統一した検索文字列
        const normalizedQuery = searchQuery
            .trim()
            .normalize("NFKC")
            .toLocaleLowerCase("ja-JP")

        // 製品名・年式・世代で絞り込み、続けて種類別フィルターを純関数へ委ねる。
        const searchedParts = parts.filter((part) =>
            !normalizedQuery || [
                part.name,
                part.modelName,
                part.variantName,
                part.edition,
                part.modelYear != null ? String(part.modelYear) : null,
            ].some((value) => value
                ?.normalize("NFKC")
                .toLocaleLowerCase("ja-JP")
                .includes(normalizedQuery)),
        )

        const filteredParts = filterCandidateParts(
            searchedParts,
            effectiveFilters,
            compatibilityByPartId,
        )

        // 同一モデル（年式・エディション含む）のバリアントをまとめる。
        const variantsByModel = new Map<string, Part[]>()

        for (const part of filteredParts) {
            const key = getPartModelKey(part)
            const variants = variantsByModel.get(key)

            if (variants) {
                variants.push(part)
            } else {
                variantsByModel.set(key, [part])
            }
        }

        const rows: CandidatePartRow[] = []

        for (const [key, variants] of variantsByModel) {
            // サイズ等の数値が小さい順に並べ、セレクタと既定選択を安定させる。
            const orderedVariants = [...variants].sort(comparePartVariants)
            const manualVariantId = selectedVariantByModel[key]

            // 選択順は「手動選択 → 選択中パーツ → 適合 → 先頭」を優先する。
            const activePart =
                orderedVariants.find((part) => part.id === manualVariantId) ??
                orderedVariants.find((part) => part.id === selectedPartId) ??
                orderedVariants.find((part) =>
                    compatibilityByPartId.get(part.id)?.status === "compatible",
                ) ??
                orderedVariants[0]

            rows.push({ key, variants: orderedVariants, activePart })
        }

        // 代表バリアントで並び替える。
        return rows.sort((a, b) => {
            const { column, direction } = sortDescriptor

            if (column === "brand" || column === "name") {
                const aValue = column === "brand"
                    ? a.activePart.brandName ?? ""
                    : getPartDisplayName(a.activePart)
                const bValue = column === "brand"
                    ? b.activePart.brandName ?? ""
                    : getPartDisplayName(b.activePart)
                let result = aValue.localeCompare(
                    bValue,
                    "ja-JP",
                    { numeric: true },
                )

                // 同じメーカー内では製品名で比較
                if (result === 0 && column === "brand") {
                    result = getPartDisplayName(a.activePart).localeCompare(
                        getPartDisplayName(b.activePart),
                        "ja-JP",
                        { numeric: true },
                    )
                }

                return direction === "ascending" ? result : -result
            }

            const result = a.activePart[column] - b.activePart[column]

            return direction === "ascending" ? result : -result
        })
    }, [
        parts,
        compatibilityByPartId,
        effectiveFilters,
        searchQuery,
        selectedPartId,
        selectedVariantByModel,
        sortDescriptor,
    ])

    // モデル行のバリアントを切り替える。
    const changeVariant = useCallback((modelKey: string, partId: number) => {
        setSelectedVariantByModel((current) => ({
            ...current,
            [modelKey]: partId,
        }))
    }, [])

    // 並び順の変更処理
    function changeSort(column: CandidatePartsSortKey) {
        // 同じ列を押した時だけ昇順・降順を反転し、別列へ移る時は昇順へ戻す。
        setSortDescriptor((current) => ({
            column,
            direction:
                current.column === column &&
                current.direction === "ascending"
                    ? "descending"
                    : "ascending",
        }))
    }

    return {
        brands,
        candidateRows,
        changeSort,
        changeVariant,
        filters: effectiveFilters,
        hasActiveFilters: countActiveFilters(effectiveFilters) > 0,
        searchQuery,
        setFilters,
        setSearchQuery,
        cockpitStatuses,
        modelYears,
        showIntegratedHandlebarFilter: hasIntegratedHandlebars,
        showViewFilter,
        sortDescriptor,
        specFilters,
    }
}

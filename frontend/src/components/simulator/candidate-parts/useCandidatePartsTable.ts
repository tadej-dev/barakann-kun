import { useMemo, useState } from "react"

import {getPartDisplayName} from "@/features/simulator/partDisplay"
import type { Part } from "@/types/part"

// 並び替え対象
export type CandidatePartsSortKey = "brand" | "name" | "weight" | "price"

// 並び替え条件
export type CandidatePartsSortDescriptor = {
    column: CandidatePartsSortKey
    direction: "ascending" | "descending"
}

const ALL_BRANDS = "all"

// 候補パーツ表の状態管理
export function useCandidatePartsTable(parts: Part[]) {
    // 並び替え状態
    const [sortDescriptor, setSortDescriptor] =
        useState<CandidatePartsSortDescriptor>({
            column: "brand",
            direction: "ascending",
        })
    // 製品名の検索文字列
    const [searchQuery, setSearchQuery] = useState("")

    // 選択中のブランド
    const [selectedBrand, setSelectedBrand] = useState(ALL_BRANDS)

    // ステム一体型フィルター
    const [integratedHandlebarOnly, setIntegratedHandlebarOnly] =
        useState(false)

    // 一体型ハンドルの有無
    const hasIntegratedHandlebars = useMemo(() => {
        return parts.some((part) =>
            (part.blockedCategoryKeys ?? []).includes("stem"),
        )
    }, [parts])

    // 重複・空文字を除外したブランド一覧
    const brands = useMemo(() => {
        return [...new Set(
            parts
                .map((part) => part.brandName)
                .filter((brand): brand is string =>
                    typeof brand === "string" && brand.trim() !== "",
                ),
        )].sort((a, b) => a.localeCompare(b, "ja-JP"))
    }, [parts])

    // カテゴリー変更で存在しなくなったフィルターを表示上解除し、空結果を防ぐ
    const effectiveSelectedBrand = selectedBrand !== ALL_BRANDS &&
        brands.includes(selectedBrand)
        ? selectedBrand
        : ALL_BRANDS
    const effectiveIntegratedHandlebarOnly = integratedHandlebarOnly &&
        hasIntegratedHandlebars

    // 絞り込み・並び替え後の候補パーツ
    const filteredAndSortedParts = useMemo(() => {
        // 全角・半角、大文字・小文字を統一した検索文字列
        const normalizedQuery = searchQuery
            .trim()
            .normalize("NFKC")
            .toLocaleLowerCase("ja-JP")

        // 製品名・ブランド・一体型による絞り込み
        const filteredParts = parts.filter((part) => {
            const matchesName = !normalizedQuery || [
                part.name,
                part.modelName,
                part.variantName,
            ].some((value) => value
                ?.normalize("NFKC")
                .toLocaleLowerCase("ja-JP")
                .includes(normalizedQuery))

            const matchesBrand = effectiveSelectedBrand === ALL_BRANDS ||
                part.brandName === effectiveSelectedBrand

            const matchesIntegratedHandlebar =
                !effectiveIntegratedHandlebarOnly ||
                (part.blockedCategoryKeys ?? []).includes("stem")

            return matchesName &&
                matchesBrand &&
                matchesIntegratedHandlebar
        })

        // 選択中の列と方向による並び替え
        return [...filteredParts].sort((a, b) => {
            const { column, direction } = sortDescriptor

            if (column === "brand" || column === "name") {
                const aValue = column === "brand"
                    ? a.brandName ?? ""
                    : getPartDisplayName(a)
                const bValue = column === "brand"
                    ? b.brandName ?? ""
                    : getPartDisplayName(b)
                let result = aValue.localeCompare(
                    bValue,
                    "ja-JP",
                    { numeric: true },
                )

                // 同じメーカー内では製品名で比較
                if (result === 0 && column === "brand") {
                    result = getPartDisplayName(a).localeCompare(
                        getPartDisplayName(b),
                        "ja-JP",
                        { numeric: true },
                    )
                }

                return direction === "ascending" ? result : -result
            }

            const result = a[column] - b[column]

            return direction === "ascending" ? result : -result
        })
    }, [
        parts,
        effectiveIntegratedHandlebarOnly,
        effectiveSelectedBrand,
        searchQuery,
        sortDescriptor,
    ])

    // 並び順の変更処理
    function changeSort(column: CandidatePartsSortKey) {
        setSortDescriptor((current) => ({
            column,
            direction:
                current.column === column &&
                current.direction === "ascending"
                    ? "descending"
                    : "ascending",
        }))
    }

    // 検索条件の有無
    const hasActiveFilters = searchQuery.trim() !== "" ||
        effectiveSelectedBrand !== ALL_BRANDS ||
        effectiveIntegratedHandlebarOnly

    return {
        brands,
        changeSort,
        filteredAndSortedParts,
        hasActiveFilters,
        hasIntegratedHandlebars,
        integratedHandlebarOnly: effectiveIntegratedHandlebarOnly,
        searchQuery,
        selectedBrand: effectiveSelectedBrand,
        setIntegratedHandlebarOnly,
        setSearchQuery,
        setSelectedBrand,
        sortDescriptor,
    }
}

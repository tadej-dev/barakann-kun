import {Badge} from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {CandidatePartsFilterMenu} from "@/components/simulator/candidate-parts/CandidatePartsFilterMenu"
import type {
    CandidateFilterState,
    CockpitStatus,
    SpecFilter,
} from "@/features/simulator/candidatePartsFilter"

type CandidatePartsFiltersProps = {
    filters: CandidateFilterState
    brands: string[]
    specFilters: SpecFilter[]
    showViewFilter: boolean
    cockpitStatuses: CockpitStatus[]
    modelYears: number[]
    showIntegratedHandlebarFilter: boolean
    onFiltersChange: (next: CandidateFilterState) => void
    searchQuery: string
    resultCount: number
    onSearchQueryChange: (query: string) => void
    slotPositionLabel?: string | null // 前後スロットの表示名(前輪・後輪)。単一スロットではnull
}

// 候補パーツの絞り込み欄
export function CandidatePartsFilters({
    filters,
    brands,
    specFilters,
    showViewFilter,
    cockpitStatuses,
    modelYears,
    showIntegratedHandlebarFilter,
    onFiltersChange,
    searchQuery,
    resultCount,
    onSearchQueryChange,
    slotPositionLabel,
}: CandidatePartsFiltersProps) {
    // 件数を絞り込みボタンの左に置き、絞り込みメニュー・検索の順で並べる。
    // 検索は文字入力が主操作のため、メニューではなく入力欄として残す。
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* 桁数で幅が変わると右隣のボタンが動くため、固定幅・左寄せ・等幅数字にする。 */}
            <p className="ml-1 min-w-12 shrink-0 text-left text-sm tabular-nums text-slate-500 sm:mr-2">
                {resultCount}件
            </p>

            <CandidatePartsFilterMenu
                filters={filters}
                brands={brands}
                specFilters={specFilters}
                showViewFilter={showViewFilter}
                cockpitStatuses={cockpitStatuses}
                modelYears={modelYears}
                showIntegratedHandlebarFilter={showIntegratedHandlebarFilter}
                onFiltersChange={onFiltersChange}
            />

            <Input
                type="search"
                aria-label="検索"
                placeholder="検索"
                className="w-full sm:max-w-sm"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
            />

            {/* 前後で別々に選ぶパーツは、どちらの位置を選んでいるかを検索欄の右に示す。 */}
            {slotPositionLabel && (
                <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-600">
                    選択位置
                    <Badge variant="outline">
                        {slotPositionLabel}
                    </Badge>
                </div>
            )}
        </div>
    )
}

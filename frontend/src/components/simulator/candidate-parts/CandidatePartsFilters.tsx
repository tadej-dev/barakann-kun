import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {BrandSelect} from "@/components/simulator/candidate-parts/BrandSelect"

type CandidatePartsFiltersProps = {
    brands: string[]
    selectedBrand: string
    searchQuery: string
    integratedHandlebarOnly: boolean
    showIntegratedHandlebarFilter: boolean
    resultCount: number
    onBrandChange: (brand: string) => void
    onSearchQueryChange: (query: string) => void
    onIntegratedHandlebarOnlyChange: (checked: boolean) => void
}

// 候補パーツの絞り込み欄
export function CandidatePartsFilters({
    brands,
    selectedBrand,
    searchQuery,
    integratedHandlebarOnly,
    showIntegratedHandlebarFilter,
    resultCount,
    onBrandChange,
    onSearchQueryChange,
    onIntegratedHandlebarOnlyChange,
}: CandidatePartsFiltersProps) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <BrandSelect
                brands={brands}
                selectedBrand={selectedBrand}
                onBrandChange={onBrandChange}
            />

            <Input
                type="search"
                aria-label="製品名で検索"
                placeholder="製品名で検索"
                className="w-full sm:max-w-sm"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
            />

            {showIntegratedHandlebarFilter && (
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                        checked={integratedHandlebarOnly}
                        onCheckedChange={onIntegratedHandlebarOnlyChange}
                    />
                    ステム一体型のみ
                </label>
            )}

            <p className="shrink-0 text-sm text-slate-500">
                {resultCount}件
            </p>
        </div>
    )
}

import {Filter} from "lucide-react"

import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuGroupLabel,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    countActiveFilters,
    initialCandidateFilterState,
    toggleSelection,
    type CandidateFilterState,
    type CandidateViewMode,
    type CockpitStatus,
    type SpecFilter,
} from "@/features/simulator/candidatePartsFilter"

type CandidatePartsFilterMenuProps = {
    filters: CandidateFilterState
    brands: string[]
    specFilters: SpecFilter[]
    showViewFilter: boolean
    cockpitStatuses: CockpitStatus[]
    modelYears: number[]
    showIntegratedHandlebarFilter: boolean
    onFiltersChange: (next: CandidateFilterState) => void
}

// 表示モードの選択肢
const viewOptions: { value: CandidateViewMode; label: string }[] = [
    {value: "all", label: "すべて"},
    {value: "excludeIncompatible", label: "非互換を除外"},
    {value: "compatibleOnly", label: "適合のみ"},
]

// 候補パーツの絞り込みメニュー
export function CandidatePartsFilterMenu({
    filters,
    brands,
    specFilters,
    showViewFilter,
    cockpitStatuses,
    modelYears,
    showIntegratedHandlebarFilter,
    onFiltersChange,
}: CandidatePartsFilterMenuProps) {
    // 適用中の条件数を数え、トリガーのバッジへ表示する。
    const activeFilterCount = countActiveFilters(filters)

    // コックピットのラジオに表示する現在値（専用/オープン/標準、未指定なら all）。
    const cockpitInterfaceValue: "all" | CockpitStatus =
        filters.cockpits.find((status) => status !== "included") ?? "all"

    // 一部の項目だけを差し替えた新しい状態を作る。
    function update(patch: Partial<CandidateFilterState>) {
        onFiltersChange({...filters, ...patch})
    }

    // 規格値のチェックを1つ切り替える。選択が空になったキーは削除する。
    function toggleSpecValue(key: string, value: string, checked: boolean) {
        const current = filters.specs[key] ?? []
        const nextValues = toggleSelection(current, value, checked)
        const nextSpecs = {...filters.specs}

        if (nextValues.length > 0) {
            nextSpecs[key] = nextValues
        } else {
            delete nextSpecs[key]
        }

        update({specs: nextSpecs})
    }

    // メーカーのチェックを1つ切り替える（複数選択）。
    function toggleBrand(brand: string, checked: boolean) {
        update({brands: toggleSelection(filters.brands, brand, checked)})
    }

    // 年式のチェックを1つ切り替える（複数選択）。
    function toggleModelYear(year: number, checked: boolean) {
        const nextYears = checked
            ? [...filters.modelYears, year]
            : filters.modelYears.filter((value) => value !== year)

        update({modelYears: nextYears})
    }

    // 「コックピット付属」は独立したチェックとして扱う。
    function toggleCockpitIncluded(checked: boolean) {
        update({
            cockpits: toggleSelection(
                filters.cockpits,
                "included",
                checked,
            ) as CockpitStatus[],
        })
    }

    // 「専用/オープン/標準」はラジオのまま扱い、選択中の項目を再クリックしたら解除する。
    // 付属の選択は保持する。
    function toggleCockpitInterface(value: CockpitStatus) {
        const withoutInterface = filters.cockpits.filter(
            (item) =>
                item !== "dedicated" &&
                item !== "open" &&
                item !== "standard",
        )

        // 既に選択中の項目を再クリック → 接続規格を未選択（絞り込みなし）へ戻す。
        if (filters.cockpits.includes(value)) {
            update({cockpits: withoutInterface})
            return
        }

        // 未選択の項目をクリック → それだけを選ぶ（ラジオの排他）。
        update({cockpits: [...withoutInterface, value]})
    }

    // すべての条件を初期状態へ戻す。
    function resetFilters() {
        onFiltersChange(initialCandidateFilterState)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        type="button"
                        variant="outline"
                        className="w-36 justify-between gap-2"
                        aria-label="絞り込み"
                    />
                }
            >
                <span className="flex items-center gap-2">
                    <Filter className="size-4" aria-hidden="true"/>
                    絞り込み
                </span>

                {/* 2桁分の幅を常時確保し、件数の有無でボタン幅が変わらないようにする。 */}
                <span className="flex w-7 justify-center">
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary" aria-label={`適用中${activeFilterCount}件`}>
                            {activeFilterCount}
                        </Badge>
                    )}
                </span>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-56">
                {/* 表示モードは比較相手があるときだけ意味を持つため、無いときは隠す。 */}
                {showViewFilter && (
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>表示</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup
                                value={filters.viewMode}
                                onValueChange={(value) =>
                                    update({viewMode: value as CandidateViewMode})}
                            >
                                <DropdownMenuGroupLabel>表示</DropdownMenuGroupLabel>
                                {viewOptions.map((option) => (
                                    <DropdownMenuRadioItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                )}

                {/* メーカーは数が多いため、BB規格と同じく複数選択のチェック項目にする。 */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>メーカー</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="max-h-[60vh] overflow-auto">
                        <DropdownMenuGroup>
                            <DropdownMenuGroupLabel>メーカー</DropdownMenuGroupLabel>
                            {brands.map((brand) => (
                                <DropdownMenuCheckboxItem
                                    key={brand}
                                    checked={filters.brands.includes(brand)}
                                    onCheckedChange={(checked) =>
                                        toggleBrand(brand, checked)}
                                >
                                    {brand}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* 年式は候補に実在するときだけ、複数選択のチェック項目にする。 */}
                {modelYears.length > 0 && (
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>年式</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="max-h-[60vh] overflow-auto">
                            <DropdownMenuGroup>
                                <DropdownMenuGroupLabel>年式</DropdownMenuGroupLabel>
                                {modelYears.map((year) => (
                                    <DropdownMenuCheckboxItem
                                        key={year}
                                        checked={filters.modelYears.includes(year)}
                                        onCheckedChange={(checked) =>
                                            toggleModelYear(year, checked)}
                                    >
                                        {year}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                )}

                {/* コックピットは付属=チェック、専用/標準=ラジオ（どちらか1つ）として扱う。 */}
                {cockpitStatuses.length > 0 && (
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>コックピット</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            {cockpitStatuses.includes("included") && (
                                <>
                                    <DropdownMenuGroup>
                                        <DropdownMenuGroupLabel>付属</DropdownMenuGroupLabel>
                                        <DropdownMenuCheckboxItem
                                            checked={filters.cockpits.includes("included")}
                                            onCheckedChange={toggleCockpitIncluded}
                                        >
                                            コックピット付属
                                        </DropdownMenuCheckboxItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator/>
                                </>
                            )}

                            <DropdownMenuRadioGroup
                                value={cockpitInterfaceValue}
                                onValueChange={(value) =>
                                    toggleCockpitInterface(value as CockpitStatus)}
                            >
                                <DropdownMenuGroupLabel>接続規格</DropdownMenuGroupLabel>
                                {cockpitStatuses.includes("dedicated") && (
                                    <DropdownMenuRadioItem value="dedicated">
                                        専用規格
                                    </DropdownMenuRadioItem>
                                )}
                                {cockpitStatuses.includes("open") && (
                                    <DropdownMenuRadioItem value="open">
                                        サードパーティ対応
                                    </DropdownMenuRadioItem>
                                )}
                                {cockpitStatuses.includes("standard") && (
                                    <DropdownMenuRadioItem value="standard">
                                        1-1/8標準コラム
                                    </DropdownMenuRadioItem>
                                )}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                )}

                {/* 規格値フィルターは候補に実在するものだけを自動生成して並べる。 */}
                {specFilters.map((specFilter) => {
                    const selectedValues = filters.specs[specFilter.key] ?? []

                    return (
                        <DropdownMenuSub key={specFilter.key}>
                            <DropdownMenuSubTrigger>
                                {specFilter.label}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="max-h-[60vh] overflow-auto">
                                {/* GroupLabelはGroup/RadioGroup内でのみ有効なためGroupで包む。 */}
                                <DropdownMenuGroup>
                                    <DropdownMenuGroupLabel>
                                        {specFilter.label}
                                    </DropdownMenuGroupLabel>
                                    {specFilter.options.map((option) => (
                                        <DropdownMenuCheckboxItem
                                            key={option.value}
                                            checked={selectedValues.includes(option.value)}
                                        onCheckedChange={(checked) =>
                                            toggleSpecValue(
                                                specFilter.key,
                                                option.value,
                                                checked,
                                            )}
                                        >
                                            {option.label}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuGroup>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    )
                })}

                {showIntegratedHandlebarFilter && (
                    <DropdownMenuCheckboxItem
                        checked={filters.integratedHandlebarOnly}
                        onCheckedChange={(checked) =>
                            update({integratedHandlebarOnly: checked})}
                    >
                        ステム一体型のみ
                    </DropdownMenuCheckboxItem>
                )}

                <DropdownMenuSeparator/>

                {/* 条件が1つも無いときは解除する対象が無いため無効化する。 */}
                <DropdownMenuItem
                    disabled={activeFilterCount === 0}
                    onClick={resetFilters}
                >
                    絞り込みを解除
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

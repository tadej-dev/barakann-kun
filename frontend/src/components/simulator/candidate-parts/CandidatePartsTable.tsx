import {CandidatePartsFilters} from "./CandidatePartsFilters"
import {CandidatePartsTableHeader} from "./CandidatePartsTableHeader"
import {CandidatePartsTableMessage} from "./CandidatePartsTableMessage"
import {CandidatePartsTableRow} from "./CandidatePartsTableRow"
import {useCandidatePartsTable} from "./useCandidatePartsTable"
import {
    Table,
    TableBody,
    TableCell,
    TableRow,
} from "@/components/ui/table"
import type {Part} from "@/types/part"

// 候補パーツ表のプロパティ
type CandidatePartsTableProps = {
    parts: Part[] // 選択中カテゴリーの候補パーツ
    selectedPart?: Part // 選択済みパーツ
    isLoading: boolean // API通信中の状態
    errorMessage: string // API取得失敗時のメッセージ
    blockedMessage?: string // 選択済みパーツによる選択不可メッセージ
    onSelect: (part: Part) => void // パーツ選択処理
}

// 候補パーツ一覧
export function CandidatePartsTable({
                                        parts,
                                        selectedPart,
                                        isLoading,
                                        errorMessage,
                                        blockedMessage,
                                        onSelect,
                                    }: CandidatePartsTableProps) {
    // 候補パーツ表の状態・表示データ
    const {
        brands,
        changeSort,
        filteredAndSortedParts,
        hasActiveFilters,
        hasIntegratedHandlebars,
        integratedHandlebarOnly,
        searchQuery,
        selectedBrand,
        setIntegratedHandlebarOnly,
        setSearchQuery,
        setSelectedBrand,
        sortDescriptor,
    } = useCandidatePartsTable(parts)

    // 選択不可状態
    if (blockedMessage) {
        return <CandidatePartsTableMessage message={blockedMessage}/>
    }

    // 読み込み状態
    if (isLoading) {
        return <CandidatePartsTableMessage message="パーツを読み込んでいます..."/>
    }

    // API取得エラー
    if (errorMessage) {
        return (
            <CandidatePartsTableMessage
                message={errorMessage}
                className="text-destructive"
            />
        )
    }

    return (
        <div className="space-y-3">
            <CandidatePartsFilters
                brands={brands}
                selectedBrand={selectedBrand}
                searchQuery={searchQuery}
                integratedHandlebarOnly={integratedHandlebarOnly}
                showIntegratedHandlebarFilter={hasIntegratedHandlebars}
                resultCount={filteredAndSortedParts.length}
                onBrandChange={setSelectedBrand}
                onSearchQueryChange={setSearchQuery}
                onIntegratedHandlebarOnlyChange={setIntegratedHandlebarOnly}
            />

            <div className="overflow-hidden rounded-lg border bg-background">
                <Table
                    aria-label="候補パーツ一覧"
                    className="min-w-[760px] table-fixed"
                >
                    <CandidatePartsTableHeader
                        sortDescriptor={sortDescriptor}
                        onSort={changeSort}
                    />

                    <TableBody className={"font-bold"}>
                        {filteredAndSortedParts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5}>
                                    <div className="py-8 text-center text-zinc-500">
                                        {hasActiveFilters
                                            ? "検索条件に一致するパーツがありません"
                                            : "表示できるパーツがありません"}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredAndSortedParts.map((part) => (
                                <CandidatePartsTableRow
                                    key={part.id}
                                    part={part}
                                    isSelected={selectedPart?.id === part.id}
                                    onSelect={onSelect}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

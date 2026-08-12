import {CandidatePartsFilters} from "./CandidatePartsFilters"
import {CandidatePartsBlockedMessage} from "./CandidatePartsBlockedMessage"
import {CandidatePartsSelectionDialog} from "./CandidatePartsSelectionDialog"
import {CandidatePartsTableHeader} from "./CandidatePartsTableHeader"
import {CandidatePartsTableMessage} from "./CandidatePartsTableMessage"
import {CandidatePartsTableRow} from "./CandidatePartsTableRow"
import {useCandidatePartsTable} from "./useCandidatePartsTable"
import {useCandidatePartsSelection} from "./useCandidatePartsSelection"
import {
    Table,
    TableBody,
    TableCell,
    TableRow,
} from "@/components/ui/table"
import {Badge} from "@/components/ui/badge"
import {
    evaluatePartCompatibility,
    getPartPackageUnit,
} from "@/features/simulator/partCompatibility"
import {hasPartVariantColumn} from "@/features/simulator/partDisplay"
import type {PartSlot} from "@/features/simulator/partSlots"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"
import type {Part} from "@/types/part"

// 候補パーツ表のプロパティ
type CandidatePartsTableProps = {
    parts: Part[] // 選択中カテゴリーの候補パーツ
    activeSlot: PartSlot // 選択中の選択枠
    selectedParts: SelectedParts // 現在構成の選択済みパーツ
    selectedPart?: Part // 選択済みパーツ
    isLoading: boolean // API通信中の状態
    errorMessage: string // API取得失敗時のメッセージ
    blockedMessage?: string // 選択済みパーツによる選択不可メッセージ
    blockingCategoryNames: string[] // 選択不可の原因となるカテゴリー名
    blockingPartNames: string[] // 選択不可の原因となるパーツ名
    slotPositionLabel?: string | null // 前後スロットの表示名
    onSelect: (
        part: Part,
        slotKeys?: string[],
        removeSlotKeys?: string[],
    ) => void // パーツ選択処理
    onRemoveBlockingParts: () => void // 選択不可の原因となるパーツの解除処理
}

// 候補パーツ一覧
export function CandidatePartsTable({
                                        parts,
                                        activeSlot,
                                        selectedParts,
                                        selectedPart,
                                        isLoading,
                                        errorMessage,
                                        blockedMessage,
                                        blockingCategoryNames,
                                        blockingPartNames,
                                        slotPositionLabel,
                                        onSelect,
                                        onRemoveBlockingParts,
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
    const showVariantColumn = hasPartVariantColumn(parts)

    const {
        cancelPendingSelection,
        categorySlots,
        confirmPendingSelection,
        pendingSelection,
        requestSelection,
    } = useCandidatePartsSelection(
        activeSlot,
        selectedParts,
        onSelect,
    )
    const supportsFrontRearSelection = categorySlots.length === 2

    // 選択不可状態
    if (blockedMessage) {
        return (
            <CandidatePartsBlockedMessage
                message={blockedMessage}
                showVariantColumn={showVariantColumn}
                blockingCategoryNames={blockingCategoryNames}
                blockingPartNames={blockingPartNames}
                onRemove={onRemoveBlockingParts}
            />
        )
    }

    // 読み込み状態
    if (isLoading) {
        return (
            <CandidatePartsTableMessage
                message="パーツを読み込んでいます..."
                showVariantColumn={showVariantColumn}
            />
        )
    }

    // API取得エラー
    if (errorMessage) {
        return (
            <CandidatePartsTableMessage
                message={errorMessage}
                showVariantColumn={showVariantColumn}
                className="text-destructive"
            />
        )
    }

    return (
        <div className="space-y-3">
            {slotPositionLabel && (
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    選択位置
                    <Badge variant="outline">
                        {slotPositionLabel}
                    </Badge>
                </div>
            )}

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

            <div className="overflow-x-auto rounded-lg border bg-background">
                <Table
                    aria-label="候補パーツ一覧"
                    className="min-w-[760px] table-fixed"
                >
                    <CandidatePartsTableHeader
                        sortDescriptor={sortDescriptor}
                        showVariantColumn={showVariantColumn}
                        onSort={changeSort}
                    />

                    <TableBody className={"font-bold"}>
                        {filteredAndSortedParts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={showVariantColumn ? 5 : 4}>
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
                                    showVariantColumn={showVariantColumn}
                                    compatibility={evaluatePartCompatibility(
                                        part,
                                        activeSlot,
                                        selectedParts,
                                    )}
                                    canSelectBoth={
                                        supportsFrontRearSelection &&
                                        !part.specifications?.allowed_position &&
                                        getPartPackageUnit(part) !== "pair"
                                    }
                                    onSelect={() => requestSelection(part)}
                                    onSelectBoth={() => requestSelection(part, true)}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <CandidatePartsSelectionDialog
                selection={pendingSelection}
                onConfirm={confirmPendingSelection}
                onCancel={cancelPendingSelection}
            />
        </div>
    )
}

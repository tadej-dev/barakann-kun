import {useMemo} from "react"

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
    type CompatibilityResult,
} from "@/features/simulator/partCompatibility"
import {hasPartVariantColumn} from "@/features/simulator/partDisplay"
import type {PartSlot} from "@/features/simulator/partSlots"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"
import type {Part} from "@/types/part"

// 行数が多い場合だけブラウザ標準の遅延描画を有効化
const CONTENT_VISIBILITY_THRESHOLD = 100

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
        requestSelectionBoth,
    } = useCandidatePartsSelection(
        activeSlot,
        selectedParts,
        onSelect,
    )
    const supportsFrontRearSelection = categorySlots.length === 2
    const enableContentVisibility = filteredAndSortedParts.length >=
        CONTENT_VISIBILITY_THRESHOLD
    // 検索条件が変わっても適合判定を再計算せず、パーツ選択時だけ更新
    // 規格判定はフィルター結果ではなく元の候補一覧を対象にし、行表示時の参照をO(1)にする。
    const compatibilityByPartId = useMemo(() => {
        const result = new Map<number, CompatibilityResult | null>()

        for (const part of parts) {
            result.set(
                part.id,
                evaluatePartCompatibility(part, activeSlot, selectedParts),
            )
        }

        return result
    }, [activeSlot, parts, selectedParts])

    // 表示データの準備後に、排他・読み込み・エラーの順で早期returnする。
    // 選択不可状態
    if (blockedMessage) {
        // 一体型パーツなどでカテゴリー全体が占有されている場合は、表を出さず解除導線を優先する。
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
        // 候補一覧がまだない間に空表示と誤認させない。
        return (
            <CandidatePartsTableMessage
                message="パーツを読み込んでいます..."
                showVariantColumn={showVariantColumn}
            />
        )
    }

    // API取得エラー
    if (errorMessage) {
        // 取得失敗時は古い候補を表示せず、再試行可能なエラー表示へ切り替える。
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

            <div
                className={
                    "rounded-lg border bg-background " +
                    (enableContentVisibility
                        ? "max-h-[70vh] overflow-auto"
                        : "overflow-x-auto")
                }
            >
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
                                    compatibility={compatibilityByPartId.get(part.id) ?? null}
                                    enableContentVisibility={enableContentVisibility}
                                    canSelectBoth={
                                        supportsFrontRearSelection &&
                                        !part.specifications?.allowed_position &&
                                        getPartPackageUnit(part) !== "pair"
                                    }
                                    onSelect={requestSelection}
                                    onSelectBoth={requestSelectionBoth}
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

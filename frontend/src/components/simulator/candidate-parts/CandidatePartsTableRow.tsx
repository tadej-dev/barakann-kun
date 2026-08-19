import {memo, type KeyboardEvent} from "react"

import { Badge } from "@/components/ui/badge"
import {buttonVariants} from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import {
    getPartPackageUnit,
    getSpecificationLabel,
    getSpecificationValueLabel,
    type CompatibilityResult,
} from "@/features/simulator/partCompatibility"
import {getPartDisplayName} from "@/features/simulator/partDisplay"
import type { Part } from "@/types/part"

type CandidatePartsTableRowProps = {
    part: Part
    isSelected: boolean
    showVariantColumn: boolean
    compatibility: CompatibilityResult | null
    canSelectBoth: boolean
    enableContentVisibility: boolean
    onSelect: (part: Part) => void
    onSelectBoth: (part: Part) => void
}

const priceFormatter = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
})

const compatibilityBadgeStyles = {
    compatible: "border-emerald-300 bg-emerald-50 text-emerald-700",
    unknown: "border-amber-300 bg-amber-50 text-amber-700",
    incompatible: "border-red-300 bg-red-50 text-red-700",
}

const compatibilityLabels = {
    compatible: "適合",
    unknown: "規格未確認",
    incompatible: "非互換",
}

// 候補パーツ表の行
function CandidatePartsTableRowComponent({
    part,
    isSelected,
    showVariantColumn,
    compatibility,
    canSelectBoth,
    enableContentVisibility,
    onSelect,
    onSelectBoth,
}: CandidatePartsTableRowProps) {
    // 行内で使う付属品・規格情報を先に整形し、JSXでは表示条件だけを扱う。
    const includedItems = part.includedItems ?? []
    const specifications = Object.entries(part.specifications ?? {})
    const isSelectionBlocked = compatibility?.selectionBlocked ?? false

    // キーボードによるパーツ選択処理
    function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            if (!isSelectionBlocked) {
                onSelect(part)
            }
        }
    }

    return (
        <TableRow
            tabIndex={0}
            aria-selected={isSelected}
            data-state={isSelected ? "selected" : undefined}
            className={
                isSelectionBlocked
                    ? "cursor-not-allowed bg-muted/30 text-muted-foreground"
                    : isSelected
                    ? "cursor-pointer bg-muted hover:bg-muted"
                    : "cursor-pointer"
            }
            style={enableContentVisibility
                ? {
                    // 大量行では画面外の描画をブラウザへ委譲
                    contentVisibility: "auto",
                    containIntrinsicSize: "0 96px",
                }
                : undefined}
            aria-disabled={isSelectionBlocked}
            onClick={() => {
                if (!isSelectionBlocked) {
                    onSelect(part)
                }
            }}
            onKeyDown={handleKeyDown}
        >
            {/* 行全体を選択対象にし、前後一括などの補助操作だけイベント伝播を止める。 */}
            <TableCell className="font-medium">
                {part.brandName ?? "-"}
            </TableCell>

            <TableCell className="whitespace-normal">
                <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 break-words font-medium [overflow-wrap:anywhere]">
                            {getPartDisplayName(part)}
                        </span>

                        {(part.blockedCategoryKeys ?? []).includes("stem") && (
                            <Badge className="bg-sky-100 text-sky-800">
                                ステム一体型
                            </Badge>
                        )}

                        {getPartPackageUnit(part) === "pair" && (
                            <Badge variant="secondary">前後セット</Badge>
                        )}

                        {compatibility && (
                            <Badge
                                variant="outline"
                                className={compatibilityBadgeStyles[compatibility.status]}
                                title={compatibility.reasons.join("\n")}
                            >
                                {compatibilityLabels[compatibility.status]}
                            </Badge>
                        )}
                    </div>

                    {includedItems.length > 0 && (
                        <span className="break-words text-xs font-normal text-slate-500 [overflow-wrap:anywhere]">
                            付属品・構成品: {includedItems
                                .map((item) =>
                                    `${item.name} ×${item.quantity}`,
                                )
                                .join("、")}
                        </span>
                    )}

                    {compatibility && (
                        <span className="break-words text-xs font-normal text-slate-500 [overflow-wrap:anywhere]">
                            {compatibility.reasons.join("、")}
                        </span>
                    )}

                    {canSelectBoth && (
                        <button
                            type="button"
                            className={`${buttonVariants({variant: "outline", size: "sm"})} mt-1 w-fit`}
                            onClick={(event) => {
                                event.stopPropagation()
                                onSelectBoth(part)
                            }}
                        >
                            前後に選択
                        </button>
                    )}
                </div>
            </TableCell>

            {showVariantColumn && (
                <TableCell>
                    {part.variantName ? (
                        <Badge variant="secondary">{part.variantName}</Badge>
                    ) : (
                        <span className="text-muted-foreground">-</span>
                    )}

                    {specifications.length > 0 && (
                        <div className="mt-1 flex flex-col gap-0.5 text-[10px] font-normal text-muted-foreground">
                            {specifications.map(([key, value]) => (
                                <span key={key}>
                                    {getSpecificationLabel(key)}: {getSpecificationValueLabel(key, value)}
                                </span>
                            ))}
                        </div>
                    )}
                </TableCell>
            )}

            <TableCell className="text-right tabular-nums">
                {part.weight.toLocaleString("ja-JP")}g
            </TableCell>

            <TableCell className="text-right tabular-nums">
                {priceFormatter.format(part.price)}
            </TableCell>
        </TableRow>
    )
}

// 選択状態や適合結果が変わらない行は再描画を省略
export const CandidatePartsTableRow = memo(CandidatePartsTableRowComponent)

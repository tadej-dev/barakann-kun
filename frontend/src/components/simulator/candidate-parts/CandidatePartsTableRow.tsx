import type { KeyboardEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import type { Part } from "@/types/part"

type CandidatePartsTableRowProps = {
    part: Part
    isSelected: boolean
    onSelect: (part: Part) => void
}

const priceFormatter = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
})

// 候補パーツ表の行
export function CandidatePartsTableRow({
    part,
    isSelected,
    onSelect,
}: CandidatePartsTableRowProps) {
    const includedItems = part.includedItems ?? []

    // キーボードによるパーツ選択処理
    function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onSelect(part)
        }
    }

    return (
        <TableRow
            tabIndex={0}
            aria-selected={isSelected}
            data-state={isSelected ? "selected" : undefined}
            className={
                isSelected
                    ? "cursor-pointer bg-muted hover:bg-muted"
                    : "cursor-pointer"
            }
            onClick={() => onSelect(part)}
            onKeyDown={handleKeyDown}
        >
            <TableCell className="font-medium">
                {part.brandName ?? "-"}
            </TableCell>

            <TableCell className="whitespace-normal">
                <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 break-words font-medium [overflow-wrap:anywhere]">
                            {part.modelName?.trim() || part.name}
                        </span>

                        {(part.blockedCategoryKeys ?? []).includes("stem") && (
                            <Badge className="bg-sky-100 text-sky-800">
                                ステム一体型
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
                </div>
            </TableCell>

            <TableCell>
                {part.variantName ? (
                    <Badge variant="secondary">{part.variantName}</Badge>
                ) : (
                    <span className="text-muted-foreground">-</span>
                )}
            </TableCell>

            <TableCell className="text-right tabular-nums">
                {part.weight.toLocaleString("ja-JP")}g
            </TableCell>

            <TableCell className="text-right tabular-nums">
                {priceFormatter.format(part.price)}
            </TableCell>
        </TableRow>
    )
}

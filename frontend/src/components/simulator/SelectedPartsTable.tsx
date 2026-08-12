import type {KeyboardEvent} from "react"

import {Badge} from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {getPartDisplayName} from "@/features/simulator/partDisplay"
import {
    getPartSlotPositionLabel,
    getPartSlots,
    type PartSlot,
} from "@/features/simulator/partSlots"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"
import type {Category} from "@/types/category"

type SelectedPartsTableProps = {
    categories: Category[]
    activeSlotKey: string
    selectedParts: SelectedParts
    blockedCategoryKeys: ReadonlySet<string>
    onSlotChange: (slot: PartSlot) => void
}

const priceFormatter = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
})

export function SelectedPartsTable({
                                       categories,
                                       activeSlotKey,
                                       selectedParts,
                                       blockedCategoryKeys,
                                       onSlotChange,
                                   }: SelectedPartsTableProps) {
    function selectSlot(slot: PartSlot) {
        onSlotChange(slot)
    }

    function handleRowKeyDown(
        event: KeyboardEvent<HTMLTableRowElement>,
        slot: PartSlot,
    ) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            selectSlot(slot)
        }
    }

    return (
        <div className="overflow-x-auto rounded-lg border bg-background">
            <Table
                aria-label="選択済みパーツ一覧"
                className="min-w-[720px] table-fixed"
            >
                <TableHeader className="bg-muted/70">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="h-11 w-[20%] text-xs font-semibold tracking-wide text-muted-foreground">
                            カテゴリ
                        </TableHead>
                        <TableHead className="h-11 w-[45%] text-xs font-semibold tracking-wide text-muted-foreground">
                            選択中のパーツ
                        </TableHead>
                        <TableHead className="h-11 w-[15%] text-left text-xs font-semibold tracking-wide text-muted-foreground">
                            重量
                        </TableHead>
                        <TableHead className="h-11 w-[20%] text-left text-xs font-semibold tracking-wide text-muted-foreground">
                            価格
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody className="font-bold">
                    {categories.flatMap((category) => {
                        return getPartSlots(category.key).map((slot) => {
                            const part = selectedParts[slot.key]
                            const positionLabel = getPartSlotPositionLabel(
                                slot.position,
                            )
                            const isActive = slot.key === activeSlotKey
                            const isBlocked = blockedCategoryKeys.has(
                                category.key,
                            )

                            return (
                                <TableRow
                                    key={slot.key}
                                    tabIndex={0}
                                    aria-selected={isActive}
                                    data-state={
                                        isActive ? "selected" : undefined
                                    }
                                    className={
                                        isBlocked
                                            ? isActive
                                                ? "cursor-pointer bg-muted text-muted-foreground hover:bg-muted"
                                                : "cursor-pointer bg-muted/40 text-muted-foreground opacity-70 hover:bg-muted/70"
                                            : isActive
                                                ? "cursor-pointer bg-muted hover:bg-muted"
                                                : "cursor-pointer"
                                    }
                                    onClick={() => selectSlot(slot)}
                                    onKeyDown={(event) =>
                                        handleRowKeyDown(event, slot)
                                    }
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">
                                                {category.displayName}
                                            </span>

                                            {positionLabel && (
                                                <Badge variant="outline">
                                                    {positionLabel}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell className="whitespace-normal">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`min-w-0 break-words [overflow-wrap:anywhere] ${
                                                    part && !isBlocked
                                                        ? "font-medium text-slate-900"
                                                        : "font-medium text-slate-400"
                                                }`}
                                            >
                                                {isBlocked
                                                    ? "解除して選択できます"
                                                    : part
                                                    ? getPartDisplayName(part)
                                                    : "未選択"}
                                            </span>

                                            {part &&
                                                !isBlocked &&
                                                (part.blockedCategoryKeys ?? []).includes(
                                                    "stem",
                                                ) && (
                                                    <Badge className="bg-sky-100 text-sky-800">
                                                        ステム一体型
                                                    </Badge>
                                                )}
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-left tabular-nums">
                                        {part && !isBlocked
                                            ? `${part.weight.toLocaleString("ja-JP")}g`
                                            : "-"}
                                    </TableCell>

                                    <TableCell>
                                        {part && !isBlocked
                                            ? priceFormatter.format(part.price)
                                            : "-"}
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    })}
                </TableBody>
            </Table>
        </div>
    )
}

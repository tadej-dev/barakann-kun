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
import type {Category} from "@/types/category"
import type {Part} from "@/types/part"

type SelectedPartsTableProps = {
    categories: Category[]
    activeCategory: string
    selectedParts: Record<string, Part>
    blockedCategoryKeys: ReadonlySet<string>
    onCategoryChange: (category: string) => void
}

const priceFormatter = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
})

export function SelectedPartsTable({
                                       categories,
                                       activeCategory,
                                       selectedParts,
                                       blockedCategoryKeys,
                                       onCategoryChange,
                                   }: SelectedPartsTableProps) {
    function selectCategory(categoryKey: string) {
        if (!blockedCategoryKeys.has(categoryKey)) {
            onCategoryChange(categoryKey)
        }
    }

    function handleRowKeyDown(
        event: KeyboardEvent<HTMLTableRowElement>,
        categoryKey: string,
    ) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            selectCategory(categoryKey)
        }
    }

    return (
        <div className="overflow-hidden rounded-lg border bg-background">
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
                    {categories.map((category) => {
                        const part = selectedParts[category.key]
                        const isActive = category.key === activeCategory
                        const isBlocked = blockedCategoryKeys.has(category.key)

                        return (
                            <TableRow
                                key={category.key}
                                tabIndex={isBlocked ? -1 : 0}
                                aria-disabled={isBlocked}
                                aria-selected={isActive}
                                data-state={
                                    isActive ? "selected" : undefined
                                }
                                className={
                                    isBlocked
                                        ? "cursor-not-allowed bg-muted/40 text-muted-foreground opacity-70 hover:bg-muted/40"
                                        : isActive
                                            ? "cursor-pointer bg-muted hover:bg-muted"
                                            : "cursor-pointer"
                                }
                                onClick={() => selectCategory(category.key)}
                                onKeyDown={(event) =>
                                    handleRowKeyDown(event, category.key)
                                }
                            >
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">
                                            {category.displayName}
                                        </span>
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
                                                ? "一体型パーツに含まれます"
                                                : part?.name ?? "未選択"}
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
                    })}
                </TableBody>
            </Table>
        </div>
    )
}

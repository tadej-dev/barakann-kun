import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type {
    CandidatePartsSortDescriptor,
    CandidatePartsSortKey,
} from "./useCandidatePartsTable"

type CandidatePartsTableHeaderProps = {
    sortDescriptor: CandidatePartsSortDescriptor
    showVariantColumn: boolean
    onSort: (column: CandidatePartsSortKey) => void
}

// 候補パーツ表のヘッダー
export function CandidatePartsTableHeader({
    sortDescriptor,
    showVariantColumn,
    onSort,
}: CandidatePartsTableHeaderProps) {
    // 並び順アイコン
    function sortIcon(column: CandidatePartsSortKey) {
        if (sortDescriptor.column !== column) {
            return <ChevronsUpDown aria-hidden="true" className="size-3.5" />
        }

        return sortDescriptor.direction === "ascending"
            ? <ArrowUp aria-hidden="true" className="size-3.5" />
            : <ArrowDown aria-hidden="true" className="size-3.5" />
    }

    return (
        <TableHeader className="bg-muted/70">
            <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 w-[15%] text-xs font-semibold tracking-wide text-muted-foreground">
                    <button
                        type="button"
                        className="flex items-center gap-1.5 hover:text-foreground"
                        onClick={() => onSort("brand")}
                    >
                        メーカー
                        {sortIcon("brand")}
                    </button>
                </TableHead>

                <TableHead className={`h-11 text-xs font-semibold tracking-wide text-muted-foreground ${showVariantColumn ? "w-[35%]" : "w-[55%]"}`}>
                    <button
                        type="button"
                        className="flex items-center gap-1.5 hover:text-foreground"
                        onClick={() => onSort("name")}
                    >
                        製品名
                        {sortIcon("name")}
                    </button>
                </TableHead>

                {showVariantColumn && (
                    <TableHead className="h-11 w-[20%] text-xs font-semibold tracking-wide text-muted-foreground">
                        バリエーション
                    </TableHead>
                )}

                {([
                    ["weight", "重量", "w-[12%]"],
                    ["price", "価格", "w-[18%]"],
                ] as const).map(([column, label, width]) => (
                    <TableHead
                        key={column}
                        className={`h-11 text-right text-xs font-semibold tracking-wide text-muted-foreground ${width}`}
                    >
                        <button
                            type="button"
                            className="ml-auto flex items-center gap-1.5 hover:text-foreground"
                            onClick={() => onSort(column)}
                        >
                            {label}
                            {sortIcon(column)}
                        </button>
                    </TableHead>
                ))}
            </TableRow>
        </TableHeader>
    )
}

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import type {ReactNode} from "react"

type CandidatePartsTableMessageProps = {
    message: string
    className?: string
    children?: ReactNode
}

// 候補パーツ表の状態メッセージ
export function CandidatePartsTableMessage({
    message,
    className = "text-muted-foreground",
    children,
}: CandidatePartsTableMessageProps) {
    return (
        <div className="overflow-hidden rounded-lg border bg-background">
            <Table
                aria-label="候補パーツ一覧"
                className="min-w-[760px] table-fixed"
            >
                <TableHeader className="bg-muted/70">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="h-11 w-[15%] text-xs font-semibold tracking-wide text-muted-foreground">ブランド</TableHead>
                        <TableHead className="h-11 w-[35%] text-xs font-semibold tracking-wide text-muted-foreground">製品名</TableHead>
                        <TableHead className="h-11 w-[20%] text-xs font-semibold tracking-wide text-muted-foreground">バリエーション</TableHead>
                        <TableHead className="h-11 w-[12%] text-right text-xs font-semibold tracking-wide text-muted-foreground">重量</TableHead>
                        <TableHead className="h-11 w-[18%] text-right text-xs font-semibold tracking-wide text-muted-foreground">価格</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow className="hover:bg-transparent">
                        <TableCell
                            colSpan={5}
                            className={`h-24 text-center ${className}`}
                        >
                            <div className="flex flex-col items-center gap-3">
                                <p>{message}</p>
                                {children}
                            </div>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    )
}

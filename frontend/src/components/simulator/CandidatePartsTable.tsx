import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import type { Part } from "@/types/part"

// 候補パーツ表のプロパティ
type CandidatePartsTableProps = {
    parts: Part[] // 選択中カテゴリーの候補パーツ
    selectedPart?: Part // 選択済みパーツ
    isLoading: boolean // API通信中の状態
    errorMessage: string // API取得失敗時のメッセージ
    onSelect: (part: Part) => void // パーツ選択処理
}

// 日本円の表示形式
const priceFormatter = new Intl.NumberFormat(
    "ja-JP", // 日本語の数値表記用
    {
        style: "currency", // 通貨形式
        currency: "JPY", // 通貨単位（日本円）
        maximumFractionDigits: 0, // 小数部分の最大桁数（小数点以下を表示しない）
    },
)

// 候補パーツ一覧
export function CandidatePartsTable({
                                        parts,
                                        selectedPart,
                                        isLoading,
                                        errorMessage,
                                        onSelect,
                                    }: CandidatePartsTableProps) {
    // API通信中の表示
    if (isLoading) {
        return (
            <div className="rounded-xl border bg-card p-8 text-center">
                パーツを読み込んでいます...
            </div>
        )
    }

    // API取得失敗時の表示
    if (errorMessage) {
        return (
            <div className="rounded-xl border bg-card p-8 text-center text-destructive">
                {errorMessage}
            </div>
        )
    }

    return (
        <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>製品名</TableHead>
                        <TableHead>重量</TableHead>
                        <TableHead>価格</TableHead>
                        <TableHead>操作</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {parts.length === 0 ? (
                        // 候補パーツが存在しない場合
                        <TableRow>
                            <TableCell
                                colSpan={4}
                                className="h-24 text-center text-muted-foreground"
                            >
                                表示できるパーツがありません
                            </TableCell>
                        </TableRow>
                    ) : (
                        // 候補パーツが存在する場合
                        parts.map((part) => {
                            // パーツの選択状態
                            const isSelected =
                                selectedPart?.id === part.id

                            return (
                                <TableRow key={part.id}>
                                    <TableCell className="font-medium">
                                        {part.name}
                                    </TableCell>

                                    <TableCell>
                                        {part.weight.toLocaleString("ja-JP")}g
                                    </TableCell>

                                    <TableCell>
                                        {priceFormatter.format(part.price)}
                                    </TableCell>

                                    <TableCell>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={
                                                isSelected
                                                    ? "default"
                                                    : "outline"
                                            }
                                            aria-pressed={isSelected}
                                            onClick={() => onSelect(part)}
                                        >
                                            {isSelected
                                                ? "選択中"
                                                : "選択"}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
import {Button} from "@/components/ui/button"
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

// 選択済みパーツ表のプロパティ
type SelectedPartsTableProps = {
    categories: Category[] // カテゴリー一覧
    activeCategory: string // 選択中のカテゴリーキー
    selectedParts: Record<string, Part> // カテゴリー別の選択済みパーツ
    onCategoryChange: (category: string) => void // カテゴリー変更処理
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

// 選択済みパーツ一覧
export function SelectedPartsTable({
                                       categories,
                                       activeCategory,
                                       selectedParts,
                                       onCategoryChange,
                                   }: SelectedPartsTableProps) {
    return (
        <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>カテゴリ</TableHead>
                        <TableHead>パーツ</TableHead>
                        <TableHead>重量</TableHead>
                        <TableHead>価格</TableHead>
                        <TableHead>操作</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {categories.map((category) => {
                        // カテゴリーに対応する選択済みパーツ
                        const part = selectedParts[category.key]

                        // カテゴリーの選択状態
                        const isActive =
                            category.key === activeCategory

                        return (
                            <TableRow key={category.id}>
                                <TableCell>
                                    {category.displayName}
                                </TableCell>

                                <TableCell className="font-medium">
                                    {part?.name ?? "未選択"}
                                </TableCell>

                                <TableCell>
                                    {part
                                        ? `${part.weight.toLocaleString(
                                            "ja-JP",
                                        )}g`
                                        : "-"}
                                </TableCell>

                                <TableCell>
                                    {part
                                        ? priceFormatter.format(part.price)
                                        : "-"}
                                </TableCell>

                                <TableCell>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={
                                            isActive ? "default" : "outline"
                                        }
                                        onClick={() =>
                                            onCategoryChange(category.key)
                                        }
                                    >
                                        {isActive ? "選択中" : "選択"}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}
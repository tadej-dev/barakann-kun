import { useMemo, useState } from "react"
import {
    ArrowDown,
    ArrowUp,
    ChevronsUpDown,
} from "lucide-react"

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

// 並び替え対象
type SortKey = "name" | "weight" | "price"

// 並び替え方向
type SortDirection = "asc" | "desc"

// 候補パーツ表のプロパティ
type CandidatePartsTableProps = {
    parts: Part[] // 選択中カテゴリーの候補パーツ
    selectedPart?: Part // 選択済みパーツ
    isLoading: boolean // API通信中の状態
    errorMessage: string // API取得失敗時のメッセージ
    onSelect: (part: Part) => void // パーツ選択処理
}

// 並び替えアイコンのプロパティ
type SortIconProps = {
    target: SortKey // 対象の並び替え項目
    sortKey: SortKey // 現在の並び替え項目
    sortDirection: SortDirection // 現在の並び替え方向
}

// 並び替え見出しのプロパティ
type SortHeaderProps = {
    target: SortKey // 対象の並び替え項目
    label: string // 表示名
    sortKey: SortKey // 現在の並び替え項目
    sortDirection: SortDirection // 現在の並び替え方向
    onSort: (sortKey: SortKey) => void // 並び替え変更処理
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

// 並び替えアイコン
function SortIcon({
                      target,
                      sortKey,
                      sortDirection,
                  }: SortIconProps) {
    if (sortKey !== target) {
        return <ChevronsUpDown className="size-4" />
    }

    return sortDirection === "asc" ? (
        <ArrowUp className="size-4" />
    ) : (
        <ArrowDown className="size-4" />
    )
}

// 並び替え見出し
function SortHeader({
                        target,
                        label,
                        sortKey,
                        sortDirection,
                        onSort,
                    }: SortHeaderProps) {
    return (
        <Button
            type="button"
            variant="ghost"
            className="-ml-3 h-8 gap-1 px-2"
            onClick={() => onSort(target)}
        >
            {label}

            <SortIcon
                target={target}
                sortKey={sortKey}
                sortDirection={sortDirection}
            />
        </Button>
    )
}

// 候補パーツ一覧
export function CandidatePartsTable({
                                        parts,
                                        selectedPart,
                                        isLoading,
                                        errorMessage,
                                        onSelect,
                                    }: CandidatePartsTableProps) {
    // 並び替え対象
    const [sortKey, setSortKey] = useState<SortKey>("name")

    // 並び替え方向
    const [sortDirection, setSortDirection] =
        useState<SortDirection>("asc")

    // 並び替え済みパーツ一覧
    const sortedParts = useMemo(() => {
        return [...parts].sort((a, b) => {
            // 製品名の比較
            if (sortKey === "name") {
                const result = a.name.localeCompare(
                    b.name, // 比較対象の製品名
                    "ja-JP", // 日本語の文字列比較
                    {
                        numeric: true, // 数字部分を数値として比較
                    },
                )

                return sortDirection === "asc"
                    ? result // 昇順
                    : -result // 降順
            }

            // 数値項目の比較
            const result = a[sortKey] - b[sortKey]

            return sortDirection === "asc"
                ? result // 昇順
                : -result // 降順
        })
    }, [
        parts, // 候補パーツ変更時の再計算
        sortKey, // 並び替え対象変更時の再計算
        sortDirection, // 並び替え方向変更時の再計算
    ])

    // 見出しクリック時の並び替え変更
    function changeSort(nextSortKey: SortKey) {
        if (sortKey === nextSortKey) {
            setSortDirection((current) =>
                current === "asc" ? "desc" : "asc",
            )

            return
        }

        setSortKey(nextSortKey)
        setSortDirection("asc")
    }

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
                        <TableHead>
                            <SortHeader
                                target="name"
                                label="製品名"
                                sortKey={sortKey}
                                sortDirection={sortDirection}
                                onSort={changeSort}
                            />
                        </TableHead>

                        <TableHead>
                            <SortHeader
                                target="weight"
                                label="重量"
                                sortKey={sortKey}
                                sortDirection={sortDirection}
                                onSort={changeSort}
                            />
                        </TableHead>

                        <TableHead>
                            <SortHeader
                                target="price"
                                label="価格"
                                sortKey={sortKey}
                                sortDirection={sortDirection}
                                onSort={changeSort}
                            />
                        </TableHead>

                        <TableHead>操作</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {sortedParts.length === 0 ? (
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
                        sortedParts.map((part) => {
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
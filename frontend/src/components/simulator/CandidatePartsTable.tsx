import type {
    Selection,
    SortDescriptor,
} from "@heroui/react"

import {
    Card,
    Table,
} from "@heroui/react"
import { useMemo, useState } from "react"

import type { Part } from "@/types/part"

// 並び替え対象
type SortKey = "name" | "weight" | "price"

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
    // 並び替え状態
    const [sortDescriptor, setSortDescriptor] =
        useState<SortDescriptor>({
            column: "name", // 初期並び替え対象
            direction: "ascending", // 初期並び替え方向
        })

    // 並び替え済みパーツ一覧
    const sortedParts = useMemo(() => {
        return [...parts].sort((a, b) => {
            // 並び替え対象
            const column = sortDescriptor.column as SortKey

            // 製品名の比較
            if (column === "name") {
                const result = a.name.localeCompare(
                    b.name, // 比較対象の製品名
                    "ja-JP", // 日本語の文字列比較
                    {
                        numeric: true, // 数字部分を数値として比較
                    },
                )

                return sortDescriptor.direction === "ascending"
                    ? result // 昇順
                    : -result // 降順
            }

            // 数値項目の比較
            const result = a[column] - b[column]

            return sortDescriptor.direction === "ascending"
                ? result // 昇順
                : -result // 降順
        })
    }, [
        parts, // 候補パーツ変更時の再計算
        sortDescriptor, // 並び替え状態変更時の再計算
    ])

    // 行選択時のパーツ変更
    function handleSelectionChange(keys: Selection) {
        if (keys === "all") {
            return
        }

        const selectedKey = Array.from(keys)[0]

        const nextPart = sortedParts.find(
            (part) => String(part.id) === String(selectedKey),
        )

        if (nextPart) {
            onSelect(nextPart)
        }
    }

    // API通信中の表示
    if (isLoading) {
        return (
            <Card>
                <Card.Content className="p-8 text-center">
                    パーツを読み込んでいます...
                </Card.Content>
            </Card>
        )
    }

    // API取得失敗時の表示
    if (errorMessage) {
        return (
            <Card>
                <Card.Content className="p-8 text-center text-red-500">
                    {errorMessage}
                </Card.Content>
            </Card>
        )
    }

    return (
        <Table
            variant="secondary"
            className="overflow-hidden rounded-none"
        >
            <Table.ScrollContainer>
                <Table.Content
                    aria-label="候補パーツ一覧"
                    className="min-w-[640px]"
                    selectionMode="single"
                    selectedKeys={
                        selectedPart
                            ? new Set([String(selectedPart.id)])
                            : new Set()
                    }
                    sortDescriptor={sortDescriptor}
                    onSelectionChange={handleSelectionChange}
                    onSortChange={setSortDescriptor}
                >
                    <Table.Header>
                        <Table.Column
                            allowsSorting
                            isRowHeader
                            id="name"
                        >
                            {({ sortDirection }) => (
                                <Table.SortableColumnHeader
                                    sortDirection={sortDirection}
                                >
                                    製品名
                                </Table.SortableColumnHeader>
                            )}
                        </Table.Column>

                        <Table.Column allowsSorting id="weight">
                            {({ sortDirection }) => (
                                <Table.SortableColumnHeader
                                    sortDirection={sortDirection}
                                >
                                    重量
                                </Table.SortableColumnHeader>
                            )}
                        </Table.Column>

                        <Table.Column allowsSorting id="price">
                            {({ sortDirection }) => (
                                <Table.SortableColumnHeader
                                    sortDirection={sortDirection}
                                >
                                    価格
                                </Table.SortableColumnHeader>
                            )}
                        </Table.Column>
                    </Table.Header>

                    <Table.Body>
                        {sortedParts.length === 0 ? (
                            // 候補パーツが存在しない場合
                            <Table.Row id="empty">
                                <Table.Cell colSpan={3}>
                                    <div className="py-8 text-center text-zinc-500">
                                        表示できるパーツがありません
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        ) : (
                            // 候補パーツが存在する場合
                            sortedParts.map((part) => {
                                // パーツの選択状態
                                const isSelected =
                                    selectedPart?.id === part.id

                                return (
                                    <Table.Row
                                        key={part.id}
                                        id={String(part.id)}
                                        className={
                                            isSelected
                                                ? "cursor-pointer border-l-4 border-sky-500 bg-sky-50 text-slate-900"
                                                : "cursor-pointer border-l-4 border-transparent bg-white hover:bg-slate-50"
                                        }
                                    >
                                        <Table.Cell>
                                            <span className="font-medium">
                                                {part.name}
                                            </span>
                                        </Table.Cell>

                                        <Table.Cell>
                                            {part.weight.toLocaleString(
                                                "ja-JP",
                                            )}
                                            g
                                        </Table.Cell>

                                        <Table.Cell>
                                            {priceFormatter.format(
                                                part.price,
                                            )}
                                        </Table.Cell>
                                    </Table.Row>
                                )
                            })
                        )}
                    </Table.Body>
                </Table.Content>
            </Table.ScrollContainer>
        </Table>
    )
}
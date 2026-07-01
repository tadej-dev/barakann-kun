import type { Selection } from "@heroui/react"

import { Table } from "@heroui/react"

import type { Category } from "@/types/category"
import type { Part } from "@/types/part"

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
    // 行選択時のカテゴリー変更
    function handleSelectionChange(keys: Selection) {
        if (keys === "all") {
            return
        }

        const selectedKey = Array.from(keys)[0]

        if (typeof selectedKey === "string") {
            onCategoryChange(selectedKey)
        }
    }

    return (
        <Table
            variant="secondary"
            className="overflow-hidden"
        >
            <Table.ScrollContainer>
                <Table.Content
                    aria-label="選択済みパーツ一覧"
                    selectionMode="single"
                    selectedKeys={
                        activeCategory
                            ? new Set([activeCategory])
                            : new Set()
                    }
                    onSelectionChange={handleSelectionChange}
                >
                    <Table.Header>
                        <Table.Column>カテゴリ</Table.Column>
                        <Table.Column>パーツ</Table.Column>
                        <Table.Column>重量</Table.Column>
                        <Table.Column>価格</Table.Column>
                    </Table.Header>

                    <Table.Body className={"font-bold"}>
                        {categories.map((category) => {
                            // カテゴリーに対応する選択済みパーツ
                            const part = selectedParts[category.key]

                            // カテゴリーの選択状態
                            const isActive =
                                category.key === activeCategory

                            return (
                                <Table.Row
                                    key={category.key}
                                    id={category.key}
                                    className={
                                        isActive
                                            ? "cursor-pointer border-l-4 border-sky-900 bg-sky-100 text-slate-900"
                                            : "cursor-pointer border-l-4 border-transparent bg-white hover:bg-slate-50"
                                    }
                                >
                                    <Table.Cell>
                                        {category.displayName}
                                    </Table.Cell>

                                    <Table.Cell>
                                        <span
                                            className={
                                                part
                                                    ? "font-medium text-slate-900"
                                                    : "font-medium text-slate-400"
                                            }
                                        >
                                            {part?.name ?? "未選択"}
                                        </span>
                                    </Table.Cell>

                                    <Table.Cell>
                                        {part
                                            ? `${part.weight.toLocaleString(
                                                "ja-JP",
                                            )}g`
                                            : "-"}
                                    </Table.Cell>

                                    <Table.Cell>
                                        {part
                                            ? priceFormatter.format(
                                                part.price,
                                            )
                                            : "-"}
                                    </Table.Cell>
                                </Table.Row>
                            )
                        })}
                    </Table.Body>
                </Table.Content>
            </Table.ScrollContainer>
        </Table>
    )
}
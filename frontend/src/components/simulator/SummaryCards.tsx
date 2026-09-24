import {useState} from "react"
import {GripVertical} from "lucide-react"
import NumberFlow from "@number-flow/react"
import type {Format} from "@number-flow/react"

import {
    Sortable,
    SortableItem,
    SortableItemHandle,
} from "@/components/reui/sortable"
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

type SummaryCardsProps = {
    totalPrice: number
    totalWeight: number
    activeConfigName: string // 選択中の構成名（構成選択は左カラムで行う）
}

type SummaryCardId = "price" | "weight" | "config"

// 選択中の構成名を先頭に置き、金額・重量がどの構成の値かを読み取りやすくする。
const initialCardOrder: SummaryCardId[] = [
    "config",
    "price",
    "weight",
]

type SummaryCard = {
    title: string
    value: number
    format: Format
    suffix?: string
}

export function SummaryCards({
                                 totalPrice,
                                 totalWeight,
                                 activeConfigName,
                             }: SummaryCardsProps) {
    // カード順は画面内だけで管理し、数値計算や構成データの保存責務とは分離する。
    const [cardOrder, setCardOrder] =
        useState<SummaryCardId[]>(initialCardOrder)

    // 金額・重量は同じカード描画器へ渡し、構成名だけを文字列表示のカードとして扱う
    const cards: Record<"price" | "weight", SummaryCard> = {
        price: {
            title: "合計金額",
            value: totalPrice,
            format: {
                style: "currency",
                currency: "JPY",
                maximumFractionDigits: 0,
            },
        },
        weight: {
            title: "完成重量",
            value: totalWeight,
            format: {
                maximumFractionDigits: 0,
            },
            suffix: " g",
        },
    }

    // 数値カードと構成カードを同じSortableへ渡し、利用者が表示順を変更できるようにする。
    return (
        <Sortable
            value={cardOrder}
            onValueChange={setCardOrder}
            getItemValue={(cardId) => cardId}
            strategy="grid"
            className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-3"
        >
            {cardOrder.map((cardId) => {
                // 構成名は数値ではないため、NumberFlowを使わない専用カードで描画する。
                if (cardId === "config") {
                    return (
                        <SortableItem key={cardId} value={cardId}>
                            <Card className="h-full border border-b-0">
                                <CardHeader>
                                    <CardTitle className="text-lg font-bold text-zinc-500">
                                        選択中の構成
                                    </CardTitle>

                                    <CardAction>
                                        <SortableItemHandle
                                            render={
                                                <button
                                                    type="button"
                                                    aria-label="選択中の構成カードを移動"
                                                />
                                            }
                                            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <GripVertical className="size-4"/>
                                        </SortableItemHandle>
                                    </CardAction>
                                </CardHeader>

                                <CardContent>
                                    {/* 長い構成名は2行で省略し、title属性で全文を確認できるようにする。 */}
                                    <p
                                        className="line-clamp-2 text-2xl font-bold [overflow-wrap:anywhere]"
                                        title={activeConfigName}
                                    >
                                        {activeConfigName}
                                    </p>
                                </CardContent>
                            </Card>
                        </SortableItem>
                    )
                }

                const card = cards[cardId]

                return (
                    <SortableItem key={cardId} value={cardId}>
                        <Card className="h-full border border-b-0">
                            <CardHeader>
                                <CardTitle className="text-lg font-bold text-zinc-500">
                                    {card.title}
                                </CardTitle>

                                <CardAction>
                                    <SortableItemHandle
                                        render={
                                            <button
                                                type="button"
                                                aria-label={`${card.title}カードを移動`}
                                            />
                                        }
                                        className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <GripVertical className="size-4"/>
                                    </SortableItemHandle>
                                </CardAction>
                            </CardHeader>

                            <CardContent>
                                <NumberFlow
                                    value={card.value}
                                    locales="ja-JP"
                                    format={card.format}
                                    suffix={card.suffix}
                                    isolate
                                    className="text-4xl font-bold tabular-nums"
                                />
                            </CardContent>
                        </Card>
                    </SortableItem>
                )
            })}
        </Sortable>
    )
}

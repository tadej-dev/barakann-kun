import {useState} from "react"
import {GripVertical} from "lucide-react"
import NumberFlow from "@number-flow/react"
import type {Format} from "@number-flow/react"

import {ConfigList} from "@/components/simulator/ConfigList"
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
import type {ConfigId} from "@/features/simulator/simulatorTypes"

type SummaryCardsProps = {
    totalPrice: number
    totalWeight: number
    activeConfigId: ConfigId
    onConfigChange: (configId: ConfigId) => void
    onClearActiveConfig: () => void
}

type SummaryCardId = "price" | "weight" | "config"

const initialCardOrder: SummaryCardId[] = ["price", "weight", "config"]

type SummaryCard = {
    title: string
    value: number
    format: Format
    suffix?: string
}

export function SummaryCards({
                                 totalPrice,
                                 totalWeight,
                                 activeConfigId,
                                 onConfigChange,
                                 onClearActiveConfig,
                             }: SummaryCardsProps) {
    const [cardOrder, setCardOrder] =
        useState<SummaryCardId[]>(initialCardOrder)

    const cards: Record<Exclude<SummaryCardId, "config">, SummaryCard> = {
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

    return (
        <Sortable
            value={cardOrder}
            onValueChange={setCardOrder}
            getItemValue={(cardId) => cardId}
            strategy="grid"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(2,minmax(0,1fr))_minmax(260px,1fr)]"
        >
            {cardOrder.map((cardId) => {
                if (cardId === "config") {
                    return (
                        <SortableItem key={cardId} value={cardId}>
                            <ConfigList
                                activeConfigId={activeConfigId}
                                onConfigChange={onConfigChange}
                                onClearActiveConfig={onClearActiveConfig}
                            />
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

import {useState} from "react"
import {GripVertical, Info} from "lucide-react"
import NumberFlow from "@number-flow/react"
import type {Format} from "@number-flow/react"
import type {Modifier} from "@dnd-kit/core"

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
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip"
import {
    TotalsBreakdownDialog,
    type TotalsBreakdownMetric,
} from "@/components/simulator/TotalsBreakdownDialog"
import type {TotalsBreakdown} from "@/features/simulator/partCompatibility"
import {lockDragAxis} from "@/features/simulator/dragAxis"

type SummaryCardsProps = {
    totalsBreakdown: TotalsBreakdown // 合計金額・完成重量と内訳
    activeConfigName: string // 選択中の構成名（構成選択は左カラムで行う）
}

type SummaryCardId = "price" | "weight" | "config"

// カードの並び替えを横方向（1列表示では縦方向）に制限する
const axisLockModifier: Modifier = ({transform}) => {
    // 3列表示かどうか（テスト環境ではmatchMediaが無いため縦扱い）
    const isWide = typeof window.matchMedia === "function" &&
        window.matchMedia("(min-width: 640px)").matches

    return lockDragAxis(transform, isWide)
}

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
    help: string // ⓘに表示する短い説明
}

// 合計金額・完成重量・構成名のカード
export function SummaryCards({
                                 totalsBreakdown,
                                 activeConfigName,
                             }: SummaryCardsProps) {
    // 合計値は内訳から取り出し、カードとダイアログの食い違いを防ぐ
    const totalPrice = totalsBreakdown.totalPrice
    const totalWeight = totalsBreakdown.totalWeight
    // カード順は画面内だけで管理し、数値計算や構成データの保存責務とは分離する。
    const [cardOrder, setCardOrder] =
        useState<SummaryCardId[]>(initialCardOrder)
    // 合計の内訳ダイアログの表示状態
    const [isBreakdownOpen, setIsBreakdownOpen] = useState(false)
    // 金額と重量のどちらの内訳を表示するか
    const [breakdownMetric, setBreakdownMetric] =
        useState<TotalsBreakdownMetric>("price")

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
            help: "合計金額：パーツ価格＋セット価格。付属品の参考価格は含みません。",
        },
        weight: {
            title: "完成重量",
            value: totalWeight,
            format: {
                maximumFractionDigits: 0,
            },
            suffix: " g",
            help: "完成重量：パーツ重量＋加算される付属品重量。セット構成品はセット本体に含まれるため別途加算しません。",
        },
    }

    // 数値カードと構成カードを同じSortableへ渡し、利用者が表示順を変更できるようにする。
    return (
        <>
            <Sortable
                value={cardOrder}
                onValueChange={setCardOrder}
                getItemValue={(cardId) => cardId}
                strategy="grid"
                modifiers={[axisLockModifier]}
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
                                        {/* 長い構成名は省略し、全文はマウスを乗せると表示する */}
                                        <p
                                            className="line-clamp-2 text-4xl font-bold [overflow-wrap:anywhere]"
                                            title={activeConfigName}
                                        >
                                            {activeConfigName}
                                        </p>
                                    </CardContent>
                                </Card>
                            </SortableItem>
                        )
                    }

                    // 数値カードの表示内容
                    const card = cards[cardId]

                    return (
                        <SortableItem key={cardId} value={cardId}>
                            <Card className="h-full border border-b-0">
                                <CardHeader>
                                    <CardTitle className="text-lg font-bold text-zinc-500">
                                        {card.title}
                                    </CardTitle>

                                    <CardAction>
                                        <div className="flex items-center gap-1">
                                            <Tooltip>
                                                <TooltipTrigger
                                                    render={
                                                        <button
                                                            type="button"
                                                            aria-label={`${card.title}の内訳を表示`}
                                                            aria-haspopup="dialog"
                                                            onClick={() => {
                                                                setBreakdownMetric(cardId)
                                                                setIsBreakdownOpen(true)
                                                            }}
                                                            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                        />
                                                    }
                                                >
                                                    <Info className="size-4" />
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" align="end">
                                                    {card.help}
                                                </TooltipContent>
                                            </Tooltip>

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
                                        </div>
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

            <TotalsBreakdownDialog
                open={isBreakdownOpen}
                metric={breakdownMetric}
                breakdown={totalsBreakdown}
                onOpenChange={setIsBreakdownOpen}
            />
        </>
    )
}

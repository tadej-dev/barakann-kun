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
import type {
    ConfigId,
    ConfigStates,
    SelectedParts,
} from "@/features/simulator/simulatorTypes"
import type {SavedBuild} from "@/api/savedBuilds"
import type {ConfigSlot} from "@/api/configSlots"
import type {Category} from "@/types/category"

type SummaryCardsProps = {
    categories: Category[]
    totalPrice: number
    totalWeight: number
    activeConfigId: ConfigId
    activeSavedBuildId: string | null
    configStates: ConfigStates
    selectedParts: SelectedParts
    isSavedBuildLoading: boolean
    savedBuildErrorMessage: string
    savedBuildsReloadKey?: number
    autoSaveEnabled?: boolean
    onConfigChange: (configId: ConfigId) => void
    onRestoreSavedBuild: (build: SavedBuild) => Promise<void>
    onSavedBuildPrefetch: (build: SavedBuild) => void
    onSavedBuildSelect: (build: SavedBuild) => void | Promise<void>
    onClearActiveConfig: () => void
    onClearConfig: (configId: ConfigId) => Promise<void>
    onRestoreConfigSlot: (slot: ConfigSlot) => Promise<void>
}

type SummaryCardId = "price" | "weight" | "config"

const initialCardOrder: SummaryCardId[] = [
    "price",
    "weight",
    "config",
]

type SummaryCard = {
    title: string
    value: number
    format: Format
    suffix?: string
}

export function SummaryCards({
                                 categories,
                                 totalPrice,
                                 totalWeight,
                                 activeConfigId,
                                 activeSavedBuildId,
                                 configStates,
                                 selectedParts,
                                 isSavedBuildLoading,
                                 savedBuildErrorMessage,
                                 savedBuildsReloadKey = 0,
                                 autoSaveEnabled = true,
                                 onConfigChange,
                                 onRestoreSavedBuild,
                                 onSavedBuildPrefetch,
                                 onSavedBuildSelect,
                                 onClearActiveConfig,
                                 onClearConfig,
                                 onRestoreConfigSlot,
                             }: SummaryCardsProps) {
    // カード順は画面内だけで管理し、数値計算や構成データの保存責務とは分離する。
    const [cardOrder, setCardOrder] =
        useState<SummaryCardId[]>(initialCardOrder)

    // 金額・重量は同じカード描画器へ渡し、構成選択だけを専用UIとして扱う
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
            className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-2"
        >
            {cardOrder.map((cardId) => {
                // 構成選択は専用の操作を持つため、通常の数値カードとは描画を分ける。
                if (cardId === "config") {
                    return (
                        <SortableItem
                            key={cardId}
                            value={cardId}
                            className="sm:col-span-2"
                        >
                            <ConfigList
                                categories={categories}
                                activeConfigId={activeConfigId}
                                activeSavedBuildId={activeSavedBuildId}
                                configStates={configStates}
                                selectedParts={selectedParts}
                                isSavedBuildLoading={isSavedBuildLoading}
                                savedBuildErrorMessage={savedBuildErrorMessage}
                                savedBuildsReloadKey={savedBuildsReloadKey}
                                autoSaveEnabled={autoSaveEnabled}
                                onConfigChange={onConfigChange}
                                onRestoreSavedBuild={onRestoreSavedBuild}
                                onSavedBuildPrefetch={onSavedBuildPrefetch}
                                onSavedBuildSelect={onSavedBuildSelect}
                                onClearActiveConfig={onClearActiveConfig}
                                onClearConfig={onClearConfig}
                                onRestoreConfigSlot={onRestoreConfigSlot}
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

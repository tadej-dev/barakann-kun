import { Card } from "@heroui/react"

// サマリー表示用のプロパティ
type SummaryCardsProps = {
    totalPrice: number // 選択済みパーツの合計金額
    totalWeight: number // 選択済みパーツの合計重量
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

// 合計金額・重量の表示欄
export function SummaryCards({
                                 totalPrice,
                                 totalWeight,
                             }: SummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card variant="default" className={"border border-b-0"}>
                <Card.Header className="pb-1">
                    <Card.Title className="text-sm text-zinc-500 font-bold">
                        合計金額
                    </Card.Title>
                </Card.Header>

                <Card.Content>
                    <p className="text-3xl font-bold">
                        {priceFormatter.format(totalPrice)}
                    </p>
                </Card.Content>
            </Card>

            <Card variant="default" className={"border border-b-0"}>
                <Card.Header className="pb-1">
                    <Card.Title className="text-sm text-zinc-500">
                        完成重量
                    </Card.Title>
                </Card.Header>

                <Card.Content>
                    <p className="text-3xl font-bold">
                        {(totalWeight / 1000).toFixed(2)} kg
                    </p>
                </Card.Content>
            </Card>
        </div>
    )
}
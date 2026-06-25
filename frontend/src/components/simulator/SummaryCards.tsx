import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

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
            {/* 合計金額 */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">
                        合計金額
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <p className="text-2xl font-bold">
                        {priceFormatter.format(totalPrice)}
                    </p>
                </CardContent>
            </Card>

            {/* 合計重量 */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">
                        完成重量
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <p className="text-2xl font-bold">
                        {(totalWeight / 1000).toFixed(2)} kg
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
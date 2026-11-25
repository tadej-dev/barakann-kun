import {Button} from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import type {
    TotalsBreakdown,
    TotalsIncludedItem,
} from "@/features/simulator/partCompatibility"

// 内訳の表示対象
export type TotalsBreakdownMetric = "price" | "weight"

type TotalsBreakdownDialogProps = {
    open: boolean // ダイアログの表示状態
    metric: TotalsBreakdownMetric // 金額か重量か
    breakdown: TotalsBreakdown // 合計金額・完成重量の内訳
    onOpenChange: (open: boolean) => void // 表示状態の変更
}

// 金額の表示書式（円）
const priceFormatter = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
})

// 重量の表示書式（g）
function formatWeight(weight: number): string {
    return `${weight.toLocaleString("ja-JP")} g`
}

// 付属品一覧の1行
function IncludedItemRow({item}: {item: TotalsIncludedItem}) {
    return (
        <li className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
            <div className="min-w-0">
                <p className="break-words text-sm font-medium text-slate-800">
                    {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                    {item.sourcePartName}・{item.quantity}個
                </p>
            </div>
            <span className="shrink-0 text-sm tabular-nums text-slate-700">
                {formatWeight(item.totalWeight)}
            </span>
        </li>
    )
}

// 参考価格の1行
function ReferencePriceRow({item}: {item: TotalsIncludedItem}) {
    return (
        <li className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
            <div className="min-w-0">
                <p className="break-words text-sm font-medium text-slate-800">
                    {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                    {item.sourcePartName}・{item.quantity}個
                </p>
            </div>
            <span className="shrink-0 text-sm tabular-nums text-slate-700">
                {item.totalPrice === null
                    ? "-"
                    : priceFormatter.format(item.totalPrice)}
            </span>
        </li>
    )
}

// 合計金額・完成重量の内訳ダイアログ
export function TotalsBreakdownDialog({
    open,
    metric,
    breakdown,
    onOpenChange,
}: TotalsBreakdownDialogProps) {
    // 金額の内訳を表示するか
    const isPrice = metric === "price"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {isPrice ? "合計金額の内訳" : "完成重量の内訳"}
                    </DialogTitle>
                    <DialogDescription>
                        {isPrice
                            ? "合計金額に含まれるもの・含まれないものを示します。"
                            : "完成重量に含まれるもの・含まれないものを示します。"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    <section className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-muted-foreground">
                            {isPrice ? "合計金額" : "完成重量"}
                        </p>
                        <p className="text-lg font-bold tabular-nums">
                            {isPrice
                                ? priceFormatter.format(breakdown.totalPrice)
                                : formatWeight(breakdown.totalWeight)}
                        </p>
                    </section>

                    <section>
                        <h3 className="mb-2 text-sm font-semibold text-slate-800">
                            パーツ本体
                        </h3>
                        <div className="text-sm text-slate-700">
                            {isPrice
                                ? `金額 ${priceFormatter.format(breakdown.basePrice)}`
                                : `重量 ${formatWeight(breakdown.baseWeight)}`}
                        </div>
                    </section>

                    {!isPrice && breakdown.includedItems.length > 0 && (
                        <section>
                            <h3 className="mb-2 text-sm font-semibold text-slate-800">
                                合計に加算される付属品
                            </h3>
                            <ul>
                                {breakdown.includedItems.map((item, index) => (
                                    <IncludedItemRow
                                        key={`${item.sourcePartName}-${item.name}-${index}`}
                                        item={item}
                                    />
                                ))}
                            </ul>
                        </section>
                    )}

                    {!isPrice && breakdown.setComponents.length > 0 && (
                        <section>
                            <h3 className="mb-2 text-sm font-semibold text-slate-800">
                                セット構成品（セット重量に含む）
                            </h3>
                            <ul>
                                {breakdown.setComponents.map((item, index) => (
                                    <IncludedItemRow
                                        key={`${item.sourcePartName}-${item.name}-${index}`}
                                        item={item}
                                    />
                                ))}
                            </ul>
                        </section>
                    )}

                    {!isPrice && breakdown.excludedItems.length > 0 && (
                        <section>
                            <h3 className="mb-2 text-sm font-semibold text-slate-800">
                                カテゴリーなし付属品（合計対象外）
                            </h3>
                            <ul>
                                {breakdown.excludedItems.map((item, index) => (
                                    <IncludedItemRow
                                        key={`${item.sourcePartName}-${item.name}-${index}`}
                                        item={item}
                                    />
                                ))}
                            </ul>
                        </section>
                    )}

                    {isPrice && breakdown.referencePrices.length > 0 && (
                        <section>
                            <h3 className="mb-2 text-sm font-semibold text-slate-800">
                                参考価格（合計に加算しない）
                            </h3>
                            <ul>
                                {breakdown.referencePrices.map((item, index) => (
                                    <ReferencePriceRow
                                        key={`${item.sourcePartName}-${item.name}-${index}`}
                                        item={item}
                                    />
                                ))}
                            </ul>
                        </section>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        閉じる
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

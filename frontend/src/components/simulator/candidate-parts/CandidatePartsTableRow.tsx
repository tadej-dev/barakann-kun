import {memo, type KeyboardEvent} from "react"

import { Badge } from "@/components/ui/badge"
import {buttonVariants} from "@/components/ui/button"
import {
    Combobox,
    ComboboxContent,
    ComboboxInput,
    ComboboxItem,
} from "@/components/ui/combobox"
import { TableCell, TableRow } from "@/components/ui/table"
import {
    getPartPackageUnit,
    getFrameCockpitBadge,
    getSpecificationLabel,
    getSpecificationValueLabel,
    type CompatibilityCounterpart,
    type CompatibilityResult,
} from "@/features/simulator/partCompatibility"
import {getPartDisplayName} from "@/features/simulator/partDisplay"
import {
    getPartSlotCategoryKey,
    getPartSlotPosition,
    getPartSlotPositionLabel,
} from "@/features/simulator/partSlots"
import type { Part } from "@/types/part"

type CandidatePartsTableRowProps = {
    part: Part
    // 同一モデルのバリアント（サイズ・年式など）。1件ならセレクタを出さない。
    variants: Part[]
    modelKey: string
    onVariantChange: (modelKey: string, partId: number) => void
    isSelected: boolean
    showVariantColumn: boolean
    compatibility: CompatibilityResult | null
    categoryDisplayNames: Record<string, string>
    canSelectBoth: boolean
    enableContentVisibility: boolean
    onSelect: (part: Part) => void
    onSelectBoth: (part: Part) => void
}

const priceFormatter = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
})

const compatibilityBadgeStyles = {
    compatible: "border-emerald-300 bg-emerald-50 text-emerald-700",
    unknown: "border-amber-300 bg-amber-50 text-amber-700",
    incompatible: "border-red-300 bg-red-50 text-red-700",
}

const compatibilityLabels = {
    compatible: "適合",
    unknown: "規格未確認",
    incompatible: "非互換",
}

// 適合・非互換の相手を「カテゴリ（前後）「製品名」」の形で表す。
function getCounterpartLabel(
    counterpart: CompatibilityCounterpart,
    categoryDisplayNames: Record<string, string>,
) {
    const categoryKey = getPartSlotCategoryKey(counterpart.slotKey)
    const categoryName = categoryDisplayNames[categoryKey] ?? categoryKey
    const positionLabel = getPartSlotPositionLabel(
        getPartSlotPosition(counterpart.slotKey),
    )

    return positionLabel
        ? `${categoryName}（${positionLabel}）「${counterpart.partName}」`
        : `${categoryName}「${counterpart.partName}」`
}

// 候補パーツ表の行
function CandidatePartsTableRowComponent({
    part,
    variants,
    modelKey,
    onVariantChange,
    isSelected,
    showVariantColumn,
    compatibility,
    categoryDisplayNames,
    canSelectBoth,
    enableContentVisibility,
    onSelect,
    onSelectBoth,
}: CandidatePartsTableRowProps) {
    // 行内で使う付属品・規格情報を先に整形し、JSXでは表示条件だけを扱う。
    const includedItems = part.includedItems ?? []
    const specifications = Object.entries(part.specifications ?? {})
    const isSelectionBlocked = compatibility?.selectionBlocked ?? false
    // フレームは全パーツ互換の基準として扱うため、候補行では互換バッジ・理由を出さない。
    const isFrame = part.categoryKey === "frame"
    // 規格未確認(unknown)やフレーム以外はバッジを表示しない
    const frameCockpitBadge = getFrameCockpitBadge(part)

    // サイズ・バリアントの選択肢（Combobox用）。値はpart id、表示はバリアント名。
    const variantOptions = variants.map((variant) => ({
        value: variant.id,
        label: variant.variantName ?? variant.name,
    }))
    const activeVariantOption =
        variantOptions.find((option) => option.value === part.id) ?? null

    // 「どのパーツに対して」非互換・未確認かを示すため、相手と理由を整形する。
    const counterparts = compatibility?.counterparts ?? []
    const offendingCounterparts = counterparts.filter(
        (counterpart) => counterpart.status !== "compatible",
    )
    // バッジのホバー詳細には適合した相手も含めて全件を出す。
    const counterpartTooltip = counterparts
        .map((counterpart) =>
            `${getCounterpartLabel(counterpart, categoryDisplayNames)}：` +
            `${compatibilityLabels[counterpart.status]}（${counterpart.reasons.join("、")}）`,
        )
        .join("\n")

    // キーボードによるパーツ選択処理
    function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            if (!isSelectionBlocked) {
                onSelect(part)
            }
        }
    }

    return (
        <TableRow
            tabIndex={0}
            aria-selected={isSelected}
            data-state={isSelected ? "selected" : undefined}
            className={
                isSelectionBlocked
                    ? "cursor-not-allowed bg-muted/30 text-muted-foreground"
                    : isSelected
                    ? "cursor-pointer bg-muted hover:bg-muted"
                    : "cursor-pointer"
            }
            style={enableContentVisibility
                ? {
                    // 大量行では画面外の描画をブラウザへ委譲
                    contentVisibility: "auto",
                    containIntrinsicSize: "0 96px",
                }
                : undefined}
            aria-disabled={isSelectionBlocked}
            onClick={() => {
                if (!isSelectionBlocked) {
                    onSelect(part)
                }
            }}
            onKeyDown={handleKeyDown}
        >
            {/* 行全体を選択対象にし、前後一括などの補助操作だけイベント伝播を止める。 */}
            <TableCell className="font-medium">
                {part.brandName ?? "-"}
            </TableCell>

            <TableCell className="whitespace-normal">
                <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 break-words font-medium [overflow-wrap:anywhere]">
                            {getPartDisplayName(part)}
                        </span>

                        {part.modelYear != null && (
                            <Badge variant="outline">
                                {part.modelYear}
                            </Badge>
                        )}

                        {part.edition && (
                            <Badge variant="outline">
                                {part.edition}
                            </Badge>
                        )}

                        {(part.blockedCategoryKeys ?? []).includes("stem") && (
                            <Badge className="bg-sky-100 text-sky-800">
                                ステム一体型
                            </Badge>
                        )}

                        {frameCockpitBadge && (
                            <Badge
                                variant="outline"
                                className={frameCockpitBadge.className}
                            >
                                {frameCockpitBadge.label}
                            </Badge>
                        )}

                        {getPartPackageUnit(part) === "pair" && (
                            <Badge variant="secondary">前後セット</Badge>
                        )}

                        {!isFrame && compatibility && (
                            <Badge
                                variant="outline"
                                className={compatibilityBadgeStyles[compatibility.status]}
                                title={counterpartTooltip || compatibility.reasons.join("\n")}
                            >
                                {compatibilityLabels[compatibility.status]}
                            </Badge>
                        )}
                    </div>

                    {includedItems.length > 0 && (
                        <span className="break-words text-xs font-normal text-slate-500 [overflow-wrap:anywhere]">
                            付属品・構成品: {includedItems
                                .map((item) =>
                                    `${item.name} ×${item.quantity}`,
                                )
                                .join("、")}
                        </span>
                    )}

                    {!isFrame && compatibility && (offendingCounterparts.length > 0 ||
                        compatibility.reasons.length > 0) && (
                        <div className="flex flex-col gap-0.5 text-xs font-normal text-slate-500">
                            {offendingCounterparts.length > 0
                                ? offendingCounterparts.map((counterpart) => (
                                    <span
                                        key={counterpart.slotKey}
                                        className="break-words [overflow-wrap:anywhere]"
                                    >
                                        {getCounterpartLabel(counterpart, categoryDisplayNames)}：
                                        {counterpart.reasons.join("、")}
                                    </span>
                                ))
                                : (
                                    // 前後位置制約など比較相手がいない非互換は、理由だけを表示する。
                                    <span className="break-words [overflow-wrap:anywhere]">
                                        {compatibility.reasons.join("、")}
                                    </span>
                                )}
                        </div>
                    )}

                    {canSelectBoth && (
                        <button
                            type="button"
                            disabled={isSelectionBlocked}
                            aria-disabled={isSelectionBlocked}
                            title={isSelectionBlocked
                                ? "規格が一致しないため選択できません"
                                : undefined}
                            className={`${buttonVariants({variant: "outline", size: "sm"})} mt-1 w-fit`}
                            onClick={(event) => {
                                event.stopPropagation()
                                onSelectBoth(part)
                            }}
                        >
                            前後に選択
                        </button>
                    )}
                </div>
            </TableCell>

            {showVariantColumn && (
                <TableCell>
                    {variants.length > 1 ? (
                        // 複数サイズは1行にまとめ、検索できるComboboxで選ぶ。
                        // 行の選択操作へ伝播させないよう、クリック/キー入力を止める。
                        <div
                            className="w-full max-w-[12rem]"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                        >
                            <Combobox
                                items={variantOptions}
                                value={activeVariantOption}
                                onValueChange={(option) => {
                                    if (option) {
                                        onVariantChange(modelKey, option.value)
                                    }
                                }}
                            >
                                <ComboboxInput
                                    aria-label="サイズ・バリアント"
                                    placeholder="サイズを選択"
                                />
                                <ComboboxContent emptyMessage="該当するサイズがありません">
                                    {variantOptions.map((option) => (
                                        <ComboboxItem
                                            key={option.value}
                                            value={option}
                                        >
                                            {option.label}
                                        </ComboboxItem>
                                    ))}
                                </ComboboxContent>
                            </Combobox>
                        </div>
                    ) : part.variantName ? (
                        <Badge variant="secondary">{part.variantName}</Badge>
                    ) : (
                        <span className="text-muted-foreground">-</span>
                    )}

                    {specifications.length > 0 && (
                        <div className="mt-1 flex flex-col gap-0.5 text-[10px] font-normal text-muted-foreground">
                            {specifications.map(([key, value]) => (
                                <span key={key}>
                                    {getSpecificationLabel(key)}: {getSpecificationValueLabel(key, value)}
                                </span>
                            ))}
                        </div>
                    )}
                </TableCell>
            )}

            <TableCell className="text-right tabular-nums">
                {part.weight.toLocaleString("ja-JP")}g
            </TableCell>

            <TableCell className="text-right tabular-nums">
                {priceFormatter.format(part.price)}
            </TableCell>
        </TableRow>
    )
}

// 選択状態や適合結果が変わらない行は再描画を省略
export const CandidatePartsTableRow = memo(CandidatePartsTableRowComponent)

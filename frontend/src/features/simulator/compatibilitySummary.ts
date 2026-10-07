import {
    getSpecificationValueLabel,
    type CompatibilityCounterpart,
} from "@/features/simulator/partCompatibility"
import {
    getPartSlotCategoryKey,
    getPartSlotPosition,
    getPartSlotPositionLabel,
} from "@/features/simulator/partSlots"
import type {CompatibilityStatus} from "../../../../shared/part-compatibility-core"

// 状態ごとの1項目。textは行内に出す文、titleはマウスを乗せたときの詳細。
export type CompatibilitySummaryItem = {
    text: string
    title: string
}

// 状態ごとの1行(例: 非互換：ホイール径（フレーム） フリーボディ（カセット：Shimano HG／SRAM XDR）)
export type CompatibilitySummaryLine = {
    status: CompatibilityStatus
    label: string
    items: CompatibilitySummaryItem[]
}

// 行の見出し。重要度の高い順に並べる。
const STATUS_ORDER: {status: CompatibilityStatus; label: string}[] = [
    {status: "incompatible", label: "非互換"},
    {status: "unknown", label: "未確認"},
    {status: "compatible", label: "互換"},
]

// 値が登録されていない側の表示
const MISSING_VALUE_LABEL = "未登録"

// 相手パーツを「カテゴリ（前後）」の短い形で表す。製品名は長いため行内には出さない。
function getCounterpartShortLabel(
    counterpart: CompatibilityCounterpart,
    categoryDisplayNames: Record<string, string>,
) {
    const categoryKey = getPartSlotCategoryKey(counterpart.slotKey)
    const categoryName = categoryDisplayNames[categoryKey] ?? categoryKey
    const positionLabel = getPartSlotPositionLabel(
        getPartSlotPosition(counterpart.slotKey),
    )

    return positionLabel
        ? `${categoryName}（${positionLabel}）`
        : categoryName
}

// 規格キーがあれば日本語ラベルへ変換し、整形済みの値はそのまま返す。
function formatValue(specificationKey: string | undefined, value: string | undefined) {
    if (!value) {
        return undefined
    }

    return specificationKey
        ? getSpecificationValueLabel(specificationKey, value)
        : value
}

// 適合判定の相手パーツ一覧を、状態ごとの行へまとめる。
// 非互換は合わない値を行内にも併記し、どの値を選び直せばよいか分かるようにする。
export function buildCompatibilitySummary(
    counterparts: CompatibilityCounterpart[],
    categoryDisplayNames: Record<string, string>,
): CompatibilitySummaryLine[] {
    const itemsByStatus = new Map<CompatibilityStatus, CompatibilitySummaryItem[]>()

    for (const counterpart of counterparts) {
        const counterpartLabel = getCounterpartShortLabel(
            counterpart,
            categoryDisplayNames,
        )

        for (const detail of counterpart.details) {
            const candidateValue = formatValue(detail.specificationKey, detail.candidateValue)
            const selectedValue = formatValue(detail.specificationKey, detail.selectedValue)
            const hasAnyValue = Boolean(candidateValue || selectedValue)

            // 詳細には、どの相手のどの値と比べたかを両側とも出す。
            const title = hasAnyValue
                ? `${detail.label}：この候補 ${candidateValue ?? MISSING_VALUE_LABEL}` +
                    ` ／ ${counterpartLabel}「${counterpart.partName}」 ${selectedValue ?? MISSING_VALUE_LABEL}`
                : `${detail.label}：${counterpartLabel}「${counterpart.partName}」`

            let text: string

            if (detail.status === "compatible") {
                // 互換は規格名だけで足りるため、相手や値は詳細に回す。
                text = detail.label
            } else if (detail.status === "incompatible" && candidateValue && selectedValue) {
                text = `${detail.label}（${counterpartLabel}：${candidateValue}／${selectedValue}）`
            } else {
                text = `${detail.label}（${counterpartLabel}）`
            }

            const items = itemsByStatus.get(detail.status) ?? []

            // 前後のローターなど、同じ文になる項目は1つにまとめる。
            if (!items.some((item) => item.text === text)) {
                items.push({text, title})
            }

            itemsByStatus.set(detail.status, items)
        }
    }

    return STATUS_ORDER.flatMap(({status, label}) => {
        const items = itemsByStatus.get(status) ?? []

        return items.length > 0
            ? [{status, label, items}]
            : []
    })
}

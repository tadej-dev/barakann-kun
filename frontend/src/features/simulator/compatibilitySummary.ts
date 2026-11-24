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
    const categoryKey = getPartSlotCategoryKey(counterpart.slotKey) // 相手パーツのカテゴリーキー
    const categoryName = categoryDisplayNames[categoryKey] ?? categoryKey // カテゴリーの表示名
    const positionLabel = getPartSlotPositionLabel( // 前輪・後輪の表示名（単一枠はnull）
        getPartSlotPosition(counterpart.slotKey),
    )

    return positionLabel
        ? `${categoryName}（${positionLabel}）`
        : categoryName
}

// 規格キーがあれば日本語ラベルへ変換し、整形済みの値はそのまま返す。
function formatValue(specificationKey: string | undefined, value: string | undefined) {
    // 値が未登録ならラベル変換しない
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
    // 状態別にまとめた表示項目
    const itemsByStatus = new Map<CompatibilityStatus, CompatibilitySummaryItem[]>()

    for (const counterpart of counterparts) {
        // 相手パーツの短い表示名
        const counterpartLabel = getCounterpartShortLabel(
            counterpart,
            categoryDisplayNames,
        )

        for (const detail of counterpart.details) {
            // 候補側の規格値
            const candidateValue = formatValue(detail.specificationKey, detail.candidateValue)
            // 選択済み側の規格値
            const selectedValue = formatValue(detail.specificationKey, detail.selectedValue)
            const hasAnyValue = Boolean(candidateValue || selectedValue) // どちらかの規格値が登録されているか

            // 詳細には、どの相手のどの値と比べたかを両側とも出す。
            const title = hasAnyValue
                ? `${detail.label}：この候補 ${candidateValue ?? MISSING_VALUE_LABEL}` +
                    ` ／ ${counterpartLabel}「${counterpart.partName}」 ${selectedValue ?? MISSING_VALUE_LABEL}`
                : `${detail.label}：${counterpartLabel}「${counterpart.partName}」`

            // 行内に表示する文
            let text: string

            // 互換は規格名だけで表示
            if (detail.status === "compatible") {
                // 互換は規格名だけで足りるため、相手や値は詳細に回す。
                text = detail.label
            // 非互換で両方の値があれば両方を併記
            } else if (detail.status === "incompatible" && candidateValue && selectedValue) {
                text = `${detail.label}（${counterpartLabel}：${candidateValue}／${selectedValue}）`
            } else {
                text = `${detail.label}（${counterpartLabel}）`
            }

            // 状態に対応する既存の表示項目
            const items = itemsByStatus.get(detail.status) ?? []

            // 前後のローターなど、同じ文になる項目は1つにまとめる。
            if (!items.some((item) => item.text === text)) {
                items.push({text, title})
            }

            itemsByStatus.set(detail.status, items)
        }
    }

    return STATUS_ORDER.flatMap(({status, label}) => {
        // 状態に対応する表示項目（無ければ空）
        const items = itemsByStatus.get(status) ?? []

        return items.length > 0
            ? [{status, label, items}]
            : []
    })
}

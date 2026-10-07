import {
    evaluateSelectedPartsCompatibility,
} from "@/features/simulator/partCompatibility"
import {
    createPartSlotKey,
    getPartSlotCategoryKey,
} from "@/features/simulator/partSlots"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"
import type {Category} from "@/types/category"

export type BuildDiagnosisSeverity = "missing" | "unknown" | "incompatible"

export type BuildDiagnosisIssue = {
    id: string
    severity: BuildDiagnosisSeverity
    title: string
    description: string
    slotKeys: string[]
}

export type BuildDiagnosis = {
    status: "empty" | "incomplete" | "needs_review" | "compatible"
    selectedCount: number
    missingCount: number
    unknownCount: number
    incompatibleCount: number
    issues: BuildDiagnosisIssue[]
}

type RequiredSlot = {
    slotKey: string
    fallbackLabel: string
}

const CORE_REQUIRED_SLOTS: RequiredSlot[] = [
    {slotKey: "frame", fallbackLabel: "フレーム"},
    {slotKey: "wheel", fallbackLabel: "ホイール"},
    {slotKey: createPartSlotKey("tire", "front"), fallbackLabel: "タイヤ（前輪）"},
    {slotKey: createPartSlotKey("tire", "rear"), fallbackLabel: "タイヤ（後輪）"},
    {slotKey: "handlebar", fallbackLabel: "ハンドル"},
    {slotKey: "bar_tape", fallbackLabel: "バーテープ"},
    {slotKey: "seatpost", fallbackLabel: "シートポスト"},
    {slotKey: "saddle", fallbackLabel: "サドル"},
    {slotKey: "pedal", fallbackLabel: "ペダル"},
]

const INDIVIDUAL_COMPONENT_SLOTS: RequiredSlot[] = [
    {slotKey: "shift_brake_lever", fallbackLabel: "シフト／ブレーキレバー"},
    {slotKey: "rear_derailleur", fallbackLabel: "リアディレーラー"},
    {slotKey: "crankset", fallbackLabel: "クランクセット"},
    {slotKey: "cassette", fallbackLabel: "カセット"},
    {slotKey: "chain", fallbackLabel: "チェーン"},
    {slotKey: "bottom_bracket", fallbackLabel: "ボトムブラケット"},
    {slotKey: createPartSlotKey("brake_caliper", "front"), fallbackLabel: "ブレーキキャリパー（前輪）"},
    {slotKey: createPartSlotKey("brake_caliper", "rear"), fallbackLabel: "ブレーキキャリパー（後輪）"},
    {slotKey: createPartSlotKey("brake_pad", "front"), fallbackLabel: "ブレーキパッド（前輪）"},
    {slotKey: createPartSlotKey("brake_pad", "rear"), fallbackLabel: "ブレーキパッド（後輪）"},
    {slotKey: createPartSlotKey("disc_rotor", "front"), fallbackLabel: "ディスクローター（前輪）"},
    {slotKey: createPartSlotKey("disc_rotor", "rear"), fallbackLabel: "ディスクローター（後輪）"},
]

function providedCategoryKeys(selectedParts: SelectedParts): Set<string> {
    const keys = new Set<string>()

    for (const part of Object.values(selectedParts)) {
        for (const categoryKey of part.blockedCategoryKeys) {
            keys.add(categoryKey)
        }

        for (const item of part.includedItems ?? []) {
            if (item.categoryKey) {
                keys.add(item.categoryKey)
            }
        }
    }

    return keys
}

function slotLabel(
    slot: RequiredSlot,
    categoriesByKey: ReadonlyMap<string, Category>,
) {
    const category = categoriesByKey.get(getPartSlotCategoryKey(slot.slotKey))
    const position = slot.slotKey.endsWith(":front")
        ? "（前輪）"
        : slot.slotKey.endsWith(":rear")
            ? "（後輪）"
            : ""

    return category ? `${category.displayName}${position}` : slot.fallbackLabel
}

// 選択漏れと規格不一致を一つの診断結果へまとめる
export function diagnoseBuild(
    selectedParts: SelectedParts,
    categories: Category[],
): BuildDiagnosis {
    const selectedCount = Object.keys(selectedParts).length
    const categoriesByKey = new Map(categories.map((category) => [
        category.key,
        category,
    ]))
    const providedCategories = providedCategoryKeys(selectedParts)
    const hasSelectedComponentOption = Boolean(selectedParts.groupset) ||
        INDIVIDUAL_COMPONENT_SLOTS.some((slot) =>
            Boolean(selectedParts[slot.slotKey]))
    const requiredSlots = [
        ...CORE_REQUIRED_SLOTS,
        // コンポセットは実際に占有するカテゴリーだけを満たし、未同梱品の見落としを防ぐ
        ...INDIVIDUAL_COMPONENT_SLOTS,
        ...(providedCategories.has("stem")
            ? []
            : [{slotKey: "stem", fallbackLabel: "ステム"}]),
    ]
    const componentOptionIssues: BuildDiagnosisIssue[] = hasSelectedComponentOption
        ? []
        : [{
            id: "missing:groupset-or-individual-components",
            severity: "missing",
            title: "コンポセットまたは単品コンポーネントを選択してください",
            description: "コンポセットを選ぶか、必要なコンポーネントを単品で選択してください",
            slotKeys: ["groupset"],
        }]
    const requiredSlotIssues = requiredSlots.flatMap((slot) => {
        const categoryKey = getPartSlotCategoryKey(slot.slotKey)

        if (selectedParts[slot.slotKey] || providedCategories.has(categoryKey)) {
            return []
        }

        const label = slotLabel(slot, categoriesByKey)

        return [{
            id: `missing:${slot.slotKey}`,
            severity: "missing" as const,
            title: `${label}が未選択です`,
            description: "完成構成として確認するにはパーツを選択してください",
            slotKeys: [slot.slotKey],
        }]
    })
    const missingIssues = [...componentOptionIssues, ...requiredSlotIssues]
    const compatibilityIssues = evaluateSelectedPartsCompatibility(
        selectedParts,
    ).map((issue, index) => ({
        id: `${issue.status}:${issue.slotKeys.join(":")}:${index}`,
        severity: issue.status,
        title: issue.status === "incompatible"
            ? "規格が一致しない組み合わせがあります"
            : "規格情報の確認が必要です",
        description: issue.reasons.join("、"),
        slotKeys: issue.slotKeys,
    }))
    const issues = [...compatibilityIssues, ...missingIssues]
    const incompatibleCount = issues.filter((issue) =>
        issue.severity === "incompatible").length
    const unknownCount = issues.filter((issue) =>
        issue.severity === "unknown").length
    const missingCount = missingIssues.length
    const status = selectedCount === 0
        ? "empty" as const
        : incompatibleCount > 0 || unknownCount > 0
            ? "needs_review" as const
            : missingCount > 0
                ? "incomplete" as const
                : "compatible" as const

    return {
        status,
        selectedCount,
        missingCount,
        unknownCount,
        incompatibleCount,
        issues,
    }
}

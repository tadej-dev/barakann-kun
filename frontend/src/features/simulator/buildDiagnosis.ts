import {
    evaluateSelectedPartsCompatibility,
} from "@/features/simulator/partCompatibility"
import {
    createPartSlotKey,
    getPartSlotCategoryKey,
} from "@/features/simulator/partSlots"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"
import type {Category} from "@/types/category"

// 診断項目の重大度（未選択・未確認・非互換）
export type BuildDiagnosisSeverity = "missing" | "unknown" | "incompatible"

// 診断で検出した問題（重要度・文言・対象スロット）
export type BuildDiagnosisIssue = {
    id: string
    severity: BuildDiagnosisSeverity
    title: string
    description: string
    slotKeys: string[]
}

// 構成の診断結果（状態・件数・問題一覧）
export type BuildDiagnosis = {
    status: "empty" | "incomplete" | "needs_review" | "compatible"
    selectedCount: number
    missingCount: number
    unknownCount: number
    incompatibleCount: number
    issues: BuildDiagnosisIssue[]
}

// 構成に必要な選択枠（スロットキーと代替表示名）
type RequiredSlot = {
    slotKey: string
    fallbackLabel: string
}

// 完成構成に必要な基本パーツの選択枠（9枠）
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

// コンポセットを選ばない場合に必要な単品パーツ枠（12枠）
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

// 選択済みパーツが占有・同梱するカテゴリーキーを集める
function providedCategoryKeys(selectedParts: SelectedParts): Set<string> {
    // 占有・同梱するカテゴリーキーの集合
    const keys = new Set<string>()

    for (const part of Object.values(selectedParts)) {
        for (const categoryKey of part.blockedCategoryKeys) {
            keys.add(categoryKey)
        }

        for (const item of part.includedItems ?? []) {
            // カテゴリー付きの同梱品だけを占有カテゴリーへ加える
            if (item.categoryKey) {
                keys.add(item.categoryKey)
            }
        }
    }

    return keys
}

// 選択枠の表示名をカテゴリー名と前後区分から作る
function slotLabel(
    slot: RequiredSlot,
    categoriesByKey: ReadonlyMap<string, Category>,
) {
    // スロットキーに対応するカテゴリー
    const category = categoriesByKey.get(getPartSlotCategoryKey(slot.slotKey))
    // 前輪・後輪の区別を付ける接尾辞
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
    // 選択済みパーツの件数
    const selectedCount = Object.keys(selectedParts).length
    // カテゴリーキーからカテゴリーを引く対応表
    const categoriesByKey = new Map(categories.map((category) => [
        category.key,
        category,
    ]))
    // 選択済みパーツが占有・同梱するカテゴリー
    const providedCategories = providedCategoryKeys(selectedParts)
    // コンポセットか単品コンポーネントを選択済みか
    const hasSelectedComponentOption = Boolean(selectedParts.groupset) ||
        INDIVIDUAL_COMPONENT_SLOTS.some((slot) =>
            Boolean(selectedParts[slot.slotKey]))
    // 構成に必要な選択枠（同梱品が無い場合はステムも含む）
    const requiredSlots = [
        ...CORE_REQUIRED_SLOTS,
        // コンポセットは実際に占有するカテゴリーだけを満たし、未同梱品の見落としを防ぐ
        ...INDIVIDUAL_COMPONENT_SLOTS,
        ...(providedCategories.has("stem")
            ? []
            : [{slotKey: "stem", fallbackLabel: "ステム"}]),
    ]
    // コンポーネント未選択の指摘
    const componentOptionIssues: BuildDiagnosisIssue[] = hasSelectedComponentOption
        ? []
        : [{
            id: "missing:groupset-or-individual-components",
            severity: "missing",
            title: "コンポセットまたは単品コンポーネントを選択してください",
            description: "コンポセットを選ぶか、必要なコンポーネントを単品で選択してください",
            slotKeys: ["groupset"],
        }]
    // 未選択の必須枠の指摘
    const requiredSlotIssues = requiredSlots.flatMap((slot) => {
        // 必須枠のカテゴリーキー
        const categoryKey = getPartSlotCategoryKey(slot.slotKey)

        // 選択済み、または同梱品で満たされる枠は指摘しない
        if (selectedParts[slot.slotKey] || providedCategories.has(categoryKey)) {
            return []
        }

        // 必須枠の表示名
        const label = slotLabel(slot, categoriesByKey)

        return [{
            id: `missing:${slot.slotKey}`,
            severity: "missing" as const,
            title: `${label}が未選択です`,
            description: "完成構成として確認するにはパーツを選択してください",
            slotKeys: [slot.slotKey],
        }]
    })
    // 選択漏れの指摘一覧
    const missingIssues = [...componentOptionIssues, ...requiredSlotIssues]
    // 規格不一致・未確認の指摘一覧
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
    // 画面へ渡す全指摘（規格判定と選択漏れ）
    const issues = [...compatibilityIssues, ...missingIssues]
    // 非互換の指摘件数
    const incompatibleCount = issues.filter((issue) =>
        issue.severity === "incompatible").length
    // 未確認の指摘件数
    const unknownCount = issues.filter((issue) =>
        issue.severity === "unknown").length
    // 選択漏れの指摘件数
    const missingCount = missingIssues.length
    // 選択状況と指摘から決まる診断状態
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

import {
    getPartSlotCategoryKey,
    getPartSlotPosition,
    type PartSlot,
} from "@/features/simulator/partSlots"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"
import type {Part} from "@/types/part"

export type CompatibilityStatus =
    | "compatible"
    | "unknown"
    | "incompatible"

export type CompatibilityResult = {
    status: CompatibilityStatus
    reasons: string[]
    conflictingSlotKeys: string[]
    selectionBlocked: boolean
}

type EqualityRule = {
    categories: readonly [string, string]
    specificationKey: string
    label: string
    protectedCategory?: string
    protectedCategoryLabel?: string
}

const EQUALITY_RULES: EqualityRule[] = [
    // 規格値が一致しない場合に、候補を解除確認または選択不可へ導く関係を定義する。
    {categories: ["brake_caliper", "brake_pad"], specificationKey: "pad_family", label: "パッド形状"},
    {
        categories: ["frame", "handlebar"],
        specificationKey: "cockpit_interface",
        label: "コックピット規格",
        protectedCategory: "frame",
        protectedCategoryLabel: "フレーム",
    },
    {
        categories: ["frame", "seatpost"],
        specificationKey: "seatpost_diameter_mm",
        label: "シートポスト径",
        protectedCategory: "frame",
        protectedCategoryLabel: "フレーム",
    },
    {
        categories: ["frame", "bottom_bracket"],
        specificationKey: "bb_standard",
        label: "BB規格",
        protectedCategory: "frame",
        protectedCategoryLabel: "フレーム",
    },
]

const SPECIFICATION_LABELS: Record<string, string> = {
    allowed_position: "対応位置",
    bb_standard: "BB規格",
    cockpit_interface: "コックピット規格",
    crank_spindle: "クランク軸規格",
    freehub_body: "フリーボディ",
    max_tire_width_mm: "対応タイヤ幅（最大）",
    min_tire_width_mm: "対応タイヤ幅（最小）",
    package_unit: "販売単位",
    pad_family: "パッド形状",
    rotor_diameter_mm: "ローター径",
    rotor_mount: "ローター取付方式",
    seatpost_diameter_mm: "シートポスト径",
    tire_width_mm: "タイヤ幅",
    wheel_diameter: "ホイール径",
}

// API内部キーを候補表で読める日本語へ変換する。

const SPECIFICATION_VALUE_LABELS: Record<string, string> = {
    "6_bolt": "6ボルト",
    center_lock: "センターロック",
    campagnolo_db310: "Campagnolo DB-310形状",
    front: "前輪専用",
    pair: "前後セット",
    rear: "後輪専用",
    shimano_road_flat_mount: "Shimano ロード用フラットマウント形状",
    single: "1個単位",
    sram_road_axs: "SRAM Road AXS形状",
}

function getCategoryKey(part: Part, slotKey: string) {
    // APIにcategoryKeyがない旧データでも、スロットキーから判定対象を補完する。
    return part.categoryKey ?? getPartSlotCategoryKey(slotKey)
}

function hasCategoryPair(
    firstCategory: string,
    secondCategory: string,
    expectedCategories: readonly [string, string],
) {
    // 同じカテゴリー同士を誤って関連判定しないよう、異なる2カテゴリーだけを対象にする。
    return (
        expectedCategories.includes(firstCategory) &&
        expectedCategories.includes(secondCategory) &&
        firstCategory !== secondCategory
    )
}

function appliesToPosition(targetSlot: PartSlot, selectedSlotKey: string) {
    // singleは前後共通、front/rearは同じ位置だけを比較対象にする。
    const selectedPosition = getPartSlotPosition(selectedSlotKey)

    return (
        targetSlot.position === "single" ||
        selectedPosition === "single" ||
        targetSlot.position === selectedPosition
    )
}

function getSpecification(part: Part, key: string) {
    // 規格が未登録の場合はundefinedのまま返し、適合不明として扱えるようにする。
    return part.specifications?.[key]
}

function compareTireAndTube(tire: Part, tube: Part) {
    const tireDiameter = getSpecification(tire, "wheel_diameter")
    const tubeDiameter = getSpecification(tube, "wheel_diameter")
    const tireWidth = Number(getSpecification(tire, "tire_width_mm"))
    const minWidth = Number(getSpecification(tube, "min_tire_width_mm"))
    const maxWidth = Number(getSpecification(tube, "max_tire_width_mm"))

    if (
        !tireDiameter ||
        !tubeDiameter ||
        !Number.isFinite(tireWidth) ||
        !Number.isFinite(minWidth) ||
        !Number.isFinite(maxWidth)
    ) {
        // 規格不足は安全側に倒し、適合と断定せず利用者へ確認を促す。
        return {status: "unknown" as const, reasons: ["タイヤとチューブのサイズ情報が不足しています"]}
    }

    if (tireDiameter !== tubeDiameter) {
        return {
            status: "incompatible" as const,
            reasons: [`ホイール径が一致しません（${tireDiameter} / ${tubeDiameter}）`],
        }
    }

    if (tireWidth < minWidth || tireWidth > maxWidth) {
        return {
            status: "incompatible" as const,
            reasons: [`${tireWidth}mmのタイヤはチューブの対応範囲${minWidth}〜${maxWidth}mm外です`],
        }
    }

    return {
        status: "compatible" as const,
        reasons: [`${tireDiameter}・${tireWidth}mmで適合します`],
    }
}

export function getSpecificationLabel(key: string) {
    // 未知の規格キーも捨てず、APIキーをフォールバック表示する。
    return SPECIFICATION_LABELS[key] ?? key
}

export function getSpecificationValueLabel(key: string, value: string) {
    // 定義済みの値は日本語化し、mm系だけ単位を補って表示する。
    if (SPECIFICATION_VALUE_LABELS[value]) {
        return SPECIFICATION_VALUE_LABELS[value]
    }

    return key.endsWith("_mm") ? `${value}mm` : value
}

export function getPartPackageUnit(part: Part) {
    // 販売単位が欠損した旧データは単品として扱う。
    return part.specifications?.package_unit ?? "single"
}

export function calculateSelectedPartsTotals(selectedParts: SelectedParts) {
    // 前後スロットに同じペア商品が入っていても、価格・重量を一度だけ加算する。
    const countedPairIds = new Set<number>()

    return Object.values(selectedParts).reduce(
        (totals, part) => {
            if (getPartPackageUnit(part) === "pair") {
                if (countedPairIds.has(part.id)) {
                    return totals
                }

                countedPairIds.add(part.id)
            }

            return {
                price: totals.price + part.price,
                weight: totals.weight + part.weight,
            }
        },
        {price: 0, weight: 0},
    )
}

export function evaluatePartCompatibility(
    candidate: Part,
    targetSlot: PartSlot,
    selectedParts: SelectedParts,
): CompatibilityResult | null {
    // 候補パーツを現在の選択状態と比較し、理由・解除対象・選択可否をまとめて返す。
    const reasons: string[] = []
    const conflictingSlotKeys = new Set<string>()
    let hasRelevantSelection = false
    let hasUnknown = false
    let hasCompatible = false
    let selectionBlocked = false
    const allowedPosition = getSpecification(candidate, "allowed_position")

    if (
        allowedPosition &&
        targetSlot.position !== "single" &&
        allowedPosition !== targetSlot.position
    ) {
        // 前輪・後輪専用品を反対側へ登録できないよう、候補表示の段階で選択を止める。
        return {
            status: "incompatible",
            reasons: [`${getSpecificationValueLabel("allowed_position", allowedPosition)}の製品です`],
            conflictingSlotKeys: [],
            selectionBlocked: true,
        }
    }

    for (const [selectedSlotKey, selectedPart] of Object.entries(selectedParts)) {
        // 同じスロット自身は比較せず、別位置にある関連パーツだけを適合判定する。
        if (selectedSlotKey === targetSlot.key || !appliesToPosition(targetSlot, selectedSlotKey)) {
            continue
        }

        const candidateCategory = candidate.categoryKey ?? targetSlot.categoryKey
        const selectedCategory = getCategoryKey(selectedPart, selectedSlotKey)

        if (hasCategoryPair(candidateCategory, selectedCategory, ["tire", "inner_tube"])) {
            // タイヤとチューブだけは径・幅の範囲を専用関数で判定する。
            hasRelevantSelection = true
            const tire = candidateCategory === "tire" ? candidate : selectedPart
            const tube = candidateCategory === "inner_tube" ? candidate : selectedPart
            const result = compareTireAndTube(tire, tube)

            reasons.push(...result.reasons)

            if (result.status === "incompatible") {
                conflictingSlotKeys.add(selectedSlotKey)
            } else if (result.status === "unknown") {
                hasUnknown = true
            } else {
                hasCompatible = true
            }

            continue
        }

        for (const rule of EQUALITY_RULES) {
            // その他の関連カテゴリーは、規格値の一致・不足・不一致を共通ルールで評価する。
            if (!hasCategoryPair(candidateCategory, selectedCategory, rule.categories)) {
                continue
            }

            const candidateValue = getSpecification(candidate, rule.specificationKey)
            const selectedValue = getSpecification(selectedPart, rule.specificationKey)

            if (!candidateValue && !selectedValue) {
                continue
            }

            hasRelevantSelection = true

            if (!candidateValue || !selectedValue) {
                hasUnknown = true
                reasons.push(`${rule.label}が未確認です`)
            } else if (candidateValue !== selectedValue) {
                if (selectedCategory === rule.protectedCategory) {
                    selectionBlocked = true
                    reasons.push(
                        `${rule.label}が一致しないため、${rule.protectedCategoryLabel}を維持したまま選択できません`,
                    )
                } else {
                    conflictingSlotKeys.add(selectedSlotKey)
                    reasons.push(`${rule.label}が一致しません`)
                }
            } else {
                hasCompatible = true
                reasons.push(`${rule.label}が適合します`)
            }
        }
    }

    if (selectionBlocked || conflictingSlotKeys.size > 0) {
        // 保護対象の不一致や解除が必要な競合は、候補行を非互換として表示する。
        return {
            status: "incompatible",
            reasons,
            conflictingSlotKeys: Array.from(conflictingSlotKeys),
            selectionBlocked,
        }
    }

    if (!hasRelevantSelection) {
        // 比較対象の規格がない候補には、誤って適合バッジを付けない。
        return null
    }

    return {
        status: hasUnknown ? "unknown" : hasCompatible ? "compatible" : "unknown",
        reasons,
        conflictingSlotKeys: [],
        selectionBlocked: false,
    }
}

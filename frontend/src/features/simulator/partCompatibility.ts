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
    return part.categoryKey ?? getPartSlotCategoryKey(slotKey)
}

function hasCategoryPair(
    firstCategory: string,
    secondCategory: string,
    expectedCategories: readonly [string, string],
) {
    return (
        expectedCategories.includes(firstCategory) &&
        expectedCategories.includes(secondCategory) &&
        firstCategory !== secondCategory
    )
}

function appliesToPosition(targetSlot: PartSlot, selectedSlotKey: string) {
    const selectedPosition = getPartSlotPosition(selectedSlotKey)

    return (
        targetSlot.position === "single" ||
        selectedPosition === "single" ||
        targetSlot.position === selectedPosition
    )
}

function getSpecification(part: Part, key: string) {
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
    return SPECIFICATION_LABELS[key] ?? key
}

export function getSpecificationValueLabel(key: string, value: string) {
    if (SPECIFICATION_VALUE_LABELS[value]) {
        return SPECIFICATION_VALUE_LABELS[value]
    }

    return key.endsWith("_mm") ? `${value}mm` : value
}

export function getPartPackageUnit(part: Part) {
    return part.specifications?.package_unit ?? "single"
}

export function calculateSelectedPartsTotals(selectedParts: SelectedParts) {
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
        return {
            status: "incompatible",
            reasons: [`${getSpecificationValueLabel("allowed_position", allowedPosition)}の製品です`],
            conflictingSlotKeys: [],
            selectionBlocked: true,
        }
    }

    for (const [selectedSlotKey, selectedPart] of Object.entries(selectedParts)) {
        if (selectedSlotKey === targetSlot.key || !appliesToPosition(targetSlot, selectedSlotKey)) {
            continue
        }

        const candidateCategory = candidate.categoryKey ?? targetSlot.categoryKey
        const selectedCategory = getCategoryKey(selectedPart, selectedSlotKey)

        if (hasCategoryPair(candidateCategory, selectedCategory, ["tire", "inner_tube"])) {
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
        return {
            status: "incompatible",
            reasons,
            conflictingSlotKeys: Array.from(conflictingSlotKeys),
            selectionBlocked,
        }
    }

    if (!hasRelevantSelection) {
        return null
    }

    return {
        status: hasUnknown ? "unknown" : hasCompatible ? "compatible" : "unknown",
        reasons,
        conflictingSlotKeys: [],
        selectionBlocked: false,
    }
}

import {
    createPartSlot,
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
    {categories: ["wheel", "tire"], specificationKey: "wheel_diameter", label: "ホイール径"},
    {categories: ["wheel", "disc_rotor"], specificationKey: "rotor_mount", label: "ローター取付方式"},
    {categories: ["wheel", "cassette"], specificationKey: "freehub_body", label: "フリーボディ"},
    {categories: ["crankset", "bottom_bracket"], specificationKey: "crank_spindle", label: "クランク軸規格"},
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
    brake_mount: "ブレーキマウント",
    cleat_system: "クリート規格",
    cockpit_interface: "コックピット規格",
    crank_spindle: "クランク軸規格",
    drivetrain_speed: "対応段数",
    freehub_body: "フリーボディ",
    handlebar_clamp_mm: "ハンドルクランプ径",
    max_tire_width_mm: "対応タイヤ幅（最大）",
    min_tire_width_mm: "対応タイヤ幅（最小）",
    package_unit: "販売単位",
    pad_family: "パッド形状",
    rotor_diameter_mm: "ローター径",
    rotor_mount: "ローター取付方式",
    saddle_rail: "サドルレール規格",
    seatpost_diameter_mm: "シートポスト径",
    shift_system: "変速方式",
    tire_width_mm: "タイヤ幅",
    wheel_diameter: "ホイール径",
}

// API内部キーを候補表で読める日本語へ変換する。

const SPECIFICATION_VALUE_LABELS: Record<string, string> = {
    "6_bolt": "6ボルト",
    argon_atten_chb_01: "Argon 18 ATTEN CHB-01専用",
    bb386: "BB386",
    bb86: "BB86",
    campagnolo_n3w: "Campagnolo N3W",
    campagnolo_protech: "Campagnolo Pro-Tech",
    campagnolo_ultra_torque: "Campagnolo Ultra-Torque",
    carbon_7x9: "カーボン 7×9mm",
    carbon_7x9_3: "カーボン 7×9.3mm",
    carbon_7x9_6: "カーボン 7×9.6mm",
    center_lock: "センターロック",
    campagnolo_db310: "Campagnolo DB-310形状",
    dub: "SRAM DUB",
    electronic_wireless: "無線電動",
    felt_gravel_integrated: "Felt Gravel一体型専用",
    flat_mount: "フラットマウント",
    front: "前輪専用",
    hollowtech_ii: "Shimano HOLLOWTECH II",
    hope_rx4: "HOPE RX4形状",
    look_keo: "LOOK KEO",
    look_aero_combo: "LOOK Aero Combo専用",
    mechanical: "機械式",
    pair: "前後セット",
    pf30: "PF30",
    post_mount: "ポストマウント",
    rear: "後輪専用",
    rotor_30: "Rotor 30mm",
    shimano_hg: "Shimano HG",
    shimano_k_type: "Shimano Kタイプ",
    shimano_road_flat_mount: "Shimano ロード用フラットマウント形状",
    shimano_spd_sl: "Shimano SPD-SL",
    single: "1個単位",
    sram_xdr: "SRAM XDR",
    sram_road_axs: "SRAM Road AXS形状",
    standard_1_1_8: "1-1/8インチ標準コラム",
    t47_85_5: "T47 85.5mm",
    t47a: "T47A（76.75mm）",
    time_iclic: "TIME ICLIC",
    trp_hyrd: "TRP HY/RD形状",
    trp_spyre: "TRP Spyre形状",
    van_rysel_rcr_f: "Van Rysel RCR-F専用",
    xelius_drs: "Lapierre Xelius DRS専用",
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

export type SelectedPartsCompatibilityIssue = {
    status: "unknown" | "incompatible"
    reasons: string[]
    slotKeys: string[]
}

// 選択済み構成を候補選択時と同じ規格ルールで再評価
export function evaluateSelectedPartsCompatibility(
    selectedParts: SelectedParts,
): SelectedPartsCompatibilityIssue[] {
    const issues = new Map<string, SelectedPartsCompatibilityIssue>()

    for (const [slotKey, part] of Object.entries(selectedParts)) {
        const otherParts = Object.fromEntries(
            Object.entries(selectedParts).filter(([otherSlotKey]) =>
                otherSlotKey !== slotKey),
        )
        const result = evaluatePartCompatibility(
            part,
            createPartSlot(
                getPartSlotCategoryKey(slotKey),
                getPartSlotPosition(slotKey),
            ),
            otherParts,
        )

        if (!result || result.status === "compatible") {
            continue
        }

        const relatedSlotKeys = Array.from(new Set([
            slotKey,
            ...result.conflictingSlotKeys,
        ])).sort()
        const reasons = Array.from(new Set(result.reasons)).sort()
        const key = `${relatedSlotKeys.join("|")}::${reasons.join("|")}`
        const existing = issues.get(key)

        // 同じパーツ組み合わせを両方向から評価した結果は重要度の高い方へまとめる
        if (!existing || result.status === "incompatible") {
            issues.set(key, {
                status: result.status,
                reasons,
                slotKeys: relatedSlotKeys,
            })
        }
    }

    return Array.from(issues.values())
}

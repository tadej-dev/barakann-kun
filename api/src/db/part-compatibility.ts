// 保存時の規格適合チェックへ渡す、カタログの最小データ
export type CompatibilityPart = {
    id: number
    categoryKey: string
    blockedCategoryKeys: string[]
    specifications: Record<string, string>
}

type PartPosition = "single" | "front" | "rear"

type StoredPart = {
    slotKey: string
    part: CompatibilityPart
}

type PairCompatibilityResult = {
    status: "compatible" | "unknown" | "incompatible"
    reasons: string[]
}

type CompatibilityIssue = {
    slotKeys: string[]
    partIds: number[]
    reasons: string[]
}

type EqualityRule = {
    categories: readonly [string, string]
    specificationKey: string
    label: string
}

// フロントの候補選択と保存APIで共通に扱う主要な規格関係
const EQUALITY_RULES: EqualityRule[] = [
    {categories: ["brake_caliper", "brake_pad"], specificationKey: "pad_family", label: "パッド形状"},
    {categories: ["wheel", "tire"], specificationKey: "wheel_diameter", label: "ホイール径"},
    {categories: ["wheel", "disc_rotor"], specificationKey: "rotor_mount", label: "ローター取付方式"},
    {categories: ["wheel", "cassette"], specificationKey: "freehub_body", label: "フリーボディ"},
    {categories: ["crankset", "bottom_bracket"], specificationKey: "crank_spindle", label: "クランク軸規格"},
    {categories: ["frame", "seatpost"], specificationKey: "seatpost_diameter_mm", label: "シートポスト径"},
    {categories: ["frame", "bottom_bracket"], specificationKey: "bb_standard", label: "BB規格"},
]

const STANDARD_COCKPIT_INTERFACE = "standard_1_1_8"

function getPartSlotPosition(slotKey: string): PartPosition {
    const position = slotKey.split(":")[1]

    return position === "front" || position === "rear"
        ? position
        : "single"
}

function hasCategoryPair(
    firstCategory: string,
    secondCategory: string,
    expectedCategories: readonly [string, string],
) {
    // 同じカテゴリー同士は規格比較の対象にしない
    return (
        expectedCategories.includes(firstCategory) &&
        expectedCategories.includes(secondCategory) &&
        firstCategory !== secondCategory
    )
}

function appliesToPosition(
    targetSlotKey: string,
    selectedSlotKey: string,
) {
    // 単一枠は前後共通、前後枠は同じ位置だけを比較する
    const targetPosition = getPartSlotPosition(targetSlotKey)
    const selectedPosition = getPartSlotPosition(selectedSlotKey)

    return (
        targetPosition === "single" ||
        selectedPosition === "single" ||
        targetPosition === selectedPosition
    )
}

function getSpecification(part: CompatibilityPart, key: string) {
    // 未登録の規格はundefinedとして、適合不明と不一致を区別する
    return part.specifications[key]
}

function isIntegratedHandlebar(part: CompatibilityPart) {
    // ステム枠を占有するハンドルは、一体型コックピットとして扱う
    return (
        part.categoryKey === "handlebar" &&
        part.blockedCategoryKeys.includes("stem")
    )
}

function getFrameCockpitStatus(
    frame: CompatibilityPart,
): "included" | "dedicated" | "standard" | "unknown" {
    // ハンドル枠を占有するフレームはコックピット付属とみなす
    if (frame.blockedCategoryKeys.includes("handlebar")) {
        return "included"
    }

    const cockpitInterface = getSpecification(frame, "cockpit_interface")

    if (!cockpitInterface) {
        return "unknown"
    }

    return cockpitInterface === STANDARD_COCKPIT_INTERFACE
        ? "standard"
        : "dedicated"
}

function compareCockpitInterface(
    frame: CompatibilityPart,
    connectedPart: CompatibilityPart,
): PairCompatibilityResult {
    const frameStatus = getFrameCockpitStatus(frame)

    if (frameStatus === "included") {
        return {
            status: "incompatible",
            reasons: ["フレームにコックピットが付属するため、別のハンドルやステムは選択できません"],
        }
    }

    if (frameStatus === "unknown") {
        return {
            status: "unknown",
            reasons: ["フレームのコックピット規格が未確認です"],
        }
    }

    const frameInterface = getSpecification(frame, "cockpit_interface")
    const connectedInterface = getSpecification(connectedPart, "cockpit_interface")

    if (!connectedInterface) {
        // 専用フレームでは、適合を確認できない接続パーツを不一致として扱う
        return frameStatus === "dedicated"
            ? {
                status: "incompatible",
                reasons: ["専用コックピットへの適合が確認できない製品です"],
            }
            : {
                status: "unknown",
                reasons: ["コックピット規格が未確認です"],
            }
    }

    if (frameInterface !== connectedInterface) {
        return {
            status: "incompatible",
            reasons: ["コックピット規格が一致しません"],
        }
    }

    return {
        status: "compatible",
        reasons: ["コックピット規格が適合します"],
    }
}

function compareHandlebarClamp(
    firstPart: CompatibilityPart,
    secondPart: CompatibilityPart,
): PairCompatibilityResult {
    const firstClamp = getSpecification(firstPart, "handlebar_clamp_mm")
    const secondClamp = getSpecification(secondPart, "handlebar_clamp_mm")

    if (!firstClamp || !secondClamp) {
        return {
            status: "unknown",
            reasons: ["ハンドルクランプ径が未確認です"],
        }
    }

    return firstClamp === secondClamp
        ? {
            status: "compatible",
            reasons: ["ハンドルクランプ径が適合します"],
        }
        : {
            status: "incompatible",
            reasons: ["ハンドルクランプ径が一致しません"],
        }
}

function compareCockpitParts(
    candidate: CompatibilityPart,
    selected: CompatibilityPart,
): PairCompatibilityResult | null {
    const candidateCategory = candidate.categoryKey
    const selectedCategory = selected.categoryKey

    if (hasCategoryPair(candidateCategory, selectedCategory, ["frame", "handlebar"])) {
        const frame = candidateCategory === "frame" ? candidate : selected
        const handlebar = candidateCategory === "handlebar" ? candidate : selected
        const frameStatus = getFrameCockpitStatus(frame)
        const cockpitConnection = getSpecification(frame, "cockpit_connection")

        if (frameStatus === "included" || frameStatus === "unknown") {
            return compareCockpitInterface(frame, handlebar)
        }

        if (isIntegratedHandlebar(handlebar)) {
            return compareCockpitInterface(frame, handlebar)
        }

        // 専用ステム付属フレームは、フレーム側に登録したクランプ径で判定する
        if (frame.blockedCategoryKeys.includes("stem")) {
            return compareHandlebarClamp(frame, handlebar)
        }

        if (cockpitConnection === "integrated_only") {
            return {
                status: "incompatible",
                reasons: ["一体型コックピット専用フレームのため、通常ハンドルは選択できません"],
            }
        }

        // 通常ハンドルはフレームへ直結せず、ステム側との組み合わせで判定する
        return null
    }

    if (hasCategoryPair(candidateCategory, selectedCategory, ["frame", "stem"])) {
        const frame = candidateCategory === "frame" ? candidate : selected
        const stem = candidateCategory === "stem" ? candidate : selected
        const cockpitConnection = getSpecification(frame, "cockpit_connection")

        if (
            frame.blockedCategoryKeys.includes("stem") ||
            cockpitConnection === "integrated_only"
        ) {
            return {
                status: "incompatible",
                reasons: ["このフレームでは別のステムを選択できません"],
            }
        }

        return compareCockpitInterface(frame, stem)
    }

    if (hasCategoryPair(candidateCategory, selectedCategory, ["stem", "handlebar"])) {
        const handlebar = candidateCategory === "handlebar" ? candidate : selected

        // 一体型ハンドルはカテゴリー排他でステムを置き換えるため、クランプ径を比較しない
        if (isIntegratedHandlebar(handlebar)) {
            return null
        }

        return compareHandlebarClamp(candidate, selected)
    }

    return null
}

function compareTireAndTube(
    tire: CompatibilityPart,
    tube: CompatibilityPart,
): PairCompatibilityResult {
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
        return {
            status: "unknown",
            reasons: ["タイヤとチューブのサイズ情報が不足しています"],
        }
    }

    if (tireDiameter !== tubeDiameter) {
        return {
            status: "incompatible",
            reasons: [`ホイール径が一致しません（${tireDiameter} / ${tubeDiameter}）`],
        }
    }

    if (tireWidth < minWidth || tireWidth > maxWidth) {
        return {
            status: "incompatible",
            reasons: [`${tireWidth}mmのタイヤはチューブの対応範囲${minWidth}〜${maxWidth}mm外です`],
        }
    }

    return {
        status: "compatible",
        reasons: [`${tireDiameter}・${tireWidth}mmで適合します`],
    }
}

function compareParts(
    candidate: CompatibilityPart,
    selected: CompatibilityPart,
): PairCompatibilityResult | null {
    if (
        candidate.blockedCategoryKeys.includes(selected.categoryKey) ||
        selected.blockedCategoryKeys.includes(candidate.categoryKey)
    ) {
        // 一体型パーツや付属コックピットと単品カテゴリーの二重登録を拒否する
        return {
            status: "incompatible",
            reasons: ["別の選択パーツが対象カテゴリーを占有するため同時に選択できません"],
        }
    }

    const cockpitResult = compareCockpitParts(candidate, selected)

    if (cockpitResult) {
        return cockpitResult
    }

    if (hasCategoryPair(candidate.categoryKey, selected.categoryKey, ["tire", "inner_tube"])) {
        const tire = candidate.categoryKey === "tire" ? candidate : selected
        const tube = candidate.categoryKey === "inner_tube" ? candidate : selected

        return compareTireAndTube(tire, tube)
    }

    for (const rule of EQUALITY_RULES) {
        if (!hasCategoryPair(candidate.categoryKey, selected.categoryKey, rule.categories)) {
            continue
        }

        const candidateValue = getSpecification(candidate, rule.specificationKey)
        const selectedValue = getSpecification(selected, rule.specificationKey)

        if (!candidateValue && !selectedValue) {
            return null
        }

        if (!candidateValue || !selectedValue) {
            return {
                status: "unknown",
                reasons: [`${rule.label}が未確認です`],
            }
        }

        return candidateValue === selectedValue
            ? {
                status: "compatible",
                reasons: [`${rule.label}が適合します`],
            }
            : {
                status: "incompatible",
                reasons: [`${rule.label}が一致しません`],
            }
    }

    return null
}

// 保存構成の中にある既知の規格不一致を、重複なしで一覧化する
export function findIncompatiblePartPairs(
    storedParts: StoredPart[],
): CompatibilityIssue[] {
    const issues = new Map<string, CompatibilityIssue>()

    for (const [index, candidate] of storedParts.entries()) {
        for (const selected of storedParts.slice(index + 1)) {
            if (!appliesToPosition(candidate.slotKey, selected.slotKey)) {
                continue
            }

            const result = compareParts(candidate.part, selected.part)

            if (!result || result.status !== "incompatible") {
                continue
            }

            const pair = [candidate, selected].sort((first, second) =>
                first.slotKey.localeCompare(second.slotKey),
            )
            const slotKeys = pair.map((item) => item.slotKey)
            const reasons = Array.from(new Set(result.reasons)).sort()
            const key = `${slotKeys.join("|")}::${reasons.join("|")}`

            if (!issues.has(key)) {
                issues.set(key, {
                    slotKeys,
                    partIds: pair.map((item) => item.part.id),
                    reasons,
                })
            }
        }
    }

    return Array.from(issues.values())
}

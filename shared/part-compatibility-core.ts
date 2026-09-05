// 候補選択(フロント)と保存APIで共通に使う規格比較コア。
// Part(フロント)とCompatibilityPart(API)の両方に適合する最小入力で動く。

export type CompatibilityStatus =
    | "compatible"
    | "unknown"
    | "incompatible"

export type CompatibilityInput = {
    categoryKey?: string
    blockedCategoryKeys?: string[]
    specifications?: Record<string, string>
}

type PairCompatibilityResult = {
    status: CompatibilityStatus
    reasons: string[]
}

type EqualityRule = {
    categories: readonly [string, string]
    specificationKey: string
    label: string
    protectedCategory?: string
    protectedCategoryLabel?: string
}

// 規格値が一致しない場合に、候補を解除確認または選択不可へ導く関係を定義する。
export const EQUALITY_RULES: EqualityRule[] = [
    {categories: ["brake_caliper", "brake_pad"], specificationKey: "pad_family", label: "パッド形状"},
    {categories: ["wheel", "tire"], specificationKey: "wheel_diameter", label: "ホイール径"},
    {categories: ["wheel", "disc_rotor"], specificationKey: "rotor_mount", label: "ローター取付方式"},
    {categories: ["wheel", "cassette"], specificationKey: "freehub_body", label: "フリーボディ"},
    {categories: ["crankset", "bottom_bracket"], specificationKey: "crank_spindle", label: "クランク軸規格"},
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

export const STANDARD_COCKPIT_INTERFACE = "standard_1_1_8"

type FrameCockpitStatus =
    | "included"
    | "dedicated"
    | "standard"
    | "unknown"

function getSpecification(part: CompatibilityInput, key: string) {
    // 規格が未登録の場合はundefinedのまま返し、適合不明として扱えるようにする。
    return part.specifications?.[key]
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

function isIntegratedHandlebar(part: CompatibilityInput) {
    // ステムカテゴリーを占有するハンドルは、フレームへ直接接続する一体型コックピットとして扱う。
    return (
        part.categoryKey === "handlebar" &&
        (part.blockedCategoryKeys ?? []).includes("stem")
    )
}

export function getFrameCockpitStatus(
    frame: CompatibilityInput,
): FrameCockpitStatus | null {
    if (frame.categoryKey !== "frame") {
        return null
    }

    // ハンドル選択枠を占有するフレームは、専用コックピットが商品に含まれる。
    if ((frame.blockedCategoryKeys ?? []).includes("handlebar")) {
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
    frame: CompatibilityInput,
    connectedPart: CompatibilityInput,
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
        // 専用品は規格不明の候補へ逃がさず、適合が確認できた製品だけを選択可能にする。
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
    firstPart: CompatibilityInput,
    secondPart: CompatibilityInput,
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
    candidate: CompatibilityInput,
    candidateCategory: string,
    selectedPart: CompatibilityInput,
    selectedCategory: string,
): PairCompatibilityResult | null {
    if (hasCategoryPair(candidateCategory, selectedCategory, ["frame", "handlebar"])) {
        // フォークは独立パーツでなくフレームのcockpit_interfaceとして扱う。
        // ハンドルがフォーク(フレーム)へ直接付くか、ステムを介して付くかを分岐して判定する。
        const frame = candidateCategory === "frame" ? candidate : selectedPart
        const handlebar = candidateCategory === "handlebar" ? candidate : selectedPart
        const frameStatus = getFrameCockpitStatus(frame)
        const cockpitConnection = getSpecification(frame, "cockpit_connection")

        // コックピット付属フレームや規格未確認フレームは、ハンドル側の規格値で比較する。
        if (frameStatus === "included" || frameStatus === "unknown") {
            return compareCockpitInterface(frame, handlebar)
        }

        // 一体型ハンドルはステムを兼ねてフォークへ直結するため、フォーク規格と比較する。
        if (isIntegratedHandlebar(handlebar)) {
            return compareCockpitInterface(frame, handlebar)
        }

        // フレームに専用ステムが付属する車種では、そのステムへ通常ハンドルをクランプ径で組み付ける。
        if ((frame.blockedCategoryKeys ?? []).includes("stem")) {
            return compareHandlebarClamp(frame, handlebar)
        }

        // 一体型コックピット専用フレームは、通常ハンドルを組み付けられない。
        if (cockpitConnection === "integrated_only") {
            return {
                status: "incompatible",
                reasons: ["一体型コックピット専用フレームのため、通常ハンドルは選択できません"],
            }
        }

        // 専用フォーク(cockpit_interfaceが専用規格)のフレームは、ステムもハンドルも専用規格を要求する。
        // 通常ハンドルをスルーせず、フォーク規格と一致するハンドルだけを許可する。
        if (frameStatus === "dedicated") {
            return compareCockpitInterface(frame, handlebar)
        }

        // 標準フォークの通常ハンドルはフレームへ直接接続しないため、選択したステムとのクランプ径で別途判定する。
        return null
    }

    if (hasCategoryPair(candidateCategory, selectedCategory, ["frame", "stem"])) {
        const frame = candidateCategory === "frame" ? candidate : selectedPart
        const stem = candidateCategory === "stem" ? candidate : selectedPart
        const cockpitConnection = getSpecification(frame, "cockpit_connection")

        if (
            (frame.blockedCategoryKeys ?? []).includes("stem") ||
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
        const handlebar = candidateCategory === "handlebar" ? candidate : selectedPart

        // 一体型ハンドルはステムを置き換えるため、クランプ径ではなくカテゴリー排他で処理する。
        if (isIntegratedHandlebar(handlebar)) {
            return null
        }

        return compareHandlebarClamp(candidate, selectedPart)
    }

    return null
}

function compareTireAndTube(
    tire: CompatibilityInput,
    tube: CompatibilityInput,
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
        // 規格不足は安全側に倒し、適合と断定せず利用者へ確認を促す。
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

// 2パーツ間の規格判定。対象カテゴリーの組み合わせがなければnullを返す。
export function compareParts(
    candidate: CompatibilityInput,
    candidateCategory: string,
    selected: CompatibilityInput,
    selectedCategory: string,
): PairCompatibilityResult | null {
    const candidateBlocksSelectedCategory =
        (candidate.blockedCategoryKeys ?? []).includes(selectedCategory)
    const selectedBlocksCandidateCategory =
        (selected.blockedCategoryKeys ?? []).includes(candidateCategory)

    if (candidateBlocksSelectedCategory || selectedBlocksCandidateCategory) {
        // 一体型パーツや付属コックピットとの二重選択を拒否する。
        return {
            status: "incompatible",
            reasons: ["別の選択パーツが対象カテゴリーを占有するため同時に選択できません"],
        }
    }

    const cockpitResult = compareCockpitParts(
        candidate,
        candidateCategory,
        selected,
        selectedCategory,
    )

    if (cockpitResult) {
        return cockpitResult
    }

    if (hasCategoryPair(candidateCategory, selectedCategory, ["tire", "inner_tube"])) {
        const tire = candidateCategory === "tire" ? candidate : selected
        const tube = candidateCategory === "inner_tube" ? candidate : selected

        return compareTireAndTube(tire, tube)
    }

    for (const rule of EQUALITY_RULES) {
        if (!hasCategoryPair(candidateCategory, selectedCategory, rule.categories)) {
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

        if (candidateValue === selectedValue) {
            return {
                status: "compatible",
                reasons: [`${rule.label}が適合します`],
            }
        }

        if (
            rule.protectedCategory &&
            (
                candidateCategory === rule.protectedCategory ||
                selectedCategory === rule.protectedCategory
            )
        ) {
            return {
                status: "incompatible",
                reasons: [
                    `${rule.label}が一致しないため、${rule.protectedCategoryLabel}を維持したまま選択できません`,
                ],
            }
        }

        return {
            status: "incompatible",
            reasons: [`${rule.label}が一致しません`],
        }
    }

    return null
}

export type CompatibilityIssue = {
    slotKeys: string[]
    partIds: number[]
    reasons: string[]
    status: "incompatible" | "unknown"
}

function partPositionFromSlotKey(slotKey: string): "single" | "front" | "rear" {
    const position = slotKey.split(":")[1]

    return position === "front" || position === "rear"
        ? position
        : "single"
}

function categoryKeyFromSlotKey(slotKey: string) {
    const separatorIndex = slotKey.indexOf(":")

    return separatorIndex === -1
        ? slotKey
        : slotKey.slice(0, separatorIndex)
}

export function appliesToPosition(targetSlotKey: string, selectedSlotKey: string) {
    // 単一枠は前後共通、前後枠は同じ位置だけを比較する
    const targetPosition = partPositionFromSlotKey(targetSlotKey)
    const selectedPosition = partPositionFromSlotKey(selectedSlotKey)

    return (
        targetPosition === "single" ||
        selectedPosition === "single" ||
        targetPosition === selectedPosition
    )
}

// 構成全体の規格不一致・規格未確認を、重複なしで一覧化する
export function findCompatibilityIssues(
    parts: {slotKey: string; part: CompatibilityInput & {id: number}}[],
): CompatibilityIssue[] {
    const issues = new Map<string, CompatibilityIssue>()

    for (const [index, candidate] of parts.entries()) {
        for (const selected of parts.slice(index + 1)) {
            if (!appliesToPosition(candidate.slotKey, selected.slotKey)) {
                continue
            }

            const result = compareParts(
                candidate.part,
                candidate.part.categoryKey ??
                    categoryKeyFromSlotKey(candidate.slotKey),
                selected.part,
                selected.part.categoryKey ??
                    categoryKeyFromSlotKey(selected.slotKey),
            )

            if (!result || result.status === "compatible") {
                continue
            }

            const pair = [candidate, selected].sort((first, second) =>
                first.slotKey.localeCompare(second.slotKey),
            )
            const slotKeys = pair.map((item) => item.slotKey)
            const reasons = Array.from(new Set(result.reasons)).sort()
            const key = `${slotKeys.join("|")}::${reasons.join("|")}`
            const existing = issues.get(key)

            // 同じパーツ組み合わせの両方向の結果は、重要度の高い方を残す
            if (
                !existing ||
                (result.status === "incompatible" && existing.status === "unknown")
            ) {
                issues.set(key, {
                    slotKeys,
                    partIds: pair.map((item) => item.part.id),
                    reasons,
                    status: result.status,
                })
            }
        }
    }

    return Array.from(issues.values())
}
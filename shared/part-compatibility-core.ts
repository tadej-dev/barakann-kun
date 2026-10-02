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

// 規格ごとの判定結果。画面で「非適合：フリーボディ（カセット：HG／XDR）」のように並べるために使う。
// reasons(文章)は保存APIのエラー文などで使うため残し、こちらは表示用の構造データとして併せて返す。
export type CompatibilityDetail = {
    label: string // 規格名(例: フリーボディ)
    status: CompatibilityStatus
    specificationKey?: string // 値を日本語ラベルへ変換するための規格キー。整形済みの値なら省略する
    candidateValue?: string // 判定対象(候補)側の値。未登録なら省略
    selectedValue?: string // 比較相手(選択済み)側の値。未登録なら省略
}

type PairCompatibilityResult = {
    status: CompatibilityStatus
    reasons: string[]
    details?: CompatibilityDetail[]
}

type EqualityRule = {
    categories: readonly [string, string]
    specificationKey: string
    label: string
    protectedCategory?: string
    protectedCategoryLabel?: string
}

// 変速段数をそろえる必要がある駆動系のカテゴリー。
// レバーの段数に合わせてディレイラー・カセット・チェーン・チェーンリングの幅が決まるため、全組み合わせで比較する。
const DRIVETRAIN_SPEED_CATEGORIES = [
    "shift_brake_lever",
    "front_derailleur",
    "rear_derailleur",
    "crankset",
    "cassette",
    "chain",
] as const

// 変速方式(機械式・電動有線・電動無線)をそろえる必要があるカテゴリー。
// 信号をやり取りするのはレバーとディレイラーだけなので、クランクなどは含めない。
const SHIFT_SYSTEM_CATEGORIES = [
    "shift_brake_lever",
    "front_derailleur",
    "rear_derailleur",
] as const

// 指定したカテゴリーの全組み合わせに、同じ規格キーの一致ルールを作る。
function createPairwiseRules(
    categories: readonly string[],
    specificationKey: string,
    label: string,
): EqualityRule[] {
    const rules: EqualityRule[] = []

    for (const [index, first] of categories.entries()) {
        for (const second of categories.slice(index + 1)) {
            rules.push({categories: [first, second], specificationKey, label})
        }
    }

    return rules
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
    {
        categories: ["frame", "wheel"],
        specificationKey: "wheel_diameter",
        label: "ホイール径",
        protectedCategory: "frame",
        protectedCategoryLabel: "フレーム",
    },
    {
        categories: ["frame", "brake_caliper"],
        specificationKey: "brake_mount",
        label: "ブレーキマウント",
        protectedCategory: "frame",
        protectedCategoryLabel: "フレーム",
    },
    // コンポセットは構成品(クランク・カセット・キャリパー)の規格をセット本体に持たせて判定する。
    // 構成品のカテゴリーはセットが占有するため、単体パーツとの組み合わせはこの3つだけになる。
    {categories: ["groupset", "bottom_bracket"], specificationKey: "crank_spindle", label: "クランク軸規格"},
    {categories: ["groupset", "wheel"], specificationKey: "freehub_body", label: "フリーボディ"},
    {categories: ["groupset", "brake_pad"], specificationKey: "pad_family", label: "パッド形状"},
    ...createPairwiseRules(
        DRIVETRAIN_SPEED_CATEGORIES,
        "drivetrain_speed",
        "対応段数",
    ),
    ...createPairwiseRules(
        SHIFT_SYSTEM_CATEGORIES,
        "shift_system",
        "変速方式",
    ),
]

export const STANDARD_COCKPIT_INTERFACE = "standard_1_1_8"

// 丸型1-1/8コラムのオープン規格。標準コックピットの装着可否を分岐させるために使う。
const ROUND_STEERER_OPEN_COCKPIT_INTERFACES: readonly string[] = [
    "fsa_acr",
    "focus_cis",
    "look_aero_combo",
    "orbea_icr",
]

// オープン規格: 専用規格だがサードパーティ製コックピットが装着できるフレームのcockpit_interface。
// 丸型コラム系は標準1-1/8のステム/一体型ハンドルも装着できる。
// D字コラム系(Deda DCR対応車種など)は標準丸型を装着できず、規格一致品のみ装着できる。
const OPEN_COCKPIT_INTERFACES = new Set<string>([
    ...ROUND_STEERER_OPEN_COCKPIT_INTERFACES,
    // D字コラムだがサードパーティ(Deda DCR等)の専用コックピットが存在する車種
    "bianchi_specialissima_rc",
    "bmc_ics",
    "cannondale_delta",
    "cannondale_knot",
    "colnago_cc01",
    "pinarello_ticr",
    "wilier_filante",
    "trek_madone_gen7",
    "factor_ostro_vam",
])

export type FrameCockpitStatus =
    | "included"
    | "dedicated"
    | "standard"
    | "open"
    | "unknown"

function getSpecification(part: CompatibilityInput, key: string) {
    // 規格が未登録の場合はundefinedのまま返し、適合不明として扱えるようにする。
    return part.specifications?.[key]
}

// カンマ区切りの規格値は、いずれか一致すれば適合とみなす。
// 複数フリーボディ対応など、1パーツが複数規格に跨るケースを表現する。
function specificationValuesMatch(first: string, second: string) {
    const firstValues = first.split(",").map((value) => value.trim()).filter(Boolean)
    const secondValues = second.split(",").map((value) => value.trim()).filter(Boolean)

    return firstValues.some((value) => secondValues.includes(value))
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

    if (cockpitInterface === STANDARD_COCKPIT_INTERFACE) {
        return "standard"
    }

    // サードパーティ製コックピットが装着できるオープン規格か判定する。
    return OPEN_COCKPIT_INTERFACES.has(cockpitInterface)
        ? "open"
        : "dedicated"
}

// 丸型1-1/8コラムのフレームは、専用規格でも標準コックピットを装着できる。
// 標準規格そのもの、または丸型コラムのオープン規格であればtrueを返す。
function acceptsStandardCockpit(frame: CompatibilityInput) {
    const cockpitInterface = getSpecification(frame, "cockpit_interface")

    if (cockpitInterface === STANDARD_COCKPIT_INTERFACE) {
        return true
    }

    return (
        !!cockpitInterface &&
        ROUND_STEERER_OPEN_COCKPIT_INTERFACES.includes(cockpitInterface)
    )
}

// 付属コックピットをサードパーティ品へ交換できるフレームか判定する。
// 交換可フレームでは、フレームが占有するハンドル/ステムを規格判定側で可否決定する。
export function allowsCockpitReplacement(frame: CompatibilityInput) {
    return getSpecification(frame, "cockpit_replaceable") === "true"
}

// システムタグ(cockpit_system)が交差すれば、規格名が違っても装着できるとみなす。
// 例: Deda DCR系フレームと、DCR対応を宣言したサードパーティ製ハンドル。
function cockpitSystemsMatch(
    frame: CompatibilityInput,
    connectedPart: CompatibilityInput,
) {
    const frameSystem = getSpecification(frame, "cockpit_system")
    const connectedSystem = getSpecification(connectedPart, "cockpit_system")

    if (!frameSystem || !connectedSystem) {
        return false
    }

    return specificationValuesMatch(frameSystem, connectedSystem)
}

// パーツがカテゴリーを占有しているか判定する。
// 交換可能な付属コックピットの占有は、規格判定側で可否を決めるため占有扱いから除く。
export function blocksCategory(
    part: CompatibilityInput,
    categoryKey: string,
) {
    if (!(part.blockedCategoryKeys ?? []).includes(categoryKey)) {
        return false
    }

    return !(
        part.categoryKey === "frame" &&
        allowsCockpitReplacement(part) &&
        (categoryKey === "handlebar" || categoryKey === "stem")
    )
}

function compareCockpitInterface(
    frame: CompatibilityInput,
    connectedPart: CompatibilityInput,
): PairCompatibilityResult {
    const frameStatus = getFrameCockpitStatus(frame)

    // 付属コックピットでも、交換可フレームは規格適合したサードパーティ品を許可する。
    if (frameStatus === "included" && !allowsCockpitReplacement(frame)) {
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

    // システムタグが交差すれば、規格名が一致しなくても装着できる。
    if (cockpitSystemsMatch(frame, connectedPart)) {
        return {
            status: "compatible",
            reasons: ["コックピットシステムが適合します"],
        }
    }

    const frameInterface = getSpecification(frame, "cockpit_interface")
    const connectedInterface = getSpecification(connectedPart, "cockpit_interface")

    if (!connectedInterface) {
        // 専用品(D字オープン規格・付属コックピットを含む)は規格不明の候補へ逃がさず、
        // 適合が確認できた製品だけを選択可能にする。
        const requiresInterfaceMatch =
            frameStatus === "dedicated" ||
            frameStatus === "included" ||
            (frameStatus === "open" && !acceptsStandardCockpit(frame))

        return requiresInterfaceMatch
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
        // 丸型コラムのオープン規格は、標準1-1/8のコックピットも装着できる。
        if (
            acceptsStandardCockpit(frame) &&
            connectedInterface === STANDARD_COCKPIT_INTERFACE
        ) {
            return {
                status: "compatible",
                reasons: ["オープン規格のため標準コックピットが適合します"],
            }
        }

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

        // D字コラムのオープン規格も、規格一致する専用ハンドルだけを許可する。
        // 丸型コラムのオープン規格は標準ハンドルを装着できるため、下のnullへ流してステム径で判定する。
        if (frameStatus === "open" && !acceptsStandardCockpit(frame)) {
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
            blocksCategory(frame, "stem") ||
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

// フレームのタイヤクリアランスとタイヤ幅を比較する。
// 一致ではなく「最大幅以下か」で判定するため、一致ルールとは別に扱う。
function compareFrameAndTire(
    frame: CompatibilityInput,
    tire: CompatibilityInput,
): PairCompatibilityResult | null {
    const maxWidthValue = getSpecification(frame, "max_tire_width_mm")
    const tireWidthValue = getSpecification(tire, "tire_width_mm")

    if (!maxWidthValue && !tireWidthValue) {
        return null
    }

    const maxWidth = Number(maxWidthValue)
    const tireWidth = Number(tireWidthValue)

    if (!Number.isFinite(maxWidth) || !Number.isFinite(tireWidth) || !maxWidthValue || !tireWidthValue) {
        return {
            status: "unknown",
            reasons: ["フレームの対応タイヤ幅が未確認です"],
        }
    }

    if (tireWidth > maxWidth) {
        // フレームは構成の基準なので、入らないタイヤはフレームを維持したまま選べない扱いにする。
        return {
            status: "incompatible",
            reasons: [
                `${tireWidth}mmのタイヤはフレームの最大${maxWidth}mmを超えるため、フレームを維持したまま選択できません`,
            ],
        }
    }

    return {
        status: "compatible",
        reasons: [`タイヤ幅${tireWidth}mmはフレームの最大${maxWidth}mm以内です`],
    }
}

// 複数ルールの判定結果を1つにまとめる。
// 同じ組み合わせに規格が複数ある場合(段数と変速方式など)、最も重い結果を採用し、理由はすべて残す。
function combinePairResults(
    results: PairCompatibilityResult[],
): PairCompatibilityResult | null {
    if (results.length === 0) {
        return null
    }

    const hasIncompatible = results.some((result) => result.status === "incompatible")
    const hasUnknown = results.some((result) => result.status === "unknown")
    const status: CompatibilityStatus = hasIncompatible
        ? "incompatible"
        : hasUnknown
            ? "unknown"
            : "compatible"

    return {
        status,
        reasons: results.flatMap((result) => result.reasons),
        details: results.flatMap((result) => result.details ?? []),
    }
}

// 一致ルール1件分の判定。両方の規格が未登録ならnullを返す。
function compareByEqualityRule(
    rule: EqualityRule,
    candidate: CompatibilityInput,
    candidateCategory: string,
    selected: CompatibilityInput,
    selectedCategory: string,
): PairCompatibilityResult | null {
    const candidateValue = getSpecification(candidate, rule.specificationKey)
    const selectedValue = getSpecification(selected, rule.specificationKey)

    if (!candidateValue && !selectedValue) {
        return null
    }

    // 規格名と両側の値は、どの判定結果でも同じ形で表示用に添える。
    const createDetails = (status: CompatibilityStatus): CompatibilityDetail[] => [{
        label: rule.label,
        status,
        specificationKey: rule.specificationKey,
        candidateValue,
        selectedValue,
    }]

    if (!candidateValue || !selectedValue) {
        return {
            status: "unknown",
            reasons: [`${rule.label}が未確認です`],
            details: createDetails("unknown"),
        }
    }

    if (specificationValuesMatch(candidateValue, selectedValue)) {
        return {
            status: "compatible",
            reasons: [`${rule.label}が適合します`],
            details: createDetails("compatible"),
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
            details: createDetails("incompatible"),
        }
    }

    return {
        status: "incompatible",
        reasons: [`${rule.label}が一致しません`],
        details: createDetails("incompatible"),
    }
}

// 規格ごとの詳細を持たない判定結果に、規格名だけの詳細を補う。
// コックピットやカテゴリーの占有のように、値の一致では表せない判定で使う。
function withSummaryDetail(
    result: PairCompatibilityResult,
    label: string,
): PairCompatibilityResult {
    if (result.details && result.details.length > 0) {
        return result
    }

    return {
        ...result,
        details: [{label, status: result.status}],
    }
}

// 2パーツ間の規格判定。対象カテゴリーの組み合わせがなければnullを返す。
export function compareParts(
    candidate: CompatibilityInput,
    candidateCategory: string,
    selected: CompatibilityInput,
    selectedCategory: string,
): PairCompatibilityResult | null {
    const candidateBlocksSelectedCategory = blocksCategory(candidate, selectedCategory)
    const selectedBlocksCandidateCategory = blocksCategory(selected, candidateCategory)

    if (candidateBlocksSelectedCategory || selectedBlocksCandidateCategory) {
        // 一体型パーツや付属コックピットとの二重選択を拒否する。
        return {
            status: "incompatible",
            reasons: ["別の選択パーツが対象カテゴリーを占有するため同時に選択できません"],
            details: [{label: "カテゴリーの占有", status: "incompatible"}],
        }
    }

    const cockpitResult = compareCockpitParts(
        candidate,
        candidateCategory,
        selected,
        selectedCategory,
    )

    if (cockpitResult) {
        return withSummaryDetail(cockpitResult, "コックピット")
    }

    if (hasCategoryPair(candidateCategory, selectedCategory, ["tire", "inner_tube"])) {
        const tire = candidateCategory === "tire" ? candidate : selected
        const tube = candidateCategory === "inner_tube" ? candidate : selected

        return withSummaryDetail(compareTireAndTube(tire, tube), "タイヤサイズ")
    }

    if (hasCategoryPair(candidateCategory, selectedCategory, ["frame", "tire"])) {
        const frame = candidateCategory === "frame" ? candidate : selected
        const tire = candidateCategory === "tire" ? candidate : selected

        const result = compareFrameAndTire(frame, tire)

        if (!result) {
            return null
        }

        // 値は単位つきで整形済みのため、規格キーを付けずにそのまま表示する。
        const tireWidth = getSpecification(tire, "tire_width_mm")
        const maxWidth = getSpecification(frame, "max_tire_width_mm")
        const tireValue = tireWidth ? `${tireWidth}mm` : undefined
        const frameValue = maxWidth ? `最大${maxWidth}mm` : undefined

        return {
            ...result,
            details: [{
                label: "タイヤ幅",
                status: result.status,
                candidateValue: candidateCategory === "tire" ? tireValue : frameValue,
                selectedValue: candidateCategory === "tire" ? frameValue : tireValue,
            }],
        }
    }

    // 該当する一致ルールをすべて評価し、結果をまとめる。
    const ruleResults: PairCompatibilityResult[] = []

    for (const rule of EQUALITY_RULES) {
        if (!hasCategoryPair(candidateCategory, selectedCategory, rule.categories)) {
            continue
        }

        const result = compareByEqualityRule(
            rule,
            candidate,
            candidateCategory,
            selected,
            selectedCategory,
        )

        if (result) {
            ruleResults.push(result)
        }
    }

    return combinePairResults(ruleResults)
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
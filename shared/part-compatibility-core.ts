// 候補選択（画面）と保存APIで共通に使う規格判定
// Part（画面）とCompatibilityPart（API）の両方に合う最小入力で動く

// 規格が適合するかの判定（互換 | 未確認 | 非互換）
export type CompatibilityStatus =
    | "compatible"
    | "unknown"
    | "incompatible"

// 規格判定に必要な最小限の入力
export type CompatibilityInput = {
    categoryKey?: string // パーツのカテゴリーキー
    blockedCategoryKeys?: string[] // 占有するカテゴリーのキー
    specifications?: Record<string, string> // 規格キーと値の対応
}

// 規格ごとの判定結果。画面で状態別にまとめて表示するために使う
export type CompatibilityDetail = {
    label: string // 規格名（例: フリーボディ）
    status: CompatibilityStatus // 対象規格の判定結果
    specificationKey?: string // 表示用ラベルへの変換に使う規格キー（省略可）
    candidateValue?: string // 候補側の規格値（省略可）
    selectedValue?: string // 選択済み側の規格値（省略可）
}

// 2パーツ間の判定結果
type PairCompatibilityResult = {
    status: CompatibilityStatus // パーツ同士の判定
    reasons: string[] // 判定結果の理由（画面・APIに表示する文章）
    details?: CompatibilityDetail[] // 比較結果の内訳
}

// 同じ規格値を求める組み合わせ
type EqualityRule = {
    categories: readonly [string, string] // 対象カテゴリーの組
    specificationKey: string // 比較する規格キー
    label: string // 表示名（規格）
    protectedCategory?: string // 維持するカテゴリーのキー
    protectedCategoryLabel?: string // 維持するカテゴリーの表示名
    toleranceMm?: number // 数値規格で許容する差（mm）
    numeric?: boolean // 数値として比較し、表記ゆれを吸収する
    missingBehavior?: "unknown" | "ignore" // 片側未登録時の扱い（未確認 | 判定しない）
}

// 上限値を持つ側と実値を持つ側を比べる組み合わせ
// 歯数や径の容量は一致ではなく「上限以下か」で判定する
type LimitRule = {
    categories: readonly [string, string] // 対象カテゴリーの組
    limitCategory: string // 上限値を持つカテゴリー
    limitSpecificationKey: string // 上限値の規格キー
    actualSpecificationKey: string // 実値の規格キー
    label: string // 表示名（規格）
    actualLabel?: string // 実値側の表示名（省略時は実値）
    unit: string // 理由に添える値の単位（歯数はT、径はmm）
    optionalLimit?: boolean // 上限が未登録なら判定しない
    note?: string // 理由に添える条件（例: アダプター無し）
    missingBehavior?: "unknown" | "ignore" // 片側未登録時の扱い（未確認 | 判定しない）
}


// 片側未登録時の結果を作る（判定しない規格はnull、それ以外は未確認）
function createMissingResult(
    missingBehavior: "unknown" | "ignore" | undefined,
    label: string,
    createDetails: (status: CompatibilityStatus) => CompatibilityDetail[],
): PairCompatibilityResult | null {
    // 登録漏れで未確認を出さない規格は、判定そのものを行わない
    if (missingBehavior === "ignore") {
        return null
    }

    return {
        status: "unknown",
        reasons: [`${label}が未確認です`],
        details: createDetails("unknown"),
    }
}

// 実値が対応範囲に収まるかを比べる組み合わせ

// タイヤの対応リム内幅のように、片側が下限と上限を持つ範囲規格で使う
type RangeRule = {
    categories: readonly [string, string] // 対象カテゴリーの組
    rangeCategory: string // 対応範囲を持つカテゴリー
    minSpecificationKey: string // 対応範囲の下限
    maxSpecificationKey: string // 対応範囲の上限
    actualSpecificationKey: string // 実値の規格キー
    actualLabel: string // 実値側の表示名（規格）
    label: string // 表示名（対応範囲の規格）
    unit: string // 理由に添える値の単位（径はmm）
    missingBehavior?: "unknown" | "ignore" // 片側未登録時の扱い（未確認 | 判定しない）
}

// 特定の値の組み合わせだけを非互換にする組み合わせ
// フックレスリムとチューブタイヤのように、片側の値だけでは決まらない組み合わせで使う
type IncompatibilityRule = {
    categories: readonly [string, string] // 対象カテゴリーの組
    firstCategory: string // 1つ目の値を持つカテゴリー
    firstSpecificationKey: string // 1つ目の規格キー
    firstValue: string // 1つ目の非互換値
    firstLabel: string // 1つ目の表示名（規格）
    secondCategory: string // 2つ目の値を持つカテゴリー
    secondSpecificationKey: string // 2つ目の規格キー
    secondValue: string // 2つ目の非互換値
    secondLabel: string // 2つ目の表示名（規格）
    reason: string // 非互換の理由（画面・APIに表示する文章）
    skipWhenNotMatched?: boolean // 非互換の組み合わせ以外は判定しない
}

// 変速段数をそろえる必要がある駆動系のカテゴリー
// レバーの段数に合わせてディレイラー・カセット・チェーン・チェーンリングの幅が決まるため、全組み合わせで比較
const DRIVETRAIN_SPEED_CATEGORIES = [
    "shift_brake_lever",
    "front_derailleur",
    "rear_derailleur",
    "crankset",
    "cassette",
    "chain",
] as const

// 変速方式(機械式・電動有線・電動無線)をそろえる必要があるカテゴリー
// 信号をやり取りするのはレバーとディレイラーだけなので、クランクなどは含めない
const SHIFT_SYSTEM_CATEGORIES = [
    "shift_brake_lever",
    "front_derailleur",
    "rear_derailleur",
] as const

// チェーンリング枚数(1x/2x/3x)をそろえる必要があるカテゴリー
// クランクとFDの対応枚数が食い違うと変速できないため、全組み合わせで比較
const CHAINRING_COUNT_CATEGORIES = [
    "crankset",
    "front_derailleur",
    "groupset",
] as const

// 指定したカテゴリーの全組み合わせに、同じ規格キーの一致ルールを作る
function createPairwiseRules(
    categories: readonly string[], // 比較するカテゴリー
    specificationKey: string, // 比較する規格
    label: string, // 規格の表示名
): EqualityRule[] {
    const rules: EqualityRule[] = []

    for (const [index, first] of categories.entries()) {
        for (const second of categories.slice(index + 1)) {
            rules.push({categories: [first, second], specificationKey, label})
        }
    }

    return rules
}

// 規格値が一致しない場合に、候補を解除確認または選択不可へ導く関係を定義
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
    // サドルはレール規格を1つ、シートポストは対応する複数を持つ
    {
        categories: ["saddle", "seatpost"],
        specificationKey: "saddle_rail",
        label: "サドルレール",
        // 片側の登録漏れで未確認を増やさない
        missingBehavior: "ignore",
    },
    {
        categories: ["frame", "bottom_bracket"],
        specificationKey: "bb_standard",
        label: "BB規格",
        protectedCategory: "frame",
        protectedCategoryLabel: "フレーム",
    },
    // BBシェル幅は数値の表記ゆれ（68と68.0）を吸収して比較
    {
        categories: ["frame", "bottom_bracket"],
        specificationKey: "bb_shell_width_mm",
        label: "BBシェル幅",
        protectedCategory: "frame",
        protectedCategoryLabel: "フレーム",
        numeric: true,
        // 片側の登録漏れで未確認を増やさない
        missingBehavior: "ignore",
    },
    {
        categories: ["frame", "wheel"],
        specificationKey: "wheel_diameter",
        label: "ホイール径",
        protectedCategory: "frame",
        protectedCategoryLabel: "フレーム",
    },
    // フレームは前後アクスルを1つずつ、ホイールは対応する複数を持つ
    {
        categories: ["frame", "wheel"],
        specificationKey: "front_axle",
        label: "前輪アクスル",
        protectedCategory: "frame",
        protectedCategoryLabel: "フレーム",
        // 片側の登録漏れで未確認を増やさない
        missingBehavior: "ignore",
    },
    {
        categories: ["frame", "wheel"],
        specificationKey: "rear_axle",
        label: "後輪アクスル",
        protectedCategory: "frame",
        protectedCategoryLabel: "フレーム",
        // 片側の登録漏れで未確認を増やさない
        missingBehavior: "ignore",
    },
    {
        categories: ["frame", "brake_caliper"],
        specificationKey: "brake_mount",
        label: "ブレーキマウント",
        protectedCategory: "frame",
        protectedCategoryLabel: "フレーム",
    },
    // コンポセットは構成品(クランク・カセット・キャリパー)の規格をセット本体に持たせて判定
    // 構成品のカテゴリーはセットが占有するため、単体パーツとの組み合わせはボトムブラケット・ホイール・ブレーキパッドの3つだけになる
    {categories: ["groupset", "bottom_bracket"], specificationKey: "crank_spindle", label: "クランク軸規格"},
    {categories: ["groupset", "wheel"], specificationKey: "freehub_body", label: "フリーボディ"},
    {categories: ["groupset", "brake_pad"], specificationKey: "pad_family", label: "パッド形状"},
    // チェーンは対応規格、カセット・リアディレイラー・クランクは受入規格として交差で比較
    {categories: ["chain", "cassette"], specificationKey: "chain_standard", label: "チェーン規格"},
    {categories: ["chain", "rear_derailleur"], specificationKey: "chain_standard", label: "チェーン規格"},
    {categories: ["chain", "crankset"], specificationKey: "chain_standard", label: "チェーン規格"},
    // クランクとフロントディレイラーはチェーンラインをそろえる
    {
        categories: ["crankset", "front_derailleur"],
        specificationKey: "chainline_mm",
        label: "チェーンライン",
        // 実装上の差は調整で吸収できるため、1mmまでを適合として扱う
        toleranceMm: 1.0,
    },
    // レバーとキャリパーはブレーキの駆動方式と油種をそろえる
    {
        categories: ["shift_brake_lever", "brake_caliper"],
        specificationKey: "brake_actuation",
        label: "ブレーキ方式",
    },
    {
        categories: ["shift_brake_lever", "brake_caliper"],
        specificationKey: "brake_fluid",
        label: "ブレーキフルード",
    },
    // レバーとハンドルのクランプ径は±0.5mmの差まで調整で吸収できる
    {
        categories: ["shift_brake_lever", "handlebar"],
        specificationKey: "control_clamp_mm",
        label: "クランプ径",
        toleranceMm: 0.5,
        // エアロ・一体型バーは径を公表しないため、未確認を出さない
        missingBehavior: "ignore",
    },
    // ペダルは軸規格を1つ、クランクは対応する複数を持つ
    {
        categories: ["pedal", "crankset"],
        specificationKey: "pedal_thread",
        label: "ペダル軸規格",
        // 片側の登録漏れで未確認を増やさない
        missingBehavior: "ignore",
    },
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
    ...createPairwiseRules(
        CHAINRING_COUNT_CATEGORIES,
        "chainring_count",
        "チェーンリング枚数",
    ),
]

// 上限値を持つ側が、実値を持つ側の容量以上かを比較する組み合わせ
// 実値が上限を超える場合は、その組み合わせを非互換として扱う
const LIMIT_RULES: LimitRule[] = [
    {
        categories: ["rear_derailleur", "cassette"],
        limitCategory: "rear_derailleur",
        limitSpecificationKey: "max_sprocket_teeth",
        actualSpecificationKey: "max_sprocket_teeth",
        label: "最大スプロケット歯数",
        unit: "T",
    },
    {
        categories: ["front_derailleur", "crankset"],
        limitCategory: "front_derailleur",
        limitSpecificationKey: "max_chainring_teeth",
        actualSpecificationKey: "max_chainring_teeth",
        label: "最大チェーンリング歯数",
        unit: "T",
    },
    {
        categories: ["brake_caliper", "disc_rotor"],
        limitCategory: "brake_caliper",
        limitSpecificationKey: "max_rotor_diameter_mm",
        actualSpecificationKey: "rotor_diameter_mm",
        label: "直付け対応ローター径",
        unit: "mm",
        note: "アダプター無し",
    },
    // フレームの対応ローター径は任意の規格で、登録があるフレームだけ比較する
    {
        categories: ["frame", "disc_rotor"],
        limitCategory: "frame",
        limitSpecificationKey: "max_rotor_diameter_mm",
        actualSpecificationKey: "rotor_diameter_mm",
        label: "直付け対応ローター径",
        unit: "mm",
        optionalLimit: true,
        note: "アダプター無し",
    },
    // フレームのシートチューブ長は任意の規格で、登録があるフレームだけ比較する
    // ポストの最小挿入長がシートチューブ長を超えると、十分に差し込めない
    {
        categories: ["frame", "seatpost"],
        limitCategory: "frame",
        limitSpecificationKey: "seat_tube_depth_mm",
        actualSpecificationKey: "seatpost_min_insert_mm",
        label: "シートチューブ長",
        actualLabel: "ポスト最小挿入長",
        unit: "mm",
        optionalLimit: true,
        missingBehavior: "ignore",
    },
]

// 実値が対応範囲に収まるかを比べる組み合わせ
const RANGE_RULES: RangeRule[] = [
    // タイヤの対応リム内幅に、ホイールのリム内幅が収まるか
    {
        categories: ["wheel", "tire"],
        rangeCategory: "tire",
        minSpecificationKey: "min_rim_inner_width_mm",
        maxSpecificationKey: "max_rim_inner_width_mm",
        actualSpecificationKey: "rim_inner_width_mm",
        actualLabel: "リム内幅",
        label: "対応リム内幅",
        unit: "mm",
        // メーカーが公開しない対応幅で未確認を増やさない
        missingBehavior: "ignore",
    },
]

// 特定の値の組み合わせだけを非互換にする組み合わせ
const INCOMPATIBILITY_RULES: IncompatibilityRule[] = [
    // フックレスリムはタイヤビードを引っ掛けるフックが無いため、チューブタイヤを装着できない
    {
        categories: ["wheel", "tire"],
        firstCategory: "wheel",
        firstSpecificationKey: "rim_tire_interface",
        firstValue: "hookless",
        firstLabel: "リムのタイヤ対応",
        secondCategory: "tire",
        secondSpecificationKey: "tire_bead",
        secondValue: "tube_type,tubular",
        secondLabel: "タイヤのビード",
        reason: "フックレスリムにチューブタイヤは装着できません",
        skipWhenNotMatched: true,
    },
]

// 標準コックピットの規格値
export const STANDARD_COCKPIT_INTERFACE = "standard_1_1_8"

// 丸型1-1/8コラムのオープン規格。標準コックピットの装着可否を分岐させるために使う
const ROUND_STEERER_OPEN_COCKPIT_INTERFACES: readonly string[] = [
    "fsa_acr",
    "focus_cis",
    "look_aero_combo",
    "orbea_icr",
]

// 専用規格でもサードパーティ製コックピットが装着できるフレームの規格値
// 丸型コラム系は標準1-1/8のステム／一体型ハンドルも装着でき、D字コラム系は規格一致品のみ
const OPEN_COCKPIT_INTERFACES = new Set<string>([
    ...ROUND_STEERER_OPEN_COCKPIT_INTERFACES,
    // サードパーティ製の専用コックピットがある車種
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

// フレームのコックピット対応（付属 | 専用 | 標準 | オープン | 未確認）
export type FrameCockpitStatus =
    | "included"
    | "dedicated"
    | "standard"
    | "open"
    | "unknown"

// 指定した規格値を取得
function getSpecification(part: CompatibilityInput, key: string) {
    // 規格が未登録の場合はundefinedのまま返し、適合不明として扱えるようにする
    return part.specifications?.[key]
}

// カンマ区切りの規格値は、いずれか一致すれば適合とみなす
// 複数フリーボディ対応など、1パーツが複数規格に跨るケースを表現
function specificationValuesMatch(first: string, second: string) {
    const firstValues = first.split(",").map((value) => value.trim()).filter(Boolean)
    const secondValues = second.split(",").map((value) => value.trim()).filter(Boolean)

    return firstValues.some((value) => secondValues.includes(value))
}

// 数値規格の表記ゆれ（68と68.0）を同じ文字列へそろえる
// カンマ区切りの複数対応は、各値を正規化してカンマで連結する
// 数値として読めない値が1つでもあればnullを返し、未確認として扱えるようにする
function normalizeNumericSpecificationValue(value: string) {
    // カンマ区切りの各値
    const parts = value.split(",").map((part) => part.trim()).filter(Boolean)

    // 空文字は数値として扱えない
    if (parts.length === 0) {
        return null
    }

    // 正規化した数値の一覧
    const normalizedValues: string[] = []

    for (const part of parts) {
        // カンマ区切りの1つ分を数値へ変換
        const numberValue = Number(part)

        // 数値として読めない値が含まれる
        if (!Number.isFinite(numberValue)) {
            return null
        }

        normalizedValues.push(String(numberValue))
    }

    return normalizedValues.join(",")
}

// 2つのカテゴリーが指定の組か判定
function hasCategoryPair(
    firstCategory: string,
    secondCategory: string,
    expectedCategories: readonly [string, string],
) {
    // 同じカテゴリー同士を誤って関連判定しないよう、異なる2カテゴリーだけを比較
    return (
        expectedCategories.includes(firstCategory) &&
        expectedCategories.includes(secondCategory) &&
        firstCategory !== secondCategory
    )
}

// 一体型ハンドルか判定
function isIntegratedHandlebar(part: CompatibilityInput) {
    // ステムカテゴリーを占有するハンドルは、フレームへ直接接続する一体型コックピットとして扱う
    return (
        part.categoryKey === "handlebar" &&
        (part.blockedCategoryKeys ?? []).includes("stem")
    )
}

// フレームのコックピット対応を判定
export function getFrameCockpitStatus(
    frame: CompatibilityInput,
): FrameCockpitStatus | null {
    // フレーム以外は対象外
    if (frame.categoryKey !== "frame") {
        return null
    }

    // ハンドル選択枠を占有するフレームは、専用コックピットが商品に含まれる
    if ((frame.blockedCategoryKeys ?? []).includes("handlebar")) {
        return "included"
    }

    const cockpitInterface = getSpecification(frame, "cockpit_interface")

    // 規格が未登録
    if (!cockpitInterface) {
        return "unknown"
    }

    // 標準コックピット規格の場合
    if (cockpitInterface === STANDARD_COCKPIT_INTERFACE) {
        return "standard"
    }

    // サードパーティ製コックピットが装着できるオープン規格か判定
    return OPEN_COCKPIT_INTERFACES.has(cockpitInterface)
        ? "open"
        : "dedicated"
}

// コラム規格から上端のコラム径（mm）を引く
// 専用形状（Cannondale Delta / BMC ICS / Giant OverDrive Aero）は丸型ではないため対象外
const STEERER_TOP_MM: Record<string, number> = {
    tapered_1_1_8_1_5: 28.6,
    tapered_1_1_8_1_3_8: 28.6,
    tapered_1_1_8_1_1_4: 28.6,
    straight_1_1_8: 28.6,
    tapered_1_1_4_1_1_5: 31.8,
    straight_1_1_4: 31.8,
}

// 丸型のコラムか判定する。専用形状や未登録は径の比較をしない
function isRoundSteerer(steererStandard: string | undefined) {
    return (
        steererStandard !== undefined &&
        STEERER_TOP_MM[steererStandard] !== undefined
    )
}

// フレームのコラム径と、ステム・一体型ハンドルのクランプ径を比較
// どちらかの径が分からない場合は判定しない(未確認にもしない)
function compareSteererClamp(
    frame: CompatibilityInput,
    connectedPart: CompatibilityInput,
): PairCompatibilityResult | null {
    const steererStandard = getSpecification(frame, "steerer_standard")
    const frameTopMm = steererStandard ? STEERER_TOP_MM[steererStandard] : undefined
    const clampValue = getSpecification(connectedPart, "steerer_clamp_mm")

    // 径が分からない
    if (frameTopMm === undefined || !clampValue) {
        return null
    }

    const clampMm = Number(clampValue)

    // クランプ径が数値でない
    if (!Number.isFinite(clampMm)) {
        return null
    }

    return clampMm === frameTopMm
        ? {
            status: "compatible",
            reasons: [`コラム径${frameTopMm}mmが適合します`],
            details: [{label: "コラム径", status: "compatible"}],
        }
        : {
            status: "incompatible",
            reasons: [`コラム径が一致しません（フレーム${frameTopMm}mm / パーツ${clampValue}mm）`],
            details: [{label: "コラム径", status: "incompatible"}],
        }
}

// null を除いてコックピット系の判定を1つにまとめる
function combineCockpitChecks(
    ...results: (PairCompatibilityResult | null)[]
) {
    return combinePairResults(
        results.filter((result): result is PairCompatibilityResult => result !== null),
    )
}

// 丸型1-1/8コラムのフレームは、専用規格でも標準コックピットを装着できる
// 標準コックピット規格、または丸型コラムのオープン規格ならtrueを返す
function acceptsStandardCockpit(frame: CompatibilityInput) {
    const cockpitInterface = getSpecification(frame, "cockpit_interface")

    // 標準コックピット規格の場合
    if (cockpitInterface === STANDARD_COCKPIT_INTERFACE) {
        return true
    }

    // コラム規格が登録されていれば、上端が1-1/8インチの丸型コラムかで判定
    // 専用形状（Cannondale Delta / BMC ICS / Giant OverDrive Aero）は丸型ではないため対象外
    const steererStandard = getSpecification(frame, "steerer_standard")

    // 丸型コラムは上端の径で判定
    if (steererStandard && isRoundSteerer(steererStandard)) {
        return STEERER_TOP_MM[steererStandard] === 28.6
    }

    // コラム規格が未登録のフレームは、従来の丸型コラム一覧で判定（後方互換）
    return (
        !!cockpitInterface &&
        ROUND_STEERER_OPEN_COCKPIT_INTERFACES.includes(cockpitInterface)
    )
}

// 付属コックピットをサードパーティ品へ交換できるフレームか判定
// 交換可フレームでは、フレームが占有するハンドル/ステムを規格判定側で可否決定
export function allowsCockpitReplacement(frame: CompatibilityInput) {
    return getSpecification(frame, "cockpit_replaceable") === "true"
}

// システムタグ(cockpit_system)が交差すれば、規格名が違っても装着できるとみなす
// 例: Deda DCR系フレームと、DCR対応を宣言したサードパーティ製ハンドル
function cockpitSystemsMatch(
    frame: CompatibilityInput,
    connectedPart: CompatibilityInput,
) {
    const frameSystem = getSpecification(frame, "cockpit_system")
    const connectedSystem = getSpecification(connectedPart, "cockpit_system")

    // システムタグのどちらかが未登録
    if (!frameSystem || !connectedSystem) {
        return false
    }

    return specificationValuesMatch(frameSystem, connectedSystem)
}

// パーツがカテゴリーを占有しているか判定
// 交換可能な付属コックピットの占有は、規格判定側で可否を決めるため占有扱いから除く
export function blocksCategory(
    part: CompatibilityInput,
    categoryKey: string,
) {
    // 対象カテゴリーを占有していない
    if (!(part.blockedCategoryKeys ?? []).includes(categoryKey)) {
        return false
    }

    return !(
        part.categoryKey === "frame" &&
        allowsCockpitReplacement(part) &&
        (categoryKey === "handlebar" || categoryKey === "stem")
    )
}

// フレームとコックピットの接続規格を比較
function compareCockpitInterface(
    frame: CompatibilityInput,
    connectedPart: CompatibilityInput,
): PairCompatibilityResult {
    const frameStatus = getFrameCockpitStatus(frame)

    // 付属コックピットでも、交換可フレームは規格適合したサードパーティ品を許可
    if (frameStatus === "included" && !allowsCockpitReplacement(frame)) {
        return {
            status: "incompatible",
            reasons: ["フレームにコックピットが付属するため、別のハンドルやステムは選択できません"],
        }
    }

    // フレームのコックピット規格が未確認
    if (frameStatus === "unknown") {
        return {
            status: "unknown",
            reasons: ["フレームのコックピット規格が未確認です"],
        }
    }

    // システムタグが交差すれば、規格名が一致しなくても装着できる
    if (cockpitSystemsMatch(frame, connectedPart)) {
        return {
            status: "compatible",
            reasons: ["コックピットシステムが適合します"],
        }
    }

    const frameInterface = getSpecification(frame, "cockpit_interface")
    const connectedInterface = getSpecification(connectedPart, "cockpit_interface")

    // 相手の接続規格が未登録
    if (!connectedInterface) {
        // 専用品(D字オープン規格・付属コックピットを含む)は規格不明の候補へ逃がさず、
        // 適合が確認できた製品だけを選択可能にする
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

    // フレームと相手の接続規格が不一致
    if (frameInterface !== connectedInterface) {
        // 丸型コラムのオープン規格は、標準1-1/8のコックピットも装着できる
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

// ハンドルとステムのクランプ径を比較
function compareHandlebarClamp(
    firstPart: CompatibilityInput,
    secondPart: CompatibilityInput,
): PairCompatibilityResult {
    const firstClamp = getSpecification(firstPart, "handlebar_clamp_mm")
    const secondClamp = getSpecification(secondPart, "handlebar_clamp_mm")

    // クランプ径が未登録
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

// コックピット構成の互換性を比較
function compareCockpitParts(
    candidate: CompatibilityInput,
    candidateCategory: string,
    selectedPart: CompatibilityInput,
    selectedCategory: string,
): PairCompatibilityResult | null {
    // フレームとハンドルの組み合わせ
    if (hasCategoryPair(candidateCategory, selectedCategory, ["frame", "handlebar"])) {
        // フォークは独立パーツでなくフレームのcockpit_interfaceとして扱う
        // ハンドルがフォーク(フレーム)へ直接付くか、ステムを介して付くかを分岐して判定
        const frame = candidateCategory === "frame" ? candidate : selectedPart
        const handlebar = candidateCategory === "handlebar" ? candidate : selectedPart
        const frameStatus = getFrameCockpitStatus(frame)
        const cockpitConnection = getSpecification(frame, "cockpit_connection")

        // 専用ステムを占有し、ステム式を受け付けないフレームだけ一体型ハンドルを拒否する
        // 一体型・ステム式の両対応(either)は、付属ステムを外して一体型へ交換できる
        if (
            isIntegratedHandlebar(handlebar) &&
            blocksCategory(frame, "stem") &&
            cockpitConnection !== "either"
        ) {
            return {
                status: "incompatible",
                reasons: ["フレームが専用ステムを占有するため、一体型ハンドルは選択できません"],
            }
        }

        // コックピット付属フレームや規格未確認フレームは、ハンドル側の規格値で比較
        if (frameStatus === "included" || frameStatus === "unknown") {
            return compareCockpitInterface(frame, handlebar)
        }

        // 一体型ハンドルはステムを兼ねてフォークへ直結するため、フォーク規格と比較
        // コラム径が分かる場合は径も比較
        if (isIntegratedHandlebar(handlebar)) {
            return combineCockpitChecks(
                compareCockpitInterface(frame, handlebar),
                compareSteererClamp(frame, handlebar),
            )
        }

        // フレームに専用ステムが付属する車種では、専用ステムへ通常ハンドルをクランプ径で組み付ける
        if ((frame.blockedCategoryKeys ?? []).includes("stem")) {
            return compareHandlebarClamp(frame, handlebar)
        }

        // 一体型コックピット専用フレームは、通常ハンドルを組み付けられない
        if (cockpitConnection === "integrated_only") {
            return {
                status: "incompatible",
                reasons: ["一体型コックピット専用フレームのため、通常ハンドルは選択できません"],
            }
        }

        // 専用フォーク(cockpit_interfaceが専用規格)のフレームは、ステムもハンドルも専用規格を要求
        // 通常ハンドルをスルーせず、フォーク規格と一致するハンドルだけを許可
        if (frameStatus === "dedicated") {
            return compareCockpitInterface(frame, handlebar)
        }

        // D字コラムのオープン規格も、規格一致する専用ハンドルだけを許可
        // 丸型コラムのオープン規格は標準ハンドルを装着できるため、下のnullへ流してステム径で判定
        if (frameStatus === "open" && !acceptsStandardCockpit(frame)) {
            return compareCockpitInterface(frame, handlebar)
        }

        // 標準フォークの通常ハンドルはフレームへ直接接続しないため、選択したステムとのクランプ径で判定
        return null
    }

    // フレームとステムの組み合わせ
    if (hasCategoryPair(candidateCategory, selectedCategory, ["frame", "stem"])) {
        const frame = candidateCategory === "frame" ? candidate : selectedPart
        const stem = candidateCategory === "stem" ? candidate : selectedPart
        const cockpitConnection = getSpecification(frame, "cockpit_connection")

        // ステムを占有する／一体型専用のフレーム
        if (
            blocksCategory(frame, "stem") ||
            cockpitConnection === "integrated_only"
        ) {
            return {
                status: "incompatible",
                reasons: ["このフレームでは別のステムを選択できません"],
            }
        }

        // コックピット規格(形状)に加え、コラム径も判定
        return combineCockpitChecks(
            compareCockpitInterface(frame, stem),
            compareSteererClamp(frame, stem),
        )
    }

    // ステムとハンドルの組み合わせ
    if (hasCategoryPair(candidateCategory, selectedCategory, ["stem", "handlebar"])) {
        const handlebar = candidateCategory === "handlebar" ? candidate : selectedPart

        // 一体型ハンドルはステムを置き換えるため、クランプ径ではなくカテゴリー排他で処理
        if (isIntegratedHandlebar(handlebar)) {
            return null
        }

        return compareHandlebarClamp(candidate, selectedPart)
    }

    return null
}

// タイヤとチューブのサイズを比較
function compareTireAndTube(
    tire: CompatibilityInput,
    tube: CompatibilityInput,
): PairCompatibilityResult {
    const tireDiameter = getSpecification(tire, "wheel_diameter")
    const tubeDiameter = getSpecification(tube, "wheel_diameter")
    const tireWidth = Number(getSpecification(tire, "tire_width_mm"))
    const minWidth = Number(getSpecification(tube, "min_tire_width_mm"))
    const maxWidth = Number(getSpecification(tube, "max_tire_width_mm"))

    // サイズ情報が不足している場合は未確認にする
    if (
        !tireDiameter ||
        !tubeDiameter ||
        !Number.isFinite(tireWidth) ||
        !Number.isFinite(minWidth) ||
        !Number.isFinite(maxWidth)
    ) {
        // 規格不足は安全側に倒し、適合と断定せず利用者へ確認を促す
        return {
            status: "unknown",
            reasons: ["タイヤとチューブのサイズ情報が不足しています"],
        }
    }

    // ホイール径の不一致
    if (tireDiameter !== tubeDiameter) {
        return {
            status: "incompatible",
            reasons: [`ホイール径が一致しません（${tireDiameter} / ${tubeDiameter}）`],
        }
    }

    // チューブの対応幅の外
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

// フレームのタイヤクリアランスとタイヤ幅を比較
// 一致ではなく「最大幅以下か」で判定するため、一致ルールとは別に扱う
function compareFrameAndTire(
    frame: CompatibilityInput,
    tire: CompatibilityInput,
): PairCompatibilityResult | null {
    const maxWidthValue = getSpecification(frame, "max_tire_width_mm")
    const tireWidthValue = getSpecification(tire, "tire_width_mm")

    // フレームの最大幅・タイヤ幅が無い
    if (!maxWidthValue && !tireWidthValue) {
        return null
    }

    const maxWidth = Number(maxWidthValue)
    const tireWidth = Number(tireWidthValue)

    // 数値でない（未登録を含む）
    if (!Number.isFinite(maxWidth) || !Number.isFinite(tireWidth) || !maxWidthValue || !tireWidthValue) {
        return {
            status: "unknown",
            reasons: ["フレームの対応タイヤ幅が未確認です"],
        }
    }

    // フレームの最大幅を超える
    if (tireWidth > maxWidth) {
        // フレームは構成の基準なので、入らないタイヤはフレームを維持したまま選べない扱いにする
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

// 複数ルールの判定結果を1つにまとめる
// 同じ組み合わせに規格が複数ある場合(段数と変速方式など)、最も重い結果を採用し、理由はすべて残す
function combinePairResults(
    results: PairCompatibilityResult[],
): PairCompatibilityResult | null {
    // 比較した結果が無い
    if (results.length === 0) {
        return null
    }

    // 最も重い結果を採用
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

// 一致ルール1件分の判定。両方の規格が未登録ならnullを返す
function compareByEqualityRule(
    rule: EqualityRule,
    candidate: CompatibilityInput,
    candidateCategory: string,
    selected: CompatibilityInput,
    selectedCategory: string,
): PairCompatibilityResult | null {
    const candidateValue = getSpecification(candidate, rule.specificationKey)
    const selectedValue = getSpecification(selected, rule.specificationKey)

    // 比較する規格値がどちらも未登録
    if (!candidateValue && !selectedValue) {
        return null
    }

    // 規格名と両側の値は、すべての判定結果で同じ形で表示用に添える
    const createDetails = (status: CompatibilityStatus): CompatibilityDetail[] => [{
        label: rule.label,
        status,
        specificationKey: rule.specificationKey,
        candidateValue,
        selectedValue,
    }]

    // 比較する規格値がどちらか未登録
    if (!candidateValue || !selectedValue) {
        // 登録漏れで未確認を出さない規格は、判定そのものを行わない
        if (rule.missingBehavior === "ignore") {
            return null
        }

        return {
            status: "unknown",
            reasons: [`${rule.label}が未確認です`],
            details: createDetails("unknown"),
        }
    }

    // 数値規格の表記ゆれを吸収した比較用の値（数値でなければnull）
    const candidateComparable = rule.numeric
        ? normalizeNumericSpecificationValue(candidateValue)
        : candidateValue
    const selectedComparable = rule.numeric
        ? normalizeNumericSpecificationValue(selectedValue)
        : selectedValue

    // 数値規格が数値でない
    if (candidateComparable === null || selectedComparable === null) {
        return {
            status: "unknown",
            reasons: [`${rule.label}が未確認です`],
            details: createDetails("unknown"),
        }
    }

    // 許容差つきの数値規格（チェーンラインなど）
    if (rule.toleranceMm !== undefined) {
        // 両側の数値
        const firstNumber = Number(candidateValue)
        const secondNumber = Number(selectedValue)

        // 数値でない場合は未確認として扱う
        if (!Number.isFinite(firstNumber) || !Number.isFinite(secondNumber)) {
            return {
                status: "unknown",
                reasons: [`${rule.label}が未確認です`],
                details: createDetails("unknown"),
            }
        }

        // 差が許容範囲内なら適合
        if (Math.abs(firstNumber - secondNumber) <= rule.toleranceMm) {
            return {
                status: "compatible",
                reasons: [
                    `${rule.label}が適合します（差${Math.abs(firstNumber - secondNumber).toFixed(1)}mm）`,
                ],
                details: createDetails("compatible"),
            }
        }

        // 差が大きい場合は調整範囲の確認を促す
        return {
            status: "unknown",
            reasons: [
                `${rule.label}が離れています（差${Math.abs(firstNumber - secondNumber).toFixed(1)}mm）。調整範囲を確認してください`,
            ],
            details: createDetails("unknown"),
        }
    }

    // 比較する規格値が一致
    if (specificationValuesMatch(candidateComparable, selectedComparable)) {
        return {
            status: "compatible",
            reasons: [`${rule.label}が適合します`],
            details: createDetails("compatible"),
        }
    }

    // 保護カテゴリーを維持したまま選べない
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

// 上限ルール1件分の判定。上限と実値のどちらも未登録ならnullを返す
function compareByLimitRule(
    rule: LimitRule,
    candidate: CompatibilityInput,
    candidateCategory: string,
    selected: CompatibilityInput,
): PairCompatibilityResult | null {
    // 候補側が上限値を持つか（持たなければ選択済み側が上限値を持つ）
    const candidateIsLimit = candidateCategory === rule.limitCategory
    // 上限値を持つパーツ
    const limitPart = candidateIsLimit ? candidate : selected
    // 実値を持つパーツ
    const actualPart = candidateIsLimit ? selected : candidate
    // 上限値の規格値
    const limitValueText = getSpecification(limitPart, rule.limitSpecificationKey)
    // 実値の規格値
    const actualValueText = getSpecification(actualPart, rule.actualSpecificationKey)

    // 上限と実値のどちらも未登録
    if (!limitValueText && !actualValueText) {
        return null
    }

    // 候補側の表示用規格値（候補が上限側なら上限値）
    const candidateValue = candidateIsLimit
        ? getSpecification(candidate, rule.limitSpecificationKey)
        : getSpecification(candidate, rule.actualSpecificationKey)
    // 選択済み側の表示用規格値（選択済みが上限側なら上限値）
    const selectedValue = candidateIsLimit
        ? getSpecification(selected, rule.actualSpecificationKey)
        : getSpecification(selected, rule.limitSpecificationKey)

    // 規格名と両側の値は、すべての判定結果で同じ形で表示用に添える
    const createDetails = (status: CompatibilityStatus): CompatibilityDetail[] => {
        // 上限と実値が同じ規格、または実値側の表示名が無い場合は1件にまとめる
        if (
            rule.limitSpecificationKey === rule.actualSpecificationKey ||
            rule.actualLabel === undefined
        ) {
            return [{
                label: rule.label,
                status,
                specificationKey: rule.limitSpecificationKey,
                candidateValue,
                selectedValue,
            }]
        }

        // 上限と実値が別の規格なら、それぞれの値を分けて示す
        const limitPart = candidateIsLimit ? candidate : selected
        const actualPart = candidateIsLimit ? selected : candidate

        return [
            {
                label: rule.label,
                status,
                specificationKey: rule.limitSpecificationKey,
                candidateValue: candidateIsLimit
                    ? getSpecification(limitPart, rule.limitSpecificationKey)
                    : undefined,
                selectedValue: candidateIsLimit
                    ? undefined
                    : getSpecification(limitPart, rule.limitSpecificationKey),
            },
            {
                label: rule.actualLabel ?? rule.label,
                status,
                specificationKey: rule.actualSpecificationKey,
                candidateValue: candidateIsLimit
                    ? undefined
                    : getSpecification(actualPart, rule.actualSpecificationKey),
                selectedValue: candidateIsLimit
                    ? getSpecification(actualPart, rule.actualSpecificationKey)
                    : undefined,
            },
        ]
    }

    // 任意の上限が未登録なら、この組み合わせは判定しない
    if (rule.optionalLimit && !limitValueText) {
        return null
    }

    // 上限と実値の片方だけ未登録
    if (!limitValueText || !actualValueText) {
        // 登録漏れで未確認を出さない規格は、判定そのものを行わない
        if (rule.missingBehavior === "ignore") {
            return null
        }

        return {
            status: "unknown",
            reasons: [`${rule.label}が未確認です`],
            details: createDetails("unknown"),
        }
    }

    // 上限値（数値として扱う）
    const limitValue = Number(limitValueText)
    // 実値（数値として扱う）
    const actualValue = Number(actualValueText)

    // 上限値か実値が数値でない
    if (!Number.isFinite(limitValue) || !Number.isFinite(actualValue)) {
        return {
            status: "unknown",
            reasons: [`${rule.label}が未確認です`],
            details: createDetails("unknown"),
        }
    }

    // 実値が上限以下
    if (actualValue <= limitValue) {
        return {
            status: "compatible",
            reasons: [`${rule.label}が適合します`],
            details: createDetails("compatible"),
        }
    }

    // 実値が上限を超える
    // 実値側の名前がある場合は、どちらが大きいかを読み違えない文にする
    const reason = rule.actualLabel
        ? `${rule.actualLabel}${actualValue}${rule.unit}が${rule.label}${limitValue}${rule.unit}を超えています${rule.note ? `（${rule.note}）` : ""}`
        : `${rule.label}が上限を超えています（上限${limitValue}${rule.unit} / 実値${actualValue}${rule.unit}${rule.note ? `・${rule.note}` : ""}）`

    return {
        status: "incompatible",
        reasons: [reason],
        details: createDetails("incompatible"),
    }
}

// 範囲ルール1件分の判定。対応範囲と実値のどちらも未登録ならnullを返す
function compareByRangeRule(
    rule: RangeRule,
    candidate: CompatibilityInput,
    candidateCategory: string,
    selected: CompatibilityInput,
): PairCompatibilityResult | null {
    // 候補側が対応範囲を持つか（持たなければ選択済み側が対応範囲を持つ）
    const candidateIsRange = candidateCategory === rule.rangeCategory
    // 対応範囲を持つパーツ
    const rangePart = candidateIsRange ? candidate : selected
    // 実値を持つパーツ
    const actualPart = candidateIsRange ? selected : candidate
    // 対応範囲の下限
    const minValueText = getSpecification(rangePart, rule.minSpecificationKey)
    // 対応範囲の上限
    const maxValueText = getSpecification(rangePart, rule.maxSpecificationKey)
    // 実値
    const actualValueText = getSpecification(actualPart, rule.actualSpecificationKey)

    // 対応範囲と実値のどちらも未登録
    if (!minValueText && !maxValueText && !actualValueText) {
        return null
    }

    // 対応範囲を下限〜上限の1つの表示用の値にまとめる
    const rangeText = minValueText && maxValueText
        ? `${minValueText}〜${maxValueText}${rule.unit}`
        : undefined

    // 規格名と両側の値は、すべての判定結果で同じ形で表示用に添える
    const createDetails = (status: CompatibilityStatus): CompatibilityDetail[] => [
        {
            label: rule.actualLabel,
            status,
            specificationKey: rule.actualSpecificationKey,
            candidateValue: candidateIsRange ? undefined : actualValueText,
            selectedValue: candidateIsRange ? actualValueText : undefined,
        },
        {
            label: rule.label,
            status,
            candidateValue: candidateIsRange ? rangeText : undefined,
            selectedValue: candidateIsRange ? undefined : rangeText,
        },
    ]

    // 実値が未登録
    if (!actualValueText) {
        return createMissingResult(rule.missingBehavior, rule.actualLabel, createDetails)
    }

    // 対応範囲の下限・上限がそろっていない
    if (!minValueText || !maxValueText) {
        return createMissingResult(rule.missingBehavior, rule.label, createDetails)
    }

    // 対応範囲と実値の数値
    const minValue = Number(minValueText)
    const maxValue = Number(maxValueText)
    const actualValue = Number(actualValueText)

    // 対応範囲か実値が数値でない
    if (
        !Number.isFinite(minValue) ||
        !Number.isFinite(maxValue) ||
        !Number.isFinite(actualValue)
    ) {
        return {
            status: "unknown",
            reasons: [`${rule.label}が未確認です`],
            details: createDetails("unknown"),
        }
    }

    // 実値が対応範囲の外
    // 推奨範囲は目安で、実使用できる場合があるため非互換にはせず注意として示す
    if (actualValue < minValue || actualValue > maxValue) {
        return {
            status: "unknown",
            reasons: [
                `${rule.actualLabel}${actualValue}${rule.unit}は${rule.label}${minValue}〜${maxValue}${rule.unit}の推奨範囲外です`,
            ],
            details: createDetails("unknown"),
        }
    }

    return {
        status: "compatible",
        reasons: [
            `${rule.actualLabel}${actualValue}${rule.unit}は${rule.label}${minValue}〜${maxValue}${rule.unit}の範囲内です`,
        ],
        details: createDetails("compatible"),
    }
}

// 非互換の組み合わせ1件分の判定。どちらの規格も未登録ならnullを返す
function compareByIncompatibilityRule(
    rule: IncompatibilityRule,
    candidate: CompatibilityInput,
    candidateCategory: string,
    selected: CompatibilityInput,
): PairCompatibilityResult | null {
    // 候補側が1つ目の値を持つか（持たなければ選択済み側が1つ目の値を持つ）
    const candidateIsFirst = candidateCategory === rule.firstCategory
    // 1つ目の値を持つパーツ
    const firstPart = candidateIsFirst ? candidate : selected
    // 2つ目の値を持つパーツ
    const secondPart = candidateIsFirst ? selected : candidate
    // 1つ目の規格値
    const firstValueText = getSpecification(firstPart, rule.firstSpecificationKey)
    // 2つ目の規格値
    const secondValueText = getSpecification(secondPart, rule.secondSpecificationKey)

    // どちらの規格も未登録
    if (!firstValueText && !secondValueText) {
        return null
    }

    // 規格名と両側の値は、すべての判定結果で同じ形で表示用に添える
    const createDetails = (status: CompatibilityStatus): CompatibilityDetail[] => [
        {
            label: rule.firstLabel,
            status,
            specificationKey: rule.firstSpecificationKey,
            candidateValue: candidateIsFirst ? firstValueText : undefined,
            selectedValue: candidateIsFirst ? undefined : firstValueText,
        },
        {
            label: rule.secondLabel,
            status,
            specificationKey: rule.secondSpecificationKey,
            candidateValue: candidateIsFirst ? undefined : secondValueText,
            selectedValue: candidateIsFirst ? secondValueText : undefined,
        },
    ]

    // 1つ目の規格が未登録
    if (!firstValueText) {
        return {
            status: "unknown",
            reasons: [`${rule.firstLabel}が未確認です`],
            details: createDetails("unknown"),
        }
    }

    // 2つ目の規格が未登録
    if (!secondValueText) {
        return {
            status: "unknown",
            reasons: [`${rule.secondLabel}が未確認です`],
            details: createDetails("unknown"),
        }
    }

    // 非互換になる値の組み合わせ（2つ目の規格はカンマ区切りで複数指定できる）
    if (
        firstValueText === rule.firstValue &&
        rule.secondValue.split(",").map((value) => value.trim())
            .includes(secondValueText)
    ) {
        return {
            status: "incompatible",
            reasons: [rule.reason],
            details: createDetails("incompatible"),
        }
    }

    // 装着できる組み合わせは、この規格では判定しない（他のルールに委ねる）
    if (rule.skipWhenNotMatched) {
        return null
    }

    // 非互換の組み合わせ以外は適合
    return {
        status: "compatible",
        reasons: [`${rule.firstLabel}と${rule.secondLabel}が適合します`],
        details: createDetails("compatible"),
    }
}

// 規格ごとの詳細を持たない判定結果に、規格名だけの詳細を補う
// コックピットやカテゴリーの占有のように、値の一致では表せない判定で使う
function withSummaryDetail(
    result: PairCompatibilityResult,
    label: string,
): PairCompatibilityResult {
    // 内訳があればそのまま返す
    if (result.details && result.details.length > 0) {
        return result
    }

    return {
        ...result,
        details: [{label, status: result.status}],
    }
}

// 2パーツ間の規格判定。対象カテゴリーの組み合わせがなければnullを返す
export function compareParts(
    candidate: CompatibilityInput,
    candidateCategory: string,
    selected: CompatibilityInput,
    selectedCategory: string,
): PairCompatibilityResult | null {
    const candidateBlocksSelectedCategory = blocksCategory(candidate, selectedCategory)
    const selectedBlocksCandidateCategory = blocksCategory(selected, candidateCategory)

    // どちらかがカテゴリーを占有
    if (candidateBlocksSelectedCategory || selectedBlocksCandidateCategory) {
        // 一体型パーツや付属コックピットとの二重選択を拒否
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

    // コックピットの判定結果
    if (cockpitResult) {
        return withSummaryDetail(cockpitResult, "コックピット")
    }

    // タイヤとチューブの組み合わせ
    if (hasCategoryPair(candidateCategory, selectedCategory, ["tire", "inner_tube"])) {
        const tire = candidateCategory === "tire" ? candidate : selected
        const tube = candidateCategory === "inner_tube" ? candidate : selected

        return withSummaryDetail(compareTireAndTube(tire, tube), "タイヤサイズ")
    }

    // フレームとタイヤの組み合わせ
    if (hasCategoryPair(candidateCategory, selectedCategory, ["frame", "tire"])) {
        const frame = candidateCategory === "frame" ? candidate : selected
        const tire = candidateCategory === "tire" ? candidate : selected

        const result = compareFrameAndTire(frame, tire)

        // 比較対象なし
        if (!result) {
            return null
        }

        // 値は単位つきで整形済みのため、規格キーを付けずに表示
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

    // 該当する一致ルールをすべて評価し、結果をまとめる
    const ruleResults: PairCompatibilityResult[] = []

    for (const rule of EQUALITY_RULES) {
        // 対象外の組み合わせ
        if (!hasCategoryPair(candidateCategory, selectedCategory, rule.categories)) {
            continue
        }

        // 機械式ブレーキには油種が無いため、フルードの比較をしない
        if (
            rule.specificationKey === "brake_fluid" &&
            isMechanicalBrakePair(candidate, selected)
        ) {
            continue
        }

        // キャリパーを同梱しないコンポセットは、パッド形状を持たないため比較しない
        // パッドの適合はキャリパー側のルールで判定する
        if (
            rule.specificationKey === "pad_family" &&
            isGroupsetPairWithoutCaliper(
                candidate,
                candidateCategory,
                selected,
                selectedCategory,
            )
        ) {
            continue
        }

        const result = compareByEqualityRule(
            rule,
            candidate,
            candidateCategory,
            selected,
            selectedCategory,
        )

        // 評価した結果を配列へ追加
        if (result) {
            ruleResults.push(result)
        }
    }

    // 該当する上限ルールをすべて評価し、一致ルールの結果へまとめる
    for (const rule of LIMIT_RULES) {
        // 対象外の組み合わせ
        if (!hasCategoryPair(candidateCategory, selectedCategory, rule.categories)) {
            continue
        }

        // 上限ルール1件分の判定結果
        const result = compareByLimitRule(
            rule,
            candidate,
            candidateCategory,
            selected,
        )

        // 評価した結果を配列へ追加
        if (result) {
            ruleResults.push(result)
        }
    }

    // 該当する範囲ルールをすべて評価し、一致ルールの結果へまとめる
    for (const rule of RANGE_RULES) {
        // 対象外の組み合わせ
        if (!hasCategoryPair(candidateCategory, selectedCategory, rule.categories)) {
            continue
        }

        // 範囲ルール1件分の判定結果
        const result = compareByRangeRule(
            rule,
            candidate,
            candidateCategory,
            selected,
        )

        // 評価した結果を配列へ追加
        if (result) {
            ruleResults.push(result)
        }
    }

    // 該当する非互換ルールをすべて評価し、一致ルールの結果へまとめる
    for (const rule of INCOMPATIBILITY_RULES) {
        // 対象外の組み合わせ
        if (!hasCategoryPair(candidateCategory, selectedCategory, rule.categories)) {
            continue
        }

        // 非互換ルール1件分の判定結果
        const result = compareByIncompatibilityRule(
            rule,
            candidate,
            candidateCategory,
            selected,
        )

        // 評価した結果を配列へ追加
        if (result) {
            ruleResults.push(result)
        }
    }

    return combinePairResults(ruleResults)
}



// どちらかが機械式ブレーキの組み合わせか判定する
function isMechanicalBrakePair(
    candidate: CompatibilityInput,
    selected: CompatibilityInput,
): boolean {
    // 片側でも機械式と分かれば油種の比較は不要
    return getSpecification(candidate, "brake_actuation") === "mechanical" ||
        getSpecification(selected, "brake_actuation") === "mechanical"
}

// キャリパーを同梱しないコンポセットとブレーキパッドの組み合わせか判定する

function isGroupsetPairWithoutCaliper(
    candidate: CompatibilityInput,
    candidateCategory: string,
    selected: CompatibilityInput,
    selectedCategory: string,
): boolean {
    // コンポセット側のパーツ
    const groupset = candidateCategory === "groupset"
        ? candidate
        : selectedCategory === "groupset"
            ? selected
            : null
    // パッド側のパーツ
    const pad = candidateCategory === "brake_pad"
        ? candidate
        : selectedCategory === "brake_pad"
            ? selected
            : null

    if (!groupset || !pad) {
        return false
    }

    // パッド形状を持つセットは従来どおり比較する
    if (getSpecification(groupset, "pad_family")) {
        return false
    }

    // キャリパーを同梱しないセットは、パッドとの比較対象外
    return !blocksCategory(groupset, "brake_caliper")
}

// 構成全体の非互換・未確認

export type CompatibilityIssue = {
    slotKeys: string[] // 問題が起きているスロットキー
    partIds: number[] // 問題が起きているパーツID
    reasons: string[] // 問題の理由（画面・APIに表示する文章）
    status: "incompatible" | "unknown" // 問題の種類（非互換 | 未確認）
}

// スロットキーから取付位置を求める
function partPositionFromSlotKey(slotKey: string): "single" | "front" | "rear" {
    const position = slotKey.split(":")[1]

    return position === "front" || position === "rear"
        ? position
        : "single"
}

// スロットキーからカテゴリーを求める
function categoryKeyFromSlotKey(slotKey: string) {
    const separatorIndex = slotKey.indexOf(":")

    return separatorIndex === -1
        ? slotKey
        : slotKey.slice(0, separatorIndex)
}

// 対応位置(allowed_position)とスロット位置の食い違い理由を返す
// 前輪・後輪専用パーツを反対側へ置けないようにするため、単一枠は判定しない
function findPositionMismatchReason(
    slotKey: string,
    part: CompatibilityInput,
): string | null {
    const allowedPosition = getSpecification(part, "allowed_position")

    // 前輪専用・後輪専用の規格が無ければ位置の判定をしない
    if (allowedPosition !== "front" && allowedPosition !== "rear") {
        return null
    }

    const slotPosition = partPositionFromSlotKey(slotKey)

    // 前後位置の無い単一枠は、専用品の対応位置と食い違うとは限らない
    if (slotPosition === "single" || slotPosition === allowedPosition) {
        return null
    }

    // 対応位置とスロット位置の表示名（前輪・後輪）
    const allowedLabel = allowedPosition === "front" ? "前輪" : "後輪"
    const slotLabel = slotPosition === "front" ? "前輪" : "後輪"

    return `${allowedLabel}専用の製品のため、${slotLabel}には取り付けられません`
}

// 前後位置の比較対象か判定
export function appliesToPosition(targetSlotKey: string, selectedSlotKey: string) {
    // 単一枠は前後共通、前後枠は同じ位置だけを比較
    const targetPosition = partPositionFromSlotKey(targetSlotKey)
    const selectedPosition = partPositionFromSlotKey(selectedSlotKey)

    return (
        targetPosition === "single" ||
        selectedPosition === "single" ||
        targetPosition === selectedPosition
    )
}

// 構成全体の規格不一致・規格未確認を、重複なしで一覧化
export function findCompatibilityIssues(
    parts: {slotKey: string; part: CompatibilityInput & {id: number}}[],
): CompatibilityIssue[] {
    const issues = new Map<string, CompatibilityIssue>()

    for (const {slotKey, part} of parts) {
        // 対応位置とスロット位置の食い違い理由（食い違いなしはnull）
        const positionMismatchReason = findPositionMismatchReason(slotKey, part)

        // 対応位置がスロット位置と合う
        if (!positionMismatchReason) {
            continue
        }

        // 同じスロット・理由の位置問題は一度だけ登録する
        issues.set(`${slotKey}::${positionMismatchReason}`, {
            slotKeys: [slotKey],
            partIds: [part.id],
            reasons: [positionMismatchReason],
            status: "incompatible",
        })
    }

    for (const [index, candidate] of parts.entries()) {
        for (const selected of parts.slice(index + 1)) {
            // 前後位置が対象外
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

            // 適合、または判定が無い
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

            // 同じパーツ組み合わせの結果は、重要度の高い方を残す
            // 重い順: 非互換 > 未確認
            const statusRank = {unknown: 2, incompatible: 3} as const

            if (!existing || statusRank[result.status] > statusRank[existing.status]) {
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
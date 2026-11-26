import {
    appliesToPosition,
    compareParts,
    findCompatibilityIssues,
    getFrameCockpitStatus,
} from "../../../../shared/part-compatibility-core"
import type {
    CompatibilityDetail,
    CompatibilityStatus,
    FrameCockpitStatus,
} from "../../../../shared/part-compatibility-core"
import {
    getPartSlotCategoryKey,
    type PartSlot,
} from "@/features/simulator/partSlots"
import {getPartDisplayName} from "@/features/simulator/partDisplay"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"
import type {Part} from "@/types/part"

// フレームのコックピット状態を画面から使えるよう再公開
export {getFrameCockpitStatus}
// 規格ごとの判定結果の型を再公開
export type {CompatibilityDetail}

// 適合判定の相手となった選択済みパーツと、その結果。
// 「どのパーツに対して非互換なのか」をUIで示すために保持する。
export type CompatibilityCounterpart = {
    slotKey: string // 相手パーツのスロットキー
    partName: string // 相手パーツの表示名
    status: CompatibilityStatus // 相手との判定結果
    reasons: string[] // 判定理由の文章
    details: CompatibilityDetail[] // 規格ごとの判定結果(表示で状態別にまとめるために使う)
}

// 候補パーツ1件の適合判定結果
export type CompatibilityResult = {
    status: CompatibilityStatus // 総合の判定結果
    reasons: string[] // 判定理由の文章
    counterparts: CompatibilityCounterpart[] // 比較した相手パーツと結果
    conflictingSlotKeys: string[] // 解除が必要な選択枠
    selectionBlocked: boolean // フレームとの不一致で選択自体を止めるか
}

// フレームの行に出すバッジ。コックピットの状態と、重量に含む範囲を表す。
export type FrameBadge = {
    label: string // バッジの文言
    className: string // バッジの配色クラス
}

// コックピット状態別のバッジ（配色クラスと代替文言）
const FRAME_COCKPIT_BADGES: Record<
    Exclude<FrameCockpitStatus, "unknown">,
    { className: string; fallback: string }
> = {
    included: {
        className: "border-emerald-300 bg-emerald-50 text-emerald-700",
        fallback: "コックピット付属",
    },
    dedicated: {
        className: "border-amber-300 bg-amber-50 text-amber-700",
        fallback: "専用コックピット必須",
    },
    open: {
        className: "border-violet-300 bg-violet-50 text-violet-700",
        fallback: "オープン規格対応",
    },
    standard: {
        className: "border-sky-300 bg-sky-50 text-sky-700",
        fallback: "1-1/8標準コラム",
    },
}

// フレーム行に出すコックピット状態のバッジ
export function getFrameCockpitBadge(part: Part): FrameBadge | null {
    // フレームのコックピット状態
    const status = getFrameCockpitStatus(part)

    // 規格未確認(unknown)やフレーム以外はバッジを表示しない。
    if (!status || status === "unknown") {
        return null
    }

    const badge = FRAME_COCKPIT_BADGES[status] // コックピット状態に対応するバッジ定義
    const cockpitInterface = part.specifications?.cockpit_interface // フレームのコックピット規格
    const interfaceLabel = cockpitInterface // コックピット規格の日本語表示名
        ? getSpecificationValueLabel("cockpit_interface", cockpitInterface)
        : null

    // 付属は規格名も併記し、標準付属か専用付属かを区別できるようにする。
    const label = status === "included" && interfaceLabel
        ? `コックピット付属（${interfaceLabel}）`
        : interfaceLabel ?? badge.fallback

    return { label, className: badge.className }
}

// フレームの重量がフロントフォークを含むことを示すバッジ。
// フレームはフォークとセットで売られるため、重量を比べる前に範囲が分かるようにする。
export function getFrameWeightBadge(part: Part): FrameBadge | null {
    // フレーム以外には重量範囲バッジを出さない
    if (part.categoryKey !== "frame") {
        return null
    }

    // 重量の範囲が未登録のフレームにはバッジを出さない(未確認を付属扱いしない)。
    if (part.specifications?.weight_scope !== "frame_and_fork") {
        return null
    }

    // 非公式・別条件の値は、公式の値と混ざらないよう「参考値」と併記する。
    if (part.specifications?.weight_source === "reference") {
        return {
            label: "フォーク込み・参考値",
            className: "border-amber-300 bg-amber-50 text-amber-700",
        }
    }

    return {
        label: "フォーク込み",
        className: "border-slate-300 bg-slate-50 text-slate-600",
    }
}

// 規格キーの日本語表示名
const SPECIFICATION_LABELS: Record<string, string> = {
    allowed_position: "対応位置",
    bb_standard: "BB規格",
    brake_actuation: "ブレーキ方式",
    brake_fluid: "ブレーキフルード",
    brake_mount: "ブレーキマウント",
    chain_standard: "チェーン規格",
    chainline_mm: "チェーンライン",
    chainring_count: "チェーンリング枚数",
    cleat_system: "クリート規格",
    cockpit_connection: "コックピット接続方式",
    cockpit_interface: "コックピット規格",
    cockpit_replaceable: "コックピット交換可否",
    cockpit_system: "コックピットシステム",
    crank_spindle: "クランク軸規格",
    drivetrain_speed: "対応段数",
    freehub_body: "フリーボディ",
    fork_weight_g: "フロントフォーク重量",
    frame_weight_g: "フレーム重量",
    front_axle: "フロントアクスル",
    steerer_clamp_mm: "コラムクランプ径",
    handlebar_clamp_mm: "ハンドルクランプ径",
    max_chainring_teeth: "最大チェーンリング歯数",
    max_rotor_diameter_mm: "対応ローター径",
    max_sprocket_teeth: "最大スプロケット歯数",
    max_tire_width_mm: "対応タイヤ幅（最大）",
    min_tire_width_mm: "対応タイヤ幅（最小）",
    package_unit: "販売単位",
    pad_family: "パッド形状",
    rotor_diameter_mm: "ローター径",
    rotor_mount: "ローター取付方式",
    saddle_rail: "サドルレール規格",
    seatpost_diameter_mm: "シートポスト径",
    shift_system: "変速方式",
    steerer_standard: "コラム規格",
    tire_width_mm: "タイヤ幅",
    weight_scope: "重量の範囲",
    weight_source: "重量の出典",
    wheel_diameter: "ホイール径",
}

// API内部キーを候補表で読める日本語へ変換する。

// 規格値の日本語表示名（APIキー→表示名）
const SPECIFICATION_VALUE_LABELS: Record<string, string> = {
    "12x100": "12x100mm（スルーアクスル）",
    "6_bolt": "6ボルト",
    alloy_7mm: "アロイ 7mm",
    argon_atten_chb_01: "Argon 18 ATTEN CHB-01専用",
    bmc_ics: "BMC ICS対応",
    bb30: "BB30",
    bb30a: "BB30A",
    bb386: "BB386",
    bb86: "BB86",
    bb90: "BB90",
    bb92: "BB92",
    bbright: "Cervélo BBRight",
    campagnolo: "Campagnolo",
    campagnolo_n3w: "Campagnolo N3W",
    campagnolo_protech: "Campagnolo Pro-Tech",
    campagnolo_ultra_torque: "Campagnolo Ultra-Torque",
    carbon_7x9: "カーボン 7×9mm",
    carbon_7x9_3: "カーボン 7×9.3mm",
    carbon_7x9_6: "カーボン 7×9.6mm",
    canyon_cp0018: "Canyon CP0018専用",
    cannondale_delta: "Cannondale Delta Steerer対応",
    cannondale_knot: "Cannondale KNOT対応",
    cervelo_s5_hb19: "Cervélo S5 HB19専用",
    colnago_cc01: "Colnago CC.01対応",
    corratec_cct_icr: "Corratec CCT ICR専用",
    deda_dcr: "Deda DCR",
    dot_4: "DOT 4",
    dot_5_1: "DOT 5.1",
    center_lock: "センターロック",
    crankbrothers: "Crankbrothers",
    campagnolo_db310: "Campagnolo DB-310形状",
    dub: "SRAM DUB",
    electronic_wired: "有線電動",
    electronic_wireless: "無線電動",
    either: "一体型／ステム式対応",
    felt_gravel_integrated: "Felt Gravel一体型専用",
    factor_ostro_vam: "Factor OSTRO VAM対応",
    focus_cis: "FOCUS C.I.S.対応",
    fsa_acr: "FSA ACR対応",
    flat_mount: "フラットマウント",
    official: "メーカー公式",
    reference: "参考値（非公式・別条件）",
    frame_and_fork: "フレーム＋フロントフォーク",
    front: "前輪専用",
    hollowtech_ii: "Shimano HOLLOWTECH II",
    hydraulic: "油圧",
    hope_rx4: "HOPE RX4形状",
    integrated_only: "一体型コックピット専用",
    italian: "イタリアンねじ切り",
    look_keo: "LOOK KEO",
    look_aero_combo: "LOOK Aero Combo対応",
    basso_sv_fuga: "Basso SV Fuga専用",
    bianchi_oltre_rc: "Bianchi Oltre RC専用",
    bianchi_specialissima_rc: "Bianchi Specialissima RC対応",
    bsa: "BSA（ねじ切り）",
    cube_litening_c68x: "CUBE Litening C:68X専用",
    mechanical: "機械式",
    mineral_oil: "ミネラルオイル",
    pair: "前後セット",
    pf30: "PF30",
    pf30a: "PF30A",
    post_mount: "ポストマウント",
    praxis_m30: "Praxis M30",
    rear: "後輪専用",
    rotor_30: "Rotor 30mm",
    shimano_hg: "Shimano HG",
    shimano_k_type: "Shimano Kタイプ",
    shimano_micro_spline: "Shimano マイクロスプライン",
    shimano_road_flat_mount: "Shimano ロード用フラットマウント形状",
    shimano_spd: "Shimano SPD",
    shimano_spd_sl: "Shimano SPD-SL",
    single: "1個単位",
    sram_xdr: "SRAM XDR",
    sram_gxp: "SRAM GXP",
    sram_flattop: "SRAM Flattop",
    sram_xd: "SRAM XD",
    sram_road_axs: "SRAM Road AXS形状",
    standard_1_1_8: "1-1/8標準コラム",
    straight_1_1_4: "1-1/4インチ（ストレート）",
    straight_1_1_8: "1-1/8インチ（ストレート）",
    tapered_1_1_4_1_1_5: "1-1/4→1.5インチ（テーパー）",
    tapered_1_1_8_1_1_4: "1-1/8→1-1/4インチ（テーパー）",
    tapered_1_1_8_1_3_8: "1-1/8→1-3/8インチ（テーパー）",
    tapered_1_1_8_1_5: "1-1/8→1.5インチ（テーパー）",
    stem: "ステム式",
    giant_overdrive_aero: "Giant OverDrive Aero専用",
    orbea_icr: "Orbea ICR対応",
    pardus_robin_evo: "Pardus Robin EVO専用",
    pinarello_ticr: "Pinarello TiCR対応",
    scott_addict_ic: "Scott Addict iC専用",
    scott_foil_ic: "Scott Foil iC専用",
    t45: "T45（82.5mm）",
    t47_68: "T47 68mm",
    t47_73: "T47 73mm",
    t47_85_5: "T47 85.5mm",
    t47a: "T47A（76.75mm）",
    time_iclic: "TIME ICLIC",
    trp_hyrd: "TRP HY/RD形状",
    trp_spyre: "TRP Spyre形状",
    trek_madone_gen7: "Trek Madone Gen 7対応",
    van_rysel_rcr_f: "Van Rysel RCR-F専用",
    wilier_filante: "Wilier Filante対応",
    wilier_verticale: "Wilier Verticale専用",
    winspace_m6: "Winspace M6専用",
    xelius_drs: "Lapierre Xelius DRS専用",
}

// 判定対象のカテゴリーキー（旧データはスロットキーから補完）
function getCategoryKey(part: Part, slotKey: string) {
    // APIにcategoryKeyがない旧データでも、スロットキーから判定対象を補完する。
    return part.categoryKey ?? getPartSlotCategoryKey(slotKey)
}

// 真偽値(true/false)で持つ規格は、キーごとに日本語へ置き換える。
const BOOLEAN_SPECIFICATION_LABELS: Record<string, Record<string, string>> = {
    cockpit_replaceable: {true: "交換可", false: "交換不可"},
}

// 規格キーと値の組み合わせで決まる表示名
const SPECIFICATION_VALUE_LABELS_BY_KEY: Record<
    string,
    Record<string, string>
> = {
    chainring_count: {
        "1": "1x（シングル）",
        "2": "2x（ダブル）",
        "3": "3x（トリプル）",
    },
}

// 規格キーの日本語表示名（未知のキーはAPIキーを返す）
export function getSpecificationLabel(key: string) {
    // 未知の規格キーも捨てず、APIキーをフォールバック表示する。
    return SPECIFICATION_LABELS[key] ?? key
}

// 規格値の日本語表示名（カンマ区切りと単位に対応）
export function getSpecificationValueLabel(key: string, value: string) {
    // 単一値もカンマ区切りも同じ経路で日本語化し、mm系とg系だけ単位を補う。
    const label = (single: string) => {
        // 真偽値の規格は「true」ではなく日本語で示す
        const booleanLabel = BOOLEAN_SPECIFICATION_LABELS[key]?.[single]

        // 真偽値の規格なら日本語の表示名を返す
        if (booleanLabel) {
            return booleanLabel
        }

        // キーの接尾辞から決まる単位
        const unit = key.endsWith("_mm") ? "mm" : key.endsWith("_g") ? "g" : ""

        // キー固有の表示名（例: チェーンリング枚数の 1→1x）
        const keyedLabel = SPECIFICATION_VALUE_LABELS_BY_KEY[key]?.[single]

        return keyedLabel ?? SPECIFICATION_VALUE_LABELS[single] ?? `${single}${unit}`
    }

    return value.split(",").map((part) => label(part.trim())).filter(Boolean).join("／")
}

// 重量の内訳(フレーム＋フロントフォーク)。画面で「1,133g」の下に「(755g + 378g)」と示すために使う。
// 内訳が未登録のフレームでは null を返し、合計だけを表示する。
export function getWeightBreakdown(part: Part): string | null {
    // フォーク込みの重量でなければ内訳を出さない
    if (part.specifications?.weight_scope !== "frame_and_fork") {
        return null
    }

    // フレーム単体の重量
    const frameWeight = part.specifications?.frame_weight_g
    // フロントフォーク単体の重量
    const forkWeight = part.specifications?.fork_weight_g

    // 内訳が未登録なら合計だけを表示
    if (!frameWeight || !forkWeight) {
        return null
    }

    // 数字と単位の並びなので、記号は半角で揃えて幅を一定にする。
    return `${frameWeight}g + ${forkWeight}g`
}

// パーツの販売単位（未登録は単品）
export function getPartPackageUnit(part: Part) {
    // 販売単位が欠損した旧データは単品として扱う。
    return part.specifications?.package_unit ?? "single"
}

// 合計の内訳に表示する付属品1件
export type TotalsIncludedItem = {
    name: string // 付属品名
    quantity: number // 数量
    unitWeight: number // 1個あたりの重量（g）
    totalWeight: number // 数量込みの重量（g）
    unitPrice: number | null // 1個あたりの参考価格（円）
    totalPrice: number | null // 数量込みの参考価格（円）
    sourcePartName: string // 付属品を同梱するパーツ名
    categoryKey: string | null // 装着先のカテゴリー
    isSetComponent: boolean // セット構成品か
}

// 合計金額・完成重量の内訳
export type TotalsBreakdown = {
    totalPrice: number // 合計金額（円）
    totalWeight: number // 完成重量（g）
    basePrice: number // パーツ本体の価格合計（円）
    baseWeight: number // パーツ本体の重量合計（g）
    includedItems: TotalsIncludedItem[] // 合計へ重量を加算する付属品
    setComponents: TotalsIncludedItem[] // セット重量に含まれる構成品
    excludedItems: TotalsIncludedItem[] // カテゴリーなしで加算しない付属品
    referencePrices: TotalsIncludedItem[] // 合計へ加算しない参考価格
}

// 選択済みパーツの合計と内訳を一度に求める
export function getTotalsBreakdown(
    selectedParts: SelectedParts,
): TotalsBreakdown {
    // 前後スロットに同じペア商品が入っていても、価格・重量を一度だけ加算する
    const countedPairIds = new Set<number>()
    // パーツ本体の価格合計（円）
    let basePrice = 0
    // パーツ本体の重量合計（g）
    let baseWeight = 0
    // 加算対象の付属品重量（g）
    let includedWeight = 0
    // 合計へ重量を加算する付属品
    const includedItems: TotalsIncludedItem[] = []
    // セット重量に含まれる構成品
    const setComponents: TotalsIncludedItem[] = []
    // カテゴリーなしで加算しない付属品
    const excludedItems: TotalsIncludedItem[] = []
    // 参考価格として表示する付属品
    const referencePrices: TotalsIncludedItem[] = []

    for (const part of Object.values(selectedParts)) {
        // ペア商品は前後のスロットで二重に加算しない
        if (getPartPackageUnit(part) === "pair") {
            // 集計済みのペア商品なら加算しない
            if (countedPairIds.has(part.id)) {
                continue
            }

            countedPairIds.add(part.id)
        }

        basePrice += part.price
        baseWeight += part.weight

        for (const item of part.includedItems ?? []) {
            // 数量込みの重量と参考価格
            const totalWeight = item.quantity * item.weight
            const totalPrice = item.price != null
                ? item.quantity * item.price
                : null
            // 内訳に表示する1件分
            const entry: TotalsIncludedItem = {
                name: item.name,
                quantity: item.quantity,
                unitWeight: item.weight,
                totalWeight,
                unitPrice: item.price ?? null,
                totalPrice,
                sourcePartName: part.name,
                categoryKey: item.categoryKey,
                isSetComponent: Boolean(item.isSetComponent),
            }

            // 装着先があり、セット構成品でない付属品は重量を加算する
            if (item.categoryKey !== null && !item.isSetComponent) {
                includedItems.push(entry)
                includedWeight += totalWeight
            // セット構成品はセット本体の重量に含まれる
            } else if (item.isSetComponent) {
                setComponents.push(entry)
            } else {
                // 装着先が決まらない付属品は合計へ加算しない
                excludedItems.push(entry)
            }

            // 参考価格は合計金額へ加算せず、内訳にだけ表示する
            if (totalPrice !== null) {
                referencePrices.push(entry)
            }
        }
    }

    return {
        totalPrice: basePrice,
        totalWeight: baseWeight + includedWeight,
        basePrice,
        baseWeight,
        includedItems,
        setComponents,
        excludedItems,
        referencePrices,
    }
}

// 選択済みパーツの価格と重量を合計
export function calculateSelectedPartsTotals(selectedParts: SelectedParts) {
    // 合計と内訳を同じ計算から返し、表示との食い違いを防ぐ
    const breakdown = getTotalsBreakdown(selectedParts)

    return {price: breakdown.totalPrice, weight: breakdown.totalWeight}
}

// カテゴリー付き付属品の重量を数量込みで合計する。価格は加算しない。
// セット構成品の重量はセット本体の重量に含まれるため、二重計算しないよう除外する。
export function sumIncludedItemsWeight(part: Part): number {
    return (part.includedItems ?? [])
        .filter((item) => item.categoryKey !== null)
        .filter((item) => !item.isSetComponent)
        .reduce((total, item) => total + item.quantity * item.weight, 0)
}

// 候補パーツを選択状態と比較し、判定結果をまとめる
export function evaluatePartCompatibility(
    candidate: Part,
    targetSlot: PartSlot,
    selectedParts: SelectedParts,
): CompatibilityResult | null {
    const reasons: string[] = [] // 候補パーツを現在の選択状態と比較し、理由・解除対象・選択可否をまとめて返す。
    const counterparts: CompatibilityCounterpart[] = [] // 比較した相手パーツと結果を蓄積し、非互換の原因をUIで特定できるようにする。
    const conflictingSlotKeys = new Set<string>() // 解除対象として集める選択枠
    let hasRelevantSelection = false // 比較対象の規格を持つ相手がいたか
    let hasUnknown = false // 未確認の判定が含まれるか
    let hasCompatible = false // 互換の判定が含まれるか
    let selectionBlocked = false // フレームとの不一致で選択を止めるか
    const allowedPosition = candidate.specifications?.allowed_position // 候補の対応位置（前輪・後輪専用）

    // 前輪・後輪専用品を反対側へ登録できないよう止める
    if (
        allowedPosition &&
        targetSlot.position !== "single" &&
        allowedPosition !== targetSlot.position
    ) {
        // 前輪・後輪専用品を反対側へ登録できないよう、候補表示の段階で選択を止める。
        return {
            status: "incompatible",
            reasons: [`${getSpecificationValueLabel("allowed_position", allowedPosition)}の製品です`],
            counterparts: [],
            conflictingSlotKeys: [],
            selectionBlocked: true,
        }
    }

    for (const [selectedSlotKey, selectedPart] of Object.entries(selectedParts)) {
        // 同じスロット自身は比較せず、別位置にある関連パーツだけを適合判定する。
        if (selectedSlotKey === targetSlot.key || !appliesToPosition(targetSlot.key, selectedSlotKey)) {
            continue
        }

        // 候補のカテゴリーキー
        const candidateCategory = candidate.categoryKey ?? targetSlot.categoryKey
        // 選択済みパーツのカテゴリーキー
        const selectedCategory = getCategoryKey(selectedPart, selectedSlotKey)

        // ペア間の規格判定は候補選択と保存APIで共通のコアへ委ねる。
        // 候補と選択済みパーツ1件の判定結果
        const result = compareParts(
            candidate,
            candidateCategory,
            selectedPart,
            selectedCategory,
        )

        // 比較対象の規格が無ければ判定を続けない
        if (!result) {
            continue
        }

        hasRelevantSelection = true
        reasons.push(...result.reasons)
        // どの選択済みパーツに対する結果かを記録する。
        counterparts.push({
            slotKey: selectedSlotKey,
            partName: getPartDisplayName(selectedPart),
            status: result.status,
            reasons: result.reasons,
            details: result.details ?? [],
        })

        // 非互換ならフレームは選択を止め、他のパーツは解除対象にする
        if (result.status === "incompatible") {
            // フレームは基準パーツ。基準(フレーム)と合わない候補は選択を止める。
            // それ以外の競合は、該当する選択済みパーツを解除対象にする。
            if (selectedCategory === "frame") {
                selectionBlocked = true
            } else {
                conflictingSlotKeys.add(selectedSlotKey)
            }
        // 未確認の相手がいれば未確認として扱う
        } else if (result.status === "unknown") {
            hasUnknown = true
        } else {
            hasCompatible = true
        }
    }

    // 選択を止める不一致や解除対象があれば非互換
    if (selectionBlocked || conflictingSlotKeys.size > 0) {
        // 保護対象の不一致や解除が必要な競合は、候補行を非互換として表示する。
        return {
            status: "incompatible",
            reasons,
            counterparts,
            conflictingSlotKeys: Array.from(conflictingSlotKeys),
            selectionBlocked,
        }
    }

    // 比較対象が無ければ適合バッジを付けない
    if (!hasRelevantSelection) {
        // 比較対象の規格がない候補には、誤って適合バッジを付けない。
        return null
    }

    return {
        status: hasUnknown ? "unknown" : hasCompatible ? "compatible" : "unknown",
        reasons,
        counterparts,
        conflictingSlotKeys: [],
        selectionBlocked: false,
    }
}

// 選択済み構成から検出した規格の問題
export type SelectedPartsCompatibilityIssue = {
    status: "unknown" | "incompatible" // 問題の種類（未確認・非互換）
    reasons: string[] // 判定理由の文章
    slotKeys: string[] // 問題のあるスロットキー
}

// 選択済み構成を候補選択時と同じ規格ルールで再評価
export function evaluateSelectedPartsCompatibility(
    selectedParts: SelectedParts,
): SelectedPartsCompatibilityIssue[] {
    return findCompatibilityIssues(
        Object.entries(selectedParts).map(([slotKey, part]) => ({
            slotKey,
            part,
        })),
    ).map((issue) => ({
        status: issue.status,
        reasons: issue.reasons,
        slotKeys: issue.slotKeys,
    }))
}
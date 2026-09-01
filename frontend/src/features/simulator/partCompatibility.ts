import {
    appliesToPosition,
    compareParts,
    findCompatibilityIssues,
    getFrameCockpitStatus,
} from "../../../../shared/part-compatibility-core"
import type {
    CompatibilityStatus,
} from "../../../../shared/part-compatibility-core"
import {
    getPartSlotCategoryKey,
    type PartSlot,
} from "@/features/simulator/partSlots"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"
import type {Part} from "@/types/part"

export {getFrameCockpitStatus}

export type CompatibilityResult = {
    status: CompatibilityStatus
    reasons: string[]
    conflictingSlotKeys: string[]
    selectionBlocked: boolean
}

const SPECIFICATION_LABELS: Record<string, string> = {
    allowed_position: "対応位置",
    bb_standard: "BB規格",
    brake_mount: "ブレーキマウント",
    cleat_system: "クリート規格",
    cockpit_connection: "コックピット接続方式",
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
    bmc_ics: "BMC ICS対応",
    bb386: "BB386",
    bb86: "BB86",
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
    corratec_cct_icr: "Corratec CCT ICR対応",
    center_lock: "センターロック",
    campagnolo_db310: "Campagnolo DB-310形状",
    dub: "SRAM DUB",
    electronic_wireless: "無線電動",
    either: "一体型／ステム式対応",
    felt_gravel_integrated: "Felt Gravel一体型専用",
    factor_ostro_vam: "Factor OSTRO VAM対応",
    focus_cis: "FOCUS C.I.S.対応",
    fsa_acr: "FSA ACR対応",
    flat_mount: "フラットマウント",
    front: "前輪専用",
    hollowtech_ii: "Shimano HOLLOWTECH II",
    hope_rx4: "HOPE RX4形状",
    integrated_only: "一体型コックピット専用",
    look_keo: "LOOK KEO",
    look_aero_combo: "LOOK Aero Combo専用",
    basso_sv_fuga: "Basso SV Fuga専用",
    bianchi_oltre_rc: "Bianchi Oltre RC専用",
    bianchi_specialissima_rc: "Bianchi Specialissima RC対応",
    cube_litening_c68x: "CUBE Litening C:68X専用",
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
    stem: "ステム式",
    giant_overdrive_aero: "Giant OverDrive Aero専用",
    orbea_icr: "Orbea ICR対応",
    pardus_robin_evo: "Pardus Robin EVO対応",
    pinarello_ticr: "Pinarello TiCR対応",
    scott_addict_ic: "Scott Addict iC対応",
    scott_foil_ic: "Scott Foil iC専用",
    t47_85_5: "T47 85.5mm",
    t47a: "T47A（76.75mm）",
    time_iclic: "TIME ICLIC",
    trp_hyrd: "TRP HY/RD形状",
    trp_spyre: "TRP Spyre形状",
    trek_madone_gen7: "Trek Madone Gen 7対応",
    van_rysel_rcr_f: "Van Rysel RCR-F専用",
    wilier_filante: "Wilier Filante対応",
    wilier_verticale: "Wilier Verticale対応",
    winspace_m6: "Winspace M6対応",
    xelius_drs: "Lapierre Xelius DRS専用",
}

function getCategoryKey(part: Part, slotKey: string) {
    // APIにcategoryKeyがない旧データでも、スロットキーから判定対象を補完する。
    return part.categoryKey ?? getPartSlotCategoryKey(slotKey)
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
    const allowedPosition = candidate.specifications?.allowed_position

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
        if (selectedSlotKey === targetSlot.key || !appliesToPosition(targetSlot.key, selectedSlotKey)) {
            continue
        }

        const candidateCategory = candidate.categoryKey ?? targetSlot.categoryKey
        const selectedCategory = getCategoryKey(selectedPart, selectedSlotKey)

        // ペア間の規格判定は候補選択と保存APIで共通のコアへ委ねる。
        const result = compareParts(
            candidate,
            candidateCategory,
            selectedPart,
            selectedCategory,
        )

        if (!result) {
            continue
        }

        hasRelevantSelection = true
        reasons.push(...result.reasons)

        if (result.status === "incompatible") {
            // フレームは基準パーツとして維持し、候補側が非互換なら選択を止める。
            if (candidateCategory === "frame" || selectedCategory === "frame") {
                selectionBlocked = true
            } else {
                conflictingSlotKeys.add(selectedSlotKey)
            }
        } else if (result.status === "unknown") {
            hasUnknown = true
        } else {
            hasCompatible = true
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
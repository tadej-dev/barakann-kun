#!/usr/bin/env node
// マスターデータの欠落・不整合を検出する監査スクリプト。
// 目的:
//   フレーム登録で「付属品の登録漏れ」や「重量0」が混ざるのを防ぐ。
//   マイグレーション適用後に `npm run master:audit` で実行する。
// 失敗にするもの(exit 1):
//   1. 存在しない part_id・category_id を参照する規格・同梱品・占有行
//   2. 同じ (part_id, spec_key) の規格の重複(UNIQUE制約があるため防御的検査)
//   3. 同じ (part_id, category_id) の占有の重複(主キーがあるため防御的検査)
//   4. 規格キーごとの値域・語彙の逸脱(例: brake_actuation は hydraulic/mechanical のみ)
//   5. カテゴリーで許可されていない規格キー(例: フレームに brake_actuation)
//   6. 自身のカテゴリを占有・同梱する自己参照
//   7. フレームの同梱品で重量が0以下のもの(0は登録しない方針)
//   8. 判定に必要な規格(チェーンリング枚数・ブレーキマウント)の欠落
//   9. 重量にフロントフォークを含むフレームの内訳・出典の欠落と合計不一致
//   10. 同じプラットフォーム内で専用パーツの付属品の有無が不揃い
//   11. フレームの占有カテゴリに同梱品がない(ハンドル・ステムは1組)
// 通知だけにするもの(exit 0):
//   1. フレーム以外の占有カテゴリに対応する同梱品がない(一覧を表示)
//   2. フロントフォークの規格が未登録のフレーム(件数のみ)
//   3. 重量の範囲が未登録のフレーム(件数のみ)
// 使い方(api ディレクトリで): npm run master:audit

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// 同梱の有無を比較する対象カテゴリー(category_id)。
// 9(BB)・16(ハンドル)・17(ステム)・19(シートポスト)で、プラットフォーム間の揃いを判定する。
const COMPONENT_BLOCK_CATEGORIES = new Set([9, 16, 17, 19]);

// ハンドル(16)・ステム(17)のカテゴリーID。
// 一体型があり、どちらかの同梱品でもう片方の占有も満たす
const COCKPIT_CATEGORY_IDS = new Set([16, 17]);

// 判定に使うため欠落を失敗にする規格(カテゴリーキー・規格キー・表示名)
const REQUIRED_SPECS = [
    // クランクセット
    {category: "crankset", key: "chainring_count", label: "チェーンリング枚数"},
    // フロントディレイラー
    {category: "front_derailleur", key: "chainring_count", label: "チェーンリング枚数"},
    // コンポセット
    {category: "groupset", key: "chainring_count", label: "チェーンリング枚数"},
    // ブレーキキャリパー
    {category: "brake_caliper", key: "brake_mount", label: "ブレーキマウント"},
];

// 単一の許可語彙を表す検査定義
function vocabulary(values) {
    return {kind: "vocabulary", values};
}

// カンマ区切りで複数指定できる許可語彙を表す検査定義
function vocabularyList(values) {
    return {kind: "vocabulary_list", values};
}

// 単一の正の整数を表す検査定義
function positiveInteger() {
    return {kind: "positive_integer"};
}

// カンマ区切りの正の整数を表す検査定義
function positiveIntegerList() {
    return {kind: "positive_integer_list"};
}

// ホイール径として許可する値（700Cと29、650Bと27.5は同じ径の別表記）
export const WHEEL_DIAMETER_VALUES = ["650B", "27.5", "700C", "29"];

// 規格キーごとの値域・語彙の検査定義
// kind: "vocabulary" は単一の許可語彙、"vocabulary_list" はカンマ区切りの許可語彙、
//       "positive_integer" は正の整数、
//       "positive_integer_list" はカンマ区切りの正の整数、
//       "integer_range" は範囲内の整数
const SPEC_VALUE_RULES = new Map([
    // 対応位置(前輪・後輪・前後セット)
    ["allowed_position", vocabulary(["front", "rear", "pair"])],
    // BB規格
    [
        "bb_standard",
        vocabulary([
            "bb30",
            "bb30a",
            "bb386",
            "bb86",
            "bb90",
            "bb92",
            "bbright",
            "bsa",
            "italian",
            "pf30",
            "t47_68",
            "t47_73",
            "t47_85_5",
            "t47a",
        ]),
    ],
    // ブレーキの駆動方式
    ["brake_actuation", vocabulary(["hydraulic", "mechanical"])],
    // ブレーキフルード
    ["brake_fluid", vocabulary(["dot_4", "dot_5_1", "mineral_oil"])],
    // ブレーキマウント
    ["brake_mount", vocabulary(["flat_mount", "post_mount"])],
    // チェーン規格(1本で複数規格に対応する場合がある)
    ["chain_standard", vocabularyList(["campagnolo", "shimano_hg", "sram_flattop"])],
    // クリート規格
    [
        "cleat_system",
        vocabulary([
            "crankbrothers",
            "look_keo",
            "shimano_spd",
            "shimano_spd_sl",
            "time_iclic",
        ]),
    ],
    // コックピットの接続方式
    ["cockpit_connection", vocabulary(["either", "integrated_only"])],
    // コックピットの接続規格(メーカー独自規格を含む)
    [
        "cockpit_interface",
        vocabulary([
            "argon_atten_chb_01",
            "basso_sv_fuga",
            "bmc_ics",
            "cannondale_delta",
            "cervelo_s5_hb19",
            "colnago_cc01",
            "factor_ostro_vam",
            "fsa_acr",
            "giant_overdrive_aero",
            "look_aero_combo",
            "orbea_icr",
            "pinarello_ticr",
            "scott_addict_ic",
            "scott_foil_ic",
            "standard_1_1_8",
            "trek_madone_gen7",
            "wilier_filante",
            "wilier_verticale",
            "winspace_m6",
        ]),
    ],
    // コックピットの交換可否
    ["cockpit_replaceable", vocabulary(["true", "false"])],
    // コックピットの配線方式(1本で複数規格に対応する場合がある)
    [
        "cockpit_system",
        vocabularyList([
            "deda_dcr",
            "fsa_acr",
            "look_aero_combo",
            "orbea_icr",
            "standard_1_1_8",
        ]),
    ],
    // クランク軸規格
    [
        "crank_spindle",
        vocabulary([
            "campagnolo_protech",
            "campagnolo_ultra_torque",
            "dub",
            "hollowtech_ii",
            "praxis_m30",
            "rotor_30",
            "sram_gxp",
        ]),
    ],
    // フロントアクスル規格(1台で複数規格に対応する場合がある)
    ["front_axle", vocabularyList(["12x100", "15x110", "qr_100"])],
    // フリーボディ規格(1輪で複数規格に対応する場合がある)
    [
        "freehub_body",
        vocabularyList([
            "campagnolo_n3w",
            "shimano_hg",
            "shimano_micro_spline",
            "sram_xd",
            "sram_xdr",
        ]),
    ],
    // ブレーキパッドの種類
    [
        "pad_family",
        vocabulary([
            "campagnolo_db310",
            "hope_rx4",
            "shimano_k_type",
            "shimano_road_flat_mount",
            "sram_road_axs",
            "trp_hyrd",
            "trp_spyre",
        ]),
    ],
    // ペダルのねじ規格
    ["pedal_thread", vocabulary(["9_16_20tpi"])],
    // リアアクスル規格(1台で複数規格に対応する場合がある)
    ["rear_axle", vocabularyList(["12x142", "12x148", "qr_135"])],
    // リムとタイヤの接合方式
    ["rim_tire_interface", vocabulary(["hooked", "hookless"])],
    // ローターの取付方式
    ["rotor_mount", vocabulary(["6_bolt", "center_lock"])],
    // サドルレール規格(1本で複数規格に対応する場合がある)
    [
        "saddle_rail",
        vocabularyList(["alloy_7mm", "carbon_7x9", "carbon_7x9_3", "carbon_7x9_6"]),
    ],
    // 変速方式
    [
        "shift_system",
        vocabulary(["mechanical", "electronic_wired", "electronic_wireless"]),
    ],
    // ステアラ規格(メーカー独自規格を含む)
    [
        "steerer_standard",
        vocabulary([
            "bmc_ics",
            "cannondale_delta",
            "giant_overdrive_aero",
            "straight_1_1_4",
            "straight_1_1_8",
            "tapered_1_1_4_1_1_5",
            "tapered_1_1_8_1_3_8",
            "tapered_1_1_8_1_5",
        ]),
    ],
    // タイヤのビード
    ["tire_bead", vocabulary(["tube_type", "tubeless", "tubular"])],
    // ホイール径(700Cと29、650Bと27.5は同じ径の別表記)
    ["wheel_diameter", vocabulary(WHEEL_DIAMETER_VALUES)],
    // 重量の範囲(フレーム単体・フロントフォーク込み)
    ["weight_scope", vocabulary(["frame_only", "frame_and_fork"])],
    // 重量の出典
    ["weight_source", vocabulary(["official", "reference"])],
    // チェーンリング枚数(1x〜3x)
    ["chainring_count", {kind: "integer_range", min: 1, max: 3}],
    // 対応段数(1製品で複数段数に対応する場合がある)
    ["drivetrain_speed", positiveIntegerList()],
    // 最大チェーンリング歯数
    ["max_chainring_teeth", positiveInteger()],
    // 最大スプロケット歯数
    ["max_sprocket_teeth", positiveInteger()],
    // フレーム単体の重量(g)
    ["frame_weight_g", positiveInteger()],
    // フロントフォークの重量(g)
    ["fork_weight_g", positiveInteger()],
]);

// カテゴリーごとに許可する規格キー(実データのDISTINCTから起こす)
export const CATEGORY_SPEC_KEYS = new Map([
    // フレーム
    [
        "frame",
        new Set([
            "bb_shell_width_mm",
            "bb_standard",
            "brake_mount",
            "cockpit_connection",
            "cockpit_interface",
            "cockpit_replaceable",
            "cockpit_system",
            "fork_weight_g",
            "frame_weight_g",
            "front_axle",
            "handlebar_clamp_mm",
            "max_rotor_diameter_mm",
            "max_tire_width_mm",
            "rear_axle",
            "seat_tube_depth_mm",
            "seatpost_diameter_mm",
            "steerer_standard",
            "weight_scope",
            "weight_source",
            "wheel_diameter",
        ]),
    ],
    // コンポセット
    [
        "groupset",
        new Set([
            "chainring_count",
            "crank_spindle",
            "drivetrain_speed",
            "freehub_body",
            "pad_family",
            "shift_system",
        ]),
    ],
    // シフトレバー(ブレーキ一体型)
    [
        "shift_brake_lever",
        new Set([
            "brake_actuation",
            "brake_fluid",
            "control_clamp_mm",
            "drivetrain_speed",
            "shift_system",
        ]),
    ],
    // フロントディレイラー
    [
        "front_derailleur",
        new Set([
            "chainline_mm",
            "chainring_count",
            "drivetrain_speed",
            "max_chainring_teeth",
            "shift_system",
        ]),
    ],
    // リアディレイラー
    [
        "rear_derailleur",
        new Set([
            "chain_standard",
            "drivetrain_speed",
            "max_sprocket_teeth",
            "shift_system",
        ]),
    ],
    // クランクセット
    [
        "crankset",
        new Set([
            "chain_standard",
            "chainline_mm",
            "chainring_count",
            "crank_spindle",
            "drivetrain_speed",
            "max_chainring_teeth",
            "pedal_thread",
        ]),
    ],
    // カセット
    [
        "cassette",
        new Set(["chain_standard", "drivetrain_speed", "freehub_body", "max_sprocket_teeth"]),
    ],
    // チェーン
    ["chain", new Set(["chain_standard", "drivetrain_speed"])],
    // ボトムブラケット
    ["bottom_bracket", new Set(["bb_shell_width_mm", "bb_standard", "crank_spindle"])],
    // ブレーキキャリパー
    [
        "brake_caliper",
        new Set([
            "brake_actuation",
            "brake_fluid",
            "brake_mount",
            "max_rotor_diameter_mm",
            "pad_family",
        ]),
    ],
    // ブレーキパッド
    ["brake_pad", new Set(["pad_family"])],
    // ディスクローター
    ["disc_rotor", new Set(["rotor_diameter_mm", "rotor_mount"])],
    // ホイール
    [
        "wheel",
        new Set([
            "freehub_body",
            "front_axle",
            "rear_axle",
            "rim_inner_width_mm",
            "rim_tire_interface",
            "rotor_mount",
            "wheel_diameter",
        ]),
    ],
    // タイヤ
    [
        "tire",
        new Set([
            "allowed_position",
            "max_rim_inner_width_mm",
            "min_rim_inner_width_mm",
            "tire_bead",
            "tire_width_mm",
            "wheel_diameter",
        ]),
    ],
    // チューブ
    ["inner_tube", new Set(["max_tire_width_mm", "min_tire_width_mm", "wheel_diameter"])],
    // ハンドル
    [
        "handlebar",
        new Set([
            "cockpit_interface",
            "cockpit_system",
            "control_clamp_mm",
            "handlebar_clamp_mm",
            "steerer_clamp_mm",
        ]),
    ],
    // ステム
    [
        "stem",
        new Set(["cockpit_interface", "handlebar_clamp_mm", "steerer_clamp_mm"]),
    ],
    // バーテープ(規格なし)
    ["bar_tape", new Set()],
    // シートポスト
    [
        "seatpost",
        new Set(["saddle_rail", "seatpost_diameter_mm", "seatpost_min_insert_mm"]),
    ],
    // サドル
    ["saddle", new Set(["saddle_rail"])],
    // ペダル
    ["pedal", new Set(["cleat_system", "pedal_thread"])],
]);

// 監査に必要なSELECT文
// SQLの実行部分と分けるため、単体テストからも同じSQLを使えるよう定義を公開する
export const AUDIT_QUERIES = {
    // パーツ本体(カテゴリーキーはcategoriesから引く)
    parts: "SELECT id, brand_id, category_id, name, model_name, weight FROM parts ORDER BY id;",
    // カテゴリー(パーツ・占有・同梱品の参照先確認に使う)
    categories: "SELECT id, key FROM categories ORDER BY id;",
    // 専用パーツが占有するカテゴリー
    blockedCategories:
        "SELECT part_id, category_id FROM part_blocked_categories ORDER BY part_id, category_id;",
    // 同梱品(付属品・セット構成品)
    includedItems:
        "SELECT part_id, item_name, included_category_id, weight FROM part_included_items" +
        " ORDER BY id;",
    // パーツの規格
    specifications:
        "SELECT part_id, spec_key, spec_value FROM part_specifications ORDER BY id;",
};

// ローカルD1に SELECT を投げ、結果行を返す。
function query(sql) {
    const out = execFileSync(
        "npx",
        ["wrangler", "d1", "execute", "DB", "--local", "--json", "--command", sql],
        {
            cwd: apiDir,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            maxBuffer: 256 * 1024 * 1024,
        },
    );
    return JSON.parse(out.slice(out.indexOf("[")))[0].results;
}

// ローカルD1から監査に必要な行を読み込む
function loadAuditData() {
    return {
        parts: query(AUDIT_QUERIES.parts),
        categories: query(AUDIT_QUERIES.categories),
        blockedCategories: query(AUDIT_QUERIES.blockedCategories),
        includedItems: query(AUDIT_QUERIES.includedItems),
        specifications: query(AUDIT_QUERIES.specifications),
    };
}

// カテゴリーIDからキーを引ける表を作る
function createCategoryKeyMap(categories) {
    return new Map(categories.map((category) => [category.id, category.key]));
}

// パーツIDからパーツ行を引ける表を作る
function createPartMap(parts) {
    return new Map(parts.map((part) => [part.id, part]));
}

// パーツごとの規格を、規格キーから値へ引ける表にまとめる
function createSpecsByPart(specifications) {
    const specsByPart = new Map();

    for (const row of specifications) {
        // パーツごとの表をまだ作っていなければ作る
        if (!specsByPart.has(row.part_id)) {
            specsByPart.set(row.part_id, new Map());
        }
        specsByPart.get(row.part_id).set(row.spec_key, row.spec_value);
    }

    return specsByPart;
}

// パーツごとの占有カテゴリーIDをまとめる
function createBlockedCategoryMap(blockedCategories) {
    const blockedByPart = new Map();

    for (const row of blockedCategories) {
        // パーツごとの集合をまだ作っていなければ作る
        if (!blockedByPart.has(row.part_id)) {
            blockedByPart.set(row.part_id, new Set());
        }
        blockedByPart.get(row.part_id).add(row.category_id);
    }

    return blockedByPart;
}

// パーツごとの同梱品行をまとめる
function createIncludedItemsMap(includedItems) {
    const itemsByPart = new Map();

    for (const row of includedItems) {
        // パーツごとの配列をまだ作っていなければ作る
        if (!itemsByPart.has(row.part_id)) {
            itemsByPart.set(row.part_id, []);
        }
        itemsByPart.get(row.part_id).push(row);
    }

    return itemsByPart;
}

// パーツ名とIDを表示用にまとめる(パーツ行がない場合はIDだけ)
function partLabel(part, partId) {
    // 削除済み・未登録のパーツはIDだけで表示
    if (part === undefined) return `part ${partId}`;
    return `${part.name}(id ${part.id})`;
}

// カンマ区切りの値を配列にする(前後の空白を除く)
function splitValues(value) {
    return value.split(",").map((piece) => piece.trim());
}

// 数値として読める値か確かめる
function isNumericValue(value) {
    // 空文字はNumber()で0になるため、数値として扱わない
    if (value === "") return false;
    return Number.isFinite(Number(value));
}

// カンマ区切りの各値がすべて数値か確かめる
function isNumericList(value) {
    return splitValues(value).every(isNumericValue);
}

// 整数か確かめる
function isIntegerValue(value) {
    // 小数点を含む値は整数として扱わない
    return isNumericValue(value) && Number.isInteger(Number(value));
}

// カンマ区切りの各値がすべて整数か確かめる
function isIntegerList(value) {
    return splitValues(value).every(isIntegerValue);
}

// 正の整数か確かめる
function isPositiveIntegerValue(value) {
    return isIntegerValue(value) && Number(value) > 0;
}

// カンマ区切りの各値がすべて正の整数か確かめる
function isPositiveIntegerList(value) {
    return splitValues(value).every(isPositiveIntegerValue);
}

// カンマ区切りの各値がすべて正の数か確かめる
function isPositiveNumericList(value) {
    return splitValues(value).every(
        // 0以下の値は寸法・重量として不正
        (piece) => isNumericValue(piece) && Number(piece) > 0,
    );
}

// カンマ区切りの各値がすべて許可語彙に含まれるか確かめる
function isVocabularyList(value, allowedValues) {
    return splitValues(value).every((piece) => allowedValues.includes(piece));
}

// 規格値を検査し、逸脱していれば理由を返す(問題なしはnull)
function findSpecValueProblem(specification) {
    const value = specification.spec_value;

    // 寸法(mm)の規格は正の数(カンマ区切り可)だけを許可
    if (specification.spec_key.endsWith("_mm")) {
        // 数値でない寸法は画面の比較や範囲判定に使えない
        if (!isNumericList(value)) return "数値でない";
        // 0以下の寸法は実在しない
        if (!isPositiveNumericList(value)) return "正の数でない";
        return null;
    }

    const rule = SPEC_VALUE_RULES.get(specification.spec_key);
    // 検査定義のない規格キーは対象外
    if (rule === undefined) return null;

    // 単一の許可語彙から外れた値
    if (rule.kind === "vocabulary" && !rule.values.includes(value)) {
        return "既知の語彙にない";
    }

    // カンマ区切りの各値が許可語彙から外れた値
    if (rule.kind === "vocabulary_list" && !isVocabularyList(value, rule.values)) {
        return "既知の語彙にない";
    }

    // 正の整数でない値
    if (rule.kind === "positive_integer") {
        // 整数でない値は先に弾く
        if (!isIntegerValue(value)) return "整数でない";
        // 0以下の値は歯数・重量として不正
        if (!isPositiveIntegerValue(value)) return "正の整数でない";
    }

    // カンマ区切りの各値が正の整数でない値
    if (rule.kind === "positive_integer_list") {
        // 整数でない値は先に弾く
        if (!isIntegerList(value)) return "整数でない";
        // 0以下の値は段数として不正
        if (!isPositiveIntegerList(value)) return "正の整数でない";
    }

    // 値域から外れた整数
    if (rule.kind === "integer_range") {
        // 整数でない値は値域より先に弾く
        if (!isIntegerList(value)) return "整数でない";
        // 複数値でもすべて範囲内であることを確かめる
        for (const piece of splitValues(value)) {
            // 下限・上限の外にある値は不正
            if (Number(piece) < rule.min || Number(piece) > rule.max) {
                return `${rule.min}〜${rule.max}の範囲外`;
            }
        }
    }

    return null;
}

// 存在しない part_id・category_id を参照する行を失敗として集める
function collectMissingReferences(data) {
    const findings = [];
    const partIds = new Set(data.parts.map((part) => part.id));
    const categoryIds = new Set(data.categories.map((category) => category.id));

    for (const row of data.specifications) {
        // パーツが削除済み・未登録の規格行
        if (!partIds.has(row.part_id)) {
            findings.push(`[参照先なし] 規格 ${row.spec_key} の part ${row.part_id} が存在しない`);
        }
    }

    for (const row of data.blockedCategories) {
        // パーツが削除済み・未登録の占有行
        if (!partIds.has(row.part_id)) {
            findings.push(`[参照先なし] 占有行の part ${row.part_id} が存在しない`);
        }
        // カテゴリーが削除済み・未登録の占有行
        if (!categoryIds.has(row.category_id)) {
            findings.push(
                `[参照先なし] part ${row.part_id} の占有カテゴリ ${row.category_id} が存在しない`,
            );
        }
    }

    for (const row of data.includedItems) {
        // パーツが削除済み・未登録の同梱品行
        if (!partIds.has(row.part_id)) {
            findings.push(
                `[参照先なし] 同梱品「${row.item_name}」の part ${row.part_id} が存在しない`,
            );
        }
        // カテゴリーが削除済み・未登録の同梱品行(NULLはカテゴリー指定なし)
        if (row.included_category_id !== null && !categoryIds.has(row.included_category_id)) {
            findings.push(
                `[参照先なし] part ${row.part_id} の同梱品「${row.item_name}」` +
                    `のカテゴリ ${row.included_category_id} が存在しない`,
            );
        }
    }

    return findings;
}

// 同じ (part_id, spec_key) の規格の重複を失敗として集める
// DBのUNIQUE制約で通常は発生しないため、複製などに備えた防御的検査
function collectDuplicateSpecifications(specifications, partById) {
    const findings = [];
    const seen = new Set();

    for (const row of specifications) {
        const key = `${row.part_id}:${row.spec_key}`;
        // 2件目以降の同じ規格を指摘
        if (seen.has(key)) {
            findings.push(
                `[規格の重複] ${partLabel(partById.get(row.part_id), row.part_id)}` +
                    ` の ${row.spec_key} が重複`,
            );
        }
        seen.add(key);
    }

    return findings;
}

// 同じ (part_id, category_id) の占有の重複を失敗として集める
// DBの主キー制約で通常は発生しないため、複製などに備えた防御的検査
function collectDuplicateBlockedCategories(blockedCategories, partById) {
    const findings = [];
    const seen = new Set();

    for (const row of blockedCategories) {
        const key = `${row.part_id}:${row.category_id}`;
        // 2件目以降の同じ占有を指摘
        if (seen.has(key)) {
            findings.push(
                `[占有の重複] ${partLabel(partById.get(row.part_id), row.part_id)}` +
                    ` のカテゴリ ${row.category_id} の占有が重複`,
            );
        }
        seen.add(key);
    }

    return findings;
}

// パーツ自身のカテゴリを占有・同梱する自己参照を失敗として集める
function collectSelfReferences(partById, blockedCategories, includedItems) {
    const findings = [];

    for (const row of blockedCategories) {
        const part = partById.get(row.part_id);
        // パーツ行がない占有行は参照先なしの検査で報告する
        if (part === undefined) continue;
        // 自身のカテゴリを占有すると、そのカテゴリのパーツを選べなくなるだけ
        if (part.category_id === row.category_id) {
            findings.push(
                `[自己参照] ${partLabel(part, part.id)} が自身のカテゴリ ${row.category_id} を占有`,
            );
        }
    }

    for (const row of includedItems) {
        const part = partById.get(row.part_id);
        // パーツ行がない同梱品行は参照先なしの検査で報告する
        if (part === undefined) continue;
        // 自身のカテゴリを同梱すると、同じカテゴリが構成に二重で入る
        if (part.category_id === row.included_category_id) {
            findings.push(
                `[自己参照] ${partLabel(part, part.id)} が自身のカテゴリ` +
                    ` ${row.included_category_id} を同梱`,
            );
        }
    }

    return findings;
}

// フレームの同梱品で重量が0以下のものを失敗として集める
// セット構成品の重量0はセット本体に含める運用のため、フレーム付属品だけを対象にする
function collectFrameItemWeightIssues(frames, includedItems) {
    const findings = [];
    const frameIds = new Set(frames.map((frame) => frame.id));

    for (const row of includedItems) {
        // フレーム以外の同梱品は対象外
        if (!frameIds.has(row.part_id)) continue;
        // NULLは未調査、0以下は登録しない方針のため指摘
        if (row.weight !== null && row.weight <= 0) {
            findings.push(
                `[重量0] part ${row.part_id} の付属品「${row.item_name}」の weight が ${row.weight}`,
            );
        }
    }

    return findings;
}

// 規格値の語彙・値域の逸脱を失敗として集める
function collectSpecValueIssues(specifications, partById) {
    const findings = [];

    for (const row of specifications) {
        const part = partById.get(row.part_id);
        // 参照先のない規格は別の検査で報告する
        if (part === undefined) continue;

        const problem = findSpecValueProblem(row);
        // 問題のある規格値だけを指摘
        if (problem !== null) {
            findings.push(
                `[規格値が不正] ${part.name}(id ${part.id}) の` +
                    ` ${row.spec_key} が ${row.spec_value}(${problem})`,
            );
        }
    }

    return findings;
}

// カテゴリーごとの許可リストから外れた規格キーを失敗として集める
function collectUnexpectedSpecKeys(parts, categoryKeyById, specsByPart) {
    const findings = [];

    for (const part of parts) {
        const categoryKey = categoryKeyById.get(part.category_id);
        const allowedKeys = CATEGORY_SPEC_KEYS.get(categoryKey);
        // カテゴリー行がないパーツは参照先なしの検査で報告する
        if (allowedKeys === undefined) continue;

        for (const specKey of specsByPart.get(part.id)?.keys() ?? []) {
            // カテゴリーで使わない規格キーは判定・表示に使えない
            if (!allowedKeys.has(specKey)) {
                findings.push(
                    `[規格キーの逸脱] ${partLabel(part, part.id)} の ${specKey} は` +
                        `カテゴリ ${categoryKey} では未定義`,
                );
            }
        }
    }

    return findings;
}

// 判定に必要な規格が未登録のパーツを失敗として集める
function collectMissingRequiredSpecs(parts, categoryKeyById, specsByPart) {
    const findings = [];

    for (const requirement of REQUIRED_SPECS) {
        for (const part of parts) {
            // 対象カテゴリー以外は判定に使わない
            if (categoryKeyById.get(part.category_id) !== requirement.category) continue;

            const partSpecs = specsByPart.get(part.id) ?? new Map();
            // 未登録の規格は判定できないため指摘
            if (!partSpecs.has(requirement.key)) {
                findings.push(
                    `[判定用の規格なし] ${part.name}(id ${part.id})` +
                        ` は${requirement.label}(${requirement.key})が未登録`,
                );
            }
        }
    }

    return findings;
}

// 重量にフロントフォークを含むフレームの内訳・出典の欠落と合計不一致を失敗として集める
function collectWeightBreakdownIssues(frames, specsByPart) {
    const findings = [];

    for (const frame of frames) {
        const frameSpecs = specsByPart.get(frame.id) ?? new Map();
        // フロントフォーク込みの重量だけが内訳の対象
        if (frameSpecs.get("weight_scope") !== "frame_and_fork") continue;

        for (const key of ["frame_weight_g", "fork_weight_g", "weight_source"]) {
            // 内訳・出典が未登録なら合計の根拠を示せない
            if (!frameSpecs.has(key)) {
                findings.push(
                    `[重量の内訳なし] ${frame.name}(id ${frame.id})` +
                        ` は重量にフロントフォークを含むが、${key} が未登録`,
                );
            }
        }

        const frameWeight = Number(frameSpecs.get("frame_weight_g"));
        const forkWeight = Number(frameSpecs.get("fork_weight_g"));
        // 内訳が揃っていて合計が一致しないと画面の内訳表示が誤りになる
        if (
            Number.isFinite(frameWeight) &&
            Number.isFinite(forkWeight) &&
            frameWeight + forkWeight !== frame.weight
        ) {
            findings.push(
                `[内訳不一致] ${frame.name}(id ${frame.id}) の weight は ${frame.weight}` +
                    ` だが、内訳の合計は ${frameWeight + forkWeight}`,
            );
        }
    }

    return findings;
}

// 同じプラットフォーム内で付属品の有無が揃っていないフレームを失敗として集める
// モデル名の先頭2語(例: "Cannondale SuperSix")でグルーピングする。
// 標準規格のパーツを使う機種(占有カテゴリが無い)は、そもそも付属品が不要なため
// 比較対象から除く。専用パーツでカテゴリを占有している機種どうしでだけ揃いを見る。
function collectPlatformIssues(frames, blockedByPart, itemsByPart) {
    const findings = [];
    // プラットフォームを表すモデル名(先頭2語)
    const platformOf = (frame) => (frame.model_name ?? frame.name).split(" ").slice(0, 2).join(" ");
    // 専用パーツでコンポ系カテゴリーを占有しているか
    const occupiesComponentCategory = (frame) => {
        const blockedCategories = blockedByPart.get(frame.id) ?? new Set();
        return [...blockedCategories].some(
            (categoryId) => COMPONENT_BLOCK_CATEGORIES.has(categoryId),
        );
    };
    const platforms = new Map();

    for (const frame of frames) {
        // 専用パーツでカテゴリを占有しない機種は比較しない
        if (!occupiesComponentCategory(frame)) continue;
        const key = `${frame.brand_id}:${platformOf(frame)}`;
        // プラットフォームごとの配列をまだ作っていなければ作る
        if (!platforms.has(key)) {
            platforms.set(key, []);
        }
        platforms.get(key).push(frame);
    }

    for (const [key, group] of platforms) {
        // 比較対象が1機種だけなら不揃いにならない
        if (group.length < 2) continue;
        const withItems = group.filter((frame) => (itemsByPart.get(frame.id) ?? []).length > 0);
        const withoutItems = group.filter(
            (frame) => (itemsByPart.get(frame.id) ?? []).length === 0,
        );
        // 付属品がある機種と無い機種が混在すると登録漏れの可能性が高い
        if (withItems.length > 0 && withoutItems.length > 0) {
            const names = withoutItems.map((frame) => `${frame.name}(id ${frame.id})`).join(", ");
            findings.push(
                `[プラットフォーム不揃い] ${key.split(":")[1]}` +
                    ` で付属品がある機種と無い機種が混在: ${names}`,
            );
        }
    }

    return findings;
}

// 占有カテゴリに対応する同梱品がない行を集める
// フレームの欠落は失敗、フレーム以外は通知に振り分ける
function collectMissingIncludedItems(blockedByPart, itemsByPart, partById, frameIds) {
    const failures = [];
    const notices = [];

    for (const [partId, categoryIds] of blockedByPart) {
        const part = partById.get(partId);
        const itemCategoryIds = new Set(
            (itemsByPart.get(partId) ?? []).map((row) => row.included_category_id),
        );
        // 自身がハンドル・ステムのパーツは組の照合対象から外す
        const isCockpitPart = part !== undefined && COCKPIT_CATEGORY_IDS.has(part.category_id);

        for (const categoryId of categoryIds) {
            // 自身が属する組の占有は付属品の有無を照合しない
            if (isCockpitPart && COCKPIT_CATEGORY_IDS.has(categoryId)) continue;

            // ハンドル・ステムはどちらかの同梱品で組の占有を満たす
            const hasIncludedItem = COCKPIT_CATEGORY_IDS.has(categoryId)
                ? itemCategoryIds.has(16) || itemCategoryIds.has(17)
                : itemCategoryIds.has(categoryId);
            // 対応する同梱品があれば指摘しない
            if (hasIncludedItem) continue;

            const message =
                `[付属品なし] ${partLabel(part, partId)}` +
                ` はカテゴリ ${categoryId} を占有するが、対応する同梱品がない`;
            // フレームの欠落は完成車として成立しないため失敗にする
            if (frameIds.has(partId)) {
                failures.push(message);
            } else {
                notices.push(message);
            }
        }
    }

    return {failures, notices};
}

// フロントフォークの規格が未登録のフレームを集める
function collectFramesWithoutForkSpecs(frames, specsByPart) {
    return frames.filter((frame) => {
        const frameSpecs = specsByPart.get(frame.id) ?? new Map();
        // フロントフォーク込みの重量でなければフォーク規格は必須にしない
        if (frameSpecs.get("weight_scope") !== "frame_and_fork") return false;
        return !frameSpecs.has("steerer_standard") || !frameSpecs.has("front_axle");
    });
}

// 重量の範囲(フロントフォーク込みか)が未登録のフレームを集める
function collectFramesWithoutWeightScope(frames, specsByPart) {
    return frames.filter(
        (frame) => !(specsByPart.get(frame.id) ?? new Map()).has("weight_scope"),
    );
}

// マスターデータの行を受け取り、失敗・通知・進捗を返す(SQLは実行しない)
export function auditMasterData(data) {
    const categoryKeyById = createCategoryKeyMap(data.categories);
    const partById = createPartMap(data.parts);
    const specsByPart = createSpecsByPart(data.specifications);
    const blockedByPart = createBlockedCategoryMap(data.blockedCategories);
    const itemsByPart = createIncludedItemsMap(data.includedItems);
    const frames = data.parts.filter(
        (part) => categoryKeyById.get(part.category_id) === "frame",
    );
    const frameIds = new Set(frames.map((frame) => frame.id));
    const missingIncludedItems = collectMissingIncludedItems(
        blockedByPart,
        itemsByPart,
        partById,
        frameIds,
    );

    const failures = [
        ...collectMissingReferences(data),
        ...collectDuplicateSpecifications(data.specifications, partById),
        ...collectDuplicateBlockedCategories(data.blockedCategories, partById),
        ...collectSelfReferences(partById, data.blockedCategories, data.includedItems),
        ...collectFrameItemWeightIssues(frames, data.includedItems),
        ...collectSpecValueIssues(data.specifications, partById),
        ...collectUnexpectedSpecKeys(data.parts, categoryKeyById, specsByPart),
        ...collectMissingRequiredSpecs(data.parts, categoryKeyById, specsByPart),
        ...collectWeightBreakdownIssues(frames, specsByPart),
        ...collectPlatformIssues(frames, blockedByPart, itemsByPart),
        ...missingIncludedItems.failures,
    ];

    return {
        failures,
        notices: missingIncludedItems.notices,
        progress: {
            // フロントフォークの規格が未登録のフレーム(通知のみ)
            framesWithoutForkSpecs: collectFramesWithoutForkSpecs(frames, specsByPart),
            // 重量の範囲が未登録のフレーム(通知のみ)
            framesWithoutWeightScope: collectFramesWithoutWeightScope(frames, specsByPart),
        },
    };
}

// 監査結果を失敗・進捗・通知に分けて表示
function printAuditResult(result) {
    // 失敗の指摘はCIを落とすため先頭に表示
    if (result.failures.length > 0) {
        process.stdout.write(`監査で ${result.failures.length} 件の指摘があります。\n\n`);
        for (const finding of result.failures) process.stdout.write(`- ${finding}\n`);
        process.stdout.write("\n");
    }

    // フロントフォークの規格は登録作業の進捗として件数だけ表示
    if (result.progress.framesWithoutForkSpecs.length > 0) {
        process.stdout.write(
            `フロントフォークの規格が未登録のフレーム: ` +
                `${result.progress.framesWithoutForkSpecs.length}件\n`,
        );
    }

    // 重量の範囲はプラットフォーム単位で調査中のため件数だけ表示
    if (result.progress.framesWithoutWeightScope.length > 0) {
        process.stdout.write(
            `重量の範囲(フロントフォーク込みか)が未登録のフレーム: ` +
                `${result.progress.framesWithoutWeightScope.length}件` +
                "(プラットフォーム単位で調査中)\n",
        );
    }

    // 通知は失敗にしないが、登録漏れとして一覧を表示
    if (result.notices.length > 0) {
        process.stdout.write(`\n通知: ${result.notices.length}件（失敗にはしない）\n\n`);
        for (const notice of result.notices) process.stdout.write(`- ${notice}\n`);
        process.stdout.write("\n");
    }

    // 失敗がなければ正常終了
    if (result.failures.length === 0) {
        process.stdout.write("監査OK: 失敗の指摘はありませんでした。\n");
        return;
    }

    process.stdout.write(
        "\n解消するか、解消できない場合は理由（出典が見つからない等）を記録してください。\n",
    );
}

// ローカルD1を読み込んで監査を実行し、失敗の有無で終了コードを決める
function main() {
    const result = auditMasterData(loadAuditData());

    printAuditResult(result);

    // 失敗の指摘があればCIを落とす
    if (result.failures.length > 0) {
        process.exit(1);
    }

    process.exit(0);
}

// 直接実行されたときだけローカルD1へ問い合わせる(テストのimportでは実行しない)
if (
    process.argv[1] !== undefined &&
    resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
    main();
}

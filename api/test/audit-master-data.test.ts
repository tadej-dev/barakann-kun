import {describe, expect, it} from "vitest"

import {EQUIVALENT_VALUE_GROUPS} from "../../shared/part-compatibility-core"
import {applyMigrations, createSqliteD1} from "./support/sqlite-d1"

// @ts-expect-error 監査スクリプト(.mjs)は型定義ファイルを持たないため
import {AUDIT_QUERIES, CATEGORY_SPEC_KEYS, WHEEL_DIAMETER_VALUES, auditMasterData} from "../scripts/audit-master-data.mjs"

// テストで使うカテゴリーID(初期スキーマの並び)
const FRAME_CATEGORY_ID = 1 // フレーム
const GROUPSET_CATEGORY_ID = 2 // コンポセット
const SHIFT_BRAKE_LEVER_CATEGORY_ID = 3 // シフトレバー(ブレーキ一体型)
const FRONT_DERAILLEUR_CATEGORY_ID = 4 // フロントディレイラー
const REAR_DERAILLEUR_CATEGORY_ID = 5 // リアディレイラー
const CRANKSET_CATEGORY_ID = 6 // クランクセット
const CASSETTE_CATEGORY_ID = 7 // カセット
const CHAIN_CATEGORY_ID = 8 // チェーン
const BRAKE_PAD_CATEGORY_ID = 11 // ブレーキパッド
const HANDLEBAR_CATEGORY_ID = 16 // ハンドル
const STEM_CATEGORY_ID = 17 // ステム
const SEATPOST_CATEGORY_ID = 19 // シートポスト
const PEDAL_CATEGORY_ID = 21 // ペダル

// 監査に渡すパーツ行
type PartRow = {
    id: number // パーツID
    brand_id: number // ブランドID
    category_id: number // カテゴリーID
    name: string // パーツ名
    model_name: string | null // モデル名
    weight: number // 重量(g)
}

// 監査に渡すカテゴリー行
type CategoryRow = {
    id: number // カテゴリーID
    key: string // カテゴリーキー
}

// 監査に渡す占有行
type BlockedCategoryRow = {
    part_id: number // 占有するパーツのID
    category_id: number // 占有するカテゴリーID
}

// 監査に渡す同梱品行
type IncludedItemRow = {
    part_id: number // 同梱するパーツのID
    item_name: string // 同梱品名
    included_category_id: number | null // 同梱品のカテゴリーID
    weight: number | null // 同梱品の重量(g)
}

// 監査に渡す規格行
type SpecificationRow = {
    part_id: number // 規格を持つパーツのID
    spec_key: string // 規格キー
    spec_value: string // 規格値
}

// 監査に渡すマスターデータ一式
type AuditData = {
    parts: PartRow[] // パーツ本体
    categories: CategoryRow[] // カテゴリー
    blockedCategories: BlockedCategoryRow[] // 専用パーツが占有するカテゴリー
    includedItems: IncludedItemRow[] // 同梱品
    specifications: SpecificationRow[] // 規格
}

// 監査結果(進捗は未登録のフレーム行)
type AuditResult = {
    failures: string[] // 失敗にする指摘
    notices: string[] // 通知だけにする指摘
    progress: {
        framesWithoutForkSpecs: PartRow[] // フロントフォークの規格が未登録のフレーム
        framesWithoutWeightScope: PartRow[] // 重量の範囲が未登録のフレーム
    }
}

// 型定義のない監査関数へ、テスト用の型を付ける
const audit = auditMasterData as (data: AuditData) => AuditResult

// 監査に渡すパーツ行を作る(名前・モデル名・重量は必要に応じて上書き)
function createPart(
    id: number,
    categoryId: number,
    overrides: Partial<Omit<PartRow, "id" | "category_id">> = {},
): PartRow {
    return {
        id,
        category_id: categoryId,
        brand_id: 1,
        name: `パーツ${id}`,
        model_name: null,
        weight: 1200,
        ...overrides,
    }
}

// テストで使う全カテゴリー(初期スキーマの並び)
const CATEGORIES: CategoryRow[] = [
    {id: FRAME_CATEGORY_ID, key: "frame"},
    {id: GROUPSET_CATEGORY_ID, key: "groupset"},
    {id: SHIFT_BRAKE_LEVER_CATEGORY_ID, key: "shift_brake_lever"},
    {id: FRONT_DERAILLEUR_CATEGORY_ID, key: "front_derailleur"},
    {id: REAR_DERAILLEUR_CATEGORY_ID, key: "rear_derailleur"},
    {id: CRANKSET_CATEGORY_ID, key: "crankset"},
    {id: CASSETTE_CATEGORY_ID, key: "cassette"},
    {id: CHAIN_CATEGORY_ID, key: "chain"},
    {id: 9, key: "bottom_bracket"},
    {id: 10, key: "brake_caliper"},
    {id: BRAKE_PAD_CATEGORY_ID, key: "brake_pad"},
    {id: 12, key: "disc_rotor"},
    {id: 13, key: "wheel"},
    {id: 14, key: "tire"},
    {id: 15, key: "inner_tube"},
    {id: HANDLEBAR_CATEGORY_ID, key: "handlebar"},
    {id: STEM_CATEGORY_ID, key: "stem"},
    {id: 18, key: "bar_tape"},
    {id: SEATPOST_CATEGORY_ID, key: "seatpost"},
    {id: 20, key: "saddle"},
    {id: PEDAL_CATEGORY_ID, key: "pedal"},
]

// 失敗も通知もない最小の監査データ(フレーム1件)を作る
function createValidData(): AuditData {
    return {
        parts: [createPart(1, FRAME_CATEGORY_ID)],
        categories: CATEGORIES.map((category) => ({...category})),
        blockedCategories: [],
        includedItems: [],
        specifications: [
            {part_id: 1, spec_key: "weight_scope", spec_value: "frame_and_fork"},
            {part_id: 1, spec_key: "frame_weight_g", spec_value: "800"},
            {part_id: 1, spec_key: "fork_weight_g", spec_value: "400"},
            {part_id: 1, spec_key: "weight_source", spec_value: "official"},
            {part_id: 1, spec_key: "steerer_standard", spec_value: "tapered_1_1_8_1_5"},
            {part_id: 1, spec_key: "front_axle", spec_value: "12x100"},
        ],
    }
}

// 規格値の検査用に、指定カテゴリーのパーツと規格を追加する
function addPartWithSpecs(
    data: AuditData,
    categoryId: number,
    specs: Record<string, string>,
): void {
    // 既存のパーツと重ならないID
    const partId = 100
    data.parts.push(createPart(partId, categoryId))
    for (const [specKey, specValue] of Object.entries(specs)) {
        data.specifications.push({part_id: partId, spec_key: specKey, spec_value: specValue})
    }
}

// 規格値の逸脱ケース(カテゴリー・規格キー・不正な値・期待する理由・補う規格)
type SpecValueCase = {
    categoryId: number // パーツのカテゴリーID
    specKey: string // 検査対象の規格キー
    value: string // 検査対象の不正な値
    reason: string // 期待する失敗理由
    requiredSpecs: Record<string, string> // 判定に必要な追加規格
}

// 規格値の逸脱ケースを作る
function specCase(
    categoryId: number,
    specKey: string,
    value: string,
    reason: string,
    requiredSpecs: Record<string, string> = {},
): SpecValueCase {
    return {categoryId, specKey, value, reason, requiredSpecs}
}

// 規格値の逸脱ケース(値域・語彙・正の数)
const SPEC_VALUE_CASES: SpecValueCase[] = [
    // 寸法(mm)は正の数だけを許可
    specCase(FRAME_CATEGORY_ID, "max_tire_width_mm", "abc", "数値でない"),
    specCase(FRAME_CATEGORY_ID, "max_tire_width_mm", "0", "正の数でない"),
    specCase(FRAME_CATEGORY_ID, "max_tire_width_mm", "-1", "正の数でない"),
    // フレームの重量(g)は正の整数だけを許可
    specCase(FRAME_CATEGORY_ID, "frame_weight_g", "abc", "整数でない"),
    specCase(FRAME_CATEGORY_ID, "frame_weight_g", "0", "正の整数でない"),
    specCase(FRAME_CATEGORY_ID, "frame_weight_g", "-1", "正の整数でない"),
    // フロントフォークの重量(g)は正の整数だけを許可
    specCase(FRAME_CATEGORY_ID, "fork_weight_g", "abc", "整数でない"),
    specCase(FRAME_CATEGORY_ID, "fork_weight_g", "0", "正の整数でない"),
    specCase(FRAME_CATEGORY_ID, "fork_weight_g", "-1", "正の整数でない"),
    // 歯数は正の整数だけを許可(フロントディレイラーはチェーンリング枚数が必須)
    specCase(
        FRONT_DERAILLEUR_CATEGORY_ID,
        "max_chainring_teeth",
        "abc",
        "整数でない",
        {chainring_count: "2"},
    ),
    specCase(
        FRONT_DERAILLEUR_CATEGORY_ID,
        "max_chainring_teeth",
        "0",
        "正の整数でない",
        {chainring_count: "2"},
    ),
    specCase(
        FRONT_DERAILLEUR_CATEGORY_ID,
        "max_chainring_teeth",
        "-1",
        "正の整数でない",
        {chainring_count: "2"},
    ),
    specCase(REAR_DERAILLEUR_CATEGORY_ID, "max_sprocket_teeth", "0", "正の整数でない"),
    // 対応段数は正の整数だけを許可
    specCase(CHAIN_CATEGORY_ID, "drivetrain_speed", "abc", "整数でない"),
    specCase(CHAIN_CATEGORY_ID, "drivetrain_speed", "0", "正の整数でない"),
    specCase(CHAIN_CATEGORY_ID, "drivetrain_speed", "-1", "正の整数でない"),
    // チェーンリング枚数は1〜3の整数だけを許可
    specCase(FRONT_DERAILLEUR_CATEGORY_ID, "chainring_count", "4", "1〜3の範囲外"),
    specCase(FRONT_DERAILLEUR_CATEGORY_ID, "chainring_count", "two", "整数でない"),
    // 語彙の定義済みキーは許可語彙だけを許可
    specCase(SHIFT_BRAKE_LEVER_CATEGORY_ID, "brake_actuation", "cable", "既知の語彙にない"),
    specCase(CASSETTE_CATEGORY_ID, "freehub_body", "shimano", "既知の語彙にない"),
    specCase(CHAIN_CATEGORY_ID, "chain_standard", "shimano_hg,unknown", "既知の語彙にない"),
    // 実データから起こした語彙も許可語彙だけを許可
    specCase(FRAME_CATEGORY_ID, "bb_standard", "bb999", "既知の語彙にない"),
    specCase(FRAME_CATEGORY_ID, "cockpit_interface", "standard_1_1_4", "既知の語彙にない"),
    specCase(FRAME_CATEGORY_ID, "cockpit_system", "standard_1_1_8,unknown", "既知の語彙にない"),
    specCase(BRAKE_PAD_CATEGORY_ID, "pad_family", "shimano_road", "既知の語彙にない"),
    specCase(PEDAL_CATEGORY_ID, "pedal_thread", "1_2_20tpi", "既知の語彙にない"),
    specCase(FRAME_CATEGORY_ID, "steerer_standard", "tapered_1_1_8", "既知の語彙にない"),
    specCase(FRAME_CATEGORY_ID, "front_axle", "12x100,boost_110", "既知の語彙にない"),
    specCase(FRAME_CATEGORY_ID, "rear_axle", "12x142x", "既知の語彙にない"),
    specCase(PEDAL_CATEGORY_ID, "cleat_system", "look_delta", "既知の語彙にない"),
]

// 監査の失敗・通知・正常系を検証
describe("マスターデータ監査", () => {
    // 問題のないデータは失敗も通知もない
    it("問題のないデータは失敗も通知もない", () => {
        const result = audit(createValidData())

        expect(result.failures).toEqual([])
        expect(result.notices).toEqual([])
        expect(result.progress.framesWithoutForkSpecs).toEqual([])
        expect(result.progress.framesWithoutWeightScope).toEqual([])
    })

    // 存在しないIDを参照する規格・占有・同梱品は失敗になる
    it("存在しないパーツ・カテゴリーの参照を失敗として検出", () => {
        const data = createValidData()
        data.specifications.push({
            part_id: 99,
            spec_key: "brake_actuation",
            spec_value: "hydraulic",
        })
        data.blockedCategories.push(
            {part_id: 99, category_id: STEM_CATEGORY_ID},
            {part_id: 1, category_id: 99},
        )
        data.includedItems.push(
            {
                part_id: 99,
                item_name: "欠落パーツの付属品",
                included_category_id: STEM_CATEGORY_ID,
                weight: 100,
            },
            {
                part_id: 1,
                item_name: "欠落カテゴリの付属品",
                included_category_id: 99,
                weight: 100,
            },
        )

        const result = audit(data)

        expect(result.failures).toEqual(
            expect.arrayContaining([
                expect.stringContaining("[参照先なし] 規格 brake_actuation の part 99"),
                expect.stringContaining("[参照先なし] 占有行の part 99"),
                expect.stringContaining("[参照先なし] part 1 の占有カテゴリ 99"),
                expect.stringContaining(
                    "[参照先なし] 同梱品「欠落パーツの付属品」の part 99",
                ),
                expect.stringContaining(
                    "[参照先なし] part 1 の同梱品「欠落カテゴリの付属品」",
                ),
            ]),
        )
    })

    // 同じ規格キー・占有カテゴリーの行が2件以上あれば失敗になる
    it("同じ規格・占有の重複を失敗として検出", () => {
        const data = createValidData()
        data.specifications.push({
            part_id: 1,
            spec_key: "weight_source",
            spec_value: "reference",
        })
        data.blockedCategories.push(
            {part_id: 1, category_id: HANDLEBAR_CATEGORY_ID},
            {part_id: 1, category_id: HANDLEBAR_CATEGORY_ID},
        )
        data.includedItems.push({
            part_id: 1,
            item_name: "付属ハンドル",
            included_category_id: HANDLEBAR_CATEGORY_ID,
            weight: 300,
        })

        const result = audit(data)

        expect(result.failures).toEqual(
            expect.arrayContaining([
                expect.stringContaining("[規格の重複]"),
                expect.stringContaining("[占有の重複]"),
            ]),
        )
    })

    // 自身のカテゴリーを占有・同梱する自己参照は失敗になる
    it("自身のカテゴリーの占有・同梱を失敗として検出", () => {
        const data = createValidData()
        data.blockedCategories.push({part_id: 1, category_id: FRAME_CATEGORY_ID})
        data.includedItems.push({
            part_id: 1,
            item_name: "フレーム自身",
            included_category_id: FRAME_CATEGORY_ID,
            weight: 100,
        })

        const result = audit(data)

        expect(result.failures).toEqual(
            expect.arrayContaining([
                expect.stringContaining("が自身のカテゴリ 1 を占有"),
                expect.stringContaining("が自身のカテゴリ 1 を同梱"),
            ]),
        )
    })

    // フレームの同梱品の重量は0より大きい必要がある
    it("フレーム同梱品の重量0以下を失敗として検出", () => {
        const data = createValidData()
        data.includedItems.push(
            {
                part_id: 1,
                item_name: "重量0の付属品",
                included_category_id: HANDLEBAR_CATEGORY_ID,
                weight: 0,
            },
            {
                part_id: 1,
                item_name: "負の重量の付属品",
                included_category_id: GROUPSET_CATEGORY_ID,
                weight: -1,
            },
        )

        const result = audit(data)

        expect(result.failures).toEqual(
            expect.arrayContaining([
                expect.stringContaining("「重量0の付属品」の weight が 0"),
                expect.stringContaining("「負の重量の付属品」の weight が -1"),
            ]),
        )
    })

    // セット構成品などフレーム以外の同梱品の重量0は失敗にしない
    it("フレーム以外の同梱品の重量0は失敗にしない", () => {
        const data = createValidData()
        data.parts.push(createPart(2, HANDLEBAR_CATEGORY_ID))
        data.includedItems.push({
            part_id: 2,
            item_name: "ステム",
            included_category_id: STEM_CATEGORY_ID,
            weight: 0,
        })

        const result = audit(data)

        expect(result.failures).toEqual([])
    })

    // 規格キーごとの許可語彙・正の数・値域から外れた値は失敗になる
    it.each(SPEC_VALUE_CASES)("$specKey が $value なら失敗として検出", (testCase) => {
        const data = createValidData()
        const specs = {...testCase.requiredSpecs, [testCase.specKey]: testCase.value}
        addPartWithSpecs(data, testCase.categoryId, specs)

        const result = audit(data)

        expect(result.failures).toContain(
            `[規格値が不正] パーツ100(id 100) の ${testCase.specKey} が` +
                ` ${testCase.value}(${testCase.reason})`,
        )
    })

    // カテゴリーで許可していない規格キーは失敗になる
    it("カテゴリー違いの規格キーを失敗として検出", () => {
        const data = createValidData()
        data.specifications.push({
            part_id: 1,
            spec_key: "brake_actuation",
            spec_value: "hydraulic",
        })

        const result = audit(data)

        expect(result.failures).toContain(
            "[規格キーの逸脱] パーツ1(id 1) の brake_actuation はカテゴリ frame では未定義",
        )
    })

    // 判定に使う規格が未登録なら失敗になる
    it("判定に必要な規格の欠落を失敗として検出", () => {
        const data = createValidData()
        data.parts.push(createPart(2, CRANKSET_CATEGORY_ID))

        const result = audit(data)

        expect(result.failures).toEqual(
            expect.arrayContaining([
                expect.stringContaining(
                    "[判定用の規格なし] パーツ2(id 2) はチェーンリング枚数(chainring_count)が未登録",
                ),
            ]),
        )
    })

    // フロントフォーク込みの重量で内訳の合計が一致しなければ失敗になる
    it("重量の内訳の合計が一致しない場合は失敗として検出", () => {
        const data = createValidData()
        data.parts[0]!.weight = 1300

        const result = audit(data)

        expect(result.failures).toEqual(
            expect.arrayContaining([expect.stringContaining("[内訳不一致]")]),
        )
    })

    // フロントフォーク込みの重量で内訳・出典が欠ければ失敗になる
    it("重量の内訳・出典の欠落を失敗として検出", () => {
        const data = createValidData()
        data.specifications = data.specifications.filter(
            (row) => row.spec_key !== "frame_weight_g" && row.spec_key !== "weight_source",
        )

        const result = audit(data)

        expect(result.failures).toEqual(
            expect.arrayContaining([
                expect.stringContaining("frame_weight_g が未登録"),
                expect.stringContaining("weight_source が未登録"),
            ]),
        )
    })

    // フレームの占有カテゴリーに対応する同梱品がなければ失敗になる
    it("フレームの付属品欠落を失敗として検出", () => {
        const data = createValidData()
        data.blockedCategories.push({part_id: 1, category_id: SEATPOST_CATEGORY_ID})

        const result = audit(data)

        expect(result.failures).toEqual([
            "[付属品なし] パーツ1(id 1) はカテゴリ 19 を占有するが、対応する同梱品がない",
        ])
        expect(result.notices).toEqual([])
    })

    // フレーム以外の占有カテゴリーに対応する同梱品がなければ通知だけにする
    it("フレーム以外の付属品欠落は通知だけにする", () => {
        const data = createValidData()
        data.parts.push(createPart(2, GROUPSET_CATEGORY_ID))
        data.specifications.push({
            part_id: 2,
            spec_key: "chainring_count",
            spec_value: "2",
        })
        data.blockedCategories.push({part_id: 2, category_id: CRANKSET_CATEGORY_ID})

        const result = audit(data)

        expect(result.failures).toEqual([])
        expect(result.notices).toEqual([
            "[付属品なし] パーツ2(id 2) はカテゴリ 6 を占有するが、対応する同梱品がない",
        ])
    })

    // ハンドルとステムはどちらかの同梱品で組の占有を満たす
    it("ハンドル・ステムの組はどちらかの同梱品で占有を満たす", () => {
        const stemIncluded = createValidData()
        stemIncluded.blockedCategories.push(
            {part_id: 1, category_id: HANDLEBAR_CATEGORY_ID},
            {part_id: 1, category_id: STEM_CATEGORY_ID},
        )
        stemIncluded.includedItems.push({
            part_id: 1,
            item_name: "一体型ステム",
            included_category_id: STEM_CATEGORY_ID,
            weight: 300,
        })

        const stemResult = audit(stemIncluded)

        expect(stemResult.failures).toEqual([])
        expect(stemResult.notices).toEqual([])

        const handlebarIncluded = createValidData()
        handlebarIncluded.blockedCategories.push(
            {part_id: 1, category_id: HANDLEBAR_CATEGORY_ID},
            {part_id: 1, category_id: STEM_CATEGORY_ID},
        )
        handlebarIncluded.includedItems.push({
            part_id: 1,
            item_name: "一体型ハンドル",
            included_category_id: HANDLEBAR_CATEGORY_ID,
            weight: 350,
        })

        const handlebarResult = audit(handlebarIncluded)

        expect(handlebarResult.failures).toEqual([])
        expect(handlebarResult.notices).toEqual([])
    })

    // 自身がハンドル・ステムのパーツは一体型として組の照合対象から外す
    it("自身がハンドル・ステムのパーツは組の照合対象から外す", () => {
        const data = createValidData()
        data.parts.push(createPart(2, HANDLEBAR_CATEGORY_ID))
        data.parts.push(createPart(3, STEM_CATEGORY_ID))
        data.blockedCategories.push(
            {part_id: 2, category_id: STEM_CATEGORY_ID},
            {part_id: 3, category_id: HANDLEBAR_CATEGORY_ID},
        )

        const result = audit(data)

        expect(result.failures).toEqual([])
        expect(result.notices).toEqual([])
    })

    // フロントフォーク規格・重量の範囲の未登録は進捗として通知に回す
    it("フロントフォーク規格と重量の範囲の未登録は通知として集める", () => {
        const data = createValidData()
        data.specifications = data.specifications.filter(
            (row) => row.spec_key !== "steerer_standard" && row.spec_key !== "front_axle",
        )
        data.parts.push(createPart(2, FRAME_CATEGORY_ID, {model_name: "別モデル"}))

        const result = audit(data)

        expect(result.failures).toEqual([])
        expect(result.notices).toEqual([])
        expect(result.progress.framesWithoutForkSpecs).toHaveLength(1)
        expect(result.progress.framesWithoutWeightScope).toHaveLength(1)
    })
})

// マイグレーション適用済みのDBから監査データを読み込む
function loadAuditData(sqlite: ReturnType<typeof createSqliteD1>["sqlite"]): AuditData {
    return {
        parts: sqlite.prepare(AUDIT_QUERIES.parts).all() as PartRow[],
        categories: sqlite.prepare(AUDIT_QUERIES.categories).all() as CategoryRow[],
        blockedCategories: sqlite
            .prepare(AUDIT_QUERIES.blockedCategories)
            .all() as BlockedCategoryRow[],
        includedItems: sqlite
            .prepare(AUDIT_QUERIES.includedItems)
            .all() as IncludedItemRow[],
        specifications: sqlite
            .prepare(AUDIT_QUERIES.specifications)
            .all() as SpecificationRow[],
    }
}

// マイグレーション適用済みの実データで監査が失敗しないことを検証
describe("マスターデータ監査(SQL結合)", () => {
    // 実データの規格・参照関係が監査を通過する
    it("マイグレーション後のデータは失敗の指摘がない", () => {
        const {sqlite} = createSqliteD1()
        applyMigrations(sqlite)

        const result = audit(loadAuditData(sqlite))

        expect(result.failures).toEqual([])
        sqlite.close()
    })

    // 実データの付属品欠落は microSHIFT 369 の6件だけ
    it("実データの付属品欠落の通知は microSHIFT 369 の6件だけ", () => {
        const {sqlite} = createSqliteD1()
        applyMigrations(sqlite)

        const result = audit(loadAuditData(sqlite))

        expect(result.notices).toHaveLength(6)
        for (const notice of result.notices) {
            expect(notice).toContain(
                "microSHIFT Sword Mechanical Disc Groupset 2x10(id 369)",
            )
        }
        const categories = result.notices.map((notice) =>
            Number(notice.match(/カテゴリ (\d+)/)?.[1]))
        expect(categories).toEqual([3, 4, 5, 6, 7, 8])
        sqlite.close()
    })

    // 実データでフレームの付属品を欠落させると失敗になる
    it("フレームの付属品欠落は失敗になる", () => {
        const {sqlite} = createSqliteD1()
        applyMigrations(sqlite)
        const data = loadAuditData(sqlite)
        // Cervelo S5(id 1)のシートポスト付属品を欠落させる
        data.includedItems = data.includedItems.filter(
            (row) => !(row.part_id === 1 && row.included_category_id === SEATPOST_CATEGORY_ID),
        )

        const result = audit(data)

        expect(result.failures).toContain(
            "[付属品なし] Cervelo S5(id 1) はカテゴリ 19 を占有するが、対応する同梱品がない",
        )
        sqlite.close()
    })

    // 0082の更新でフリーボディ規格が想定どおりになる
    it("0082適用後のフリーボディ規格が更新されている", () => {
        const {sqlite} = createSqliteD1()
        applyMigrations(sqlite)
        const rows = sqlite
            .prepare(
                "SELECT part_id, spec_value FROM part_specifications" +
                    " WHERE spec_key = 'freehub_body' AND part_id IN (96, 570, 571, 572)",
            )
            .all() as {part_id: number; spec_value: string}[]
        const freehubById = new Map(
            rows.map((row) => [row.part_id, row.spec_value.split(",")]),
        )

        expect(freehubById.get(96)).not.toContain("campagnolo_n3w")
        expect(freehubById.get(570)).toContain("campagnolo_n3w")
        expect(freehubById.get(571)).toContain("campagnolo_n3w")
        expect(freehubById.get(572)).toContain("campagnolo_n3w")
        sqlite.close()
    })

    // カテゴリー別の許可リストが実データの全カテゴリーを網羅している
    it("カテゴリー別の許可リストが全21カテゴリーを網羅している", () => {
        const {sqlite} = createSqliteD1()
        applyMigrations(sqlite)
        const categories = sqlite
            .prepare(AUDIT_QUERIES.categories)
            .all() as CategoryRow[]

        expect([...CATEGORY_SPEC_KEYS.keys()].sort()).toEqual(
            categories.map((category) => category.key).sort(),
        )
        sqlite.close()
    })
    // 実データの進捗表示（フォーク規格・重量の範囲）は既知の件数で固定する
    it("実データの進捗件数は既知の値のまま", () => {
        const {sqlite} = createSqliteD1()
        applyMigrations(sqlite)

        const result = audit(loadAuditData(sqlite))

        // フォーク規格が未登録のフレームは3件、重量の範囲が未登録は0件
        expect(result.progress.framesWithoutForkSpecs).toHaveLength(3)
        expect(result.progress.framesWithoutWeightScope).toHaveLength(0)
        expect(result.failures).toEqual([])
        sqlite.close()
    })

    // 監査の口径語彙が等価ルールの対象と同じ値を持つ
    it("口径の語彙が等価ルールの対象と同じ値を持つ", () => {
        // 等価ルールの対象（コアの定義から引く）
        const equivalenceValues = new Set(
            EQUIVALENT_VALUE_GROUPS
                .filter((group) => group.specificationKey === "wheel_diameter")
                .flatMap((group) => group.values),
        )

        expect(new Set(WHEEL_DIAMETER_VALUES)).toEqual(equivalenceValues)
        // 28インチは622mmと635mmの両方があるため対象外
        expect(WHEEL_DIAMETER_VALUES).not.toContain("28")
    })

})

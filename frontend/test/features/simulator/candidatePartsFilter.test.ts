import {describe, expect, it} from "vitest"

import {
    buildSpecFilters,
    collectBrands,
    collectModelYears,
    countActiveFilters,
    filterCandidateParts,
    hasCompatibilityInfo,
    initialCandidateFilterState,
    toggleSelection,
    type CandidateFilterState,
} from "@/features/simulator/candidatePartsFilter"
import type {CompatibilityResult} from "@/features/simulator/partCompatibility"
import type {Part} from "@/types/part"

// テスト用の最小パーツ。指定した項目だけを上書きして使う
function createPart(overrides: Partial<Part> & {id: number}): Part {
    return {
        id: overrides.id,
        name: overrides.name ?? `Part ${overrides.id}`,
        modelName: overrides.modelName ?? null,
        variantName: overrides.variantName ?? null,
        modelYear: overrides.modelYear ?? null,
        edition: overrides.edition ?? null,
        brandName: overrides.brandName ?? "Test Brand",
        categoryKey: overrides.categoryKey ?? "cassette",
        weight: overrides.weight ?? 100,
        price: overrides.price ?? 1000,
        includedItems: overrides.includedItems ?? [],
        blockedCategoryKeys: overrides.blockedCategoryKeys ?? [],
        specifications: overrides.specifications ?? {},
    }
}

// 適合結果の最小オブジェクト
function compatibility(status: CompatibilityResult["status"]): CompatibilityResult {
    return {status, reasons: [], counterparts: [], conflictingSlotKeys: [], selectionBlocked: false}
}

// 初期状態へ一部の条件を重ねた絞り込み状態
function filters(overrides: Partial<CandidateFilterState>): CandidateFilterState {
    return {...initialCandidateFilterState, ...overrides}
}

// 規格の選択肢生成を保証
describe("buildSpecFilters", () => {
    // カンマ区切りの値は分解し、複数の値を持つ許可キーだけを選択肢にする
    it("カンマ区切りの規格値を分解し、複数値のあるキーだけを対象にする", () => {
        // 規格値が異なるテスト用パーツ
        const parts = [
            createPart({
                id: 1,
                specifications: {freehub_body: "shimano_hg,sram_xdr"},
            }),
            createPart({
                id: 2,
                specifications: {
                    freehub_body: "campagnolo_n3w",
                    drivetrain_speed: "12",
                },
            }),
        ]

        // 生成した規格の絞り込み選択肢
        const specFilters = buildSpecFilters(parts)

        expect(specFilters).toHaveLength(1)
        expect(specFilters[0]?.key).toBe("freehub_body")
        expect(specFilters[0]?.options.map((option) => option.value).sort())
            .toEqual(["campagnolo_n3w", "shimano_hg", "sram_xdr"])
    })

    // 許可リストに無い規格は、値が複数あっても無視
    it("許可リスト外のキーは対象にしない", () => {
        // 許可リスト外の規格だけを持つパーツ
        const parts = [
            createPart({id: 1, specifications: {unknown_key: "a"}}),
            createPart({id: 2, specifications: {unknown_key: "b"}}),
        ]

        expect(buildSpecFilters(parts)).toEqual([])
    })

    // 新たに許可したキー（タイヤ幅など）も選択肢として生成
    it("追加した許可キーの選択肢を生成する", () => {
        // タイヤ幅の規格値が異なるパーツ
        const parts = [
            createPart({id: 1, specifications: {tire_width_mm: "28"}}),
            createPart({id: 2, specifications: {tire_width_mm: "32"}}),
        ]

        expect(buildSpecFilters(parts).some((filter) =>
            filter.key === "tire_width_mm")).toBe(true)
    })
})

// 候補メーカーの収集を保証
describe("collectBrands", () => {
    // 重複と空文字を除き、表示順を安定させる
    it("重複と空を除いてブランドを並べる", () => {
        // メーカー名が重複するテスト用パーツ
        const parts = [
            createPart({id: 1, brandName: "Shimano"}),
            createPart({id: 2, brandName: "Shimano"}),
            createPart({id: 3, brandName: "SRAM"}),
        ]

        expect(collectBrands(parts)).toEqual(["Shimano", "SRAM"])
    })
})

// 規格・メーカー・コックピット・適合・年式による絞り込みを保証
describe("filterCandidateParts", () => {
    // 複数選択は「いずれか一致」、集合値は交差で判定
    it("複数選択した規格のいずれかを含むパーツだけを残す", () => {
        // フリーボディ規格が異なるテスト用パーツ
        const parts = [
            createPart({
                id: 1,
                specifications: {freehub_body: "shimano_hg,sram_xdr"},
            }),
            createPart({
                id: 2,
                specifications: {freehub_body: "campagnolo_n3w"},
            }),
        ]

        // 絞り込み結果
        const result = filterCandidateParts(
            parts,
            filters({specs: {freehub_body: ["sram_xdr"]}}),
            new Map(),
        )

        expect(result.map((part) => part.id)).toEqual([1])
    })

    // 数値系（タイヤ幅）の規格でも複数選択で絞り込める
    it("追加した数値規格でも絞り込める", () => {
        // タイヤ幅が異なるテスト用パーツ
        const parts = [
            createPart({
                id: 1,
                categoryKey: "tire",
                specifications: {tire_width_mm: "28"},
            }),
            createPart({
                id: 2,
                categoryKey: "tire",
                specifications: {tire_width_mm: "32"},
            }),
        ]

        // 絞り込み結果
        const result = filterCandidateParts(
            parts,
            filters({specs: {tire_width_mm: ["28"]}}),
            new Map(),
        )

        expect(result.map((part) => part.id)).toEqual([1])
    })
    // コックピット付属のフレームだけを残すことを保証
    it("コックピット付属のフレームだけを残す", () => {
        // コックピットが付属するフレーム
        const included = createPart({
            id: 1,
            categoryKey: "frame",
            blockedCategoryKeys: ["handlebar", "stem"],
        })
        // 標準コックピット仕様のフレーム
        const standard = createPart({
            id: 2,
            categoryKey: "frame",
            specifications: {cockpit_interface: "standard_1_1_8"},
        })

        // 絞り込み結果
        const result = filterCandidateParts(
            [included, standard],
            filters({cockpits: ["included"]}),
            new Map(),
        )

        expect(result.map((part) => part.id)).toEqual([1])
    })

    // 適合のみは unknown / incompatible を除外
    it("適合のみでは compatible 以外を除外する", () => {
        // 判定の異なる3件のパーツ
        const parts = [
            createPart({id: 1}),
            createPart({id: 2}),
            createPart({id: 3}),
        ]
        // パーツIDごとの適合判定結果
        const compatibilityByPartId = new Map<number, CompatibilityResult | null>([
            [1, compatibility("compatible")],
            [2, compatibility("unknown")],
            [3, compatibility("incompatible")],
        ])

        // 絞り込み結果
        const result = filterCandidateParts(
            parts,
            filters({viewMode: "compatibleOnly"}),
            compatibilityByPartId,
        )

        expect(result.map((part) => part.id)).toEqual([1])
    })

    // メーカーと一体型など、複数条件はANDで適用
    it("メーカーと一体型の条件を組み合わせる", () => {
        // メーカーとコックピット形状が異なるパーツ
        const parts = [
            createPart({id: 1, brandName: "Shimano", blockedCategoryKeys: ["stem"]}),
            createPart({id: 2, brandName: "Shimano"}),
            createPart({id: 3, brandName: "SRAM", blockedCategoryKeys: ["stem"]}),
        ]

        // 絞り込み結果
        const result = filterCandidateParts(
            parts,
            filters({brands: ["Shimano"], integratedHandlebarOnly: true}),
            new Map(),
        )

        expect(result.map((part) => part.id)).toEqual([1])
    })

    // フレームは全パーツ互換の基準として扱うため、表示モードでは除外しない
    it("フレームは表示モードで除外しない", () => {
        // フレームとハンドルの2件のパーツ
        const parts = [
            createPart({id: 1, categoryKey: "frame"}),
            createPart({id: 2, categoryKey: "handlebar"}),
        ]
        // パーツIDごとの適合判定結果
        const compatibilityByPartId = new Map<number, CompatibilityResult | null>([
            [1, compatibility("incompatible")],
            [2, compatibility("incompatible")],
        ])

        // 非互換を除外する表示モードの結果
        const excluded = filterCandidateParts(
            parts,
            filters({viewMode: "excludeIncompatible"}),
            compatibilityByPartId,
        )
        // 適合のみを表示する表示モードの結果
        const compatibleOnly = filterCandidateParts(
            parts,
            filters({viewMode: "compatibleOnly"}),
            compatibilityByPartId,
        )

        expect(excluded.map((part) => part.id)).toEqual([1])
        expect(compatibleOnly.map((part) => part.id)).toEqual([1])
    })
})

// 絞り込み選択肢の追加・削除を保証
describe("toggleSelection", () => {
    // チェックのオン・オフで値を追加・削除
    it("チェックで追加、解除で削除する", () => {
        expect(toggleSelection(["a"], "b", true)).toEqual(["a", "b"])
        expect(toggleSelection(["a", "b"], "a", false)).toEqual(["b"])
    })

    // すべて選択することもできる（自動解除はしない）
    it("全選択も可能", () => {
        expect(toggleSelection(["a", "b"], "c", true))
            .toEqual(["a", "b", "c"])
    })
})

// 適合判定情報の有無を保証
describe("hasCompatibilityInfo", () => {
    // 確定した適合/非互換が1件でもあれば true
    it("比較相手が存在する場合は true を返す", () => {
        // 判定済みと未確認が混在するパーツ
        const parts = [createPart({id: 1}), createPart({id: 2})]
        // パーツIDごとの適合判定結果
        const compatibilityByPartId = new Map<number, CompatibilityResult | null>([
            [1, null],
            [2, compatibility("compatible")],
        ])

        expect(hasCompatibilityInfo(parts, compatibilityByPartId)).toBe(true)
    })

    // 全て未確認(null)なら false（比較相手なし）
    it("全て未確認の場合は false を返す", () => {
        // 判定結果が未確認のパーツ
        const parts = [createPart({id: 1})]
        // パーツIDごとの適合判定結果
        const compatibilityByPartId = new Map<number, CompatibilityResult | null>([
            [1, null],
        ])

        expect(hasCompatibilityInfo(parts, compatibilityByPartId)).toBe(false)
    })
})

// 適用中の絞り込み条件数の集計を保証
describe("countActiveFilters", () => {
    // 空の規格フィルターは数に含めない
    it("適用中の条件数を数える", () => {
        expect(countActiveFilters(initialCandidateFilterState)).toBe(0)
        expect(countActiveFilters(filters({
            brands: ["Shimano"],
            viewMode: "compatibleOnly",
            cockpits: ["included"],
            modelYears: [2025],
            integratedHandlebarOnly: true,
            specs: {freehub_body: ["sram_xdr"], wheel_diameter: []},
        }))).toBe(6)
    })
})

// 候補年式の収集と並びを保証
describe("collectModelYears", () => {
    // 年式は重複を除き、昇順で返す（未設定は対象外）
    it("候補に実在する年式を昇順で重複なく返す", () => {
        // 年式が重複・未設定のパーツ
        const parts = [
            createPart({id: 1, modelYear: 2025}),
            createPart({id: 2, modelYear: 2023}),
            createPart({id: 3, modelYear: 2025}),
            createPart({id: 4, modelYear: null}),
        ]

        expect(collectModelYears(parts)).toEqual([2023, 2025])
    })
})

// 年式による候補の絞り込みを保証
describe("filterCandidateParts 年式", () => {
    // 選択した年式だけを残し、年式未設定の製品は除外
    it("選択した年式のみを残し、未設定は除外する", () => {
        // 年式が異なるテスト用パーツ
        const parts = [
            createPart({id: 1, modelYear: 2024}),
            createPart({id: 2, modelYear: 2025}),
            createPart({id: 3, modelYear: null}),
        ]

        // 絞り込み結果
        const result = filterCandidateParts(
            parts,
            filters({modelYears: [2025]}),
            new Map(),
        )

        expect(result.map((part) => part.id)).toEqual([2])
    })

    // 未選択なら年式で絞り込まない
    it("年式が未選択なら絞り込まない", () => {
        // 年式が異なるテスト用パーツ
        const parts = [
            createPart({id: 1, modelYear: 2024}),
            createPart({id: 2, modelYear: null}),
        ]

        // 絞り込み結果
        const result = filterCandidateParts(parts, filters({}), new Map())

        expect(result.map((part) => part.id)).toEqual([1, 2])
    })
})

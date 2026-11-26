import {describe, expect, it} from "vitest"

import {diagnoseBuild} from "@/features/simulator/buildDiagnosis"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"
import type {Part} from "@/types/part"

// 診断テスト用のパーツを生成
function part(
    id: number,
    categoryKey: string,
    specifications: Record<string, string> = {},
): Part {
    return {
        id,
        name: `Part ${id}`,
        brandName: "Brand",
        categoryKey,
        price: 100,
        weight: 100,
        blockedCategoryKeys: [],
        specifications,
    }
}

// 構成診断の判定と案内メッセージを保証
describe("diagnoseBuild", () => {
    // 空の構成を未選択として扱うことを保証
    it("空の構成を未選択として診断する", () => {
        // 構成診断の結果
        const diagnosis = diagnoseBuild({}, [])

        expect(diagnosis.status).toBe("empty")
        expect(diagnosis.missingCount).toBeGreaterThan(0)
    })

    // パーツ間のホイール径不一致を検出することを保証
    it("ホイール径の不一致を構成全体から検出する", () => {
        // ホイール径の異なる選択済みパーツ
        const selectedParts: SelectedParts = {
            wheel: part(1, "wheel", {wheel_diameter: "700C"}),
            "tire:front": part(2, "tire", {
                wheel_diameter: "650B",
                tire_width_mm: "28",
            }),
        }
        // 構成診断の結果
        const diagnosis = diagnoseBuild(selectedParts, [])

        expect(diagnosis.incompatibleCount).toBeGreaterThan(0)
        expect(diagnosis.issues.some((issue) =>
            issue.description.includes("ホイール径"),
        )).toBe(true)
    })

    // 一体型ハンドルが提供するステムを未選択に数えないことを保証
    it("一体型ハンドルがステムを提供する場合は未選択に数えない", () => {
        // ステムを占有する一体型ハンドル
        const selectedParts: SelectedParts = {
            handlebar: {
                ...part(1, "handlebar"),
                blockedCategoryKeys: ["stem"],
            },
        }
        // 構成診断の結果
        const diagnosis = diagnoseBuild(selectedParts, [])

        expect(diagnosis.issues.some((issue) =>
            issue.id === "missing:stem",
        )).toBe(false)
    })

    // コンポセットと単品の未選択時に選択方法を案内することを保証
    it("コンポセットも単品コンポーネントも未選択の場合は選択方法を案内する", () => {
        // 構成診断の結果
        const diagnosis = diagnoseBuild({}, [])
        // 選択方法の案内項目
        const issue = diagnosis.issues.find((item) =>
            item.id === "missing:groupset-or-individual-components")

        expect(issue?.slotKeys).toEqual(["groupset"])
        expect(issue?.title).toBe(
            "コンポセットまたは単品コンポーネントを選択してください",
        )
    })

    // コンポセットか単品を選ぶと案内が消えることを保証
    it.each([
        ["コンポセット", {groupset: part(1, "groupset")}],
        ["単品コンポーネント", {crankset: part(2, "crankset")}],
    ])("%sを選択すると選択方法の案内を消す", (_, selectedParts) => {
        // 構成診断の結果
        const diagnosis = diagnoseBuild(selectedParts, [])

        expect(diagnosis.issues.some((issue) =>
            issue.id === "missing:groupset-or-individual-components",
        )).toBe(false)
    })

    // フロントディレイラーだけを選んでも選択方法の案内を残すことを保証
    it("フロントディレイラーだけでは選択方法の案内を消さない", () => {
        // フロントディレイラーだけを選んだ構成
        const selectedParts: SelectedParts = {
            front_derailleur: part(1, "front_derailleur"),
        }
        // 構成診断の結果
        const diagnosis = diagnoseBuild(selectedParts, [])

        expect(diagnosis.issues.some((issue) =>
            issue.id === "missing:groupset-or-individual-components",
        )).toBe(true)
    })

    // 1xのコンポセットはフロントディレイラーを必須にしないことを保証
    it("1xコンポセットではフロントディレイラーを未選択に数えない", () => {
        // チェーンリング1枚のコンポセット
        const selectedParts: SelectedParts = {
            groupset: part(1, "groupset", {chainring_count: "1"}),
        }
        // 構成診断の結果
        const diagnosis = diagnoseBuild(selectedParts, [])

        expect(diagnosis.issues.some((issue) =>
            issue.id === "missing:front_derailleur",
        )).toBe(false)
    })

    // 1xのクランクでもフロントディレイラーを必須にしないことを保証
    it("1xクランクではフロントディレイラーを未選択に数えない", () => {
        // チェーンリング1枚のクランク
        const selectedParts: SelectedParts = {
            crankset: part(1, "crankset", {chainring_count: "1"}),
        }
        // 構成診断の結果
        const diagnosis = diagnoseBuild(selectedParts, [])

        expect(diagnosis.issues.some((issue) =>
            issue.id === "missing:front_derailleur",
        )).toBe(false)
    })

    // 2x・未登録のクランクはフロントディレイラーを必須にすることを保証
    it.each([
        ["2xクランク", {chainring_count: "2"}],
        ["規格未登録のクランク", {}],
    ])("%sではフロントディレイラーを未選択として指摘する", (_, specifications) => {
        // 指定した規格を持つクランク
        const selectedParts: SelectedParts = {
            crankset: part(1, "crankset", specifications),
        }
        // 構成診断の結果
        const diagnosis = diagnoseBuild(selectedParts, [])

        expect(diagnosis.issues.some((issue) =>
            issue.id === "missing:front_derailleur",
        )).toBe(true)
    })

    // 1x構成でフロントディレイラーを選ぶと非互換を指摘することを保証
    it.each([
        ["1xコンポセット", "groupset"],
        ["1xクランク", "crankset"],
    ])("%sとフロントディレイラーの同時選択を非互換として指摘する", (_, categoryKey) => {
        // 1xの構成パーツとフロントディレイラー
        const selectedParts: SelectedParts = {
            [categoryKey]: part(1, categoryKey, {chainring_count: "1"}),
            front_derailleur: part(2, "front_derailleur", {
                chainring_count: "2",
            }),
        }
        // 構成診断の結果
        const diagnosis = diagnoseBuild(selectedParts, [])
        // チェーンリング枚数の不一致としての指摘
        const issue = diagnosis.issues.find((item) =>
            item.severity === "incompatible" &&
            item.description.includes("チェーンリング枚数"))

        // 比較した2パーツのスロットを含む
        expect(issue?.slotKeys).toHaveLength(2)
        expect(issue?.slotKeys).toContain("front_derailleur")
        // 同じ組み合わせを二重に数えない
        expect(diagnosis.incompatibleCount).toBe(1)
    })
})

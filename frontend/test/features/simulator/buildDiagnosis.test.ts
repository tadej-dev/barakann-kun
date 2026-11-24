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
})

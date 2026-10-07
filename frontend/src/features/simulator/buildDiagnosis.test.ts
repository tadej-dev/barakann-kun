import {describe, expect, it} from "vitest"

import {diagnoseBuild} from "@/features/simulator/buildDiagnosis"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"
import type {Part} from "@/types/part"

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

describe("diagnoseBuild", () => {
    it("空の構成を未選択として診断する", () => {
        const diagnosis = diagnoseBuild({}, [])

        expect(diagnosis.status).toBe("empty")
        expect(diagnosis.missingCount).toBeGreaterThan(0)
    })

    it("ホイール径の不一致を構成全体から検出する", () => {
        const selectedParts: SelectedParts = {
            wheel: part(1, "wheel", {wheel_diameter: "700C"}),
            "tire:front": part(2, "tire", {
                wheel_diameter: "650B",
                tire_width_mm: "28",
            }),
        }
        const diagnosis = diagnoseBuild(selectedParts, [])

        expect(diagnosis.incompatibleCount).toBeGreaterThan(0)
        expect(diagnosis.issues.some((issue) =>
            issue.description.includes("ホイール径"),
        )).toBe(true)
    })

    it("一体型ハンドルがステムを提供する場合は未選択に数えない", () => {
        const selectedParts: SelectedParts = {
            handlebar: {
                ...part(1, "handlebar"),
                blockedCategoryKeys: ["stem"],
            },
        }
        const diagnosis = diagnoseBuild(selectedParts, [])

        expect(diagnosis.issues.some((issue) =>
            issue.id === "missing:stem",
        )).toBe(false)
    })

    it("コンポセットも単品コンポーネントも未選択の場合は選択方法を案内する", () => {
        const diagnosis = diagnoseBuild({}, [])
        const issue = diagnosis.issues.find((item) =>
            item.id === "missing:groupset-or-individual-components")

        expect(issue?.slotKeys).toEqual(["groupset"])
        expect(issue?.title).toBe(
            "コンポセットまたは単品コンポーネントを選択してください",
        )
    })

    it.each([
        ["コンポセット", {groupset: part(1, "groupset")}],
        ["単品コンポーネント", {crankset: part(2, "crankset")}],
    ])("%sを選択すると選択方法の案内を消す", (_, selectedParts) => {
        const diagnosis = diagnoseBuild(selectedParts, [])

        expect(diagnosis.issues.some((issue) =>
            issue.id === "missing:groupset-or-individual-components",
        )).toBe(false)
    })
})

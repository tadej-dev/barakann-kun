import {describe, expect, it} from "vitest"

import {
    getPartDisplayName,
    hasPartVariantColumn,
} from "@/features/simulator/partDisplay"
import type {Part} from "@/types/part"

function createPart(
    name: string,
    brandName: string,
    modelName?: string | null,
): Pick<Part, "name" | "modelName" | "brandName"> {
    return {name, brandName, modelName}
}

function createMetadata(
    variantName?: string | null,
    specifications: Record<string, string> = {},
): Pick<Part, "variantName" | "specifications"> {
    return {variantName, specifications}
}

describe("getPartDisplayName", () => {
    it("製品名の先頭にあるブランド名を除去する", () => {
        expect(getPartDisplayName(
            createPart(
                "Shimano Ultegra CS-R8100",
                "Shimano",
            ),
        )).toBe("Ultegra CS-R8100")
    })

    it("modelNameを優先して表示する", () => {
        expect(getPartDisplayName(
            createPart(
                "Cervelo S5 2025",
                "Cervelo",
                "Cervelo S5",
            ),
        )).toBe("S5")
    })

    it("ブランド名の大文字小文字が異なっても除去する", () => {
        expect(getPartDisplayName(
            createPart("sram Rival AXS", "SRAM"),
        )).toBe("Rival AXS")
    })

    it("ブランド名が先頭にない製品名はそのまま表示する", () => {
        expect(getPartDisplayName(
            createPart("SuperSix EVO", "Cannondale"),
        )).toBe("SuperSix EVO")
    })

    it("ブランド名と製品名が同じ場合は空文字にしない", () => {
        expect(getPartDisplayName(
            createPart("Shimano", "Shimano"),
        )).toBe("Shimano")
    })

    it("バリエーションと仕様がすべて空なら列を非表示にする", () => {
        expect(hasPartVariantColumn([
            createMetadata(),
            createMetadata(""),
        ])).toBe(false)
    })

    it("仕様がある場合はバリエーション列を表示する", () => {
        expect(hasPartVariantColumn([
            createMetadata(null, {wheel_diameter: "700C"}),
        ])).toBe(true)
    })
})

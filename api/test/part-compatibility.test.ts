import {describe, expect, it} from "vitest"

import {findIncompatiblePartPairs} from "../src/db/part-compatibility"

function part(
    id: number,
    categoryKey: string,
    specifications: Record<string, string> = {},
    blockedCategoryKeys: string[] = [],
) {
    return {
        id,
        categoryKey,
        specifications,
        blockedCategoryKeys,
    }
}

describe("保存構成の規格適合チェック", () => {
    it("専用フレームと異なるコックピットを不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "frame",
                part: part(1, "frame", {
                    cockpit_interface: "canyon_cp0018",
                    cockpit_connection: "integrated_only",
                }),
            },
            {
                slotKey: "handlebar",
                part: part(2, "handlebar", {
                    cockpit_interface: "standard_1_1_8",
                }),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.slotKeys).toEqual(["frame", "handlebar"])
        expect(issues[0]?.partIds).toEqual([1, 2])
    })

    it("前輪と後輪の規格は混ぜずに判定する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "wheel",
                part: part(1, "wheel", {wheel_diameter: "700C"}),
            },
            {
                slotKey: "tire:front",
                part: part(2, "tire", {
                    wheel_diameter: "650B",
                    tire_width_mm: "28",
                }),
            },
            {
                slotKey: "tire:rear",
                part: part(3, "tire", {
                    wheel_diameter: "700C",
                    tire_width_mm: "28",
                }),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.slotKeys).toEqual(["tire:front", "wheel"])
    })

    it("規格が未登録の組み合わせは保存拒否対象にしない", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "wheel",
                part: part(1, "wheel"),
            },
            {
                slotKey: "tire:front",
                part: part(2, "tire", {tire_width_mm: "28"}),
            },
        ])

        expect(issues).toEqual([])
    })

    it("カテゴリーを占有する一体型パーツとの二重登録を検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "handlebar",
                part: part(1, "handlebar", {}, ["stem"]),
            },
            {
                slotKey: "stem",
                part: part(2, "stem"),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.partIds).toEqual([1, 2])
    })
})

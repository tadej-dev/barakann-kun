import {describe, expect, it} from "vitest"

import {
    calculateSelectedPartsTotals,
    evaluatePartCompatibility,
    getSpecificationValueLabel,
} from "@/features/simulator/partCompatibility"
import {createPartSlot} from "@/features/simulator/partSlots"
import type {Part} from "@/types/part"

function createPart(
    id: number,
    name: string,
    categoryKey: string,
    specifications: Record<string, string>,
): Part {
    return {
        id,
        name,
        categoryKey,
        specifications,
        brandName: "Test Brand",
        weight: 100,
        price: 1000,
        blockedCategoryKeys: [],
    }
}

describe("evaluatePartCompatibility", () => {
    it("内部用のパッド形状を表示名へ変換する", () => {
        expect(getSpecificationValueLabel(
            "pad_family",
            "shimano_road_flat_mount",
        )).toBe("Shimano ロード用フラットマウント形状")
    })

    it("タイヤ幅がチューブの対応範囲内なら適合する", () => {
        const tire = createPart(1, "Tire", "tire", {
            wheel_diameter: "700C",
            tire_width_mm: "28",
        })
        const tube = createPart(2, "Tube", "inner_tube", {
            wheel_diameter: "700C",
            min_tire_width_mm: "25",
            max_tire_width_mm: "32",
        })

        const result = evaluatePartCompatibility(
            tube,
            createPartSlot("inner_tube", "front"),
            {"tire:front": tire},
        )

        expect(result?.status).toBe("compatible")
    })

    it("タイヤ幅がチューブの対応範囲外なら競合として扱う", () => {
        const tire = createPart(1, "Tire", "tire", {
            wheel_diameter: "700C",
            tire_width_mm: "35",
        })
        const tube = createPart(2, "Tube", "inner_tube", {
            wheel_diameter: "700C",
            min_tire_width_mm: "20",
            max_tire_width_mm: "28",
        })

        const result = evaluatePartCompatibility(
            tube,
            createPartSlot("inner_tube", "front"),
            {"tire:front": tire},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.conflictingSlotKeys).toEqual(["tire:front"])
    })

    it("規格不足は非互換ではなく未確認にする", () => {
        const caliper = createPart(1, "Caliper", "brake_caliper", {})
        const pad = createPart(2, "Pad", "brake_pad", {
            pad_family: "shimano_road_flat_mount",
        })

        const result = evaluatePartCompatibility(
            pad,
            createPartSlot("brake_pad", "front"),
            {"brake_caliper:front": caliper},
        )

        expect(result?.status).toBe("unknown")
    })

    it("前輪専用タイヤは後輪で非互換にする", () => {
        const tire = createPart(1, "Front Tire", "tire", {
            allowed_position: "front",
        })

        const result = evaluatePartCompatibility(
            tire,
            createPartSlot("tire", "rear"),
            {},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.selectionBlocked).toBe(true)
    })

    it("フレームと規格が異なる候補はフレームを解除せず選択不可にする", () => {
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "canyon_cp0018",
        })
        const handlebar = createPart(2, "Handlebar", "handlebar", {
            cockpit_interface: "standard_road",
        })

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.selectionBlocked).toBe(true)
        expect(result?.conflictingSlotKeys).toEqual([])
    })

    it("規格情報が両方にない将来用ルールは判定結果を表示しない", () => {
        const frame = createPart(1, "Frame", "frame", {})
        const handlebar = createPart(2, "Handlebar", "handlebar", {})

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result).toBeNull()
    })

    it("キャリパーとパッドの形状が異なる場合は競合として扱う", () => {
        const caliper = createPart(1, "Caliper", "brake_caliper", {
            pad_family: "shimano_road_flat_mount",
        })
        const pad = createPart(2, "Pad", "brake_pad", {
            pad_family: "campagnolo_db310",
        })

        const result = evaluatePartCompatibility(
            pad,
            createPartSlot("brake_pad", "front"),
            {"brake_caliper:front": caliper},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.conflictingSlotKeys).toEqual(["brake_caliper:front"])
    })

    it("前後セット商品の合計は1回だけ加算する", () => {
        const pair = createPart(1, "Pair", "tire", {
            package_unit: "pair",
        })

        expect(calculateSelectedPartsTotals({
            "tire:front": pair,
            "tire:rear": pair,
        })).toEqual({price: 1000, weight: 100})
    })
})

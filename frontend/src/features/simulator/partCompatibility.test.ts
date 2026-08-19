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

// 規格が一致する場合・不明な場合・明確に不一致な場合の判定を確認する。
describe("evaluatePartCompatibility", () => {
    // DBの規格キーを候補一覧で読める日本語ラベルへ変換する。
    it("内部用のパッド形状を表示名へ変換する", () => {
        expect(getSpecificationValueLabel(
            "pad_family",
            "shimano_road_flat_mount",
        )).toBe("Shimano ロード用フラットマウント形状")
    })

    // チューブ側の最小・最大幅にタイヤ幅が収まる場合は選択可能にする。
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

    // 対応範囲外なら競合するタイヤのスロットも結果へ返す。
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

    // 必要な規格が片側にない場合は、誤って選択を禁止せず未確認とする。
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

    // 前後位置制約に反する候補は、選択操作自体を止める。
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

    // フレームを外して解決するのではなく、候補だけを選択不可にする。
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

    // まだ規格情報が整備されていない組み合わせは、判定UIを表示しない。
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

    // キャリパーとパッドの規格が違えば、相互に対応しない候補として扱う。
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

    // 同じペア商品を前後スロットに置いても、価格・重量を二重計上しない。
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

import {describe, expect, it} from "vitest"

import {
    createPartSlot,
    createPartSlots,
    getPartSlotCategoryKey,
    getPartSlotPosition,
    getPartSlotPositionLabel,
    getPartSlots,
    migrateLegacyPartSlotSelections,
} from "@/features/simulator/partSlots"

describe("partSlots", () => {
    it("単一選択カテゴリーでは従来のカテゴリーキーを維持する", () => {
        expect(createPartSlot("frame")).toEqual({
            key: "frame",
            categoryKey: "frame",
            position: "single",
        })
    })

    it("同じカテゴリーに前後の選択枠を作成する", () => {
        expect(createPartSlots("tire", ["front", "rear"])).toEqual([
            {
                key: "tire:front",
                categoryKey: "tire",
                position: "front",
            },
            {
                key: "tire:rear",
                categoryKey: "tire",
                position: "rear",
            },
        ])
    })

    it("選択枠キーから元のカテゴリーキーを取得する", () => {
        expect(getPartSlotCategoryKey("tire:front")).toBe("tire")
        expect(getPartSlotCategoryKey("frame")).toBe("frame")
    })

    it("選択枠キーから前後位置を取得する", () => {
        expect(getPartSlotPosition("tire:front")).toBe("front")
        expect(getPartSlotPosition("tire:rear")).toBe("rear")
        expect(getPartSlotPosition("frame")).toBe("single")
    })

    it("前後選択対象のカテゴリーに2つの選択枠を適用する", () => {
        const frontRearCategoryKeys = [
            "brake_caliper",
            "brake_pad",
            "disc_rotor",
            "tire",
            "inner_tube",
        ]

        for (const categoryKey of frontRearCategoryKeys) {
            expect(
                getPartSlots(categoryKey).map((slot) => slot.key),
            ).toEqual([
                `${categoryKey}:front`,
                `${categoryKey}:rear`,
            ])
        }

        expect(getPartSlots("frame").map((slot) => slot.key)).toEqual([
            "frame",
        ])
    })

    it("前後導入前の選択を前輪スロットへ引き継ぐ", () => {
        const selections = migrateLegacyPartSlotSelections({
            frame: "frame-part",
            disc_rotor: "legacy-rotor",
            tire: "legacy-tire",
            inner_tube: "legacy-tube",
        })

        expect(selections).toEqual({
            frame: "frame-part",
            "disc_rotor:front": "legacy-rotor",
            "tire:front": "legacy-tire",
            "inner_tube:front": "legacy-tube",
        })
    })

    it("選択位置の表示名を返す", () => {
        expect(getPartSlotPositionLabel("front")).toBe("前輪")
        expect(getPartSlotPositionLabel("rear")).toBe("後輪")
        expect(getPartSlotPositionLabel("single")).toBeNull()
    })
})

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

// 単一・前後スロットのキー変換と、旧形式データの移行結果を確認する。
describe("partSlots", () => {
    // 前後分割の対象外は、既存のカテゴリーキーをそのまま選択枠キーにする。
    it("単一選択カテゴリーでは従来のカテゴリーキーを維持する", () => {
        expect(createPartSlot("frame")).toEqual({
            key: "frame",
            categoryKey: "frame",
            position: "single",
        })
    })

    // 前後位置を指定したカテゴリーは、UIで独立して操作できる2枠を作る。
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

    // API・表示用の選択枠キーから、候補取得に使うカテゴリーキーへ戻す。
    it("選択枠キーから元のカテゴリーキーを取得する", () => {
        expect(getPartSlotCategoryKey("tire:front")).toBe("tire")
        expect(getPartSlotCategoryKey("frame")).toBe("frame")
    })

    // 単一枠と前後枠を同じ型で扱い、表示位置を判定できるようにする。
    it("選択枠キーから前後位置を取得する", () => {
        expect(getPartSlotPosition("tire:front")).toBe("front")
        expect(getPartSlotPosition("tire:rear")).toBe("rear")
        expect(getPartSlotPosition("frame")).toBe("single")
    })

    // タイヤ・ブレーキ系の対象カテゴリーだけが前後2枠になることを固定する。
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

    // v1のカテゴリー単位データを破棄せず、前輪側へ移行して互換性を保つ。
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

    // 単一枠では余計な位置ラベルを表示せず、前後枠だけ日本語ラベルを返す。
    it("選択位置の表示名を返す", () => {
        expect(getPartSlotPositionLabel("front")).toBe("前輪")
        expect(getPartSlotPositionLabel("rear")).toBe("後輪")
        expect(getPartSlotPositionLabel("single")).toBeNull()
    })
})

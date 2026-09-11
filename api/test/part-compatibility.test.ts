import {describe, expect, it} from "vitest"

import {findIncompatiblePartPairs} from "../src/db/part-compatibility"

// 保存構成の規格判定に使う最小パーツ。付属品判定に必要な項目だけを持つ。
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
    // フレーム側のコックピット規格と一致しないハンドルは、接続方式の違いに
    // よらず保存不可にし、競合する両パーツをslotKeys/partIdsへ整形して返す。
    it.each([
        [
            // 専用インターフェースのフレームへ、標準規格のハンドルを組むケース。
            "一体型専用フレーム",
            {
                cockpit_interface: "canyon_cp0018",
                cockpit_connection: "integrated_only",
            },
            {cockpit_interface: "standard_1_1_8"},
        ],
        [
            // ステムを介さずハンドルがフォークへ直結する専用フォークのケース。
            "専用フォーク(either接続)",
            {
                cockpit_interface: "cannondale_delta",
                cockpit_connection: "either",
            },
            {handlebar_clamp_mm: "31.8"},
        ],
    ])(
        "%sと規格外の通常ハンドルを不一致として検出する",
        (_label, frameSpecs, handlebarSpecs) => {
            const issues = findIncompatiblePartPairs([
                {
                    slotKey: "frame",
                    part: part(1, "frame", frameSpecs),
                },
                {
                    slotKey: "handlebar",
                    part: part(2, "handlebar", handlebarSpecs),
                },
            ])

            expect(issues).toHaveLength(1)
            expect(issues[0]?.slotKeys).toEqual(["frame", "handlebar"])
            expect(issues[0]?.partIds).toEqual([1, 2])
        },
    )

    // 前後に同じ規格でも、反対側にしか対応しないパーツ同士は混ぜて判定しない。
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

    // 規格が未登録の組み合わせは、適合不明として保存を許可する。
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
})

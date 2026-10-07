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

    // システムタグが交差すれば、規格名が違っても適合として扱う。
    it("コックピットシステムが交差するフレームとハンドルは不一致にしない", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "frame",
                part: part(1, "frame", {
                    cockpit_interface: "pinarello_ticr",
                    cockpit_system: "deda_dcr",
                    cockpit_connection: "integrated_only",
                }),
            },
            {
                slotKey: "handlebar",
                part: part(2, "handlebar", {
                    cockpit_system: "standard_1_1_8,fsa_acr,deda_dcr",
                }, ["stem"]),
            },
        ])

        expect(issues).toHaveLength(0)
    })

    // 交換可の付属コックピットは、システムが一致するハンドルへの交換を許可する。
    it("交換可の付属コックピットは適合ハンドルへの交換を不一致にしない", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "frame",
                part: part(1, "frame", {
                    cockpit_interface: "pinarello_ticr",
                    cockpit_system: "deda_dcr",
                    cockpit_replaceable: "true",
                    cockpit_connection: "integrated_only",
                }, ["handlebar", "stem"]),
            },
            {
                slotKey: "handlebar",
                part: part(2, "handlebar", {
                    cockpit_system: "standard_1_1_8,fsa_acr,deda_dcr",
                }, ["stem"]),
            },
        ])

        expect(issues).toHaveLength(0)
    })

    // 交換不可の付属コックピットは、システムが一致しても別ハンドルを不一致にする。
    it("交換不可の付属コックピットは別ハンドルを不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "frame",
                part: part(1, "frame", {
                    cockpit_interface: "canyon_cp0018",
                    cockpit_system: "canyon_cp0018",
                    cockpit_connection: "integrated_only",
                }, ["handlebar", "stem"]),
            },
            {
                slotKey: "handlebar",
                part: part(2, "handlebar", {
                    cockpit_system: "standard_1_1_8,fsa_acr,deda_dcr",
                }, ["stem"]),
            },
        ])

        expect(issues).toHaveLength(1)
    })

    // 前後に同じ規格でも、反対側にしか対応しないパーツ同士は混ぜて判定しない。
    it("前輪と後輪の規格は混ぜずに判定する", () => {        const issues = findIncompatiblePartPairs([
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

    // 複数フリーボディ対応のホイールは、対応集合に含まれるカセットを許可する。
    it("複数フリーボディ対応のホイールは集合内のカセットを不一致にしない", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "wheel",
                part: part(1, "wheel", {
                    freehub_body: "shimano_hg,sram_xdr",
                }),
            },
            {
                slotKey: "cassette",
                part: part(2, "cassette", {freehub_body: "sram_xdr"}),
            },
        ])

        expect(issues).toEqual([])
    })

    // 対応集合に含まれないカセットは保存不可として検出する。
    it("複数フリーボディ対応でも集合外のカセットを不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "wheel",
                part: part(1, "wheel", {
                    freehub_body: "shimano_hg,sram_xdr",
                }),
            },
            {
                slotKey: "cassette",
                part: part(2, "cassette", {
                    freehub_body: "campagnolo_n3w",
                }),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.slotKeys).toEqual(["cassette", "wheel"])
        expect(issues[0]?.partIds).toEqual([2, 1])
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

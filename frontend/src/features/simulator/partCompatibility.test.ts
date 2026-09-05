import {describe, expect, it} from "vitest"

import {
    calculateSelectedPartsTotals,
    evaluatePartCompatibility,
    getSpecificationValueLabel,
} from "@/features/simulator/partCompatibility"
import {createPartSlot} from "@/features/simulator/partSlots"
import type {Part, PartIncludedItem} from "@/types/part"

function createPart(
    id: number,
    name: string,
    categoryKey: string,
    specifications: Record<string, string>,
    blockedCategoryKeys: string[] = [],
    includedItems: PartIncludedItem[] = [],
): Part {
    return {
        id,
        name,
        categoryKey,
        specifications,
        brandName: "Test Brand",
        weight: 100,
        price: 1000,
        blockedCategoryKeys,
        includedItems,
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
            cockpit_connection: "integrated_only",
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

    // 既存パーツを解除してしまうフレーム変更は、候補の段階で選択不可にする。
    it("既存シートポストと径が異なるフレームは選択不可にする", () => {
        const frame = createPart(1, "Frame", "frame", {
            seatpost_diameter_mm: "27.2",
        })
        const seatpost = createPart(2, "Seatpost", "seatpost", {
            seatpost_diameter_mm: "31.6",
        })

        const result = evaluatePartCompatibility(
            frame,
            createPartSlot("frame"),
            {seatpost},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.selectionBlocked).toBe(true)
    })

    // フレーム規格が未登録でも自由に適合とはせず、確認が必要な状態を表示する。
    it("コックピット規格がないフレームは未確認として扱う", () => {
        const frame = createPart(1, "Frame", "frame", {})
        const handlebar = createPart(2, "Handlebar", "handlebar", {})

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result?.status).toBe("unknown")
        expect(result?.selectionBlocked).toBe(false)
    })

    // 専用フレームでは、規格値が欠けた汎用品を選択できないようにする。
    it("専用フレームに対する適合未確認のハンドルは選択不可にする", () => {
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "canyon_cp0018",
            cockpit_connection: "integrated_only",
        })
        const handlebar = createPart(2, "Handlebar", "handlebar", {})

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.selectionBlocked).toBe(true)
    })

    // 専用フォーク(either接続・ステム非占有)では、通常ハンドルをスルーせずフォーク規格と比較する。
    it("専用フォークと規格外の通常ハンドルは選択不可にする", () => {
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "cannondale_delta",
            cockpit_connection: "either",
        })
        const handlebar = createPart(2, "Handlebar", "handlebar", {
            handlebar_clamp_mm: "31.8",
        })

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.selectionBlocked).toBe(true)
    })

    // 専用フォークに適合する専用規格のハンドルは選択できる。
    it("専用フォークと適合する専用ハンドルは選択できる", () => {
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "cannondale_delta",
            cockpit_connection: "either",
        })
        const handlebar = createPart(2, "Handlebar", "handlebar", {
            cockpit_interface: "cannondale_delta",
        })

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result?.status).toBe("compatible")
        expect(result?.selectionBlocked).toBe(false)
    })

    // 標準フレームと通常ハンドルの間にはステムが入るため、直接の規格比較をしない。
    it("標準フレームと通常ハンドルは直接比較しない", () => {
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "standard_1_1_8",
        })
        const handlebar = createPart(2, "Handlebar", "handlebar", {
            handlebar_clamp_mm: "31.8",
        })

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result).toBeNull()
    })

    // 専用ステムが付属する場合も、通常ハンドルは付属ステムのクランプ径で判定する。
    it("専用ステム付属フレームと通常ハンドルはクランプ径で適合判定する", () => {
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "focus_cis",
            cockpit_connection: "stem",
            handlebar_clamp_mm: "31.8",
        }, ["stem"])
        const handlebar = createPart(2, "Handlebar", "handlebar", {
            handlebar_clamp_mm: "31.8",
        })

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result?.status).toBe("compatible")
        expect(result?.selectionBlocked).toBe(false)
    })

    // 一体型専用フレームでは、規格値がある通常ハンドルでも選択を許可しない。
    it("一体型専用フレームでは通常ハンドルを選択不可にする", () => {
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "colnago_cc01",
            cockpit_connection: "integrated_only",
        })
        const handlebar = createPart(2, "Handlebar", "handlebar", {
            handlebar_clamp_mm: "31.8",
        })

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.selectionBlocked).toBe(true)
    })

    // 通常ハンドルはフレーム規格ではなく、接続相手となるステムのクランプ径で判定する。
    it("通常ハンドルとステムはクランプ径で適合判定する", () => {
        const stem = createPart(1, "Stem", "stem", {
            handlebar_clamp_mm: "31.8",
        })
        const handlebar = createPart(2, "Handlebar", "handlebar", {
            handlebar_clamp_mm: "35",
        })

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {stem},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.conflictingSlotKeys).toEqual(["stem"])
    })

    // 付属コックピット枠を持つフレームでは、別売ハンドルを追加できない。
    it("コックピット付属フレームでは別のハンドルを選択不可にする", () => {
        const frame = createPart(1, "Frame", "frame", {})
        frame.blockedCategoryKeys = ["handlebar", "stem"]
        const handlebar = createPart(2, "Handlebar", "handlebar", {})

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.selectionBlocked).toBe(true)
    })

    // 一体型ハンドルを選ぶときは、既存ステムを黙って解除せず確認対象にする。
    it("一体型ハンドルと既存ステムの同時選択を確認対象にする", () => {
        const stem = createPart(1, "Stem", "stem", {})
        const handlebar = createPart(2, "Integrated Handlebar", "handlebar", {}, ["stem"])

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {stem},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.selectionBlocked).toBe(false)
        expect(result?.conflictingSlotKeys).toEqual(["stem"])
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

    // ホイール側へ追加した取付規格を使い、6ボルトローターとの不一致を検出する。
    it("ホイールとローターの取付方式が異なる場合は競合として扱う", () => {
        const wheel = createPart(1, "Wheel", "wheel", {
            rotor_mount: "center_lock",
        })
        const rotor = createPart(2, "Rotor", "disc_rotor", {
            rotor_mount: "6_bolt",
        })

        const result = evaluatePartCompatibility(
            rotor,
            createPartSlot("disc_rotor", "front"),
            {wheel},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.reasons).toContain("ローター取付方式が一致しません")
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

    // 占有枠の付属品は数量込みの重量を加算し、価格は加算しない。
    it("カテゴリー付き付属品の重量を合計に加算する", () => {
        const frame: Part = {
            ...createPart(1, "Frame", "frame", {}),
            weight: 780,
            includedItems: [
                {
                    name: "Basso Fuga Integrated Handlebar",
                    quantity: 1,
                    categoryKey: "handlebar",
                    weight: 320,
                },
                {
                    name: "Basso Piuma Seatpost",
                    quantity: 1,
                    categoryKey: "seatpost",
                    weight: 200,
                },
            ],
        }

        expect(calculateSelectedPartsTotals({frame}))
            .toEqual({price: 1000, weight: 780 + 320 + 200})
    })

    // カテゴリーなし付属品（クリート等）は完成重量へ加算しない。
    it("カテゴリーなし付属品の重量は合計に加算しない", () => {
        const pedal: Part = {
            ...createPart(1, "Pedal", "pedal", {}),
            includedItems: [{
                name: "SPD-SLクリートセット",
                quantity: 1,
                categoryKey: null,
                weight: 100,
            }],
        }

        expect(calculateSelectedPartsTotals({pedal}))
            .toEqual({price: 1000, weight: 100})
    })

    // 前後セット商品の付属品も、親商品と一緒に1回だけ加算する。
    it("前後セット商品の付属品は二重計上しない", () => {
        const pair: Part = {
            ...createPart(1, "Pair", "tire", {package_unit: "pair"}),
            includedItems: [{
                name: "チューブ",
                quantity: 1,
                categoryKey: "inner_tube",
                weight: 50,
            }],
        }

        expect(calculateSelectedPartsTotals({
            "tire:front": pair,
            "tire:rear": pair,
        })).toEqual({price: 1000, weight: 100 + 50})
    })
})

import {describe, expect, it} from "vitest"

import {buildCompatibilitySummary} from "@/features/simulator/compatibilitySummary"
import type {CompatibilityCounterpart} from "@/features/simulator/partCompatibility"

const categoryDisplayNames = {
    frame: "フレーム",
    cassette: "カセットスプロケット",
    disc_rotor: "ディスクローター",
}

describe("buildCompatibilitySummary", () => {
    // 非互換・未確認・互換の順に行をまとめ、非互換には合わない値を併記する。
    it("状態ごとの行にまとめ、非互換には両側の値を併記する", () => {
        const counterparts: CompatibilityCounterpart[] = [
            {
                slotKey: "frame",
                partName: "Frame A",
                status: "compatible",
                reasons: [],
                details: [{
                    label: "ホイール径",
                    status: "compatible",
                    specificationKey: "wheel_diameter",
                    candidateValue: "700C",
                    selectedValue: "700C",
                }],
            },
            {
                slotKey: "cassette",
                partName: "Cassette B",
                status: "incompatible",
                reasons: [],
                details: [{
                    label: "フリーボディ",
                    status: "incompatible",
                    specificationKey: "freehub_body",
                    candidateValue: "shimano_hg",
                    selectedValue: "sram_xdr",
                }],
            },
        ]

        const lines = buildCompatibilitySummary(counterparts, categoryDisplayNames)

        expect(lines.map((line) => line.label)).toEqual(["非互換", "互換"])
        expect(lines[0]?.items[0]?.text).toBe(
            "フリーボディ（カセットスプロケット：Shimano HG／SRAM XDR）",
        )
        expect(lines[1]?.items[0]?.text).toBe("ホイール径")
    })

    // 前後のローターのように同じ文になる項目は1つにまとめる。
    it("同じ文になる互換項目は1つにまとめる", () => {
        const createRotor = (slotKey: string): CompatibilityCounterpart => ({
            slotKey,
            partName: "Rotor",
            status: "compatible",
            reasons: [],
            details: [{
                label: "ローター取付方式",
                status: "compatible",
                specificationKey: "rotor_mount",
                candidateValue: "centerlock",
                selectedValue: "centerlock",
            }],
        })

        const lines = buildCompatibilitySummary(
            [createRotor("disc_rotor:front"), createRotor("disc_rotor:rear")],
            categoryDisplayNames,
        )

        expect(lines).toHaveLength(1)
        expect(lines[0]?.items.map((item) => item.text)).toEqual(["ローター取付方式"])
    })

    // 片側の値が未登録の未確認は、相手だけを行内に出し、値は詳細に回す。
    it("未確認は相手を添え、詳細に未登録側を示す", () => {
        const lines = buildCompatibilitySummary([{
            slotKey: "frame",
            partName: "Frame A",
            status: "unknown",
            reasons: [],
            details: [{
                label: "ホイール径",
                status: "unknown",
                specificationKey: "wheel_diameter",
                candidateValue: "700C",
            }],
        }], categoryDisplayNames)

        expect(lines[0]?.label).toBe("未確認")
        expect(lines[0]?.items[0]?.text).toBe("ホイール径（フレーム）")
        expect(lines[0]?.items[0]?.title).toContain("未登録")
    })
})

import {describe, expect, it} from "vitest"

import {findIncompatiblePartPairs} from "../src/db/part-compatibility"

// 保存構成の規格判定に使う最小パーツ（ID・カテゴリー・規格・占有カテゴリー）
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

// 保存構成のパーツ組み合わせで規格不一致を検出
describe("保存構成の規格適合チェック", () => {
    // フレーム側のコックピット規格と一致しないハンドルは、接続方式の違いに
    // よらず保存不可にし、競合する両パーツをslotKeys/partIdsへ整形して返す
    it.each([
        [
            // 専用インターフェースのフレームへ、標準規格のハンドルを組むケース
            "一体型専用フレーム",
            {
                cockpit_interface: "canyon_cp0018",
                cockpit_connection: "integrated_only",
            },
            {cockpit_interface: "standard_1_1_8"},
        ],
        [
            // ステムを介さずハンドルがフォークへ直結する専用フォークのケース
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

    // システムタグが交差すれば、規格名が違っても適合として扱う
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

    // 交換可の付属コックピットは、システムが一致するハンドルへの交換を許可
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

    // 交換不可の付属コックピットは、システムが一致しても別ハンドルを不一致にする
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

    // 前後に同じ規格でも、反対側にしか対応しないパーツ同士は混ぜて判定しない
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

    // 複数フリーボディ対応のホイールは、対応集合に含まれるカセットを許可
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

    // 対応集合に含まれないカセットは保存不可として検出
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

    // XDRドライバは1.85mmスペーサー併用でXDカセットを受け入れる
    it("XDRドライバのホイールはXDカセットを不一致にしない", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "wheel",
                part: part(1, "wheel", {freehub_body: "sram_xdr"}),
            },
            {
                slotKey: "cassette",
                part: part(2, "cassette", {freehub_body: "sram_xd"}),
            },
        ])

        expect(issues).toEqual([])
    })

    // XDドライバはXDRカセットを受け入れないため、保存不可として検出
    it("XDドライバのホイールはXDRカセットを不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "wheel",
                part: part(1, "wheel", {freehub_body: "sram_xd"}),
            },
            {
                slotKey: "cassette",
                part: part(2, "cassette", {freehub_body: "sram_xdr"}),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.slotKeys).toEqual(["cassette", "wheel"])
        expect(issues[0]?.partIds).toEqual([2, 1])
    })

    // 複数対応ホイールでも、受入対象の値が含まれればXDカセットを許可
    it("複数対応ホイールは受入対象のXDカセットを不一致にしない", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "wheel",
                part: part(1, "wheel", {
                    freehub_body: "shimano_hg,sram_xdr",
                }),
            },
            {
                slotKey: "cassette",
                part: part(2, "cassette", {freehub_body: "sram_xd"}),
            },
        ])

        expect(issues).toEqual([])
    })

    // 700Cと29インチは同じリム径なので、保存時の判定でも不一致にしない
    it("700Cフレームと29インチホイールは同じ規格として不一致にしない", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "frame",
                part: part(1, "frame", {wheel_diameter: "700C"}),
            },
            {
                slotKey: "wheel",
                part: part(2, "wheel", {wheel_diameter: "29"}),
            },
        ])

        expect(issues).toEqual([])
    })

    // 等価でないホイール径は保存不可として検出
    it("700Cフレームと650Bホイールを不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "frame",
                part: part(1, "frame", {wheel_diameter: "700C"}),
            },
            {
                slotKey: "wheel",
                part: part(2, "wheel", {wheel_diameter: "650B"}),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.slotKeys).toEqual(["frame", "wheel"])
        expect(issues[0]?.partIds).toEqual([1, 2])
    })

    // 規格が未登録の組み合わせは、適合不明として保存を許可
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

    // チェーンリング枚数が食い違う組み合わせは保存不可として検出
    it("1xクランクと2xフロントディレイラーを不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "crankset",
                part: part(1, "crankset", {chainring_count: "1"}),
            },
            {
                slotKey: "front_derailleur",
                part: part(2, "front_derailleur", {chainring_count: "2"}),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.slotKeys).toEqual(["crankset", "front_derailleur"])
        expect(issues[0]?.reasons.join("、")).toContain("チェーンリング枚数")
    })

    // チェーンリング枚数が一致する組み合わせは不一致にしない
    it("2xクランクと2xフロントディレイラーを不一致にしない", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "crankset",
                part: part(1, "crankset", {chainring_count: "2"}),
            },
            {
                slotKey: "front_derailleur",
                part: part(2, "front_derailleur", {chainring_count: "2"}),
            },
        ])

        expect(issues).toEqual([])
    })

    // 前輪専用タイヤを後輪スロットへ置いた構成は保存不可として検出
    it("前輪専用タイヤを後輪に置いた構成を不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "tire:rear",
                part: part(1, "tire", {allowed_position: "front"}),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.status).toBe("incompatible")
        expect(issues[0]?.slotKeys).toEqual(["tire:rear"])
        expect(issues[0]?.partIds).toEqual([1])
        expect(issues[0]?.reasons[0]).toContain("前輪専用")
    })

    // 対応位置とスロット位置が一致する構成は不一致にしない
    it("前輪専用タイヤを前輪に置いた構成を不一致にしない", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "tire:front",
                part: part(1, "tire", {allowed_position: "front"}),
            },
        ])

        expect(issues).toEqual([])
    })

    // 占有された専用ステムを一体型ハンドルで置き換えられない
    it("専用ステムを占有するフレームへの一体型ハンドルを不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "frame",
                part: part(1, "frame", {
                    cockpit_interface: "standard_1_1_8",
                }, ["stem"]),
            },
            {
                slotKey: "handlebar",
                part: part(2, "handlebar", {
                    cockpit_interface: "standard_1_1_8",
                }, ["stem"]),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.slotKeys).toEqual(["frame", "handlebar"])
    })

    // チェーン規格が一致しないチェーンとカセットは保存不可として検出
    it("チェーン規格が一致しないチェーンとカセットを不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "chain",
                part: part(1, "chain", {chain_standard: "sram_flattop"}),
            },
            {
                slotKey: "cassette",
                part: part(2, "cassette", {chain_standard: "shimano_hg"}),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.slotKeys).toEqual(["cassette", "chain"])
        expect(issues[0]?.reasons.join("、")).toContain("チェーン規格")
    })

    // カンマ区切りの対応規格が重なる場合は保存を許可
    it("チェーン規格がカンマ区切りで交差するチェーンとカセットを不一致にしない", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "chain",
                part: part(1, "chain", {
                    chain_standard: "shimano_hg,sram_flattop",
                }),
            },
            {
                slotKey: "cassette",
                part: part(2, "cassette", {chain_standard: "sram_flattop"}),
            },
        ])

        expect(issues).toEqual([])
    })

    // リアディレイラーの上限を超えるカセットは保存不可として検出
    it("リアディレイラーの上限を超えるカセットを不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "rear_derailleur",
                part: part(1, "rear_derailleur", {max_sprocket_teeth: "36"}),
            },
            {
                slotKey: "cassette",
                part: part(2, "cassette", {max_sprocket_teeth: "42"}),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.slotKeys).toEqual(["cassette", "rear_derailleur"])
        expect(issues[0]?.reasons.join("、")).toContain("最大スプロケット歯数")
    })

    // 上限ちょうどのカセットは保存を許可
    it("リアディレイラーの上限ちょうどのカセットを不一致にしない", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "rear_derailleur",
                part: part(1, "rear_derailleur", {max_sprocket_teeth: "36"}),
            },
            {
                slotKey: "cassette",
                part: part(2, "cassette", {max_sprocket_teeth: "36"}),
            },
        ])

        expect(issues).toEqual([])
    })

    // 上限値が数値でない場合は適否を断定せず保存を許可
    it("最大スプロケット歯数が数値でない組み合わせは保存を許可する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "rear_derailleur",
                part: part(1, "rear_derailleur", {max_sprocket_teeth: "36T"}),
            },
            {
                slotKey: "cassette",
                part: part(2, "cassette", {max_sprocket_teeth: "42"}),
            },
        ])

        expect(issues).toEqual([])
    })

    // 上限値が片側だけ未登録の場合は未確認として保存を許可
    it("最大スプロケット歯数が片側だけ未登録の組み合わせは保存を許可する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "rear_derailleur",
                part: part(1, "rear_derailleur", {max_sprocket_teeth: "36"}),
            },
            {
                slotKey: "cassette",
                part: part(2, "cassette", {}),
            },
        ])

        expect(issues).toEqual([])
    })

    // フロントディレイラーの上限を超えるクランクは保存不可として検出
    it("フロントディレイラーの上限を超えるクランクを不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "front_derailleur",
                part: part(1, "front_derailleur", {max_chainring_teeth: "50"}),
            },
            {
                slotKey: "crankset",
                part: part(2, "crankset", {max_chainring_teeth: "53"}),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.reasons.join("、")).toContain("最大チェーンリング歯数")
    })

    // ブレーキフルードが異なるレバーとキャリパーは保存不可として検出
    it("ブレーキフルードが異なるレバーとキャリパーを不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "shift_brake_lever",
                part: part(1, "shift_brake_lever", {
                    brake_actuation: "hydraulic",
                    brake_fluid: "mineral_oil",
                }),
            },
            {
                slotKey: "brake_caliper:front",
                part: part(2, "brake_caliper", {
                    brake_actuation: "hydraulic",
                    brake_fluid: "dot_4",
                }),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.reasons.join("、")).toContain("ブレーキフルード")
    })

    // フレームの対応ローター径を超えるローターは保存不可として検出
    it("フレームの対応ローター径を超えるローターを不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "frame",
                part: part(1, "frame", {max_rotor_diameter_mm: "160"}),
            },
            {
                slotKey: "disc_rotor:front",
                part: part(2, "disc_rotor", {rotor_diameter_mm: "180"}),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.slotKeys).toEqual(["disc_rotor:front", "frame"])
        expect(issues[0]?.reasons.join("、")).toContain("対応ローター径")
    })

    // 後輪アクスルが一致しないフレームとホイールは保存不可として検出
    it("後輪アクスルが一致しないフレームとホイールを不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "frame",
                part: part(1, "frame", {rear_axle: "12x142"}),
            },
            {
                slotKey: "wheel",
                part: part(2, "wheel", {rear_axle: "qr_135"}),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.slotKeys).toEqual(["frame", "wheel"])
        expect(issues[0]?.reasons.join("、")).toContain("後輪アクスル")
    })

    // ホイールの複数対応にフレームのアクスルが含まれれば保存を許可
    it("後輪アクスルの対応が交差するフレームとホイールを不一致にしない", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "frame",
                part: part(1, "frame", {rear_axle: "12x142"}),
            },
            {
                slotKey: "wheel",
                part: part(2, "wheel", {rear_axle: "12x142,qr_135"}),
            },
        ])

        expect(issues).toEqual([])
    })

    // BBシェル幅の表記ゆれ（68と68.0）は同じ値として保存を許可
    it("BBシェル幅が表記ゆれでも不一致にしない", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "frame",
                part: part(1, "frame", {bb_shell_width_mm: "68"}),
            },
            {
                slotKey: "bottom_bracket",
                part: part(2, "bottom_bracket", {bb_shell_width_mm: "68.0"}),
            },
        ])

        expect(issues).toEqual([])
    })

    // BBシェル幅が異なるフレームとBBは保存不可として検出
    it("BBシェル幅が異なるフレームとBBを不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "frame",
                part: part(1, "frame", {bb_shell_width_mm: "68"}),
            },
            {
                slotKey: "bottom_bracket",
                part: part(2, "bottom_bracket", {bb_shell_width_mm: "73"}),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.slotKeys).toEqual(["bottom_bracket", "frame"])
        expect(issues[0]?.reasons.join("、")).toContain("BBシェル幅")
    })

    // サドルレールが一致しないサドルとシートポストは保存不可として検出
    it("サドルレールが一致しないサドルとシートポストを不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "saddle",
                part: part(1, "saddle", {saddle_rail: "carbon_7x9_3"}),
            },
            {
                slotKey: "seatpost",
                part: part(2, "seatpost", {saddle_rail: "carbon_7x9"}),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.slotKeys).toEqual(["saddle", "seatpost"])
        expect(issues[0]?.reasons.join("、")).toContain("サドルレール")
    })

    // ペダル軸規格が一致しないペダルとクランクは保存不可として検出
    it("ペダル軸規格が一致しないペダルとクランクを不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "pedal",
                part: part(1, "pedal", {pedal_thread: "1_2_20tpi"}),
            },
            {
                slotKey: "crankset",
                part: part(2, "crankset", {pedal_thread: "9_16_20tpi"}),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.slotKeys).toEqual(["crankset", "pedal"])
        expect(issues[0]?.reasons.join("、")).toContain("ペダル軸規格")
    })

    // フックレスリムとチューブタイヤは保存不可として検出
    it("フックレスリムとチューブタイヤを不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "wheel",
                part: part(1, "wheel", {rim_tire_interface: "hookless"}),
            },
            {
                slotKey: "tire:front",
                part: part(2, "tire", {tire_bead: "tube_type"}),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.slotKeys).toEqual(["tire:front", "wheel"])
        expect(issues[0]?.reasons).toContain(
            "フックレスリムにチューブタイヤは装着できません",
        )
    })

    // フックレスリムでもチューブレスタイヤは保存を許可
    it("フックレスリムとチューブレスタイヤを不一致にしない", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "wheel",
                part: part(1, "wheel", {rim_tire_interface: "hookless"}),
            },
            {
                slotKey: "tire:front",
                part: part(2, "tire", {tire_bead: "tubeless"}),
            },
        ])

        expect(issues).toEqual([])
    })

    // リム内幅がタイヤの推奨範囲外でも保存は許可
    it("リム内幅がタイヤの対応範囲外でも保存を止めない", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "wheel",
                part: part(1, "wheel", {rim_inner_width_mm: "26"}),
            },
            {
                slotKey: "tire:front",
                part: part(2, "tire", {
                    min_rim_inner_width_mm: "19",
                    max_rim_inner_width_mm: "25",
                }),
            },
        ])

        // 推奨範囲外は注意として扱い、保存は許可する
        expect(issues).toHaveLength(0)
    })

    // リム内幅が対応範囲の境界ちょうどなら保存を許可
    it("リム内幅がタイヤの対応範囲ちょうどなら不一致にしない", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "wheel",
                part: part(1, "wheel", {rim_inner_width_mm: "25"}),
            },
            {
                slotKey: "tire:front",
                part: part(2, "tire", {
                    min_rim_inner_width_mm: "19",
                    max_rim_inner_width_mm: "25",
                }),
            },
        ])

        expect(issues).toEqual([])
    })

    // ポスト最小挿入長がシートチューブ長を超えると保存不可として検出
    it("ポスト最小挿入長がシートチューブ長を超えると不一致として検出する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "frame",
                part: part(1, "frame", {seat_tube_depth_mm: "120"}),
            },
            {
                slotKey: "seatpost",
                part: part(2, "seatpost", {seatpost_min_insert_mm: "150"}),
            },
        ])

        expect(issues).toHaveLength(1)
        expect(issues[0]?.slotKeys).toEqual(["frame", "seatpost"])
        expect(issues[0]?.reasons.join("、")).toContain("シートチューブ長")
    })

    // フレームのシートチューブ長が未登録なら保存を許可
    it("シートチューブ長が未登録の組み合わせは保存を許可する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "frame",
                part: part(1, "frame", {}),
            },
            {
                slotKey: "seatpost",
                part: part(2, "seatpost", {seatpost_min_insert_mm: "150"}),
            },
        ])

        expect(issues).toEqual([])
    })

    // クランプ径の差が0.5mmを超える場合は未確認として保存を許可
    it("クランプ径の差が0.5mmを超える組み合わせは保存を許可する", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "shift_brake_lever",
                part: part(1, "shift_brake_lever", {control_clamp_mm: "31.8"}),
            },
            {
                slotKey: "handlebar",
                part: part(2, "handlebar", {control_clamp_mm: "32.4"}),
            },
        ])

        expect(issues).toEqual([])
    })
    // XDRドライバのホイールはXDカセットをスペーサー併用で受け入れる
    it("XDRドライバのホイールとXDカセットは不一致にしない", () => {
        const issues = findIncompatiblePartPairs([
            {
                slotKey: "wheel",
                part: part(1, "wheel", {freehub_body: "shimano_hg,sram_xdr"}),
            },
            {
                slotKey: "groupset",
                part: part(2, "groupset", {freehub_body: "sram_xd"}),
            },
        ])

        expect(issues).toEqual([])
    })

})

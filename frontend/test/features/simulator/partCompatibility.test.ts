import {describe, expect, it} from "vitest"

import {
    calculateSelectedPartsTotals,
    evaluatePartCompatibility,
    evaluateSelectedPartsCompatibility,
    getFrameCockpitBadge,
    getFrameWeightBadge,
    getSpecificationLabel,
    getSpecificationValueLabel,
    getTotalsBreakdown,
    getWeightBreakdown,
} from "@/features/simulator/partCompatibility"
import {createPartSlot} from "@/features/simulator/partSlots"
import type {Part, PartIncludedItem} from "@/types/part"

// 規格判定テスト用のパーツを生成
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

// 規格が一致する場合・不明な場合・明確に不一致な場合の判定を確認
// 判定処理は共有コア(compareParts)が担い、ここではUI向けの選択可否・競合返却を固定
describe("evaluatePartCompatibility", () => {
    // 辞書にないmm系の規格値も、単位を補って表示できるようにする
    it("mm系の規格値には単位を補って表示する", () => {
        expect(getSpecificationValueLabel(
            "rotor_diameter_mm",
            "160",
        )).toBe("160mm")
        // 小数を含むクランプ径でも同じ規則で表示
        expect(getSpecificationValueLabel(
            "handlebar_clamp_mm",
            "31.8",
        )).toBe("31.8mm")
        // 重量も同じ規則で単位を補い、重量の内訳を読めるようにする
        expect(getSpecificationValueLabel(
            "frame_weight_g",
            "755",
        )).toBe("755g")
    })

    // 真偽値で持つ規格は、英語のまま出さず日本語で示す
    it("真偽値の規格は日本語で表示する", () => {
        expect(getSpecificationValueLabel(
            "cockpit_replaceable",
            "true",
        )).toBe("交換可")
        expect(getSpecificationValueLabel(
            "cockpit_replaceable",
            "false",
        )).toBe("交換不可")
    })

    // 値ラベルを登録した規格値と、未登録の値のフォールバックを固定
    it("規格値のラベルと未登録時の表示を固定する", () => {
        expect(getSpecificationValueLabel(
            "bb_standard",
            "bb30a",
        )).toBe("BB30A")
        // 未登録の値は、キーの単位規則だけを適用して表示
        expect(getSpecificationValueLabel(
            "bb_standard",
            "unknown_value",
        )).toBe("unknown_value")
    })

    // 複数対応の規格値は、各値を日本語ラベルで並べて表示
    it("複数対応の規格値を並べて表示する", () => {
        expect(getSpecificationValueLabel(
            "freehub_body",
            "shimano_hg,sram_xdr,campagnolo_n3w",
        )).toBe("Shimano HG／SRAM XDR／Campagnolo N3W")
    })

    // チェーンリング枚数は、規格名と1x/2x/3xの値ラベルで表示する
    it("チェーンリング枚数の規格名と値ラベルを表示する", () => {
        expect(getSpecificationLabel("chainring_count")).toBe("チェーンリング枚数")
        expect(getSpecificationValueLabel("chainring_count", "1")).toBe("1x（シングル）")
        expect(getSpecificationValueLabel("chainring_count", "2")).toBe("2x（ダブル）")
        expect(getSpecificationValueLabel("chainring_count", "3")).toBe("3x（トリプル）")
    })

    // 追加した規格キーの表示名を返す
    it("チェーン・容量・ブレーキ系の規格名を表示する", () => {
        expect(getSpecificationLabel("chain_standard")).toBe("チェーン規格")
        expect(getSpecificationLabel("max_sprocket_teeth")).toBe("最大スプロケット歯数")
        expect(getSpecificationLabel("max_chainring_teeth")).toBe("最大チェーンリング歯数")
        expect(getSpecificationLabel("chainline_mm")).toBe("チェーンライン")
        expect(getSpecificationLabel("brake_actuation")).toBe("ブレーキ方式")
        expect(getSpecificationLabel("brake_fluid")).toBe("ブレーキフルード")
        expect(getSpecificationLabel("max_rotor_diameter_mm")).toBe("対応ローター径")
    })

    // 追加した規格値の表示名を返す（カンマ区切りも日本語で並べる）
    it("チェーン規格・ブレーキ方式・油種の値ラベルを表示する", () => {
        expect(getSpecificationValueLabel("chain_standard", "shimano_hg")).toBe("Shimano HG")
        expect(getSpecificationValueLabel("chain_standard", "sram_flattop")).toBe("SRAM Flattop")
        expect(getSpecificationValueLabel("chain_standard", "campagnolo")).toBe("Campagnolo")
        expect(getSpecificationValueLabel(
            "chain_standard",
            "shimano_hg,campagnolo",
        )).toBe("Shimano HG／Campagnolo")
        expect(getSpecificationValueLabel("brake_actuation", "hydraulic")).toBe("油圧")
        expect(getSpecificationValueLabel("brake_actuation", "mechanical")).toBe("機械式")
        expect(getSpecificationValueLabel("brake_fluid", "mineral_oil")).toBe("ミネラルオイル")
        expect(getSpecificationValueLabel("brake_fluid", "dot_4")).toBe("DOT 4")
        expect(getSpecificationValueLabel("brake_fluid", "dot_5_1")).toBe("DOT 5.1")
        // 歯数は単位を付けず、mm系は単位を補う
        expect(getSpecificationValueLabel("max_sprocket_teeth", "36")).toBe("36")
        expect(getSpecificationValueLabel("chainline_mm", "43.5")).toBe("43.5mm")
        expect(getSpecificationValueLabel("max_rotor_diameter_mm", "180")).toBe("180mm")
    })

    // フレームの最大タイヤ幅を超えるタイヤは、フレームを維持したまま選べない
    it("フレームの最大タイヤ幅を超えるタイヤは選択できない", () => {
        // 最大タイヤ幅30mmのフレームと幅32mmのタイヤ
        const frame = createPart(1, "Frame", "frame", {max_tire_width_mm: "30"})
        const tire = createPart(2, "Tire", "tire", {tire_width_mm: "32"})

        const result = evaluatePartCompatibility(
            tire,
            createPartSlot("tire", "front"),
            {frame},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.selectionBlocked).toBe(true)
    })

    // 最大幅以内のタイヤは適合として扱う
    it("フレームの最大タイヤ幅以内のタイヤは適合する", () => {
        // 最大タイヤ幅30mmのフレームと幅28mmのタイヤ
        const frame = createPart(1, "Frame", "frame", {max_tire_width_mm: "30"})
        const tire = createPart(2, "Tire", "tire", {tire_width_mm: "28"})

        const result = evaluatePartCompatibility(
            tire,
            createPartSlot("tire", "front"),
            {frame},
        )

        expect(result?.status).toBe("compatible")
    })

    // フレームのブレーキマウントと合わないキャリパーは選択できない
    it("ブレーキマウントが異なるキャリパーは選択できない", () => {
        // フラットマウントのフレームとポストマウントのキャリパー
        const frame = createPart(1, "Frame", "frame", {brake_mount: "flat_mount"})
        const caliper = createPart(2, "Caliper", "brake_caliper", {brake_mount: "post_mount"})

        const result = evaluatePartCompatibility(
            caliper,
            createPartSlot("brake_caliper", "front"),
            {frame},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.selectionBlocked).toBe(true)
    })

    // 段数が一致していても変速方式が異なれば、どちらの理由も残して非互換にする
    it("レバーとディレイラーは段数と変速方式の両方を判定する", () => {
        // 機械式レバーと電動ディレイラー（段数は12で一致）
        const lever = createPart(1, "Lever", "shift_brake_lever", {
            drivetrain_speed: "12",
            shift_system: "mechanical",
        })
        const derailleur = createPart(2, "RD", "rear_derailleur", {
            drivetrain_speed: "12",
            shift_system: "electronic_wireless",
        })

        const result = evaluatePartCompatibility(
            derailleur,
            createPartSlot("rear_derailleur", "single"),
            {shift_brake_lever: lever},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.reasons).toEqual([
            "対応段数が適合します",
            "変速方式が一致しません",
        ])
    })

    // カセットとチェーンの段数が異なれば非互換にする
    it("段数が異なるカセットとチェーンは非互換にする", () => {
        // 12速カセットと11速チェーン
        const cassette = createPart(1, "Cassette", "cassette", {drivetrain_speed: "12"})
        const chain = createPart(2, "Chain", "chain", {drivetrain_speed: "11"})

        const result = evaluatePartCompatibility(
            chain,
            createPartSlot("chain", "single"),
            {cassette},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.conflictingSlotKeys).toEqual(["cassette"])
    })

    // コンポセットのクランク軸規格とBBを比較
    it("コンポセットとクランク軸規格が異なるBBは非互換にする", () => {
        // クランク軸が異なるコンポセットとBB
        const groupset = createPart(1, "Groupset", "groupset", {crank_spindle: "hollowtech_ii"})
        const bottomBracket = createPart(2, "BB", "bottom_bracket", {crank_spindle: "dub"})

        const result = evaluatePartCompatibility(
            bottomBracket,
            createPartSlot("bottom_bracket", "single"),
            {groupset},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.conflictingSlotKeys).toEqual(["groupset"])
    })

    // コンポセットのフリーボディに対応するホイールは適合
    it("コンポセットのフリーボディに対応するホイールは適合する", () => {
        // SRAM XDR対応のコンポセットと複数対応ホイール
        const groupset = createPart(1, "Groupset", "groupset", {freehub_body: "sram_xdr"})
        const wheel = createPart(2, "Wheel", "wheel", {freehub_body: "shimano_hg,sram_xdr"})

        const result = evaluatePartCompatibility(
            wheel,
            createPartSlot("wheel", "single"),
            {groupset},
        )

        expect(result?.status).toBe("compatible")
    })

    // チューブ側の最小・最大幅にタイヤ幅が収まる場合は選択可能にする
    it("タイヤ幅がチューブの対応範囲内なら適合する", () => {
        // 幅28mmのタイヤと対応範囲25〜32mmのチューブ
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

    // 対応範囲外なら競合するタイヤのスロットも結果へ返す
    it("タイヤ幅がチューブの対応範囲外なら競合として扱う", () => {
        // 幅35mmのタイヤと対応範囲20〜28mmのチューブ
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

    // 必要な規格が片側にない場合は、誤って選択を禁止せず未確認と判定
    it("規格不足は非互換ではなく未確認にする", () => {
        // 規格未登録のキャリパーと形状規格ありのパッド
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

    // 前後位置制約に反する候補は、選択操作自体を止める
    it("前輪専用タイヤは後輪で非互換にする", () => {
        // 前輪専用のタイヤ
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

    // 選択済み構成でも前後位置の食い違いを非互換として返す
    it("選択済み構成で前輪専用タイヤを後輪に置くと非互換を返す", () => {
        // 後輪スロットへ置いた前輪専用タイヤ
        const issues = evaluateSelectedPartsCompatibility({
            "tire:rear": createPart(1, "Front Tire", "tire", {
                allowed_position: "front",
            }),
        })

        expect(issues).toHaveLength(1)
        expect(issues[0]?.status).toBe("incompatible")
        expect(issues[0]?.slotKeys).toEqual(["tire:rear"])
        expect(issues[0]?.reasons[0]).toContain("前輪専用")
    })

    // 対応位置とスロット位置が一致する専用品は非互換にしない
    it("前輪専用タイヤを前輪に置くと位置の非互換を返さない", () => {
        // 前輪スロットへ置いた前輪専用タイヤ
        const issues = evaluateSelectedPartsCompatibility({
            "tire:front": createPart(1, "Front Tire", "tire", {
                allowed_position: "front",
            }),
        })

        expect(issues).toEqual([])
    })

    // 枚数が食い違うクランクとフロントディレイラーは同時に選べない
    it("1xクランクと2xフロントディレイラーは非互換にする", () => {
        // 1xクランクと2xフロントディレイラー
        const crankset = createPart(1, "Crankset", "crankset", {
            chainring_count: "1",
        })
        const frontDerailleur = createPart(2, "FD", "front_derailleur", {
            chainring_count: "2",
        })

        const result = evaluatePartCompatibility(
            frontDerailleur,
            createPartSlot("front_derailleur"),
            {crankset},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.conflictingSlotKeys).toEqual(["crankset"])
        expect(result?.reasons.join("、")).toContain("チェーンリング枚数")
    })

    // 枚数が一致するクランクとフロントディレイラーは適合にする
    it("2xクランクと2xフロントディレイラーは適合にする", () => {
        // 2xクランクと2xフロントディレイラー
        const crankset = createPart(1, "Crankset", "crankset", {
            chainring_count: "2",
        })
        const frontDerailleur = createPart(2, "FD", "front_derailleur", {
            chainring_count: "2",
        })

        const result = evaluatePartCompatibility(
            frontDerailleur,
            createPartSlot("front_derailleur"),
            {crankset},
        )

        expect(result?.status).toBe("compatible")
    })

    // コンポセットとフロントディレイラー・クランクの枚数も比較する
    it.each([
        ["コンポセットとフロントディレイラー", "groupset", "front_derailleur"],
        ["コンポセットとクランク", "groupset", "crankset"],
    ])("%sのチェーンリング枚数が食い違う場合は非互換にする", (
        _label,
        selectedCategory,
        candidateCategory,
    ) => {
        // 2xのコンポセットと1xの構成パーツ
        const groupset = createPart(1, "Groupset", "groupset", {
            chainring_count: "2",
        })
        const candidate = createPart(2, "Candidate", candidateCategory, {
            chainring_count: "1",
        })

        const result = evaluatePartCompatibility(
            candidate,
            createPartSlot(candidateCategory),
            {[selectedCategory]: groupset},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.reasons.join("、")).toContain("チェーンリング枚数")
    })

    // 占有された専用ステムを一体型ハンドルで置き換えられない
    it("専用ステムを占有するフレームに一体型ハンドルは選択できない", () => {
        // 専用ステムを占有し、ステム式のみを受け付けるフレームと一体型ハンドル
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "standard_1_1_8",
            cockpit_connection: "integrated_only",
        }, ["stem"])
        const handlebar = createPart(2, "Integrated", "handlebar", {
            cockpit_interface: "standard_1_1_8",
        }, ["stem"])

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.selectionBlocked).toBe(true)
    })

    // 一体型・ステム式の両対応フレームは、付属ステムを外して一体型へ交換できる
    it("一体型とステム式の両対応フレームは一体型ハンドルを許可する", () => {
        // Tarmac SL8のように、付属ステムを持ち両対応のフレーム
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "standard_1_1_8",
            cockpit_connection: "either",
            steerer_standard: "tapered_1_1_8_1_5",
        }, ["stem"])
        const handlebar = createPart(2, "Roval Rapide Cockpit", "handlebar", {
            cockpit_interface: "standard_1_1_8",
            steerer_clamp_mm: "28.6",
        }, ["stem"])

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result?.status).toBe("compatible")
    })

    // 交換可の付属コックピットなら、一体型ハンドルの交換を許可する
    it("交換可の専用ステムなら一体型ハンドルを許可する", () => {
        // 専用ステムを占有するが交換可のフレームと一体型ハンドル
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "standard_1_1_8",
            cockpit_replaceable: "true",
        }, ["stem"])
        const handlebar = createPart(2, "Integrated", "handlebar", {
            cockpit_interface: "standard_1_1_8",
        }, ["stem"])

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result?.status).toBe("compatible")
    })

    // フレームを外して解決するのではなく、候補だけを選択不可にする
    it("フレームと規格が異なる候補はフレームを解除せず選択不可にする", () => {
        // 専用コックピットのフレームと標準ハンドル
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

    // フレームは基準パーツ。径が異なるシートポストは解除対象にし、フレームは選択可能にする
    it("径が異なるシートポストが選択済みでもフレームは選択可能にする", () => {
        // シートポスト径27.2mmのフレームと31.6mmのシートポスト
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
        expect(result?.selectionBlocked).toBe(false)
        expect(result?.conflictingSlotKeys).toEqual(["seatpost"])
    })

    // フレーム規格が未登録でも自由に適合とはせず、確認が必要な状態を表示
    it("コックピット規格がないフレームは未確認として扱う", () => {
        // コックピット規格が未登録のフレームとハンドル
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

    // 専用フォーク(either接続・ステム非占有)では、通常ハンドルをスルーせずフォーク規格と比較
    it("専用フォークと規格外の通常ハンドルは選択不可にする", () => {
        // 専用フォークのフレームとクランプ径31.8mmのハンドル
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

    // 専用フォークに適合する専用規格のハンドルは選択できる
    it("専用フォークと適合する専用ハンドルは選択できる", () => {
        // 専用フォークと専用規格のハンドル
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

    // 標準フレームと通常ハンドルの間にはステムが入るため、直接の規格比較をしない
    it("標準フレームと通常ハンドルは直接比較しない", () => {
        // 標準コックピットのフレームとクランプ径31.8mmのハンドル
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

    // 丸型コラムのオープン規格は、標準1-1/8の一体型ハンドルも装着できる
    it("丸型オープン規格は標準一体型ハンドルを適合にする", () => {
        // 丸型オープン規格のフレームと標準一体型ハンドル
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "fsa_acr",
            cockpit_connection: "either",
        })
        const handlebar = createPart(2, "Integrated", "handlebar", {
            cockpit_interface: "standard_1_1_8",
        }, ["stem"])

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result?.status).toBe("compatible")
    })

    // D字コラムのオープン規格は標準コックピットを装着できない
    it("D字オープン規格は標準一体型ハンドルを非互換にする", () => {
        // D字オープン規格のフレームと標準一体型ハンドル
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "pinarello_ticr",
            cockpit_connection: "integrated_only",
        })
        const handlebar = createPart(2, "Integrated", "handlebar", {
            cockpit_interface: "standard_1_1_8",
        }, ["stem"])

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result?.status).toBe("incompatible")
    })

    // D字コラムのオープン規格でも、規格一致の専用コックピットは装着できる
    it("D字オープン規格は規格一致の専用ハンドルを適合にする", () => {
        // D字オープン規格のフレームと規格一致の専用ハンドル
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "pinarello_ticr",
            cockpit_connection: "integrated_only",
        })
        const handlebar = createPart(2, "Dedicated", "handlebar", {
            cockpit_interface: "pinarello_ticr",
        }, ["stem"])

        const result = evaluatePartCompatibility(
            handlebar,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result?.status).toBe("compatible")
    })

    // 標準ステムは、丸型オープン規格では適合し、D字オープン規格では非互換になる
    it("標準ステムの可否を丸型とD字のオープン規格で分ける", () => {
        // 丸型とD字のフレーム、標準ステム
        const roundFrame = createPart(1, "Frame", "frame", {
            cockpit_interface: "fsa_acr",
            cockpit_connection: "either",
        })
        const dShapedFrame = createPart(2, "Frame", "frame", {
            cockpit_interface: "pinarello_ticr",
            cockpit_connection: "either",
        })
        const stem = createPart(3, "Stem", "stem", {
            cockpit_interface: "standard_1_1_8",
        })

        const roundResult = evaluatePartCompatibility(
            stem,
            createPartSlot("stem"),
            {frame: roundFrame},
        )
        const dShapedResult = evaluatePartCompatibility(
            stem,
            createPartSlot("stem"),
            {frame: dShapedFrame},
        )

        expect(roundResult?.status).toBe("compatible")
        expect(dShapedResult?.status).toBe("incompatible")
    })

    // コラム規格から上端径を引ける場合、ステムのコラムクランプ径と比較
    it("コラム径が一致するフレームとステムは適合にする", () => {
        // テーパーコラムのフレームとコラムクランプ28.6mmのステム
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "standard_1_1_8",
            steerer_standard: "tapered_1_1_8_1_5",
        })
        const stem = createPart(2, "Stem", "stem", {
            cockpit_interface: "standard_1_1_8",
            steerer_clamp_mm: "28.6",
        })

        const result = evaluatePartCompatibility(
            stem,
            createPartSlot("stem"),
            {frame},
        )

        expect(result?.status).toBe("compatible")
        expect(result?.selectionBlocked).toBe(false)
    })

    // 1-1/4インチのコラムに1-1/8インチ用ステムは取り付けられない
    it("コラム径が異なるステムは選択不可にする", () => {
        // 1-1/4インチコラムのフレームと28.6mm用ステム
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "standard_1_1_8",
            steerer_standard: "straight_1_1_4",
        })
        const stem = createPart(2, "Stem", "stem", {
            cockpit_interface: "standard_1_1_8",
            steerer_clamp_mm: "28.6",
        })

        const result = evaluatePartCompatibility(
            stem,
            createPartSlot("stem"),
            {frame},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.selectionBlocked).toBe(true)
    })

    // 専用形状(Delta/ICS/OverDrive Aero)は径の比較をしない
    it("専用形状のコラムはコラム径で判定しない", () => {
        // 専用形状コラムのフレームと専用ステム
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "bmc_ics",
            steerer_standard: "bmc_ics",
        })
        const stem = createPart(2, "Stem", "stem", {
            cockpit_interface: "bmc_ics",
        })

        const result = evaluatePartCompatibility(
            stem,
            createPartSlot("stem"),
            {frame},
        )

        expect(result?.status).toBe("compatible")
    })

    // システムタグが交差すれば、規格名が異なっても装着できる(例: DCR車とEXS)
    it("コックピットシステムが交差するフレームとハンドルは適合にする", () => {
        // 複数システム対応のハンドルと3種のフレーム
        const dedaFrame = createPart(1, "Frame", "frame", {
            cockpit_interface: "pinarello_ticr",
            cockpit_system: "deda_dcr",
            cockpit_connection: "integrated_only",
        })
        const fsaFrame = createPart(2, "Frame", "frame", {
            cockpit_interface: "fsa_acr",
            cockpit_system: "fsa_acr",
            cockpit_connection: "either",
        })
        const standardFrame = createPart(3, "Frame", "frame", {
            cockpit_interface: "standard_1_1_8",
            cockpit_system: "standard_1_1_8",
            cockpit_connection: "either",
        })
        const barrier = createPart(4, "EXS AEROVER", "handlebar", {
            cockpit_system: "standard_1_1_8,fsa_acr,deda_dcr",
        }, ["stem"])

        for (const frame of [dedaFrame, fsaFrame, standardFrame]) {
            const result = evaluatePartCompatibility(
                barrier,
                createPartSlot("handlebar"),
                {frame},
            )

            expect(result?.status).toBe("compatible")
        }
    })

    // 交換不可の付属コックピットは、システムが一致しても別ハンドルを選べない
    it("交換不可の付属コックピットは別ハンドルを選択不可にする", () => {
        // 交換不可の付属コックピットを持つフレームと社外ハンドル
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "canyon_cp0018",
            cockpit_system: "canyon_cp0018",
            cockpit_connection: "integrated_only",
        }, ["handlebar", "stem"])
        const barrier = createPart(2, "EXS AEROVER", "handlebar", {
            cockpit_system: "standard_1_1_8,fsa_acr,deda_dcr",
        }, ["stem"])

        const result = evaluatePartCompatibility(
            barrier,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.selectionBlocked).toBe(true)
    })

    // 交換可の付属コックピットは、システムが一致するハンドルへ交換できる
    it("交換可の付属コックピットは適合するハンドルへ交換できる", () => {
        // 交換可の付属コックピットを持つフレームと社外ハンドル
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "pinarello_ticr",
            cockpit_system: "deda_dcr",
            cockpit_replaceable: "true",
            cockpit_connection: "integrated_only",
        }, ["handlebar", "stem"])
        const barrier = createPart(2, "EXS AEROVER", "handlebar", {
            cockpit_system: "standard_1_1_8,fsa_acr,deda_dcr",
        }, ["stem"])

        const result = evaluatePartCompatibility(
            barrier,
            createPartSlot("handlebar"),
            {frame},
        )

        expect(result?.status).toBe("compatible")
        expect(result?.selectionBlocked).toBe(false)
    })

    // フレームは基準パーツ。選択済みハンドルと規格が合わない場合は
    // フレーム側を選択不可にせず、解除対象にして選び直せるようにする
    it("フレーム候補は選択済みハンドルと合わない場合に解除対象にする", () => {
        // 専用コックピットのフレーム候補と選択済みハンドル
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "canyon_cp0018",
            cockpit_connection: "integrated_only",
        })
        const handlebar = createPart(2, "Integrated", "handlebar", {
            cockpit_interface: "giant_overdrive_aero",
        }, ["stem"])

        const result = evaluatePartCompatibility(
            frame,
            createPartSlot("frame"),
            {handlebar},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.selectionBlocked).toBe(false)
        expect(result?.conflictingSlotKeys).toEqual(["handlebar"])
    })

    // 専用ステムが付属する場合も、通常ハンドルは付属ステムのクランプ径で判定
    it("専用ステム付属フレームと通常ハンドルはクランプ径で適合判定する", () => {
        // 専用ステム付きフレームとクランプ径31.8mmのハンドル
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

    // 一体型専用フレームは、通常ハンドルの規格値が欠けていても選択を許可しない
    it("一体型専用フレームでは通常ハンドルを選択不可にする", () => {
        // 一体型専用フレームとクランプ径31.8mmのハンドル
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

    // 通常ハンドルはフレーム規格ではなく、接続相手となるステムのクランプ径で判定
    it("通常ハンドルとステムはクランプ径で適合判定する", () => {
        // クランプ径31.8mmのステムと35mmのハンドル
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

    // 付属コックピット枠を持つフレームでは、別売ハンドルを追加できない
    it("コックピット付属フレームでは別のハンドルを選択不可にする", () => {
        // コックピットが付属するフレームと別売ハンドル
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

    // 一体型ハンドルを選ぶときは、既存ステムを黙って解除せず確認対象にする
    it("一体型ハンドルと既存ステムの同時選択を確認対象にする", () => {
        // ステムと、ステムを占有する一体型ハンドル
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

    // キャリパーとパッドの規格が違えば、相互に対応しない候補として扱う
    it("キャリパーとパッドの形状が異なる場合は競合として扱う", () => {
        // 形状規格が異なるキャリパーとパッド
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
    // キャリパーを同梱しないコンポセットは、パッド形状を比較しない
    it("キャリパー非同梱のコンポセットとパッドを未確認にしない", () => {
        // Swordのようにキャリパーを同梱しないセット
        const groupset = createPart(1, "Sword", "groupset", {}, [
            "shift_brake_lever",
            "rear_derailleur",
        ])
        // パッド形状を持つパッド
        const pad = createPart(2, "Pad", "brake_pad", {
            pad_family: "shimano_road_flat_mount",
        })

        const result = evaluatePartCompatibility(
            pad,
            createPartSlot("brake_pad", "front"),
            {groupset},
        )

        // 比較対象のルールが無いため未確認にしない
        expect(result).toBeNull()
    })

    // キャリパーを同梱するがパッド形状が未登録のセットは、未確認のままにする
    it("キャリパー同梱でパッド形状が未登録なら未確認にする", () => {
        // パッド形状だけ未登録のセット
        const groupset = createPart(1, "Groupset", "groupset", {}, [
            "brake_caliper",
        ])
        const pad = createPart(2, "Pad", "brake_pad", {
            pad_family: "shimano_road_flat_mount",
        })

        const result = evaluatePartCompatibility(
            pad,
            createPartSlot("brake_pad", "front"),
            {groupset},
        )

        expect(result?.status).toBe("unknown")
        expect(result?.reasons.join("、")).toContain("パッド形状")
    })

    // キャリパーを同梱するセットは、従来どおりパッド形状を比較する
    it("キャリパー同梱のコンポセットとパッド形状が違えば非互換にする", () => {
        // パッド形状を持つセット
        const groupset = createPart(1, "Groupset", "groupset", {
            pad_family: "shimano_road_flat_mount",
        }, ["brake_caliper"])
        const pad = createPart(2, "Pad", "brake_pad", {
            pad_family: "campagnolo_db310",
        })

        const result = evaluatePartCompatibility(
            pad,
            createPartSlot("brake_pad", "front"),
            {groupset},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.reasons.join("、")).toContain("パッド形状")
    })

    // ホイール側へ追加した取付規格を使い、6ボルトローターとの不一致を検出
    it("ホイールとローターの取付方式が異なる場合は競合として扱う", () => {
        // センターロックのホイールと6ボルトローター
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

    // 650Bホイールに700Cタイヤは装着できないため非互換にする
    it("ホイール径が異なるタイヤは競合として扱う", () => {
        // 650Bホイールと700Cタイヤ
        const wheel = createPart(1, "Wheel", "wheel", {
            wheel_diameter: "650B",
        })
        const tire = createPart(2, "Tire", "tire", {
            wheel_diameter: "700C",
            tire_width_mm: "28",
        })

        const result = evaluatePartCompatibility(
            tire,
            createPartSlot("tire", "front"),
            {wheel},
        )

        expect(result?.status).toBe("incompatible")
    })

    // 非互換の原因となった相手パーツを結果へ含め、UIで相手を特定できるようにする
    it("非互換の相手パーツを結果へ含める", () => {
        // 専用コックピットのフレームと通常ハンドル
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "canyon_cp0018",
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
        expect(result?.counterparts[0]?.partName).toBe("Frame")
        expect(result?.counterparts[0]?.slotKey).toBe("frame")
    })

    // 複数フリーボディ対応のホイールは、対応集合に含まれるカセットを適合と判定
    it("複数フリーボディ対応のホイールは集合内のカセットを適合とする", () => {
        // Shimano HG・SRAM XDR対応ホイールとXDRカセット
        const wheel = createPart(1, "Wheel", "wheel", {
            freehub_body: "shimano_hg,sram_xdr",
        })
        const cassette = createPart(2, "Cassette", "cassette", {
            freehub_body: "sram_xdr",
        })

        const result = evaluatePartCompatibility(
            cassette,
            createPartSlot("cassette"),
            {wheel},
        )

        expect(result?.status).toBe("compatible")
    })

    // 対応集合に含まれないカセットは非互換と判定
    it("複数フリーボディ対応のホイールでも集合外のカセットは非互換にする", () => {
        // Shimano HG・SRAM XDR対応ホイールとCampagnoloカセット
        const wheel = createPart(1, "Wheel", "wheel", {
            freehub_body: "shimano_hg,sram_xdr",
        })
        const cassette = createPart(2, "Cassette", "cassette", {
            freehub_body: "campagnolo_n3w",
        })

        const result = evaluatePartCompatibility(
            cassette,
            createPartSlot("cassette"),
            {wheel},
        )

        expect(result?.status).toBe("incompatible")
    })

    // 同じペア商品を前後スロットに置いても、価格・重量を二重計上しない
    it("前後セット商品の合計は1回だけ加算する", () => {
        // 前後セット販売のタイヤ
        const pair = createPart(1, "Pair", "tire", {
            package_unit: "pair",
        })

        expect(calculateSelectedPartsTotals({
            "tire:front": pair,
            "tire:rear": pair,
        })).toEqual({price: 1000, weight: 100})
    })

    // 占有枠の付属品は数量込みの重量を加算し、価格は加算しない
    it("カテゴリー付き付属品の重量を合計に加算する", () => {
        // ハンドルとシートポストが付属するフレーム
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

    // コンポセットの構成品は重量・価格がセット本体に含まれるため、合計へ加算しない
    it("セット構成品の重量と参考価格は合計に加算しない", () => {
        // 構成品を含むコンポセット
        const groupset: Part = {
            ...createPart(1, "Groupset", "groupset", {}),
            weight: 2500,
            includedItems: [{
                name: "RD-R7150",
                quantity: 1,
                categoryKey: "rear_derailleur",
                weight: 262,
                price: 40000,
                isSetComponent: true,
            }],
        }

        expect(calculateSelectedPartsTotals({groupset}))
            .toEqual({price: 1000, weight: 2500})
    })

    // カテゴリーなし付属品（クリート等）は完成重量へ加算しない
    it("カテゴリーなし付属品の重量は合計に加算しない", () => {
        // クリート付属のペダル
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

    // 前後セット商品の付属品も、親商品と一緒に1回だけ加算
    it("前後セット商品の付属品は二重計上しない", () => {
        // チューブ付属の前後セットタイヤ
        const pair: Part = {
            ...createPart(1, "Pair", "tire", {package_unit: "pair"}),
            includedItems: [{
                name: "チューブ",
                quantity: 1,
                categoryKey: "inner_tube",
                weight: 50,
                price: 300,
            }],
        }

        expect(calculateSelectedPartsTotals({
            "tire:front": pair,
            "tire:rear": pair,
        })).toEqual({price: 1000, weight: 100 + 50})
    })

    // 付属品・ペア商品・セット構成品が混在しても合計が正しい
    it("付属品・ペア商品・セット構成品をまとめて正しく合計する", () => {
        // カテゴリー付属品とカテゴリーなし付属品を持つフレーム
        const frame: Part = {
            ...createPart(1, "Frame", "frame", {}),
            price: 1000,
            weight: 780,
            includedItems: [
                {
                    name: "ハンドル",
                    quantity: 1,
                    categoryKey: "handlebar",
                    weight: 320,
                },
                {
                    name: "シートポスト",
                    quantity: 1,
                    categoryKey: "seatpost",
                    weight: 200,
                },
                {
                    name: "クリート",
                    quantity: 1,
                    categoryKey: null,
                    weight: 60,
                },
            ],
        }
        // 前後ペア販売でチューブが付属するタイヤ
        const pair: Part = {
            ...createPart(2, "Tire pair", "tire", {package_unit: "pair"}),
            price: 500,
            weight: 100,
            includedItems: [{
                name: "チューブ",
                quantity: 1,
                categoryKey: "inner_tube",
                weight: 50,
            }],
        }
        // 構成品の重量をセット本体に含むグループセット
        const groupset: Part = {
            ...createPart(3, "Groupset", "groupset", {}),
            price: 2000,
            weight: 2500,
            includedItems: [{
                name: "RD",
                quantity: 1,
                categoryKey: "rear_derailleur",
                weight: 262,
                price: 40000,
                isSetComponent: true,
            }],
        }

        expect(calculateSelectedPartsTotals({
            frame,
            "tire:front": pair,
            "tire:rear": pair,
            groupset,
        })).toEqual({
            // RD構成品の参考価格は合計金額へ加算しない
            price: 1000 + 500 + 2000,
            // フレーム本体 + ハンドル + シートポスト + ペア本体 + チューブ + セット本体
            // カテゴリーなしのクリート60gとセット構成品262gは含めない
            weight: 780 + 320 + 200 + 100 + 50 + 2500,
        })
    })
})

// チェーン規格・容量上限・ブレーキ方式の判定を確認
describe("追加した規格の判定", () => {
    // チェーンとカセットの規格が一致する場合は適合
    it("チェーン規格が一致するチェーンとカセットは適合する", () => {
        // Shimano HG対応のチェーンとカセット
        const chain = createPart(1, "Chain", "chain", {chain_standard: "shimano_hg"})
        const cassette = createPart(2, "Cassette", "cassette", {chain_standard: "shimano_hg"})

        const result = evaluatePartCompatibility(
            chain,
            createPartSlot("chain"),
            {cassette},
        )

        expect(result?.status).toBe("compatible")
        expect(result?.reasons).toContain("チェーン規格が適合します")
    })

    // チェーンとカセットの規格が一致しない場合は非互換
    it("チェーン規格が一致しないチェーンとカセットは非互換にする", () => {
        // SRAM Flattop専用チェーンとShimano HGカセット
        const chain = createPart(1, "Chain", "chain", {chain_standard: "sram_flattop"})
        const cassette = createPart(2, "Cassette", "cassette", {chain_standard: "shimano_hg"})

        const result = evaluatePartCompatibility(
            chain,
            createPartSlot("chain"),
            {cassette},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.conflictingSlotKeys).toEqual(["cassette"])
        expect(result?.reasons.join("、")).toContain("チェーン規格")
    })

    // カンマ区切りの対応規格が1つでも重なれば適合
    it("チェーン規格がカンマ区切りで交差すれば適合する", () => {
        // 複数規格対応チェーンとSRAM Flattopカセット
        const chain = createPart(1, "Chain", "chain", {
            chain_standard: "shimano_hg,sram_flattop",
        })
        const cassette = createPart(2, "Cassette", "cassette", {
            chain_standard: "sram_flattop",
        })

        const result = evaluatePartCompatibility(
            chain,
            createPartSlot("chain"),
            {cassette},
        )

        expect(result?.status).toBe("compatible")
    })

    // カンマ区切りの対応規格が交差しない場合は非互換
    it("チェーン規格がカンマ区切りで交差しなければ非互換にする", () => {
        // Campagnolo専用チェーンとShimano HG・SRAM Flattop対応カセット
        const chain = createPart(1, "Chain", "chain", {chain_standard: "campagnolo"})
        const cassette = createPart(2, "Cassette", "cassette", {
            chain_standard: "shimano_hg,sram_flattop",
        })

        const result = evaluatePartCompatibility(
            chain,
            createPartSlot("chain"),
            {cassette},
        )

        expect(result?.status).toBe("incompatible")
    })

    // チェーン規格はリアディレイラーとも比較する（一致・不一致）
    it.each([
        // 規格が一致する組み合わせと一致しない組み合わせ
        ["shimano_hg", "shimano_hg", "compatible"],
        ["shimano_hg", "sram_flattop", "incompatible"],
    ])(
        "チェーン規格が%sのチェーンと%sのリアディレイラーは%sにする",
        (chainStandard, derailleurStandard, expectedStatus) => {
            // チェーン規格が異なるチェーンとリアディレイラー
            const chain = createPart(1, "Chain", "chain", {
                chain_standard: chainStandard,
            })
            const derailleur = createPart(2, "RD", "rear_derailleur", {
                chain_standard: derailleurStandard,
            })

            const result = evaluatePartCompatibility(
                derailleur,
                createPartSlot("rear_derailleur"),
                {chain},
            )

            expect(result?.status).toBe(expectedStatus)
        },
    )

    // チェーン規格はクランクとも比較する（一致・不一致）
    it.each([
        // 規格が一致する組み合わせと一致しない組み合わせ
        ["campagnolo", "campagnolo", "compatible"],
        ["campagnolo", "shimano_hg", "incompatible"],
    ])(
        "チェーン規格が%sのチェーンと%sのクランクは%sにする",
        (chainStandard, cranksetStandard, expectedStatus) => {
            // チェーン規格が異なるチェーンとクランク
            const chain = createPart(1, "Chain", "chain", {
                chain_standard: chainStandard,
            })
            const crankset = createPart(2, "Crankset", "crankset", {
                chain_standard: cranksetStandard,
            })

            const result = evaluatePartCompatibility(
                crankset,
                createPartSlot("crankset"),
                {chain},
            )

            expect(result?.status).toBe(expectedStatus)
        },
    )

    // チェーン規格が片側だけ未登録なら未確認
    it.each([
        ["カセット", "cassette"],
        ["リアディレイラー", "rear_derailleur"],
        ["クランク", "crankset"],
    ])("チェーン規格が片側だけ未登録のチェーンと%sは未確認にする", (
        _label,
        selectedCategory,
    ) => {
        // 規格を登録したチェーンと未登録の相手パーツ
        const chain = createPart(1, "Chain", "chain", {chain_standard: "shimano_hg"})
        const selected = createPart(2, "Selected", selectedCategory, {})

        const result = evaluatePartCompatibility(
            chain,
            createPartSlot("chain"),
            {[selectedCategory]: selected},
        )

        expect(result?.status).toBe("unknown")
        expect(result?.reasons.join("、")).toContain("チェーン規格")
    })

    // チェーンラインが一致するクランクとFDは適合
    it("チェーンラインが一致するクランクとフロントディレイラーは適合する", () => {
        // チェーンライン43.5mmで一致するクランクとフロントディレイラー
        const crankset = createPart(1, "Crankset", "crankset", {chainline_mm: "43.5"})
        const frontDerailleur = createPart(2, "FD", "front_derailleur", {
            chainline_mm: "43.5",
        })

        const result = evaluatePartCompatibility(
            frontDerailleur,
            createPartSlot("front_derailleur"),
            {crankset},
        )

        expect(result?.status).toBe("compatible")
        expect(result?.reasons.join("、")).toContain("チェーンラインが適合します")
    })

    // チェーンラインの差が許容範囲を超える場合は調整確認にする
    it("チェーンラインが大きく離れている場合は未確認にする", () => {
        // チェーンライン43.5mmのクランクと47.5mmのフロントディレイラー
        const crankset = createPart(1, "Crankset", "crankset", {chainline_mm: "43.5"})
        const frontDerailleur = createPart(2, "FD", "front_derailleur", {
            chainline_mm: "47.5",
        })

        const result = evaluatePartCompatibility(
            frontDerailleur,
            createPartSlot("front_derailleur"),
            {crankset},
        )

        expect(result?.status).toBe("unknown")
        expect(result?.reasons.join("、")).toContain("チェーンラインが離れています")
        expect(result?.selectionBlocked).toBe(false)
    })

    // 1mm以内の差は調整で吸収できるため適合
    it("チェーンラインの差が1mm以内なら適合にする", () => {
        // チェーンライン44mmのクランクと44.5mmのフロントディレイラー
        const crankset = createPart(1, "Crankset", "crankset", {chainline_mm: "44"})
        const frontDerailleur = createPart(2, "FD", "front_derailleur", {
            chainline_mm: "44.5",
        })

        const result = evaluatePartCompatibility(
            frontDerailleur,
            createPartSlot("front_derailleur"),
            {crankset},
        )

        expect(result?.status).toBe("compatible")
        expect(result?.reasons.join("、")).toContain("差0.5mm")
    })

    // 表記ゆれ（45と45.0）でも同じ値として扱う
    it("チェーンラインの表記ゆれを同じ値として扱う", () => {
        const crankset = createPart(1, "Crankset", "crankset", {chainline_mm: "45"})
        const frontDerailleur = createPart(2, "FD", "front_derailleur", {
            chainline_mm: "45.0",
        })

        const result = evaluatePartCompatibility(
            frontDerailleur,
            createPartSlot("front_derailleur"),
            {crankset},
        )

        expect(result?.status).toBe("compatible")
    })

    // チェーンラインが片側だけ未登録なら未確認
    it("チェーンラインが片側だけ未登録なら未確認にする", () => {
        // チェーンラインを登録したクランクと未登録のフロントディレイラー
        const crankset = createPart(1, "Crankset", "crankset", {chainline_mm: "43.5"})
        const frontDerailleur = createPart(2, "FD", "front_derailleur", {})

        const result = evaluatePartCompatibility(
            frontDerailleur,
            createPartSlot("front_derailleur"),
            {crankset},
        )

        expect(result?.status).toBe("unknown")
        expect(result?.reasons.join("、")).toContain("チェーンラインが未確認です")
    })

    // 油圧レバーと油圧キャリパーの方式・油種が一致する場合は適合
    it("ブレーキ方式と油種が一致するレバーとキャリパーは適合する", () => {
        // ミネラルオイルの油圧レバーとキャリパー
        const lever = createPart(1, "Lever", "shift_brake_lever", {
            brake_actuation: "hydraulic",
            brake_fluid: "mineral_oil",
        })
        const caliper = createPart(2, "Caliper", "brake_caliper", {
            brake_actuation: "hydraulic",
            brake_fluid: "mineral_oil",
        })

        const result = evaluatePartCompatibility(
            caliper,
            createPartSlot("brake_caliper", "front"),
            {shift_brake_lever: lever},
        )

        expect(result?.status).toBe("compatible")
        expect(result?.reasons).toEqual([
            "ブレーキ方式が適合します",
            "ブレーキフルードが適合します",
        ])
    })

    // 油圧レバーと機械式キャリパーの方式が異なる場合は非互換
    it("ブレーキ方式が異なるレバーとキャリパーは非互換にする", () => {
        // 油圧レバーと機械式キャリパー
        const lever = createPart(1, "Lever", "shift_brake_lever", {
            brake_actuation: "hydraulic",
        })
        const caliper = createPart(2, "Caliper", "brake_caliper", {
            brake_actuation: "mechanical",
        })

        const result = evaluatePartCompatibility(
            caliper,
            createPartSlot("brake_caliper", "front"),
            {shift_brake_lever: lever},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.reasons.join("、")).toContain("ブレーキ方式が一致しません")
    })

    // 油種が異なる油圧レバーとキャリパーは非互換
    it("ブレーキフルードが異なるレバーとキャリパーは非互換にする", () => {
        // ミネラルオイルの油圧レバーとDOT 4の油圧キャリパー
        const lever = createPart(1, "Lever", "shift_brake_lever", {
            brake_actuation: "hydraulic",
            brake_fluid: "mineral_oil",
        })
        const caliper = createPart(2, "Caliper", "brake_caliper", {
            brake_actuation: "hydraulic",
            brake_fluid: "dot_4",
        })

        const result = evaluatePartCompatibility(
            caliper,
            createPartSlot("brake_caliper", "front"),
            {shift_brake_lever: lever},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.reasons).toContain("ブレーキフルードが一致しません")
    })

    // 油種が片側だけ未登録なら未確認
    it("ブレーキフルードが片側だけ未登録なら未確認にする", () => {
        // 油種を登録したレバーと油種が未登録のキャリパー
        const lever = createPart(1, "Lever", "shift_brake_lever", {
            brake_actuation: "hydraulic",
            brake_fluid: "mineral_oil",
        })
        const caliper = createPart(2, "Caliper", "brake_caliper", {
            brake_actuation: "hydraulic",
        })

        const result = evaluatePartCompatibility(
            caliper,
            createPartSlot("brake_caliper", "front"),
            {shift_brake_lever: lever},
        )

        expect(result?.status).toBe("unknown")
        expect(result?.reasons.join("、")).toContain("ブレーキフルードが未確認です")
    })

    // ブレーキ方式・油種のどちらも未登録なら判定しない
    it("ブレーキ方式と油種が未登録のレバーとキャリパーは判定しない", () => {
        // 規格を持たないレバーとキャリパー
        const lever = createPart(1, "Lever", "shift_brake_lever", {})
        const caliper = createPart(2, "Caliper", "brake_caliper", {})

        const result = evaluatePartCompatibility(
            caliper,
            createPartSlot("brake_caliper", "front"),
            {shift_brake_lever: lever},
        )

        expect(result).toBeNull()
    })

    // 実値が上限ちょうどなら適合（境界値）
    it("カセットの最大歯数がリアディレイラーの上限ちょうどなら適合する", () => {
        // 最大36T対応のリアディレイラーと最大36Tのカセット
        const derailleur = createPart(1, "RD", "rear_derailleur", {
            max_sprocket_teeth: "36",
        })
        const cassette = createPart(2, "Cassette", "cassette", {
            max_sprocket_teeth: "36",
        })

        const result = evaluatePartCompatibility(
            derailleur,
            createPartSlot("rear_derailleur"),
            {cassette},
        )

        expect(result?.status).toBe("compatible")
        expect(result?.reasons).toContain("最大スプロケット歯数が適合します")
    })

    // 実値が上限を超える場合は非互換（表示用の内訳も上限と実値を持つ）
    it("カセットの最大歯数がリアディレイラーの上限を超える場合は非互換にする", () => {
        // 最大36T対応のリアディレイラーと最大42Tのカセット
        const derailleur = createPart(1, "RD", "rear_derailleur", {
            max_sprocket_teeth: "36",
        })
        const cassette = createPart(2, "Cassette", "cassette", {
            max_sprocket_teeth: "42",
        })

        const result = evaluatePartCompatibility(
            derailleur,
            createPartSlot("rear_derailleur"),
            {cassette},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.conflictingSlotKeys).toEqual(["cassette"])
        expect(result?.reasons).toContain(
            "最大スプロケット歯数が上限を超えています（上限36T / 実値42T）",
        )
        expect(result?.counterparts[0]?.details).toEqual([{
            label: "最大スプロケット歯数",
            status: "incompatible",
            specificationKey: "max_sprocket_teeth",
            candidateValue: "36",
            selectedValue: "42",
        }])
    })

    // 候補と選択済みが逆でも、上限側と実値側を取り違えず判定する
    it("カセットを候補にしてもリアディレイラーの上限で判定する", () => {
        // 最大36T対応のリアディレイラーと最大42Tのカセット
        const derailleur = createPart(1, "RD", "rear_derailleur", {
            max_sprocket_teeth: "36",
        })
        const cassette = createPart(2, "Cassette", "cassette", {
            max_sprocket_teeth: "42",
        })

        const result = evaluatePartCompatibility(
            cassette,
            createPartSlot("cassette"),
            {rear_derailleur: derailleur},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.conflictingSlotKeys).toEqual(["rear_derailleur"])
    })

    // 実値が片側だけ未登録なら未確認
    it("カセットの最大歯数が未登録ならリアディレイラーとの判定を未確認にする", () => {
        // 最大36T対応のリアディレイラーと最大歯数が未登録のカセット
        const derailleur = createPart(1, "RD", "rear_derailleur", {
            max_sprocket_teeth: "36",
        })
        const cassette = createPart(2, "Cassette", "cassette", {})

        const result = evaluatePartCompatibility(
            derailleur,
            createPartSlot("rear_derailleur"),
            {cassette},
        )

        expect(result?.status).toBe("unknown")
        expect(result?.reasons.join("、")).toContain("最大スプロケット歯数が未確認です")
    })

    // 数値でない上限・実値は未確認
    it("最大歯数が数値でない場合は未確認にする", () => {
        // 数値でない上限を持つリアディレイラーと数値のカセット
        const derailleur = createPart(1, "RD", "rear_derailleur", {
            max_sprocket_teeth: "36T",
        })
        const cassette = createPart(2, "Cassette", "cassette", {
            max_sprocket_teeth: "42",
        })

        const result = evaluatePartCompatibility(
            derailleur,
            createPartSlot("rear_derailleur"),
            {cassette},
        )

        expect(result?.status).toBe("unknown")
        expect(result?.reasons.join("、")).toContain("最大スプロケット歯数が未確認です")
    })

    // 上限と実値のどちらも未登録なら判定しない
    it("最大歯数がどちらも未登録なら判定しない", () => {
        // 最大歯数を持たないリアディレイラーとカセット
        const derailleur = createPart(1, "RD", "rear_derailleur", {})
        const cassette = createPart(2, "Cassette", "cassette", {})

        const result = evaluatePartCompatibility(
            derailleur,
            createPartSlot("rear_derailleur"),
            {cassette},
        )

        expect(result).toBeNull()
    })

    // 最大チェーンリング歯数はFDの上限とクランクの実値を比較する
    it.each([
        // 上限と実値が同じ場合と上限を超える場合
        ["52", "52", "compatible"],
        ["50", "53", "incompatible"],
    ])(
        "FDの上限が%sT・クランクが%sTなら%sにする",
        (limit, actual, expectedStatus) => {
            // 最大チェーンリング歯数を持つFDとクランク
            const frontDerailleur = createPart(1, "FD", "front_derailleur", {
                max_chainring_teeth: limit,
            })
            const crankset = createPart(2, "Crankset", "crankset", {
                max_chainring_teeth: actual,
            })

            const result = evaluatePartCompatibility(
                frontDerailleur,
                createPartSlot("front_derailleur"),
                {crankset},
            )

            expect(result?.status).toBe(expectedStatus)
        },
    )

    // クランクの最大チェーンリング歯数が未登録なら未確認
    it("クランクの最大チェーンリング歯数が未登録なら未確認にする", () => {
        // 上限を登録したFDと実値が未登録のクランク
        const frontDerailleur = createPart(1, "FD", "front_derailleur", {
            max_chainring_teeth: "52",
        })
        const crankset = createPart(2, "Crankset", "crankset", {})

        const result = evaluatePartCompatibility(
            frontDerailleur,
            createPartSlot("front_derailleur"),
            {crankset},
        )

        expect(result?.status).toBe("unknown")
        expect(result?.reasons.join("、")).toContain("最大チェーンリング歯数が未確認です")
    })

    // キャリパーの対応ローター径とローターの径を比較する
    it.each([
        // 径が上限ちょうどと上限を超える場合
        ["180", "180", "compatible"],
        ["180", "203", "incompatible"],
    ])(
        "キャリパーの上限が%smm・ローターが%smmなら%sにする",
        (limit, actual, expectedStatus) => {
            // 対応ローター径を持つキャリパーと径の異なるローター
            const caliper = createPart(1, "Caliper", "brake_caliper", {
                max_rotor_diameter_mm: limit,
            })
            const rotor = createPart(2, "Rotor", "disc_rotor", {
                rotor_diameter_mm: actual,
            })

            const result = evaluatePartCompatibility(
                rotor,
                createPartSlot("disc_rotor", "front"),
                {"brake_caliper:front": caliper},
            )

            expect(result?.status).toBe(expectedStatus)
        },
    )

    // ローターの径が未登録なら未確認
    it("ローター径が未登録ならキャリパーとの判定を未確認にする", () => {
        // 対応ローター径を持つキャリパーと径が未登録のローター
        const caliper = createPart(1, "Caliper", "brake_caliper", {
            max_rotor_diameter_mm: "180",
        })
        const rotor = createPart(2, "Rotor", "disc_rotor", {})

        const result = evaluatePartCompatibility(
            rotor,
            createPartSlot("disc_rotor", "front"),
            {"brake_caliper:front": caliper},
        )

        expect(result?.status).toBe("unknown")
        expect(result?.reasons.join("、")).toContain("対応ローター径が未確認です")
    })

    // フレームの対応ローター径がローター径以上なら適合
    it("フレームの対応ローター径以内のローターは適合する", () => {
        // 最大180mm対応のフレームと160mmローター
        const frame = createPart(1, "Frame", "frame", {max_rotor_diameter_mm: "180"})
        const rotor = createPart(2, "Rotor", "disc_rotor", {rotor_diameter_mm: "160"})

        const result = evaluatePartCompatibility(
            rotor,
            createPartSlot("disc_rotor", "front"),
            {frame},
        )

        expect(result?.status).toBe("compatible")
    })

    // フレームの対応ローター径を超えるローターは選択できない
    it("フレームの対応ローター径を超えるローターは選択できない", () => {
        // 最大160mm対応のフレームと180mmローター
        const frame = createPart(1, "Frame", "frame", {max_rotor_diameter_mm: "160"})
        const rotor = createPart(2, "Rotor", "disc_rotor", {rotor_diameter_mm: "180"})

        const result = evaluatePartCompatibility(
            rotor,
            createPartSlot("disc_rotor", "front"),
            {frame},
        )

        expect(result?.status).toBe("incompatible")
        expect(result?.selectionBlocked).toBe(true)
        expect(result?.reasons.join("、")).toContain("対応ローター径が上限を超えています")
    })

    // フレームの対応ローター径が未登録なら判定しない（任意規格のため）
    it("フレームの対応ローター径が未登録なら判定しない", () => {
        // 対応ローター径が未登録のフレームと180mmローター
        const frame = createPart(1, "Frame", "frame", {})
        const rotor = createPart(2, "Rotor", "disc_rotor", {rotor_diameter_mm: "180"})

        const result = evaluatePartCompatibility(
            rotor,
            createPartSlot("disc_rotor", "front"),
            {frame},
        )

        expect(result).toBeNull()
    })

    // フレームとローターの両方に径の規格が無ければ判定しない
    it("フレームとローターの両方に径の規格が無ければ判定しない", () => {
        // 径の規格を持たないフレームとローター
        const frame = createPart(1, "Frame", "frame", {})
        const rotor = createPart(2, "Rotor", "disc_rotor", {})

        const result = evaluatePartCompatibility(
            rotor,
            createPartSlot("disc_rotor", "front"),
            {frame},
        )

        expect(result).toBeNull()
    })
})

// フレームのコックピットバッジを確認
describe("getFrameCockpitBadge", () => {
    // 付属は規格名を併記し、標準付属か専用付属かを区別
    it("付属は規格名を併記したバッジを返す", () => {
        // 専用規格と標準規格の付属コックピットを持つフレーム
        const proprietaryFrame = createPart(1, "Frame", "frame", {
            cockpit_interface: "canyon_cp0018",
            cockpit_connection: "integrated_only",
        }, ["handlebar", "stem"])
        const standardFrame = createPart(2, "Frame", "frame", {
            cockpit_interface: "standard_1_1_8",
            cockpit_connection: "integrated_only",
        }, ["handlebar"])

        expect(getFrameCockpitBadge(proprietaryFrame)).toEqual({
            label: "コックピット付属（Canyon CP0018専用）",
            className: "border-emerald-300 bg-emerald-50 text-emerald-700",
        })
        expect(getFrameCockpitBadge(standardFrame)?.label).toBe(
            "コックピット付属（1-1/8標準コラム）",
        )
    })

    // ハンドル未占有で専用規格は、規格名だけを表示
    it("専用規格は規格名のバッジを返す", () => {
        // 専用規格でハンドル未占有のフレーム
        const frame = createPart(1, "Frame", "frame", {
            cockpit_interface: "cervelo_s5_hb19",
            cockpit_connection: "either",
        })

        expect(getFrameCockpitBadge(frame)?.label).toBe("Cervélo S5 HB19専用")
    })

    // サードパーティ製コックピットが装着できる規格は、具体名を表示
    it("オープン規格は規格名のバッジを返す", () => {
        // 丸型とD字のオープン規格フレーム
        const roundSteererFrame = createPart(1, "Frame", "frame", {
            cockpit_interface: "fsa_acr",
            cockpit_connection: "either",
        })
        const dShapedFrame = createPart(2, "Frame", "frame", {
            cockpit_interface: "pinarello_ticr",
            cockpit_connection: "either",
        })

        expect(getFrameCockpitBadge(roundSteererFrame)?.label).toBe("FSA ACR対応")
        expect(getFrameCockpitBadge(dShapedFrame)?.label).toBe("Pinarello TiCR対応")
    })

    // 標準規格は 1-1/8 標準コラム。規格が無ければ null
    it("標準規格は標準コラム、規格なしは null を返す", () => {
        // 標準規格のフレームと規格未登録のフレーム
        const standardFrame = createPart(1, "Frame", "frame", {
            cockpit_interface: "standard_1_1_8",
        })
        const unknownFrame = createPart(2, "Frame", "frame", {})

        expect(getFrameCockpitBadge(standardFrame)?.label).toBe("1-1/8標準コラム")
        expect(getFrameCockpitBadge(unknownFrame)).toBeNull()
    })
})

// フレームの重量がフロントフォークを含むことを示すバッジを確認
describe("getFrameWeightBadge", () => {
    // 重量の範囲がフレーム＋フロントフォークのときだけバッジを出す
    it("フレーム＋フロントフォークのフレームはバッジを返す", () => {
        // フレーム＋フォークの重量範囲を持つフレーム
        const frameset = createPart(1, "Frameset", "frame", {
            weight_scope: "frame_and_fork",
        })

        expect(getFrameWeightBadge(frameset)).toEqual({
            label: "フォーク込み",
            className: "border-slate-300 bg-slate-50 text-slate-600",
        })
    })

    // 非公式・別条件の値は、公式の値と混ざらないよう「参考値」と併記
    it("参考値のフレームは参考値つきのバッジを返す", () => {
        // 参考値の重量を持つフレーム
        const referenceFrameset = createPart(2, "Frameset", "frame", {
            weight_scope: "frame_and_fork",
            weight_source: "reference",
        })

        expect(getFrameWeightBadge(referenceFrameset)).toEqual({
            label: "フォーク込み・参考値",
            className: "border-amber-300 bg-amber-50 text-amber-700",
        })
    })

    // 範囲が未登録のフレームと、フレーム以外にはバッジを出さない
    it("範囲が未登録のフレームとフレーム以外は null を返す", () => {
        // 範囲未登録のフレームとフレーム以外のパーツ
        const unknownFrame = createPart(1, "Frame", "frame", {})
        const wheel = createPart(2, "Wheel", "wheel", {
            weight_scope: "frame_and_fork",
        })

        expect(getFrameWeightBadge(unknownFrame)).toBeNull()
        expect(getFrameWeightBadge(wheel)).toBeNull()
    })
})

// 完成重量が何の足し算かを示す内訳を確認
describe("getWeightBreakdown", () => {
    // フレーム＋フロントフォークの内訳を、単位つきで並べて返す
    it("フレームとフロントフォークの内訳を返す", () => {
        // フレームとフォークの重量内訳を持つフレーム
        const frameset = createPart(1, "Frameset", "frame", {
            weight_scope: "frame_and_fork",
            frame_weight_g: "755",
            fork_weight_g: "378",
        })

        expect(getWeightBreakdown(frameset)).toBe("755g + 378g")
    })

    // 内訳が未登録、または重量の範囲が違う場合は null を返す
    it("内訳が未登録なら null を返す", () => {
        // 内訳未登録と範囲違いのフレーム
        const missingBreakdown = createPart(1, "Frameset", "frame", {
            weight_scope: "frame_and_fork",
        })
        const frameOnly = createPart(2, "Frame", "frame", {
            frame_weight_g: "755",
            fork_weight_g: "378",
        })

        expect(getWeightBreakdown(missingBreakdown)).toBeNull()
        expect(getWeightBreakdown(frameOnly)).toBeNull()
    })
    // 合計の内訳を返し、加算・除外の区分を保つ
    it("合計の内訳を返す", () => {
        // 付属品とカテゴリーなし付属品を持つフレーム
        const frame: Part = {
            ...createPart(1, "Frame", "frame", {}),
            price: 1000,
            weight: 800,
            includedItems: [
                {
                    name: "ハンドル",
                    quantity: 2,
                    categoryKey: "handlebar",
                    weight: 200,
                    price: 500,
                },
                {
                    name: "クリート",
                    quantity: 1,
                    categoryKey: null,
                    weight: 50,
                },
            ],
        }
        // 構成品を同梱するグループセット
        const groupset: Part = {
            ...createPart(2, "Groupset", "groupset", {}),
            price: 2000,
            weight: 2500,
            includedItems: [{
                name: "RD",
                quantity: 1,
                categoryKey: "rear_derailleur",
                weight: 200,
                price: 1000,
                isSetComponent: true,
            }],
        }
        const breakdown = getTotalsBreakdown({frame, groupset})

        expect(breakdown.basePrice).toBe(3000)
        expect(breakdown.baseWeight).toBe(3300)
        expect(breakdown.totalPrice).toBe(3000)
        expect(breakdown.totalWeight).toBe(3700)
        expect(breakdown.includedItems).toEqual([{
            name: "ハンドル",
            quantity: 2,
            unitWeight: 200,
            totalWeight: 400,
            unitPrice: 500,
            totalPrice: 1000,
            sourcePartName: "Frame",
            categoryKey: "handlebar",
            isSetComponent: false,
        }])
        expect(breakdown.setComponents).toEqual([{
            name: "RD",
            quantity: 1,
            unitWeight: 200,
            totalWeight: 200,
            unitPrice: 1000,
            totalPrice: 1000,
            sourcePartName: "Groupset",
            categoryKey: "rear_derailleur",
            isSetComponent: true,
        }])
        expect(breakdown.excludedItems[0]).toMatchObject({
            name: "クリート",
            quantity: 1,
            totalWeight: 50,
            totalPrice: null,
            categoryKey: null,
            isSetComponent: false,
        })
        expect(breakdown.referencePrices.map((item) => [
            item.name,
            item.totalPrice,
        ])).toEqual([["ハンドル", 1000], ["RD", 1000]])
    })



    // 機械式ブレーキは油種を持たないため、フルードの未確認を出さない
    it("機械式キャリパーではブレーキフルードを比較しない", () => {
        // 油圧レバーと機械式キャリパー
        const lever = createPart(1, "Lever", "shift_brake_lever", {
            brake_actuation: "hydraulic",
            brake_fluid: "mineral_oil",
        })
        const caliper = createPart(2, "Caliper", "brake_caliper", {
            brake_actuation: "mechanical",
        })

        const result = evaluatePartCompatibility(
            caliper,
            createPartSlot("brake_caliper", "front"),
            {shift_brake_lever: lever},
        )

        // 方式の不一致だけを理由にし、油種の未確認は出さない
        expect(result?.reasons.join("、")).toContain("ブレーキ方式")
        expect(result?.reasons.join("、")).not.toContain("ブレーキフルード")
    })

    // 容量の実値が数値でない場合も未確認にする
    it("実値が数値でない容量は未確認にする", () => {
        // 最大42T表記のカセットと34T対応のリアディレイラー
        const rearDerailleur = createPart(1, "RD", "rear_derailleur", {
            max_sprocket_teeth: "34",
        })
        const cassette = createPart(2, "Cassette", "cassette", {
            max_sprocket_teeth: "42T",
        })

        const result = evaluatePartCompatibility(
            cassette,
            createPartSlot("cassette"),
            {rear_derailleur: rearDerailleur},
        )

        expect(result?.status).toBe("unknown")
    })

})

import {describe, expect, it} from "vitest"

import {createPartSlot} from "@/features/simulator/partSlots"
import {
    createInitialSimulatorState,
    simulatorReducer,
} from "@/features/simulator/simulatorReducer"
import type {Part} from "@/types/part"

function createPart(
    id: number,
    name: string,
    blockedCategoryKeys: string[] = [],
): Part {
    return {
        id,
        name,
        brandName: "Test Brand",
        weight: 100,
        price: 1000,
        blockedCategoryKeys,
    }
}

// 構成切り替え・パーツ選択・排他解除が状態遷移として正しく適用されることを確認する。
describe("simulatorReducer", () => {
    // 前後選択可能なカテゴリーを開いた直後は、前輪を操作対象にする。
    it("前後カテゴリーは前輪スロットを初期表示する", () => {
        const state = createInitialSimulatorState("tire")

        expect(state.activeSlot).toEqual(
            createPartSlot("tire", "front"),
        )
    })

    // 固定構成へ切り替えた後は、前の構成で選んでいたカテゴリーを引き継がない。
    it("固定構成を切り替えるとフレーム選択へ戻る", () => {
        let state = createInitialSimulatorState("frame")

        state = simulatorReducer(state, {
            type: "changeSlot",
            slot: createPartSlot("wheel"),
        })
        state = simulatorReducer(state, {
            type: "changeConfig",
            configId: "2",
        })

        expect(state.activeSlot).toEqual(createPartSlot("frame"))
    })

    // 追加構成へ切り替えた後も、規格の基準となるフレームから選択を始める。
    it("追加構成を切り替えるとフレーム選択へ戻る", () => {
        let state = createInitialSimulatorState("wheel")

        state = simulatorReducer(state, {
            type: "selectSavedBuild",
            buildId: "build-1",
            parts: {},
        })

        expect(state.activeSlot).toEqual(createPartSlot("frame"))
    })

    // 追加構成をアクティブにした後の選択は、固定枠ではなくその構成へ保存する。
    it("追加構成を選択すると、その構成へパーツ選択を反映する", () => {
        const frame = createPart(1, "Frame")
        const groupset = createPart(2, "Groupset")
        let state = createInitialSimulatorState("frame")

        state = simulatorReducer(state, {
            type: "selectSavedBuild",
            buildId: "build-1",
            parts: {frame},
        })
        state = simulatorReducer(state, {
            type: "changeSlot",
            slot: createPartSlot("groupset"),
        })
        state = simulatorReducer(state, {
            type: "selectPart",
            part: groupset,
        })

        expect(state.activeSavedBuildId).toBe("build-1")
        expect(state.savedBuildParts).toEqual({frame, groupset})
        expect(state.configs["1"]).toEqual({})
    })

    // 前後スロットを分けることで、同じカテゴリーでも別商品を保持できる。
    it("同じカテゴリーの前後に異なるパーツを保持する", () => {
        const frontTire = createPart(1, "Front Tire")
        const rearTire = createPart(2, "Rear Tire")
        let state = createInitialSimulatorState("tire")

        state = simulatorReducer(state, {
            type: "changeSlot",
            slot: createPartSlot("tire", "front"),
        })
        state = simulatorReducer(state, {
            type: "selectPart",
            part: frontTire,
        })
        state = simulatorReducer(state, {
            type: "changeSlot",
            slot: createPartSlot("tire", "rear"),
        })
        state = simulatorReducer(state, {
            type: "selectPart",
            part: rearTire,
        })

        expect(state.configs["1"]).toEqual({
            "tire:front": frontTire,
            "tire:rear": rearTire,
        })
    })

    // 一体型商品の選択で占有されたカテゴリーは、前後の既存選択をまとめて解除する。
    it("カテゴリーが占有された場合は前後両方の選択を解除する", () => {
        const frontTire = createPart(1, "Front Tire")
        const rearTire = createPart(2, "Rear Tire")
        const tireIncludedPart = createPart(
            3,
            "Tire Included Part",
            ["tire"],
        )
        let state = createInitialSimulatorState("tire")

        for (const [position, part] of [
            ["front", frontTire],
            ["rear", rearTire],
        ] as const) {
            state = simulatorReducer(state, {
                type: "changeSlot",
                slot: createPartSlot("tire", position),
            })
            state = simulatorReducer(state, {
                type: "selectPart",
                part,
            })
        }

        state = simulatorReducer(state, {
            type: "changeSlot",
            slot: createPartSlot("wheel"),
        })
        state = simulatorReducer(state, {
            type: "selectPart",
            part: tireIncludedPart,
        })

        expect(state.configs["1"]).toEqual({
            wheel: tireIncludedPart,
        })
    })

    // 占有中でも候補画面へ移動できるようにし、解除案内を表示する余地を残す。
    it("占有中カテゴリーに解除案内表示のため移動できる", () => {
        const tireIncludedPart = createPart(
            1,
            "Tire Included Part",
            ["tire"],
        )
        let state = createInitialSimulatorState("wheel")

        state = simulatorReducer(state, {
            type: "selectPart",
            part: tireIncludedPart,
        })

        const nextState = simulatorReducer(state, {
            type: "changeSlot",
            slot: createPartSlot("tire", "front"),
        })

        expect(nextState.activeSlot).toEqual(
            createPartSlot("tire", "front"),
        )
        expect(nextState.configs).toBe(state.configs)
    })

    // コンポセットが含む単品カテゴリーは、前後分を含めて一括で排他解除する。
    it("コンポセット選択時に単品とブレーキの前後選択を解除する", () => {
        const rearDerailleur = createPart(1, "Rear Derailleur")
        const frontCaliper = createPart(2, "Front Caliper")
        const rearCaliper = createPart(3, "Rear Caliper")
        const groupset = createPart(4, "Groupset", [
            "rear_derailleur",
            "brake_caliper",
        ])
        let state = createInitialSimulatorState("rear_derailleur")

        state = simulatorReducer(state, {
            type: "selectPart",
            part: rearDerailleur,
        })

        for (const [position, part] of [
            ["front", frontCaliper],
            ["rear", rearCaliper],
        ] as const) {
            state = simulatorReducer(state, {
                type: "changeSlot",
                slot: createPartSlot("brake_caliper", position),
            })
            state = simulatorReducer(state, {
                type: "selectPart",
                part,
            })
        }

        state = simulatorReducer(state, {
            type: "changeSlot",
            slot: createPartSlot("groupset"),
        })
        state = simulatorReducer(state, {
            type: "selectPart",
            part: groupset,
        })

        expect(state.configs["1"]).toEqual({
            groupset,
        })
    })

    // コンポセット占有中の単品カテゴリーでは、Reducerが新しい選択を無視する。
    it("コンポセットが占有する単品カテゴリーでパーツは選択できない", () => {
        const groupset = createPart(1, "Groupset", [
            "rear_derailleur",
            "disc_rotor",
        ])
        const rearDerailleur = createPart(2, "Rear Derailleur")
        let state = createInitialSimulatorState("groupset")

        state = simulatorReducer(state, {
            type: "selectPart",
            part: groupset,
        })

        state = simulatorReducer(state, {
            type: "changeSlot",
            slot: createPartSlot("rear_derailleur"),
        })
        const nextState = simulatorReducer(state, {
            type: "selectPart",
            part: rearDerailleur,
        })

        expect(nextState).toBe(state)
        expect(nextState.configs["1"]).toEqual({groupset})
    })

    // 競合解消のために指定されたスロットだけを削除し、他の選択を残す。
    it("指定したパーツだけを構成から解除する", () => {
        const frame = createPart(1, "Frame")
        const groupset = createPart(2, "Groupset", ["crankset"])
        let state = createInitialSimulatorState("frame")

        state = simulatorReducer(state, {
            type: "selectPart",
            part: frame,
        })
        state = simulatorReducer(state, {
            type: "changeSlot",
            slot: createPartSlot("groupset"),
        })
        state = simulatorReducer(state, {
            type: "selectPart",
            part: groupset,
        })
        state = simulatorReducer(state, {
            type: "removeParts",
            slotKeys: ["groupset"],
        })

        expect(state.configs["1"]).toEqual({frame})
    })

    // 構成全体をクリアした後は、次の開始点としてフレームを選択状態にする。
    it("構成をクリアするとフレーム選択に戻る", () => {
        const groupset = createPart(1, "Groupset")
        let state = createInitialSimulatorState("frame")

        state = simulatorReducer(state, {
            type: "changeSlot",
            slot: createPartSlot("groupset"),
        })
        state = simulatorReducer(state, {
            type: "selectPart",
            part: groupset,
        })
        state = simulatorReducer(state, {
            type: "clearActiveConfig",
        })

        expect(state.activeSlot).toEqual(createPartSlot("frame"))
        expect(state.configs["1"]).toEqual({})
    })

    // 一括選択指定がある場合は、同一商品を前後スロットへ一度に反映する。
    it("同じパーツを前後に一括選択する", () => {
        const tire = createPart(1, "Tire")
        let state = createInitialSimulatorState("tire")

        state = simulatorReducer(state, {
            type: "selectPart",
            part: tire,
            slotKeys: ["tire:front", "tire:rear"],
        })

        expect(state.configs["1"]).toEqual({
            "tire:front": tire,
            "tire:rear": tire,
        })
    })

    // UIが選んだ競合解除スロットを先に外し、新しい候補を選択する。
    it("非互換パーツを解除して選択する", () => {
        const tire = createPart(1, "Tire")
        const tube = createPart(2, "Tube")
        let state = createInitialSimulatorState("tire")

        state = simulatorReducer(state, {
            type: "selectPart",
            part: tire,
        })
        state = simulatorReducer(state, {
            type: "changeSlot",
            slot: createPartSlot("inner_tube", "front"),
        })
        state = simulatorReducer(state, {
            type: "selectPart",
            part: tube,
            removeSlotKeys: ["tire:front"],
        })

        expect(state.configs["1"]).toEqual({
            "inner_tube:front": tube,
        })
    })
})

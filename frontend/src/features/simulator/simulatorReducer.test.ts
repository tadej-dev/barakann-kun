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

describe("simulatorReducer", () => {
    it("前後カテゴリーは前輪スロットを初期表示する", () => {
        const state = createInitialSimulatorState("tire")

        expect(state.activeSlot).toEqual(
            createPartSlot("tire", "front"),
        )
    })

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

    it("保存構成を現在の作業枠だけへ復元する", () => {
        const frame = createPart(1, "Saved Frame")
        let state = createInitialSimulatorState("groupset")

        state = simulatorReducer(state, {
            type: "changeConfig",
            configId: "2",
        })
        state = simulatorReducer(state, {
            type: "restoreActiveConfig",
            selectedParts: {frame},
        })

        expect(state.activeConfigId).toBe("2")
        expect(state.activeSlot).toEqual(createPartSlot("frame"))
        expect(state.configs["1"]).toEqual({})
        expect(state.configs["2"]).toEqual({frame})
    })

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

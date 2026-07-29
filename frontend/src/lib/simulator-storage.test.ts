import {afterEach, beforeEach, describe, expect, it} from "vitest"

import {
    loadSimulatorState,
    saveSimulatorState,
} from "@/lib/simulator-storage"
import type {ConfigStates} from "@/features/simulator/simulatorTypes"
import type {Part} from "@/types/part"

const LEGACY_STORAGE_KEY = "barakann-simulator-configs-v1"
const STORAGE_KEY = "barakann-simulator-configs-v2"

function createLocalStorage() {
    const values = new Map<string, string>()

    return {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => Array.from(values.keys())[index] ?? null,
        get length() {
            return values.size
        },
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
    } satisfies Storage
}

function createPart(id: number): Part {
    return {
        id,
        name: `Part ${id}`,
        brandName: "Test Brand",
        weight: 100,
        price: 1000,
        blockedCategoryKeys: [],
    }
}

describe("simulator-storage", () => {
    beforeEach(() => {
        Object.defineProperty(globalThis, "window", {
            configurable: true,
            value: {localStorage: createLocalStorage()},
        })
    })

    afterEach(() => {
        Reflect.deleteProperty(globalThis, "window")
    })

    it("旧形式のPartからIDを取り出して前後スロットへ移行する", () => {
        window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({
            activeConfigId: "1",
            configs: {
                "1": {tire: createPart(10)},
                "2": {},
                "3": {},
                "4": {},
            },
        }))

        expect(loadSimulatorState()).toEqual({
            activeConfigId: "1",
            configs: {
                "1": {"tire:front": 10},
                "2": {},
                "3": {},
                "4": {},
            },
        })
    })

    it("Part全体ではなくIDだけをv2形式で保存する", () => {
        const part = createPart(20)
        const configs: ConfigStates = {
            "1": {frame: part},
            "2": {},
            "3": {},
            "4": {},
        }
        window.localStorage.setItem(LEGACY_STORAGE_KEY, "legacy")

        saveSimulatorState({activeConfigId: "1", configs})

        expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "")).toEqual({
            activeConfigId: "1",
            configs: {
                "1": {frame: 20},
                "2": {},
                "3": {},
                "4": {},
            },
        })
        expect(window.localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull()
    })
})

import {afterEach, beforeEach, describe, expect, it} from "vitest"

import {
    loadSimulatorState,
    saveLocalConfigCollection,
    saveSimulatorState,
} from "@/lib/simulator-storage"
import type {ConfigStates} from "@/features/simulator/simulatorTypes"
import type {Part} from "@/types/part"

const LEGACY_V1_KEY = "barakann-simulator-configs-v1"
const LEGACY_V2_KEY = "barakann-simulator-configs-v2"
const STORAGE_KEY = "barakann-simulator-configs-v3"

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

// 現行形式・旧形式・Storage利用不可の環境で、画面状態を安全に復元できるか確認する。
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

    // 旧形式のPartオブジェクトをIDだけの形式へ変換し、前輪へ引き継ぐ。
    it("旧形式のPartからIDを取り出して前後スロットへ移行する", () => {
        window.localStorage.setItem(LEGACY_V1_KEY, JSON.stringify({
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
            savedBuilds: [],
            order: [],
        })
    })

    // localStorageの肥大化を防ぐため、保存するのはパーツIDと構成メタデータだけにする。
    it("Part全体ではなくIDだけを保存する", () => {
        const part = createPart(20)
        const configs: ConfigStates = {
            "1": {frame: part},
            "2": {},
            "3": {},
            "4": {},
        }
        window.localStorage.setItem(LEGACY_V1_KEY, "legacy")

        saveSimulatorState({activeConfigId: "1", configs})

        expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "")).toEqual({
            activeConfigId: "1",
            configs: {
                "1": {frame: 20},
                "2": {},
                "3": {},
                "4": {},
            },
            savedBuilds: [],
            order: [],
        })
        expect(window.localStorage.getItem(LEGACY_V1_KEY)).toBeNull()
    })

    // 統合で削除した旧パーツIDは、残したIDへ読み替えて復元する。
    it("統合前の旧パーツIDを残したIDへ読み替える", () => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            activeConfigId: "1",
            configs: {
                "1": {wheel: 442},
                "2": {},
                "3": {},
                "4": {},
            },
        }))

        expect(loadSimulatorState()?.configs["1"]).toEqual({wheel: 441})
    })

    // Safariの制限やプライベートモードでも、シミュレーター自体は操作できるようにする。
    // Safariの制限やプライベートモードでも、シミュレーター自体は操作できるようにする。
    it("追加構成と並び順を保存して復元する", () => {
        saveLocalConfigCollection(
            [{
                id: "build-1",
                name: "通勤用",
                parts: [{slotKey: "frame", partId: 10, price: 1000, weight: 100}],
            }],
            ["config:1", "build:build-1"],
        )

        expect(loadSimulatorState()).toMatchObject({
            savedBuilds: [{
                id: "build-1",
                name: "通勤用",
                parts: [{slotKey: "frame", partId: 10, price: 1000, weight: 100}],
            }],
            order: ["config:1", "build:build-1"],
        })
    })

    // 構成の選択を保存しても、追加構成と並び順は消えない。
    it("構成の選択を保存しても追加構成と並び順を保つ", () => {
        saveLocalConfigCollection(
            [{id: "build-1", name: "通勤用", parts: []}],
            ["build:build-1"],
        )

        saveSimulatorState({
            activeConfigId: "2",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
        })

        expect(loadSimulatorState()).toMatchObject({
            activeConfigId: "2",
            savedBuilds: [{id: "build-1", name: "通勤用", parts: []}],
            order: ["build:build-1"],
        })
    })

    // 旧キー(v2)に保存された状態も読み込める。
    it("v2形式の保存内容も読み込める", () => {
        window.localStorage.setItem(LEGACY_V2_KEY, JSON.stringify({
            activeConfigId: "1",
            configs: {"1": {frame: 10}, "2": {}, "3": {}, "4": {}},
        }))

        expect(loadSimulatorState()).toMatchObject({
            configs: {"1": {frame: 10}},
            savedBuilds: [],
            order: [],
        })
    })

    // 壊れた追加構成は読み飛ばし、正常な項目だけを復元する。
    it("壊れた追加構成は読み飛ばす", () => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            activeConfigId: "1",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
            savedBuilds: [
                {id: "build-1", name: "通勤用", parts: []},
                {id: "", name: "壊れている", parts: []},
                {id: "build-3", name: "レース用", parts: [{slotKey: "frame"}]},
            ],
            order: ["build:build-1"],
        }))

        expect(loadSimulatorState()?.savedBuilds).toEqual([
            {id: "build-1", name: "通勤用", parts: []},
            {id: "build-3", name: "レース用", parts: []},
        ])
    })

    // 追加構成を保存しても、構成の選択と選択中の構成は変わらない。
    it("追加構成を保存しても構成の選択を保つ", () => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            activeConfigId: "3",
            configs: {"1": {frame: 10}, "2": {}, "3": {}, "4": {}},
            savedBuilds: [],
            order: [],
        }))

        saveLocalConfigCollection(
            [{id: "build-1", name: "通勤用", parts: []}],
            ["build:build-1"],
        )

        expect(loadSimulatorState()).toMatchObject({
            activeConfigId: "3",
            configs: {"1": {frame: 10}},
            savedBuilds: [{id: "build-1", name: "通勤用", parts: []}],
            order: ["build:build-1"],
        })
    })

    // 現行キーと旧キーが同時にある場合は現行キーを優先し、保存後に旧キーを消す。
    it("現行キーを優先して旧キーを削除する", () => {
        window.localStorage.setItem(LEGACY_V2_KEY, JSON.stringify({
            activeConfigId: "1",
            configs: {"1": {frame: 99}, "2": {}, "3": {}, "4": {}},
        }))
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            activeConfigId: "2",
            configs: {"1": {frame: 10}, "2": {}, "3": {}, "4": {}},
            savedBuilds: [],
            order: [],
        }))

        expect(loadSimulatorState()?.activeConfigId).toBe("2")

        saveLocalConfigCollection([], [])

        expect(window.localStorage.getItem(LEGACY_V2_KEY)).toBeNull()
        expect(window.localStorage.getItem(LEGACY_V1_KEY)).toBeNull()
    })

    it("Storageへアクセスできない環境でも例外を画面へ伝播しない", () => {
        Object.defineProperty(window, "localStorage", {
            configurable: true,
            get: () => {
                throw new Error("Storage is unavailable")
            },
        })

        expect(loadSimulatorState()).toBeNull()
        expect(() => saveSimulatorState({
            activeConfigId: "1",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
        })).not.toThrow()
    })
})

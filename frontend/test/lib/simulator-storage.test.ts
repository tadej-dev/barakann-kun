import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"

import {
    clearSimulatorState,
    loadLocalConfigCollection,
    loadSimulatorState,
    saveLocalConfigCollection,
    saveSimulatorState,
    subscribeToLocalConfigChanges,
} from "@/lib/simulator-storage"
import type {ConfigStates} from "@/features/simulator/simulatorTypes"
import type {StoredConfig} from "@/features/saved-builds/configRules"
import type {Part} from "@/types/part"

const STORAGE_KEY = "barakann-simulator-configs-v4"
const COLLECTION_STORAGE_KEY = "barakann-config-collection-v2"
const LEGACY_V3_KEY = "barakann-simulator-configs-v3"
const LEGACY_COLLECTION_KEY = "barakann-config-collection-v1"

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

// Storageイベントを監視するテスト用のwindow
function createWindowStub(localStorage: Storage) {
    const target = new EventTarget()

    return {
        localStorage,
        addEventListener: target.addEventListener.bind(target),
        removeEventListener: target.removeEventListener.bind(target),
        dispatchEvent: (event: Event) => target.dispatchEvent(event),
    }
}

function dispatchStorageEvent(key: string | null) {
    const event = new Event("storage") as Event & {key: string | null}
    event.key = key
    window.dispatchEvent(event)
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

// 構成1件分の保存データ
function createConfig(id: string, name = `構成${id}`): StoredConfig {
    return {
        id,
        name,
        parts: [{slotKey: "frame", partId: 10, price: 1000, weight: 100}],
    }
}

describe("simulator-storage", () => {
    beforeEach(() => {
        Object.defineProperty(globalThis, "window", {
            configurable: true,
            value: createWindowStub(createLocalStorage()),
        })
    })

    afterEach(() => {
        Reflect.deleteProperty(globalThis, "window")
    })

    // 構成の選択をIDごとに保存し、復元できる。
    it("構成ごとの選択を保存して復元する", () => {
        const part = createPart(20)
        const configs: ConfigStates = {
            "config-a": {frame: part},
            "config-b": {},
        }

        expect(saveSimulatorState({activeConfigId: "config-a", configs})).toBe(true)

        expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "")).toEqual({
            activeConfigId: "config-a",
            configs: {"config-a": {frame: 20}, "config-b": {}},
        })
        expect(loadSimulatorState()).toEqual({
            activeConfigId: "config-a",
            configs: {"config-a": {frame: 20}, "config-b": {}},
        })
    })

    // 構成一覧と並び順を保存して復元する。
    it("構成一覧と並び順を保存して復元する", () => {
        expect(saveLocalConfigCollection(
            [createConfig("config-a", "通勤用")],
            ["config:config-a"],
        )).toBe(true)

        expect(loadLocalConfigCollection()).toMatchObject({
            configs: [{id: "config-a", name: "通勤用", parts: [
                {slotKey: "frame", partId: 10, price: 1000, weight: 100},
            ]}],
            order: ["config:config-a"],
        })
    })

    // 壊れた構成は読み飛ばす。
    it("壊れた構成は読み飛ばす", () => {
        window.localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify({
            configs: [
                createConfig("a"),
                {id: "", name: "壊れている"},
                {id: "c", name: "   "},
            ],
            order: ["config:a"],
        }))

        expect(loadLocalConfigCollection().configs.map((config) => config.id))
            .toEqual(["a"])
    })

    // 旧形式(固定枠と追加構成)から1系統へ引き継ぐ。
    it("旧形式の構成を1系統へ引き継ぐ", () => {
        window.localStorage.setItem(LEGACY_V3_KEY, JSON.stringify({
            activeConfigId: "1",
            configs: {"1": {frame: 10}, "2": {}},
        }))
        window.localStorage.setItem(LEGACY_COLLECTION_KEY, JSON.stringify({
            savedBuilds: [{
                id: "old-build",
                name: "旧追加",
                parts: [{slotKey: "frame", partId: 10, price: 100, weight: 1}],
            }],
            order: ["config:1", "build:old-build"],
        }))

        const collection = loadLocalConfigCollection()

        expect(collection.configs.map((config) => config.id)).toEqual([
            "1",
            "2",
            "old-build",
        ])
        expect(collection.order).toEqual(["config:1", "config:old-build"])
    })

    // キー分割前のv3に埋め込まれた追加構成も引き継ぎ、旧パーツIDを読み替える。
    it("v3内蔵の追加構成を引き継ぎ、旧パーツIDを読み替える", () => {
        window.localStorage.setItem(LEGACY_V3_KEY, JSON.stringify({
            activeConfigId: "1",
            configs: {"1": {frame: 10}},
            savedBuilds: [{
                id: "old-build",
                name: "旧追加",
                parts: [{slotKey: "wheel", partId: 442, price: 100, weight: 1}],
            }],
            order: ["config:1", "build:old-build"],
        }))

        const collection = loadLocalConfigCollection()
        const migrated = collection.configs.find((config) =>
            config.id === "old-build")

        expect(migrated?.parts[0]?.partId).toBe(441)
        expect(collection.order).toContain("config:old-build")
    })

    // 保存に失敗したときはfalseを返す。
    it("保存に失敗したときはfalseを返す", () => {
        Object.defineProperty(window, "localStorage", {
            configurable: true,
            value: {
                ...createLocalStorage(),
                setItem: () => {
                    throw new Error("QuotaExceededError")
                },
                getItem: () => null,
                removeItem: () => {},
            },
        })

        expect(saveSimulatorState({
            activeConfigId: "a",
            configs: {"a": {}},
        })).toBe(false)
        expect(saveLocalConfigCollection([createConfig("a")], [])).toBe(false)
    })

    // 別タブの保存を検知して通知する。
    it("別タブの保存を検知して通知する", () => {
        const listener = vi.fn()
        const unsubscribe = subscribeToLocalConfigChanges(listener)

        window.localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify({
            configs: [createConfig("a")],
            order: ["config:a"],
        }))
        dispatchStorageEvent(COLLECTION_STORAGE_KEY)

        expect(listener).toHaveBeenCalledTimes(1)

        unsubscribe()
        dispatchStorageEvent(COLLECTION_STORAGE_KEY)
        expect(listener).toHaveBeenCalledTimes(1)
    })

    // 関係ないキーの更新では通知しない。
    it("関係ないキーの更新では通知しない", () => {
        const listener = vi.fn()
        subscribeToLocalConfigChanges(listener)

        dispatchStorageEvent("other")

        expect(listener).not.toHaveBeenCalled()
    })

    // 全消去で、構成一覧も選択状態も消える。
    it("全消去で保存内容を消す", () => {
        saveSimulatorState({activeConfigId: "a", configs: {"a": {}}})
        saveLocalConfigCollection([createConfig("a")], ["config:a"])

        clearSimulatorState()

        expect(loadSimulatorState()).toBeNull()
        expect(loadLocalConfigCollection()).toEqual({configs: [], order: []})
    })

    // Storageへアクセスできない環境でも例外を画面へ伝播しない。
    it("Storageへアクセスできない環境でも例外を画面へ伝播しない", () => {
        Object.defineProperty(window, "localStorage", {
            configurable: true,
            get: () => {
                throw new Error("Storage is unavailable")
            },
        })

        expect(loadSimulatorState()).toBeNull()
        expect(loadLocalConfigCollection()).toEqual({configs: [], order: []})
        expect(saveSimulatorState({
            activeConfigId: "a",
            configs: {"a": {}},
        })).toBe(false)
        expect(saveLocalConfigCollection([], [])).toBe(false)
    })
})

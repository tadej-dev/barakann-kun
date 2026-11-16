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
import type {Part} from "@/types/part"

const LEGACY_V1_KEY = "barakann-simulator-configs-v1"
const LEGACY_V2_KEY = "barakann-simulator-configs-v2"
const STORAGE_KEY = "barakann-simulator-configs-v3"
const COLLECTION_STORAGE_KEY = "barakann-config-collection-v1"

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

// Storageイベントを監視するテスト用のwindow。jsdomを使わずにイベントだけ再現する
function createWindowStub(localStorage: Storage) {
    const target = new EventTarget()

    return {
        localStorage,
        addEventListener: target.addEventListener.bind(target),
        removeEventListener: target.removeEventListener.bind(target),
        dispatchEvent: (event: Event) => target.dispatchEvent(event),
    }
}

// 別タブでの保存を模したStorageイベントを発火する
function dispatchStorageEvent(key: string | null) {
    const event = new Event("storage") as Event & {key: string | null}
    event.key = key
    window.dispatchEvent(event)
}

// 追加構成1件分の最小データ
function createStoredBuild(id: string, name = `構成${id}`) {
    return {
        id,
        name,
        parts: [{slotKey: "frame", partId: 10, price: 1000, weight: 100}],
    }
}

// 現行形式・旧形式・Storage利用不可の環境で、画面状態を安全に復元できるか確認する。
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

        expect(saveSimulatorState({activeConfigId: "1", configs})).toBe(true)

        expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "")).toEqual({
            activeConfigId: "1",
            configs: {
                "1": {frame: 20},
                "2": {},
                "3": {},
                "4": {},
            },
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

    // 追加構成と並び順を保存し、再読み込みで復元する。
    it("追加構成と並び順を保存して復元する", () => {
        expect(saveLocalConfigCollection(
            [createStoredBuild("build-1", "通勤用")],
            ["config:1", "build:build-1"],
        )).toBe(true)

        expect(loadLocalConfigCollection()).toEqual({
            savedBuilds: [createStoredBuild("build-1", "通勤用")],
            order: ["config:1", "build:build-1"],
        })
    })

    // 構成の選択と追加構成は別のキーに保存し、互いを上書きしない。
    it("構成の選択と追加構成を別のキーに保存する", () => {
        saveLocalConfigCollection([createStoredBuild("build-1")], ["build:build-1"])
        saveSimulatorState({
            activeConfigId: "2",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
        })

        // 選択を保存しても追加構成は残り、その逆も同じ。
        expect(loadLocalConfigCollection().savedBuilds).toHaveLength(1)
        expect(loadSimulatorState()?.activeConfigId).toBe("2")

        saveLocalConfigCollection([], [])

        expect(loadSimulatorState()?.activeConfigId).toBe("2")
    })

    // キー分割前のデータ(v3に追加構成が入っていた形式)は、新しいキーへ引き継ぐ。
    it("キー分割前の追加構成を新しいキーへ引き継ぐ", () => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            activeConfigId: "1",
            configs: {"1": {frame: 10}, "2": {}, "3": {}, "4": {}},
            savedBuilds: [createStoredBuild("build-1", "通勤用")],
            order: ["config:1", "build:build-1"],
        }))

        expect(loadLocalConfigCollection()).toEqual({
            savedBuilds: [createStoredBuild("build-1", "通勤用")],
            order: ["config:1", "build:build-1"],
        })
        // 引き継ぎ後は新しいキーにも保存され、次回はそこから読む。
        expect(JSON.parse(
            window.localStorage.getItem(COLLECTION_STORAGE_KEY) ?? "",
        )).toMatchObject({order: ["config:1", "build:build-1"]})
        // 構成の選択はそのまま読める。
        expect(loadSimulatorState()?.configs["1"]).toEqual({frame: 10})
    })

    // 旧キー(v2)に保存された状態も読み込める。
    it("v2形式の保存内容も読み込める", () => {
        window.localStorage.setItem(LEGACY_V2_KEY, JSON.stringify({
            activeConfigId: "1",
            configs: {"1": {frame: 10}, "2": {}, "3": {}, "4": {}},
        }))

        expect(loadSimulatorState()).toMatchObject({
            configs: {"1": {frame: 10}},
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
        }))

        expect(loadSimulatorState()?.activeConfigId).toBe("2")

        saveSimulatorState({
            activeConfigId: "2",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
        })

        expect(window.localStorage.getItem(LEGACY_V2_KEY)).toBeNull()
        expect(window.localStorage.getItem(LEGACY_V1_KEY)).toBeNull()
    })

    // 壊れた追加構成は読み飛ばし、正常な項目だけを復元する。
    it("壊れた追加構成は読み飛ばす", () => {
        window.localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify({
            savedBuilds: [
                createStoredBuild("build-1", "通勤用"),
                {id: "", name: "壊れている", parts: []},
                {id: "build-3", name: "レース用", parts: [{slotKey: "frame"}]},
            ],
            order: ["build:build-1"],
        }))

        expect(loadLocalConfigCollection().savedBuilds).toEqual([
            {id: "build-1", name: "通勤用", parts: [{
                slotKey: "frame", partId: 10, price: 1000, weight: 100,
            }]},
            {id: "build-3", name: "レース用", parts: []},
        ])
    })

    // 保存時に、サーバーと同じルールで整える(名前の空白除去・不正な項目の除外)。
    it("保存時に構成名を整え、不正な項目を除く", () => {
        saveLocalConfigCollection([
            {...createStoredBuild("build-1", "  通勤用  ")},
            createStoredBuild("build-1", "重複ID"),
            {...createStoredBuild("build-2", "あ".repeat(51))},
            {
                id: "build-3",
                name: "レース用",
                parts: [
                    {slotKey: "frame", partId: 10, price: 1000, weight: 100},
                    {slotKey: "frame", partId: 99, price: 1, weight: 1},
                    {slotKey: "INVALID", partId: 10, price: 1, weight: 1},
                ],
            },
        ], ["config:1", "config:1", "", "x".repeat(201)])

        expect(loadLocalConfigCollection()).toEqual({
            savedBuilds: [
                {...createStoredBuild("build-1", "通勤用")},
                {id: "build-3", name: "レース用", parts: [{
                    slotKey: "frame", partId: 10, price: 1000, weight: 100,
                }]},
            ],
            order: ["config:1"],
        })
    })

    // 移行では旧パーツIDを読み替え、移行元の追加構成を消す。
    it("移行時に旧パーツIDを読み替え、移行元を空にする", () => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            activeConfigId: "1",
            configs: {"1": {frame: 10}, "2": {}, "3": {}, "4": {}},
            savedBuilds: [{
                id: "build-1",
                name: "通勤用",
                parts: [{
                    slotKey: "wheel", partId: 442, price: 1000, weight: 100,
                }],
            }],
            order: ["build:build-1"],
        }))

        expect(loadLocalConfigCollection().savedBuilds[0]?.parts).toEqual([
            {slotKey: "wheel", partId: 441, price: 1000, weight: 100},
        ])
        // 移行後は旧キーに追加構成の項目が残らない
        expect(JSON.parse(
            window.localStorage.getItem(STORAGE_KEY) ?? "",
        )).not.toHaveProperty("savedBuilds")
    })

    // 移行先へ保存できなかった場合は、旧データを残して次回もう一度試す。
    it("移行に失敗したときは旧データを残す", () => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            activeConfigId: "1",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
            savedBuilds: [createStoredBuild("build-1")],
            order: ["build:build-1"],
        }))

        const original = window.localStorage.setItem.bind(window.localStorage)
        let failCollection = true
        window.localStorage.setItem = (key: string, value: string) => {
            if (key === COLLECTION_STORAGE_KEY && failCollection) {
                throw new Error("QuotaExceededError")
            }

            original(key, value)
        }

        // 移行に失敗しても、旧キーの内容は画面へ返す
        expect(loadLocalConfigCollection().savedBuilds).toHaveLength(1)
        expect(JSON.parse(
            window.localStorage.getItem(STORAGE_KEY) ?? "",
        )).toHaveProperty("savedBuilds")

        // 保存できるようになれば移行される
        failCollection = false
        expect(loadLocalConfigCollection().savedBuilds).toHaveLength(1)
    })

    // 構成の保存経由でも、キー分割前の追加構成を失わない。
    it("構成の保存時に移行してから書き換える", () => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            activeConfigId: "1",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
            savedBuilds: [createStoredBuild("build-old")],
            order: ["build:build-old"],
        }))

        expect(saveSimulatorState({
            activeConfigId: "2",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
        })).toBe(true)

        expect(loadLocalConfigCollection().savedBuilds).toHaveLength(1)
        expect(loadSimulatorState()?.activeConfigId).toBe("2")
    })

    // 移行に失敗したときは、構成の保存でも旧データを書き換えない。
    it("移行に失敗したら構成の保存で旧データを消さない", () => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            activeConfigId: "1",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
            savedBuilds: [createStoredBuild("build-old")],
            order: ["build:build-old"],
        }))

        const originalSetItem = window.localStorage.setItem.bind(
            window.localStorage,
        )
        window.localStorage.setItem = (key: string, value: string) => {
            if (key === COLLECTION_STORAGE_KEY) {
                throw new Error("QuotaExceededError")
            }

            originalSetItem(key, value)
        }

        expect(saveSimulatorState({
            activeConfigId: "2",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
        })).toBe(false)
        // 旧キーの追加構成はそのまま残る
        expect(JSON.parse(
            window.localStorage.getItem(STORAGE_KEY) ?? "",
        )).toHaveProperty("savedBuilds")

        window.localStorage.setItem = originalSetItem
    })

    // 新しいキーが壊れている場合は、旧データで置き換える(データを失わない)。
    it("新しいキーが壊れているときは旧データで置き換える", () => {
        window.localStorage.setItem(COLLECTION_STORAGE_KEY, "{broken")
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            activeConfigId: "1",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
            savedBuilds: [createStoredBuild("build-old")],
            order: ["build:build-old"],
        }))

        expect(loadLocalConfigCollection().savedBuilds.map((build) => build.id))
            .toEqual(["build-old"])
        // 移行後は新しいキーに保存され、次回も読める
        expect(loadLocalConfigCollection().savedBuilds).toHaveLength(1)
    })

    // 項目の型だけが壊れている場合も、旧データで置き換える。
    it("新しいキーの項目が壊れているときも旧データで置き換える", () => {
        window.localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify({
            savedBuilds: "broken",
            order: ["config:1"],
        }))
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            activeConfigId: "1",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
            savedBuilds: [createStoredBuild("build-old")],
            order: ["build:build-old"],
        }))

        expect(loadLocalConfigCollection().savedBuilds.map((build) => build.id))
            .toEqual(["build-old"])
    })

    // 新しいキーに既にデータがある場合は、旧データで上書きしない。
    it("新しいキーがあるときは旧データを移行しない", () => {
        saveLocalConfigCollection(
            [createStoredBuild("build-new")],
            ["build:build-new"],
        )
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            activeConfigId: "1",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
            savedBuilds: [createStoredBuild("build-old")],
            order: ["build:build-old"],
        }))

        saveSimulatorState({
            activeConfigId: "2",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
        })

        expect(loadLocalConfigCollection().savedBuilds.map((build) => build.id))
            .toEqual(["build-new"])
    })

    // 保存直後の生データが、サーバーと同じルールで整えられている。
    it("保存直後の生データを正規化する", () => {
        saveLocalConfigCollection([
            {id: "build-1", name: "  通勤用  ", parts: []},
            {id: "build 2", name: "空白入りID", parts: []},
            {id: "build-3", name: "   ", parts: []},
            {id: "build-4", name: "レース用", parts: [
                {slotKey: " frame ", partId: 10, price: 1000, weight: 100},
                {slotKey: "frame", partId: 11, price: 1000, weight: 100},
                {slotKey: "frame", partId: 12, price: -1, weight: 100},
            ]},
        ], ["config:1", "  ", "x".repeat(201)])

        expect(JSON.parse(
            window.localStorage.getItem(COLLECTION_STORAGE_KEY) ?? "",
        )).toEqual({
            savedBuilds: [
                {id: "build-1", name: "通勤用", parts: []},
                {id: "build-4", name: "レース用", parts: [{
                    slotKey: "frame", partId: 10, price: 1000, weight: 100,
                }]},
            ],
            order: ["config:1"],
        })
    })

    // 追加構成は固定枠を除いた上限(16件)までに制限する。
    it("追加構成を上限までに制限する", () => {
        const builds = Array.from({length: 20}, (_, index) =>
            createStoredBuild(`build-${index}`))

        saveLocalConfigCollection(builds, [])

        expect(loadLocalConfigCollection().savedBuilds).toHaveLength(16)
    })

    // 保存できなかった場合はfalseを返し、呼び出し側が通知できるようにする。
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
            activeConfigId: "1",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
        })).toBe(false)
        expect(saveLocalConfigCollection([createStoredBuild("build-1")], []))
            .toBe(false)
    })

    // パーツは1構成100件までに制限する。
    it("パーツ数を上限までに制限する", () => {
        const parts = Array.from({length: 120}, (_, index) => ({
            slotKey: `slot${index}`,
            partId: index + 1,
            price: 100,
            weight: 100,
        }))

        saveLocalConfigCollection([{id: "build-1", name: "通勤用", parts}], [])

        expect(loadLocalConfigCollection().savedBuilds[0]?.parts).toHaveLength(100)
    })

    // 表示順は24件までに制限する。
    it("表示順を上限までに制限する", () => {
        const order = Array.from({length: 30}, (_, index) => `config:${index}`)

        saveLocalConfigCollection([], order)

        expect(loadLocalConfigCollection().order).toHaveLength(24)
    })

    // 不正なパーツ(負の価格・欠けた重量・0のパーツID)は読み飛ばす。
    it("不正なパーツを読み飛ばす", () => {
        saveLocalConfigCollection([{
            id: "build-1",
            name: "通勤用",
            parts: [
                {slotKey: "frame", partId: 10, price: 1000, weight: 100},
                {slotKey: "fork", partId: 11, price: -1, weight: 100},
                {slotKey: "wheel", partId: 12, price: 1000},
                {slotKey: "tire", partId: 0, price: 1000, weight: 100},
                null,
            ] as never,
        }], [])

        expect(loadLocalConfigCollection().savedBuilds[0]?.parts).toEqual([
            {slotKey: "frame", partId: 10, price: 1000, weight: 100},
        ])
    })

    // 構成を全消去したときは、追加構成のキーも消す。
    it("全消去で追加構成も消す", () => {
        saveLocalConfigCollection([createStoredBuild("build-1")], ["build:build-1"])
        saveSimulatorState({
            activeConfigId: "1",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
        })

        clearSimulatorState()

        expect(loadSimulatorState()).toBeNull()
        expect(loadLocalConfigCollection()).toEqual({savedBuilds: [], order: []})
        expect(window.localStorage.getItem(COLLECTION_STORAGE_KEY)).toBeNull()
    })

    // 旧キーの後片付けに失敗しても、保存自体は成功として扱う。
    it("旧キーを削除できなくても保存は成功とする", () => {
        const original = window.localStorage.removeItem.bind(window.localStorage)
        window.localStorage.removeItem = () => {
            throw new Error("Storage is unavailable")
        }

        expect(saveSimulatorState({
            activeConfigId: "1",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
        })).toBe(true)

        window.localStorage.removeItem = original
    })

    // 別タブの保存を検知して、最新の追加構成を通知する。
    it("別タブの保存を検知して通知する", () => {
        const listener = vi.fn()
        const unsubscribe = subscribeToLocalConfigChanges(listener)

        window.localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify({
            savedBuilds: [createStoredBuild("build-1")],
            order: ["build:build-1"],
        }))
        dispatchStorageEvent(COLLECTION_STORAGE_KEY)

        expect(listener).toHaveBeenCalledWith({
            savedBuilds: [createStoredBuild("build-1")],
            order: ["build:build-1"],
        })

        unsubscribe()
        dispatchStorageEvent(COLLECTION_STORAGE_KEY)
        expect(listener).toHaveBeenCalledTimes(1)
    })

    // Storage全体のclearでも一覧を取り直す。
    it("Storage全体のclearでも通知する", () => {
        const listener = vi.fn()
        subscribeToLocalConfigChanges(listener)

        dispatchStorageEvent(null)

        expect(listener).toHaveBeenCalledWith({savedBuilds: [], order: []})
    })

    // 構成の選択だけが変わっても、追加構成は読み直さない。
    it("構成の選択の更新では通知しない", () => {
        const listener = vi.fn()
        subscribeToLocalConfigChanges(listener)

        dispatchStorageEvent(STORAGE_KEY)

        expect(listener).not.toHaveBeenCalled()
    })

    // 関係ないキーの更新では通知しない。
    it("関係ないキーの更新では通知しない", () => {
        const listener = vi.fn()
        subscribeToLocalConfigChanges(listener)

        dispatchStorageEvent("other")

        expect(listener).not.toHaveBeenCalled()
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
        expect(loadLocalConfigCollection()).toEqual({savedBuilds: [], order: []})
        // 保存できない場合はfalseを返し、画面側が通知できるようにする
        expect(saveSimulatorState({
            activeConfigId: "1",
            configs: {"1": {}, "2": {}, "3": {}, "4": {}},
        })).toBe(false)
        expect(saveLocalConfigCollection([], [])).toBe(false)
    })
})

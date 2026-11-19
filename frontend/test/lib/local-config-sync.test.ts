// @vitest-environment jsdom

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"

import type {SavedBuild} from "@/api/savedBuilds"
import type {StoredConfig} from "@/features/saved-builds/configRules"
import {
    buildMigrationPlan,
    createConfigMatchKey,
    loadLocalOrigin,
    saveLocalOrigin,
    saveServerSnapshotToLocal,
} from "@/lib/local-config-sync"
import {loadLocalConfigCollection} from "@/lib/simulator-storage"

// テスト用のローカル構成
function createLocalConfig(
    id: string,
    name: string,
    parts: StoredConfig["parts"] = [],
): StoredConfig {
    return {id, name, parts}
}

// テスト用のサーバー構成
function createServerConfig(
    id: string,
    name: string,
    parts: SavedBuild["parts"] = [],
): SavedBuild {
    return {
        id,
        name,
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        parts,
    }
}

describe("ローカル構成の移行と保存", () => {
    beforeEach(() => {
        window.localStorage.clear()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    // 名前とパーツ構成が同じものは重複として扱う(パーツの順序は問わない)。
    it("名前とパーツ構成が同じ構成を重複とする", () => {
        const local = [
            createLocalConfig("local-1", "通勤用", [
                {slotKey: "frame", partId: 1, price: 1, weight: 1},
                {slotKey: "wheel", partId: 2, price: 1, weight: 1},
            ]),
        ]
        const server = [
            createServerConfig("server-1", "通勤用", [
                {slotKey: "wheel", partId: 2, price: 9, weight: 9},
                {slotKey: "frame", partId: 1, price: 9, weight: 9},
            ]),
        ]

        const plan = buildMigrationPlan(local, server, 20)

        expect(plan.candidates[0]?.status).toBe("duplicate")
        expect(plan.defaultSelectedIds).toEqual([])
    })

    // 上限を超える構成は over-limit として既定選択から外す。
    it("上限を超える構成は既定で選択しない", () => {
        const local = [
            createLocalConfig("local-1", "1件目"),
            createLocalConfig("local-2", "2件目"),
            createLocalConfig("local-3", "3件目"),
        ]
        const server = [
            createServerConfig("server-1", "既存1"),
            createServerConfig("server-2", "既存2"),
        ]

        const plan = buildMigrationPlan(local, server, 4)

        expect(plan.remainingSlots).toBe(2)
        expect(plan.candidates.map((candidate) => candidate.status)).toEqual([
            "new",
            "new",
            "over-limit",
        ])
        expect(plan.defaultSelectedIds).toEqual(["local-1", "local-2"])
    })

    // 一致判定用キーは名前とパーツで決まり、パーツの並び順に依存しない。
    it("一致判定用キーはパーツの順序に依存しない", () => {
        const first = createLocalConfig("a", "通勤用", [
            {slotKey: "frame", partId: 1, price: 1, weight: 1},
            {slotKey: "wheel", partId: 2, price: 1, weight: 1},
        ])
        const second = createLocalConfig("b", "通勤用", [
            {slotKey: "wheel", partId: 2, price: 5, weight: 5},
            {slotKey: "frame", partId: 1, price: 5, weight: 5},
        ])

        expect(createConfigMatchKey(first))
            .toBe(createConfigMatchKey(second))
    })

    // 由来アカウントの保存・読み取り・消去。
    it("由来アカウントを保存して読み取れる", () => {
        expect(loadLocalOrigin()).toBeNull()

        saveLocalOrigin("user-1")

        expect(loadLocalOrigin()).toBe("user-1")

        saveLocalOrigin(null)

        expect(loadLocalOrigin()).toBeNull()
    })

    // ログアウト時はアカウントの構成をローカルへ上書き保存する。
    it("アカウントの構成をローカルへ保存し由来を記録する", () => {
        const snapshot = {
            configs: [createLocalConfig("server-1", "通勤用", [
                {slotKey: "frame", partId: 1, price: 100, weight: 1000},
            ])],
            order: ["config:server-1"],
        }

        expect(saveServerSnapshotToLocal("user-1", snapshot)).toBe(true)

        const saved = loadLocalConfigCollection()

        expect(saved.configs).toHaveLength(1)
        expect(saved.configs[0]?.name).toBe("通勤用")
        expect(saved.order).toEqual(["config:server-1"])
        expect(loadLocalOrigin()).toBe("user-1")
    })

    // 保存に失敗した場合はfalseを返し、由来を記録しない。
    it("保存に失敗したときは由来を記録しない", () => {
        const setItem = vi.spyOn(Storage.prototype, "setItem")
            .mockImplementation(() => {
                throw new Error("quota exceeded")
            })

        const snapshot = {
            configs: [createLocalConfig("server-1", "通勤用")],
            order: ["config:server-1"],
        }

        expect(saveServerSnapshotToLocal("user-1", snapshot)).toBe(false)
        expect(loadLocalOrigin()).toBeNull()

        setItem.mockRestore()
    })
})

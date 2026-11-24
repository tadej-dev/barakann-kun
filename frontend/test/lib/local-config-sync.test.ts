// @vitest-environment jsdom

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"

import type {SavedBuild} from "@/api/savedBuilds"
import type {StoredConfig} from "@/features/saved-builds/configRules"
import {
    buildMigrationPlan,
    canMigrateForAccount,
    intersectSelectableIds,
    selectMigrationTargets,
    createConfigMatchKey,
    loadLocalOrigin,
    saveLocalOrigin,
    saveServerSnapshotToLocal,
} from "@/lib/local-config-sync"
import {saveLocalConfigCollection} from "@/lib/simulator-storage"
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

// ローカル構成の移行判定・選択・由来記録・保存失敗を保証
describe("ローカル構成の移行と保存", () => {
    beforeEach(() => {
        window.localStorage.clear()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    // 名前とパーツ構成が同じものは重複として扱う(パーツの順序は問わない)
    it("名前とパーツ構成が同じ構成を重複とする", () => {
        // サーバーと同じ名前・パーツのローカル構成
        const local = [
            createLocalConfig("local-1", "通勤用", [
                {slotKey: "frame", partId: 1, price: 1, weight: 1},
                {slotKey: "wheel", partId: 2, price: 1, weight: 1},
            ]),
        ]
        // 同じ構成を持つサーバーの保存構成
        const server = [
            createServerConfig("server-1", "通勤用", [
                {slotKey: "wheel", partId: 2, price: 9, weight: 9},
                {slotKey: "frame", partId: 1, price: 9, weight: 9},
            ]),
        ]

        // 移行計画
        const plan = buildMigrationPlan(local, server, 20)

        expect(plan.candidates[0]?.status).toBe("duplicate")
        expect(plan.defaultSelectedIds).toEqual([])
    })

    // 上限を超える構成は over-limit として既定選択から外す
    it("上限を超える構成は既定で選択しない", () => {
        // 上限を超える3件のローカル構成
        const local = [
            createLocalConfig("local-1", "1件目", [
                {slotKey: "frame", partId: 1, price: 1, weight: 1},
            ]),
            createLocalConfig("local-2", "2件目", [
                {slotKey: "frame", partId: 2, price: 1, weight: 1},
            ]),
            createLocalConfig("local-3", "3件目", [
                {slotKey: "frame", partId: 3, price: 1, weight: 1},
            ]),
        ]
        // 保存済みの2件のサーバー構成
        const server = [
            createServerConfig("server-1", "既存1"),
            createServerConfig("server-2", "既存2"),
        ]

        // 残り枠2件の移行計画
        const plan = buildMigrationPlan(local, server, 4)

        expect(plan.remainingSlots).toBe(2)
        expect(plan.candidates.map((candidate) => candidate.status)).toEqual([
            "new",
            "new",
            "over-limit",
        ])
        expect(plan.defaultSelectedIds).toEqual(["local-1", "local-2"])
    })

    // 選択した構成のうち、重複でないものを移行対象にする
    it("選択した構成を移行対象にする", () => {
        // 選択対象の2件のローカル構成
        const local = [
            createLocalConfig("local-1", "A", [
                {slotKey: "frame", partId: 1, price: 1, weight: 1},
            ]),
            createLocalConfig("local-2", "B", [
                {slotKey: "frame", partId: 2, price: 1, weight: 1},
            ]),
        ]
        // 上限を1件にして、2件目が上限超過になる計画を作る
        const plan = buildMigrationPlan(local, [], 1)

        // 上限超過も、選択されていれば移行対象に含める
        expect(selectMigrationTargets(plan, ["local-1", "local-2"])
            .map((config) => config.id)).toEqual(["local-1", "local-2"])
        expect(intersectSelectableIds(plan, ["local-1", "missing"]))
            .toEqual(["local-1"])
    })

    // パーツが空の構成は移行候補にしないことを保証
    it("空の構成は移行候補にしない", () => {
        // パーツが空のローカル構成
        const local = [createLocalConfig("local-1", "構成1")]
        // 同じ名前のサーバー構成
        const server = [createServerConfig("server-1", "構成1")]

        // 移行計画
        const plan = buildMigrationPlan(local, server, 20)

        expect(plan.candidates).toEqual([])
        expect(plan.defaultSelectedIds).toEqual([])
    })

    // ログイン直後の空の構成1は、移行する構成で置き換える
    it("空の構成1がある場合は置き換え対象にする", () => {
        // 構成1を含む2件のローカル構成
        const local = [
            createLocalConfig("local-1", "構成1", [
                {slotKey: "frame", partId: 1, price: 1, weight: 1},
            ]),
            createLocalConfig("local-2", "構成2", [
                {slotKey: "frame", partId: 2, price: 1, weight: 1},
            ]),
        ]
        // 構成1だけを持つサーバー構成
        const server = [createServerConfig("server-1", "構成1")]

        // 置き換え対象を含む移行計画
        const plan = buildMigrationPlan(local, server, 20)

        expect(plan.replaceInitialConfig)
            .toEqual({id: "server-1", version: 1})
        expect(plan.remainingSlots).toBe(20)
        expect(plan.candidates.map((candidate) => candidate.status))
            .toEqual(["new", "new"])
    })

    // ローカル同士で同じ構成が2件あるときは、2件目を重複にする
    it("ローカル同士の重複は2件目を選ばない", () => {
        // 2件で共有するパーツ構成
        const parts = [{slotKey: "frame", partId: 1, price: 1, weight: 1}]
        // 同じ内容の2件のローカル構成
        const local = [
            createLocalConfig("local-1", "通勤用", parts),
            createLocalConfig("local-2", "通勤用", parts),
        ]

        // 移行計画
        const plan = buildMigrationPlan(local, [], 20)

        expect(plan.candidates.map((candidate) => candidate.status))
            .toEqual(["new", "duplicate"])
        expect(plan.defaultSelectedIds).toEqual(["local-1"])
    })

    // 一致判定用キーは名前とパーツで決まり、パーツの並び順に依存しない
    it("一致判定用キーはパーツの順序に依存しない", () => {
        // パーツの並び順が異なる構成
        const first = createLocalConfig("a", "通勤用", [
            {slotKey: "frame", partId: 1, price: 1, weight: 1},
            {slotKey: "wheel", partId: 2, price: 1, weight: 1},
        ])
        // 比較対象となる別の並び順の構成
        const second = createLocalConfig("b", "通勤用", [
            {slotKey: "wheel", partId: 2, price: 5, weight: 5},
            {slotKey: "frame", partId: 1, price: 5, weight: 5},
        ])

        expect(createConfigMatchKey(first))
            .toBe(createConfigMatchKey(second))
    })

    // 由来アカウントの保存・読み取り・消去
    it("由来アカウントを保存して読み取れる", () => {
        expect(loadLocalOrigin()).toBeNull()

        saveLocalOrigin("user-1")

        expect(loadLocalOrigin()).toBe("user-1")

        saveLocalOrigin(null)

        expect(loadLocalOrigin()).toBeNull()
    })

    // 由来が無い、または同じアカウントのときだけ移行
    it("由来が無いか同じアカウントのときだけ移行する", () => {
        expect(canMigrateForAccount(null, "user-1")).toBe(true)
        expect(canMigrateForAccount("user-1", "user-1")).toBe(true)
        expect(canMigrateForAccount("user-2", "user-1")).toBe(false)
    })

    // ログアウト時はアカウントの構成をローカルへ上書き保存
    it("アカウントの構成をローカルへ保存し由来を記録する", () => {
        // ログアウト時に保存するサーバー構成のスナップショット
        const snapshot = {
            configs: [createLocalConfig("server-1", "通勤用", [
                {slotKey: "frame", partId: 1, price: 100, weight: 1000},
            ])],
            order: ["config:server-1"],
        }

        expect(saveServerSnapshotToLocal("user-1", snapshot)).toBe(true)

        // 保存されたローカル構成
        const saved = loadLocalConfigCollection()

        expect(saved.configs).toHaveLength(1)
        expect(saved.configs[0]?.name).toBe("通勤用")
        expect(saved.order).toEqual(["config:server-1"])
        expect(loadLocalOrigin()).toBe("user-1")
    })

    // 構成の保存に失敗しても、以前の由来を消さない
    it("保存に失敗しても以前の由来を残す", () => {
        saveLocalOrigin("user-B")
        saveLocalConfigCollection(
            [createLocalConfig("b-1", "Bの構成")],
            ["config:b-1"],
        )

        // 元の保存処理
        const originalSetItem = Storage.prototype.setItem
        // 構成一覧の書き込みだけを失敗させる保存処理
        const setItem = vi.spyOn(Storage.prototype, "setItem")
            .mockImplementation((key: string, value: string) => {
                // 構成一覧の書き込みだけを失敗させる
                if (key === "barakann-config-collection-v2") {
                    throw new Error("quota exceeded")
                }

                originalSetItem.call(window.localStorage, key, value)
            })

        // スナップショット保存の成否
        const saved = saveServerSnapshotToLocal("user-A", {
            configs: [createLocalConfig("a-1", "Aの構成")],
            order: ["config:a-1"],
        })

        expect(saved).toBe(false)
        expect(loadLocalOrigin()).toBe("user-B")

        setItem.mockRestore()
    })

    // 保存に失敗した場合はfalseを返し、由来を記録しない
    it("保存に失敗したときは由来を記録しない", () => {
        // すべての書き込みを失敗させる保存処理
        const setItem = vi.spyOn(Storage.prototype, "setItem")
            .mockImplementation(() => {
                throw new Error("quota exceeded")
            })

        // 保存するサーバー構成のスナップショット
        const snapshot = {
            configs: [createLocalConfig("server-1", "通勤用")],
            order: ["config:server-1"],
        }

        expect(saveServerSnapshotToLocal("user-1", snapshot)).toBe(false)
        expect(loadLocalOrigin()).toBeNull()

        setItem.mockRestore()
    })
})

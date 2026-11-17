// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it} from "vitest"
import {act, renderHook, waitFor} from "@testing-library/react"

import {useLocalConfigCollection} from "@/features/saved-builds/useLocalConfigCollection"
import {
    loadLocalConfigCollection,
    saveLocalConfigCollection,
} from "@/lib/simulator-storage"

// テストごとに描画した内容を破棄し、次のテストへ持ち越さない
afterEach(() => {
    window.localStorage.clear()
})

// 各テストを空の保存領域から始める
beforeEach(() => {
    window.localStorage.clear()
})

// パーツ1件分の保存データ
function createPart(partId = 10) {
    return {slotKey: "frame", partId, price: 1000, weight: 2000}
}

describe("useLocalConfigCollection", () => {
    // 保存済みの内容を読み込んで一覧に出す。
    it("保存済みの追加構成を読み込む", () => {
        saveLocalConfigCollection(
            [{id: "build-1", name: "通勤用", parts: [createPart()]}],
            ["build:build-1"],
        )

        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))

        expect(result.current.builds.builds).toEqual([{
            id: "build-1",
            name: "通勤用",
            version: 1,
            createdAt: "",
            updatedAt: "",
            parts: [createPart()],
        }])
        expect(result.current.order.order).toEqual(["build:build-1"])
        expect(result.current.isReady).toBe(true)
    })

    // 作成した構成は、一覧と保存領域の両方へ反映する。
    it("追加構成を作成して保存する", async () => {
        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))

        let createdId = ""

        await act(async () => {
            const created = await result.current.builds.create(
                "通勤用",
                [createPart()],
            )
            createdId = created.id
        })

        expect(result.current.builds.builds).toHaveLength(1)
        expect(result.current.builds.builds[0]?.name).toBe("通勤用")
        expect(loadLocalConfigCollection().savedBuilds[0]?.id).toBe(createdId)
        // 追加した構成は表示順にも入る
        expect(result.current.order.order).toEqual([`build:${createdId}`])
    })

    // 既存の構成がある状態で作成しても、並び順から既存が落ちない。
    it("作成しても既存の並び順を保つ", async () => {
        saveLocalConfigCollection(
            [{id: "build-old", name: "既存", parts: []}],
            ["config:2", "build:build-old"],
        )

        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))

        await act(async () => {
            await result.current.builds.create("新規", [])
        })

        const order = loadLocalConfigCollection().order

        expect(order).toContain("config:2")
        expect(order).toContain("build:build-old")
        // 新しい構成も末尾に加わる
        expect(order).toContain(`build:${result.current.builds.builds[0]!.id}`)
    })

    // 名前変更と更新は、保存領域の内容も書き換える。
    it("追加構成の名前とパーツを更新する", async () => {
        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))

        let buildId = ""

        await act(async () => {
            const created = await result.current.builds.create(
                "通勤用",
                [createPart()],
            )
            buildId = created.id
        })

        await act(async () => {
            await result.current.builds.rename(
                result.current.builds.builds[0]!,
                "レース用",
            )
        })

        expect(result.current.builds.builds[0]?.name).toBe("レース用")

        await act(async () => {
            await result.current.builds.update(
                result.current.builds.builds[0]!,
                [createPart(20)],
            )
        })

        expect(result.current.builds.builds[0]?.parts).toEqual([createPart(20)])
        expect(loadLocalConfigCollection().savedBuilds[0]).toMatchObject({
            id: buildId,
            name: "レース用",
            parts: [createPart(20)],
        })
    })

    // 削除した構成は、一覧と表示順の両方から消える。
    it("追加構成を削除すると表示順からも消える", async () => {
        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))

        await act(async () => {
            await result.current.builds.create("通勤用", [createPart()])
        })

        await act(async () => {
            await result.current.builds.remove(result.current.builds.builds[0]!)
        })

        expect(result.current.builds.builds).toHaveLength(0)
        expect(result.current.order.order).toEqual([])
        expect(loadLocalConfigCollection().savedBuilds).toHaveLength(0)
    })

    // 並び替えた順番を保存し、未登録の構成は末尾へ補う。
    it("並び順を保存する", async () => {
        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))

        await act(async () => {
            await result.current.builds.create("通勤用", [createPart()])
        })

        const buildKey = result.current.order.order[0]!

        await act(async () => {
            await result.current.order.save(["config:2", buildKey, "config:1"])
        })

        expect(result.current.order.order).toEqual([
            "config:2",
            buildKey,
            "config:1",
        ])
        // 渡した順のまま保存する（一覧の描画時に不足分を末尾へ補う）
        expect(loadLocalConfigCollection().order).toEqual([
            "config:2",
            buildKey,
            "config:1",
        ])
    })

    // 追加できるのは上限までにする。
    it("上限を超えて作成できない", async () => {
        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))

        await act(async () => {
            for (let index = 0; index < 16; index += 1) {
                await result.current.builds.create(`構成${index}`, [])
            }
        })

        expect(result.current.builds.builds).toHaveLength(16)

        await act(async () => {
            await expect(result.current.builds.create("超過", []))
                .rejects.toThrow()
        })

        expect(result.current.builds.builds).toHaveLength(16)
    })

    // 保存できないときは、エラーを残して呼び出し側へ伝える。
    it("保存に失敗したときはエラーを残す", async () => {
        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))

        // 容量超過などで書き込めない保存領域に差し替える
        const original = Object.getOwnPropertyDescriptor(window, "localStorage")
        Object.defineProperty(window, "localStorage", {
            configurable: true,
            value: {
                clear: () => {},
                getItem: () => null,
                key: () => null,
                length: 0,
                removeItem: () => {},
                setItem: () => {
                    throw new Error("QuotaExceededError")
                },
            },
        })

        await act(async () => {
            await expect(result.current.builds.create("通勤用", []))
                .rejects.toThrow()
        })

        await waitFor(() => {
            expect(result.current.builds.errorMessage).toContain("保存できませんでした")
        })

        if (original) {
            Object.defineProperty(window, "localStorage", original)
        }
    })

    // 再読み込みすると、保存失敗のメッセージは消える。
    it("再読み込みでエラーを消す", async () => {
        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))
        const original = Object.getOwnPropertyDescriptor(window, "localStorage")

        Object.defineProperty(window, "localStorage", {
            configurable: true,
            value: {
                clear: () => {},
                getItem: () => null,
                key: () => null,
                length: 0,
                removeItem: () => {},
                setItem: () => {
                    throw new Error("QuotaExceededError")
                },
            },
        })

        await act(async () => {
            await expect(result.current.builds.create("通勤用", [])).rejects.toThrow()
        })
        expect(result.current.builds.errorMessage).not.toBe("")

        if (original) {
            Object.defineProperty(window, "localStorage", original)
        }

        await act(async () => {
            await result.current.builds.reload()
        })

        expect(result.current.builds.errorMessage).toBe("")
    })

    // ログイン時はローカルの内容を扱わない。
    it("ログイン時はローカルの内容を返さない", () => {
        saveLocalConfigCollection(
            [{id: "build-1", name: "通勤用", parts: []}],
            ["build:build-1"],
        )

        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: false}))

        expect(result.current.builds.builds).toEqual([])
        expect(result.current.order.order).toEqual([])
        expect(result.current.builds.isLoading).toBe(false)
    })

    // 別タブでの保存を検知して一覧を取り直す。
    it("別タブの変更を一覧へ反映する", async () => {
        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))

        act(() => {
            window.localStorage.setItem(
                "barakann-config-collection-v1",
                JSON.stringify({
                    savedBuilds: [{
                        id: "build-2",
                        name: "別タブ",
                        parts: [],
                    }],
                    order: ["build:build-2"],
                }),
            )
            const event = new Event("storage") as Event & {key: string}
            event.key = "barakann-config-collection-v1"
            window.dispatchEvent(event)
        })

        await waitFor(() => {
            expect(result.current.builds.builds[0]?.name).toBe("別タブ")
        })
    })
})

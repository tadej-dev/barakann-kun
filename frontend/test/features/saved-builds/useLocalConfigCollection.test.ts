// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it} from "vitest"
import {act, cleanup, renderHook, waitFor} from "@testing-library/react"

import {useLocalConfigCollection} from "@/features/saved-builds/useLocalConfigCollection"
import {
    loadLocalConfigCollection,
    saveLocalConfigCollection,
} from "@/lib/simulator-storage"

// 構成1件分のパーツ
function createPart(partId = 10) {
    return {slotKey: "frame", partId, price: 1000, weight: 2000}
}

describe("useLocalConfigCollection", () => {
    beforeEach(() => {
        window.localStorage.clear()
    })

    afterEach(() => {
        cleanup()
        window.localStorage.clear()
    })

    // 構成が1件も無ければ、既定の構成を用意する。
    it("初回は既定の構成を1件用意する", () => {
        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))

        expect(result.current.builds.builds).toHaveLength(1)
        expect(result.current.builds.builds[0]).toMatchObject({
            name: "構成1",
        })
        expect(loadLocalConfigCollection().configs).toHaveLength(1)
    })

    // 保存済みの構成を読み込む。
    it("保存済みの構成を読み込む", () => {
        saveLocalConfigCollection(
            [{
                id: "config-a",
                name: "通勤用",
                parts: [createPart()],
            }],
            ["config:config-a"],
        )

        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))

        expect(result.current.builds.builds[0]).toMatchObject({
            id: "config-a",
            name: "通勤用",
        })
        expect(result.current.builds.builds[0]?.parts).toEqual([createPart()])
    })

    // 構成を追加すると、一覧と保存領域の両方へ反映する。
    it("構成を追加して保存する", async () => {
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

        expect(result.current.builds.builds).toHaveLength(2)
        expect(result.current.builds.builds[1]).toMatchObject({
            id: createdId,
            name: "通勤用",
        })
        expect(loadLocalConfigCollection().configs).toHaveLength(2)
    })

    // 名前変更と更新は保存領域も書き換える。
    it("構成の名前とパーツを更新する", async () => {
        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))
        const config = result.current.builds.builds[0]!

        await act(async () => {
            await result.current.builds.rename(config, "レース用")
        })
        expect(result.current.builds.builds[0]?.name).toBe("レース用")

        await act(async () => {
            await result.current.builds.update(
                result.current.builds.builds[0]!,
                [createPart(20)],
            )
        })
        expect(result.current.builds.builds[0]?.parts).toEqual([createPart(20)])
        expect(loadLocalConfigCollection().configs[0]).toMatchObject({
            name: "レース用",
            parts: [createPart(20)],
        })
    })

    // ログアウトなどで有効になったときは、保存済みの内容を読み直す。
    it("有効になったときに保存済みの内容を読み直す", async () => {
        const {result, rerender} = renderHook(
            ({enabled}: {enabled: boolean}) =>
                useLocalConfigCollection({enabled}),
            {initialProps: {enabled: false}},
        )

        saveLocalConfigCollection(
            [{id: "external", name: "外部の構成", parts: []}],
            ["config:external"],
        )
        rerender({enabled: true})

        await waitFor(() => {
            expect(result.current.builds.builds[0]?.name)
                .toBe("外部の構成")
        })
    })

    // 最後の1件も削除できる（画面側が「構成1」を作り直す）。
    it("最後の1件も削除できる", async () => {
        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))

        await act(async () => {
            await result.current.builds.remove(result.current.builds.builds[0]!)
        })

        expect(result.current.builds.builds).toHaveLength(0)
    })

    // 2件以上あれば、最初の構成も削除できる。
    it("2件以上あれば最初の構成も削除できる", async () => {
        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))

        await act(async () => {
            await result.current.builds.create("2件目", [])
        })

        const first = result.current.builds.builds[0]!

        await act(async () => {
            await result.current.builds.remove(first)
        })

        expect(result.current.builds.builds).toHaveLength(1)
        expect(result.current.builds.builds[0]?.name).toBe("2件目")
    })

    // 削除した構成は並び順からも消える。
    it("構成を削除すると並び順からも消える", async () => {
        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))

        await act(async () => {
            await result.current.builds.create("削除対象", [])
        })

        const target = result.current.builds.builds.find((config) =>
            config.name === "削除対象")!

        await act(async () => {
            await result.current.builds.remove(target)
        })

        expect(result.current.builds.builds).toHaveLength(1)
        expect(result.current.order.order.some((key) =>
            key.includes(target.id))).toBe(false)
    })

    // 並び順を保存する。
    it("並び順を保存する", async () => {
        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))

        const defaultId = result.current.builds.builds[0]!.id

        await act(async () => {
            await result.current.order.save([`config:${defaultId}`, "config:other"])
        })

        // 存在しない構成のキーは保存しない
        expect(loadLocalConfigCollection().order).toEqual([`config:${defaultId}`])
    })

    // 上限(20件)を超えて作成できない。
    it("上限を超えて作成できない", async () => {
        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))

        await act(async () => {
            for (let index = 0; index < 19; index += 1) {
                await result.current.builds.create(`構成${index}`, [])
            }
        })

        expect(result.current.builds.builds).toHaveLength(20)

        await act(async () => {
            await expect(result.current.builds.create("超過", [])).rejects.toThrow()
        })
    })

    // 保存できないときはエラーを残す。
    it("保存に失敗したときはエラーを残す", async () => {
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

        await waitFor(() => {
            expect(result.current.builds.errorMessage).toContain("保存できませんでした")
        })

        if (original) {
            Object.defineProperty(window, "localStorage", original)
        }
    })

    // ログイン時はローカルの内容を扱わない。
    it("ログイン時はローカルの内容を返さない", () => {
        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: false}))

        expect(result.current.builds.builds).toEqual([])
        expect(result.current.order.order).toEqual([])
    })

    // 別タブの変更を一覧へ反映する。
    it("別タブの変更を一覧へ反映する", async () => {
        const {result} = renderHook(() =>
            useLocalConfigCollection({enabled: true}))

        act(() => {
            window.localStorage.setItem(
                "barakann-config-collection-v2",
                JSON.stringify({
                    configs: [{
                        id: "config-b",
                        name: "別タブ",
                        parts: [],
                    }],
                    order: ["config:config-b"],
                }),
            )
            const event = new Event("storage") as Event & {key: string}
            event.key = "barakann-config-collection-v2"
            window.dispatchEvent(event)
        })

        await waitFor(() => {
            expect(result.current.builds.builds[0]?.name).toBe("別タブ")
        })
    })
})

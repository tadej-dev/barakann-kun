import {afterEach, describe, expect, it, vi} from "vitest"

import {fetchCategories} from "@/api/categories"
import {fetchParts, fetchPartsByIds} from "@/api/parts"

function jsonResponse(value: unknown, status = 200) {
    return new Response(JSON.stringify(value), {
        status,
        headers: {"content-type": "application/json"},
    })
}

const PART = {
    id: 1,
    name: "Frame",
    modelName: "Frame",
    variantName: null,
    brandName: "Brand",
    categoryKey: "frame",
    weight: 1000,
    price: 100000,
    priceUpdatedAt: null,
    includedItems: [],
    blockedCategoryKeys: [],
    specifications: {},
}

describe("catalog API", () => {
    afterEach(() => vi.unstubAllGlobals())

    it("カテゴリー一覧を検証して返す", async () => {
        const fetchMock = vi.fn(async () => jsonResponse([{
            id: 1,
            key: "frame",
            displayName: "フレーム",
        }]))
        vi.stubGlobal("fetch", fetchMock)

        await expect(fetchCategories()).resolves.toEqual([{
            id: 1,
            key: "frame",
            displayName: "フレーム",
        }])
    })

    it("カテゴリー一覧の不正なJSONを拒否する", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({items: []})))

        await expect(fetchCategories()).rejects.toThrow(
            "カテゴリー一覧のレスポンスを解釈できませんでした",
        )
    })

    it("JSONでない成功レスポンスを拒否する", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => new Response("not-json")))

        await expect(fetchCategories()).rejects.toThrow(
            "カテゴリー一覧のレスポンスを解釈できませんでした",
        )
    })

    it("パーツ一覧の不正な数値を拒否する", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([{
            ...PART,
            price: Number.NaN,
        }])))

        await expect(fetchParts("frame")).rejects.toThrow(
            "パーツのレスポンスを解釈できませんでした",
        )
    })

    it("ID指定のパーツ一覧を検証する", async () => {
        const fetchMock = vi.fn(async () => jsonResponse([PART]))
        vi.stubGlobal("fetch", fetchMock)

        await expect(fetchPartsByIds([1])).resolves.toEqual([PART])
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/parts/by-ids?ids=1",
            expect.objectContaining({
                headers: {Accept: "application/json"},
            }),
        )
    })
})

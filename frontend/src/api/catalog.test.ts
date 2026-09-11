import {afterEach, describe, expect, it, vi} from "vitest"

import {fetchCategories} from "@/api/categories"
import {fetchParts, fetchPartsByIds} from "@/api/parts"

function jsonResponse(value: unknown, status = 200) {
    return new Response(JSON.stringify(value), {
        status,
        headers: {"content-type": "application/json"},
    })
}

// レスポンス検証の条件だけをテスト側で変えられるよう、最小のパーツを用意する。
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

// カタログAPIが不正なJSON・数値を受け取った場合に、画面へ流さず拒否することを確認する。
describe("catalog API", () => {
    afterEach(() => vi.unstubAllGlobals())

    // 正常なカテゴリー配列は、そのままUIで利用できる型へ変換される。
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

    // 成功ステータスでも、配列以外のJSONやJSONでない本文は壊れたカタログとして拒否する。
    it.each([
        ["配列以外のJSON", () => jsonResponse({items: []})],
        ["JSONでない本文", () => new Response("not-json")],
    ])("カテゴリー一覧の%sを拒否する", async (_label, responseFactory) => {
        vi.stubGlobal("fetch", vi.fn(async () => responseFactory()))

        await expect(fetchCategories()).rejects.toThrow(
            "カテゴリー一覧のレスポンスを解釈できませんでした",
        )
    })

    // 重量・価格などの数値がNaNなら、合計計算へ進めずレスポンスを拒否する。
    it("パーツ一覧の不正な数値を拒否する", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([{
            ...PART,
            price: Number.NaN,
        }])))

        await expect(fetchParts("frame")).rejects.toThrow(
            "パーツのレスポンスを解釈できませんでした",
        )
    })

    // 付属品の重量は完成重量の加算に使うため、そのまま受け取る。
    it("付属品の重量を検証して返す", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([{
            ...PART,
            includedItems: [{
                name: "Basso Fuga Integrated Handlebar",
                quantity: 1,
                categoryKey: "handlebar",
                weight: 320,
            }],
        }])))

        await expect(fetchParts("frame")).resolves.toEqual([{
            ...PART,
            includedItems: [{
                name: "Basso Fuga Integrated Handlebar",
                quantity: 1,
                categoryKey: "handlebar",
                weight: 320,
            }],
        }])
    })

    // 重量が負数なら、合計計算へ進めずレスポンスを拒否する。
    it("付属品の不正な重量を拒否する", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([{
            ...PART,
            includedItems: [{
                name: "Basso Fuga Integrated Handlebar",
                quantity: 1,
                categoryKey: "handlebar",
                weight: -1,
            }],
        }])))

        await expect(fetchParts("frame")).rejects.toThrow(
            "パーツの付属品情報を解釈できませんでした",
        )
    })

    // 保存構成の復元で使うID検索が、期待するクエリとレスポンス検証を行う。
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

    // 比較対象が増えてもバックエンドの1リクエスト100件上限を超えないよう分割する。
    it("100件を超えるIDはAPI上限に合わせて分割取得する", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse([PART]))
            .mockResolvedValueOnce(jsonResponse([]))
        vi.stubGlobal("fetch", fetchMock)

        await expect(fetchPartsByIds(
            Array.from({length: 101}, (_, index) => index + 1),
        )).resolves.toEqual([PART])
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(fetchMock.mock.calls[0]?.[0]).toContain("ids=100")
        expect(fetchMock.mock.calls[1]?.[0]).toContain("ids=101")
    })
})

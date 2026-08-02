import {describe, expect, it} from "vitest"

import {createApp} from "../src/app"
import type {CatalogRepository} from "../src/db/catalog-repository"
import type {Category, Part} from "../src/types"

// APIレスポンスに使用するテスト用カテゴリー
const category: Category = {
    id: 1,
    key: "frame",
    displayName: "フレーム",
}

// APIレスポンスに使用するテスト用パーツ
const part: Part = {
    id: 1,
    name: "Test Frame",
    modelName: "Test Frame",
    variantName: null,
    brandName: "Test Brand",
    categoryKey: "frame",
    weight: 900,
    price: 300000,
    priceUpdatedAt: "2026-07-15 00:00:00",
    includedItems: [],
    blockedCategoryKeys: [],
    specifications: {},
}

// D1を使わずにルートの振る舞いを検証するRepositoryモック
function createRepository(): CatalogRepository {
    return {
        findCategories: async () => [category],
        findPartsByCategory: async (categoryKey) => (
            categoryKey === "frame" ? [part] : []
        ),
        findPartsByIds: async (ids) => (
            ids.includes(part.id) ? [part] : []
        ),
    }
}

// カタログAPIのルートテスト
describe("catalog API", () => {
    const app = createApp({catalogRepository: createRepository()})

    it("returns health status with security headers", async () => {
        const response = await app.request("/api/health")

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({status: "ok"})
        expect(response.headers.get("x-content-type-options")).toBe("nosniff")
        expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN")
    })

    it("returns categories", async () => {
        const response = await app.request("/api/categories")

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual([category])
    })

    it("returns parts by category", async () => {
        const response = await app.request("/api/parts?category=frame")

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual([part])
    })

    it("rejects an invalid category", async () => {
        const response = await app.request("/api/parts?category=FRAME!")

        expect(response.status).toBe(400)
        expect(await response.json()).toMatchObject({
            error: {code: "INVALID_CATEGORY"},
        })
    })

    it("returns parts by unique IDs", async () => {
        const response = await app.request(
            "/api/parts/by-ids?ids=1&ids=1&ids=2",
        )

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual([part])
    })

    it("rejects invalid IDs", async () => {
        const response = await app.request("/api/parts/by-ids?ids=0&ids=text")

        expect(response.status).toBe(400)
        expect(await response.json()).toMatchObject({
            error: {code: "INVALID_PART_IDS"},
        })
    })

    it("rejects more than 100 IDs", async () => {
        const parameters = new URLSearchParams()

        for (let id = 1; id <= 101; id += 1) {
            parameters.append("ids", String(id))
        }

        const response = await app.request(`/api/parts/by-ids?${parameters}`)

        expect(response.status).toBe(400)
        expect(await response.json()).toMatchObject({
            error: {code: "INVALID_PART_IDS"},
        })
    })

    it("returns a JSON 404 response", async () => {
        const response = await app.request("/api/unknown")

        expect(response.status).toBe(404)
        expect(await response.json()).toMatchObject({
            error: {code: "NOT_FOUND"},
        })
    })
})

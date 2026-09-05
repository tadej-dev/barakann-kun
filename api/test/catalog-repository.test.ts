import {describe, expect, it} from "vitest"

import {D1CatalogRepository} from "../src/db/d1-catalog-repository"

// SQL文の種類ごとに返す行を切り替える簡易スタブ
function createDatabaseStub() {
    const database = {
        prepare(sql: string) {
            return {
                bind(..._parameters: unknown[]) {
                    return {
                        all: async () => {
                            if (sql.includes("FROM part_included_items")) {
                                return {
                                    results: [{
                                        part_id: 534,
                                        item_name: "Basso Fuga Integrated Handlebar",
                                        quantity: 1,
                                        category_key: "handlebar",
                                        weight: 320,
                                    }],
                                }
                            }

                            if (sql.includes("FROM part_blocked_categories")) {
                                return {results: []}
                            }

                            if (sql.includes("FROM part_specifications")) {
                                return {results: []}
                            }

                            return {
                                results: [{
                                    id: 534,
                                    name: "Basso SV Frame Kit",
                                    model_name: "Basso SV Frame Kit",
                                    variant_name: null,
                                    brand_name: "Basso",
                                    category_key: "frame",
                                    weight: 780,
                                    price: 1155000,
                                    price_updated_at: null,
                                    updated_at: "2026-01-01 00:00:00",
                                }],
                            }
                        },
                    }
                },
            }
        },
    } as unknown as D1Database

    return database
}

describe("d1-catalog-repository", () => {
    it("付属品の重量をそのまま返す", async () => {
        const repository = new D1CatalogRepository(createDatabaseStub())
        const parts = await repository.findPartsByCategory("frame")

        expect(parts).toHaveLength(1)
        expect(parts[0]?.includedItems).toEqual([{
            name: "Basso Fuga Integrated Handlebar",
            quantity: 1,
            categoryKey: "handlebar",
            weight: 320,
        }])
    })
})

import type {CatalogRepository} from "./catalog-repository"
import type {Category, Part, PartIncludedItem} from "../types"

type CategoryRow = {
    id: number
    key: string
    display_name: string
}

type PartRow = {
    id: number
    name: string
    model_name: string | null
    variant_name: string | null
    brand_name: string
    category_key: string
    weight: number
    price: number
    price_updated_at: string | null
    updated_at: string
}

type IncludedItemRow = {
    part_id: number
    item_name: string
    quantity: number
    category_key: string | null
}

type BlockedCategoryRow = {
    part_id: number
    category_key: string
}

type SpecificationRow = {
    part_id: number
    spec_key: string
    spec_value: string
}

const RELATED_QUERY_BATCH_SIZE = 100

function placeholders(length: number): string {
    return Array.from({length}, () => "?").join(", ")
}

function chunk<T>(values: T[], size: number): T[][] {
    const chunks: T[][] = []

    for (let index = 0; index < values.length; index += size) {
        chunks.push(values.slice(index, index + size))
    }

    return chunks
}

function toLocalDateTime(value: string): string {
    return value.replace(" ", "T")
}

async function queryRows<T>(
    database: D1Database,
    sql: string,
    parameters: unknown[] = [],
): Promise<T[]> {
    const statement = database.prepare(sql).bind(...parameters)
    const result = await statement.all<T>()

    return result.results
}

export class D1CatalogRepository implements CatalogRepository {
    constructor(private readonly database: D1Database) {}

    async findCategories(): Promise<Category[]> {
        const rows = await queryRows<CategoryRow>(
            this.database,
            `SELECT id, key, display_name
             FROM categories
             ORDER BY id ASC`,
        )

        return rows.map((row) => ({
            id: row.id,
            key: row.key,
            displayName: row.display_name,
        }))
    }

    async findPartsByCategory(categoryKey: string): Promise<Part[]> {
        const rows = await queryRows<PartRow>(
            this.database,
            `${this.basePartQuery()}
             WHERE categories.key = ?
             ORDER BY parts.id ASC`,
            [categoryKey],
        )

        return this.attachRelations(rows)
    }

    async findPartsByIds(ids: number[]): Promise<Part[]> {
        if (ids.length === 0) {
            return []
        }

        const rows = await queryRows<PartRow>(
            this.database,
            `${this.basePartQuery()}
             WHERE parts.id IN (${placeholders(ids.length)})
             ORDER BY parts.id ASC`,
            ids,
        )

        return this.attachRelations(rows)
    }

    private basePartQuery(): string {
        return `SELECT parts.id,
                       parts.name,
                       parts.model_name,
                       parts.variant_name,
                       brands.name AS brand_name,
                       categories.key AS category_key,
                       parts.weight,
                       parts.price,
                       parts.price_updated_at,
                       parts.updated_at
                FROM parts
                JOIN brands ON brands.id = parts.brand_id
                JOIN categories ON categories.id = parts.category_id`
    }

    private async attachRelations(rows: PartRow[]): Promise<Part[]> {
        const partIds = rows.map((row) => row.id)
        const includedItems = new Map<number, PartIncludedItem[]>()
        const blockedCategoryKeys = new Map<number, Set<string>>()
        const specifications = new Map<number, Record<string, string>>()

        for (const partIdBatch of chunk(partIds, RELATED_QUERY_BATCH_SIZE)) {
            const parameters = placeholders(partIdBatch.length)
            const [itemRows, blockedRows, specificationRows] = await Promise.all([
                queryRows<IncludedItemRow>(
                    this.database,
                    `SELECT items.part_id,
                            items.item_name,
                            items.quantity,
                            categories.key AS category_key
                     FROM part_included_items AS items
                     LEFT JOIN categories
                       ON categories.id = items.included_category_id
                     WHERE items.part_id IN (${parameters})
                     ORDER BY items.id ASC`,
                    partIdBatch,
                ),
                queryRows<BlockedCategoryRow>(
                    this.database,
                    `SELECT blocked.part_id, categories.key AS category_key
                     FROM part_blocked_categories AS blocked
                     JOIN categories ON categories.id = blocked.category_id
                     WHERE blocked.part_id IN (${parameters})
                     ORDER BY categories.key ASC`,
                    partIdBatch,
                ),
                queryRows<SpecificationRow>(
                    this.database,
                    `SELECT part_id, spec_key, spec_value
                     FROM part_specifications
                     WHERE part_id IN (${parameters})
                     ORDER BY id ASC`,
                    partIdBatch,
                ),
            ])

            for (const row of itemRows) {
                const items = includedItems.get(row.part_id) ?? []
                items.push({
                    name: row.item_name,
                    quantity: row.quantity,
                    categoryKey: row.category_key,
                })
                includedItems.set(row.part_id, items)

                if (row.category_key) {
                    const keys = blockedCategoryKeys.get(row.part_id) ?? new Set()
                    keys.add(row.category_key)
                    blockedCategoryKeys.set(row.part_id, keys)
                }
            }

            for (const row of blockedRows) {
                const keys = blockedCategoryKeys.get(row.part_id) ?? new Set()
                keys.add(row.category_key)
                blockedCategoryKeys.set(row.part_id, keys)
            }

            for (const row of specificationRows) {
                const partSpecifications = specifications.get(row.part_id) ?? {}
                partSpecifications[row.spec_key] = row.spec_value
                specifications.set(row.part_id, partSpecifications)
            }
        }

        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            modelName: row.model_name?.trim() || row.name,
            variantName: row.variant_name,
            brandName: row.brand_name,
            categoryKey: row.category_key,
            weight: row.weight,
            price: row.price,
            priceUpdatedAt: toLocalDateTime(
                row.price_updated_at ?? row.updated_at,
            ),
            includedItems: includedItems.get(row.id) ?? [],
            blockedCategoryKeys: Array.from(
                blockedCategoryKeys.get(row.id) ?? [],
            ).sort(),
            specifications: specifications.get(row.id) ?? {},
        }))
    }
}

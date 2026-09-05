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

// D1のバインド変数上限を考慮した関連データ取得単位
const RELATED_QUERY_BATCH_SIZE = 100

// IN句用のプレースホルダー一覧
function placeholders(length: number): string {
    return Array.from({length}, () => "?").join(", ")
}

// 配列を指定サイズで分割
function chunk<T>(values: T[], size: number): T[][] {
    const chunks: T[][] = []

    for (let index = 0; index < values.length; index += size) {
        chunks.push(values.slice(index, index + size))
    }

    return chunks
}

// D1の日時表記をAPI向けの日時表記へ変換
function toLocalDateTime(value: string): string {
    return value.replace(" ", "T")
}

// D1のクエリ結果を型付き配列として取得
async function queryRows<T>(
    database: D1Database,
    sql: string,
    parameters: unknown[] = [],
): Promise<T[]> {
    const statement = database.prepare(sql).bind(...parameters)
    const result = await statement.all<T>()

    return result.results
}

// D1を利用したカタログリポジトリ
export class D1CatalogRepository implements CatalogRepository {
    // 公開カタログの読み取りSQLをAPIルートから分離する
    constructor(private readonly database: D1Database) {}

    async findCategories(): Promise<Category[]> {
        // 表示順をマスターデータのID順に統一
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
        // パーツ本体をカテゴリーキーで絞り込み
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
        // 空のID一覧ではD1クエリを発行しない
        if (ids.length === 0) {
            return []
        }

        // IN句のプレースホルダーをID数に合わせて生成
        const rows = await queryRows<PartRow>(
            this.database,
            `${this.basePartQuery()}
             WHERE parts.id IN (${placeholders(ids.length)})
             ORDER BY parts.id ASC`,
            ids,
        )

        return this.attachRelations(rows)
    }

    // パーツ本体とブランド・カテゴリーを結合する共通クエリ
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

    // 含有品・選択不可カテゴリー・規格情報をパーツへ付加
    private async attachRelations(rows: PartRow[]): Promise<Part[]> {
        const partIds = rows.map((row) => row.id)

        // 関連データをパーツID単位でまとめるための一時マップ
        const includedItems = new Map<number, PartIncludedItem[]>()
        const blockedCategoryKeys = new Map<number, Set<string>>()
        const specifications = new Map<number, Record<string, string>>()

        for (const partIdBatch of chunk(partIds, RELATED_QUERY_BATCH_SIZE)) {
            // D1のバインド変数上限を超えない単位で関連情報を取得する
            // 関連テーブルは同じID群を使って並列取得
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

            // 含有品をパーツごとの一覧へ集約
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

            // 選択不可カテゴリーをパーツごとの集合へ集約
            for (const row of blockedRows) {
                const keys = blockedCategoryKeys.get(row.part_id) ?? new Set()
                keys.add(row.category_key)
                blockedCategoryKeys.set(row.part_id, keys)
            }

            // 規格情報をキー・値のオブジェクトへ変換
            for (const row of specificationRows) {
                const partSpecifications = specifications.get(row.part_id) ?? {}
                partSpecifications[row.spec_key] = row.spec_value
                specifications.set(row.part_id, partSpecifications)
            }
        }

        // 関連行がないパーツも空配列や空オブジェクトを付けて返す
        // DBのスネークケースをAPIのキャメルケースへ変換
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

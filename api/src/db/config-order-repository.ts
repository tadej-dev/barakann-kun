import {CONFIG_SLOT_IDS} from "./config-slot-repository"

// 固定構成と追加構成を同じ並び順で扱うためのキー接頭辞
export const CONFIG_ORDER_CONFIG_PREFIX = "config:"
export const CONFIG_ORDER_BUILD_PREFIX = "build:"

export type ConfigOrderRepository = {
    list(userId: string): Promise<string[]>
    save(userId: string, itemKeys: string[]): Promise<string[]>
}

// 現在のユーザー構成に存在しないキーを保存しないための入力エラー
export class InvalidConfigOrderError extends Error {
    constructor() {
        super("構成の並び順に不正な項目が含まれています")
        this.name = "InvalidConfigOrderError"
    }
}

// 表示順テーブルのマイグレーション未適用を、画面で扱えるエラーへ分類
export class ConfigOrderMigrationRequiredError extends Error {
    constructor() {
        super("構成の並び順保存機能が未適用です。D1マイグレーションを実行してください")
        this.name = "ConfigOrderMigrationRequiredError"
    }
}

// Cloudflare D1のラップされたcauseを含め、構成表示順に必要なスキーマ不足を判定
export function isMissingConfigOrderTableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false
    }

    if (/no such (table|column):\s*(saved_build_orders|saved_builds|config_slot)/i.test(error.message)) {
        return true
    }

    return isMissingConfigOrderTableError(
        (error as Error & {cause?: unknown}).cause,
    )
}

type OrderRow = {
    item_key: string
    sort_order: number
}

type BuildRow = {
    id: string
}

// D1のクエリ結果を型付き配列として取得
async function queryRows<T>(
    database: D1Database,
    sql: string,
    parameters: unknown[] = [],
): Promise<T[]> {
    const result = await database.prepare(sql).bind(...parameters).all<T>()

    return result.results
}

// 構成1〜4はDB上に未保存でも並び替え対象として扱う
function configItemKey(configId: string): string {
    return `${CONFIG_ORDER_CONFIG_PREFIX}${configId}`
}

// D1に保存された追加構成のキーを作成
function buildItemKey(buildId: string): string {
    return `${CONFIG_ORDER_BUILD_PREFIX}${buildId}`
}

// ユーザーが現在利用できる固定・追加構成のキーを取得
async function listCurrentItemKeys(
    database: D1Database,
    userId: string,
): Promise<string[]> {
    const buildRows = await queryRows<BuildRow>(
        database,
        `SELECT id
         FROM saved_builds
         WHERE user_id = ? AND config_slot IS NULL
         ORDER BY updated_at DESC, id ASC`,
        [userId],
    )

    return [
        ...CONFIG_SLOT_IDS.map(configItemKey),
        ...buildRows.map((row) => buildItemKey(row.id)),
    ]
}

// ユーザーごとの構成表示順をD1へ保存するリポジトリ
export class D1ConfigOrderRepository implements ConfigOrderRepository {
    constructor(private readonly database: D1Database) {}

    async list(userId: string): Promise<string[]> {
        let currentItemKeys: string[]

        try {
            currentItemKeys = await listCurrentItemKeys(
                this.database,
                userId,
            )
        } catch (error) {
            if (isMissingConfigOrderTableError(error)) {
                throw new ConfigOrderMigrationRequiredError()
            }

            throw error
        }
        const currentItemKeySet = new Set(currentItemKeys)
        let orderRows: OrderRow[]

        try {
            orderRows = await queryRows<OrderRow>(
                this.database,
                `SELECT item_key, sort_order
                 FROM saved_build_orders
                 WHERE user_id = ?
                 ORDER BY sort_order ASC, item_key ASC`,
                [userId],
            )
        } catch (error) {
            if (isMissingConfigOrderTableError(error)) {
                // 旧D1でも構成一覧は表示できるよう、未適用時は既定順へ戻す
                return currentItemKeys
            }

            throw error
        }
        const orderedItemKeys = orderRows
            .filter((row) => currentItemKeySet.has(row.item_key))
            .map((row) => row.item_key)
        const orderedItemKeySet = new Set(orderedItemKeys)

        // 新しく追加された構成は、既存の順序を壊さず末尾へ追加する
        return [
            ...orderedItemKeys,
            ...currentItemKeys.filter((itemKey) =>
                !orderedItemKeySet.has(itemKey),
            ),
        ]
    }

    async save(userId: string, itemKeys: string[]): Promise<string[]> {
        let currentItemKeys: string[]

        try {
            currentItemKeys = await listCurrentItemKeys(
                this.database,
                userId,
            )
        } catch (error) {
            if (isMissingConfigOrderTableError(error)) {
                throw new ConfigOrderMigrationRequiredError()
            }

            throw error
        }
        const currentItemKeySet = new Set(currentItemKeys)
        const uniqueItemKeys = new Set(itemKeys)

        // 所有していない構成や重複・欠落を受け付けない
        if (
            uniqueItemKeys.size !== itemKeys.length ||
            uniqueItemKeys.size !== currentItemKeys.length ||
            itemKeys.some((itemKey) => !currentItemKeySet.has(itemKey))
        ) {
            throw new InvalidConfigOrderError()
        }

        const statements = [
            this.database.prepare(
                "DELETE FROM saved_build_orders WHERE user_id = ?",
            ).bind(userId),
            ...itemKeys.map((itemKey, sortOrder) => this.database.prepare(
                `INSERT INTO saved_build_orders (
                     user_id, item_key, sort_order
                 ) VALUES (?, ?, ?)`,
            ).bind(userId, itemKey, sortOrder)),
        ]

        try {
            // 並び順の全項目を一括置換し、途中状態を公開しない
            await this.database.batch(statements)
        } catch (error) {
            if (isMissingConfigOrderTableError(error)) {
                throw new ConfigOrderMigrationRequiredError()
            }

            throw error
        }

        return itemKeys
    }
}

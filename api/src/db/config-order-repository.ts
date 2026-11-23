
// 構成表示順のキー接頭辞
export const CONFIG_ORDER_CONFIG_PREFIX = "config:"
// 表示順の読み書きでは未使用のキー接頭辞
export const CONFIG_ORDER_BUILD_PREFIX = "build:"

// ユーザーごとの構成表示順の取得・保存契約
export type ConfigOrderRepository = {
    // 現在の構成と保存済みの表示順を照合し、構成キーの一覧を返す
    list(userId: string): Promise<string[]>
    // 受け取った順序を保存し、保存した構成キーの一覧を返す
    save(userId: string, itemKeys: string[]): Promise<string[]>
}

// 現在のユーザー構成に存在しないキーを保存しないための入力エラー
export class InvalidConfigOrderError extends Error {
    // 構成表示順の入力エラーを生成
    constructor() {
        super("構成の並び順に不正な項目が含まれています")
        this.name = "InvalidConfigOrderError"
    }
}

// 表示順テーブルのマイグレーション未適用を、画面で扱えるエラーへ分類
export class ConfigOrderMigrationRequiredError extends Error {
    // 表示順テーブル未適用のエラーを生成
    constructor() {
        super("構成の並び順保存機能が未適用です。D1マイグレーションを実行してください")
        this.name = "ConfigOrderMigrationRequiredError"
    }
}

// Cloudflare D1のラップされたcauseを含め、構成表示順に必要なスキーマ不足を判定
export function isMissingConfigOrderTableError(error: unknown): boolean {
    // Error以外はテーブル不足の判定対象外
    if (!(error instanceof Error)) {
        return false
    }

    // 構成表示順に必要なテーブル・列の不足を検出
    if (/no such (table|column):\s*(saved_build_orders|saved_builds)/i.test(error.message)) {
        return true
    }

    // D1がSQLiteエラーをcauseへ包む場合もあるため原因を再帰的に確認
    return isMissingConfigOrderTableError(
        (error as Error & {cause?: unknown}).cause,
    )
}

// saved_build_ordersテーブルの行
type OrderRow = {
    item_key: string
    sort_order: number
}

// saved_buildsテーブルの行
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

// 構成IDを表示順キーconfig:<id>へ変換
function configItemKey(configId: string): string {
    return `${CONFIG_ORDER_CONFIG_PREFIX}${configId}`
}

// ユーザーの全構成の表示順キーを取得
async function listCurrentItemKeys(
    database: D1Database,
    userId: string,
): Promise<string[]> {
    // すべての構成を同じconfig:<id>形式のキーで返す
    const configRows = await queryRows<BuildRow>(
        database,
        `SELECT id
         FROM saved_builds
         WHERE user_id = ?
         ORDER BY created_at, id ASC`,
        [userId],
    )

    return configRows.map((row) => configItemKey(row.id))
}

// ユーザーごとの構成表示順をD1へ保存するリポジトリ
export class D1ConfigOrderRepository implements ConfigOrderRepository {
    // 構成一覧と保存済みの順序を同じD1接続で照合
    constructor(private readonly database: D1Database) {}

    // 保存済みの表示順と現在の構成一覧を照合してキー一覧を返す
    async list(userId: string): Promise<string[]> {
        // 現在のユーザーが持つ構成キーの一覧
        let currentItemKeys: string[]

        try {
            currentItemKeys = await listCurrentItemKeys(
                this.database,
                userId,
            )
        } catch (error) {
            // 構成一覧テーブルが無い旧D1ではマイグレーション未適用として通知
            if (isMissingConfigOrderTableError(error)) {
                throw new ConfigOrderMigrationRequiredError()
            }

            throw error
        }
        // 現在の構成キーを高速に照合する集合
        const currentItemKeySet = new Set(currentItemKeys)
        // 保存済みの表示順キーと順序
        let orderRows: OrderRow[]

        try {
            // 削除済み構成が保存順に残っていても後で除外できるよう取得
            orderRows = await queryRows<OrderRow>(
                this.database,
                `SELECT item_key, sort_order
                 FROM saved_build_orders
                 WHERE user_id = ?
                 ORDER BY sort_order ASC, item_key ASC`,
                [userId],
            )
        } catch (error) {
            // 表示順テーブルだけが無い場合は構成一覧を既定順で返す
            if (isMissingConfigOrderTableError(error)) {
                // 旧D1でも構成一覧は表示できるよう、未適用時は既定順へ戻す
                return currentItemKeys
            }

            throw error
        }
        // 現在も存在する構成だけを保存順に並べたキー
        const orderedItemKeys = orderRows
            .filter((row) => currentItemKeySet.has(row.item_key))
            .map((row) => row.item_key)
        // 保存済みの表示順に含まれるキーの集合
        const orderedItemKeySet = new Set(orderedItemKeys)

        // 順序保存後に追加された構成は既存順を保ったまま末尾へ補う
        return [
            ...orderedItemKeys,
            ...currentItemKeys.filter((itemKey) =>
                !orderedItemKeySet.has(itemKey),
            ),
        ]
    }

    // 全構成を一度ずつ含む並び順だけを保存
    async save(userId: string, itemKeys: string[]): Promise<string[]> {
        // 現在のユーザーが持つ構成キーの一覧
        let currentItemKeys: string[]

        try {
            currentItemKeys = await listCurrentItemKeys(
                this.database,
                userId,
            )
        } catch (error) {
            // 構成一覧テーブルが取得できない場合はマイグレーション未適用として通知
            if (isMissingConfigOrderTableError(error)) {
                throw new ConfigOrderMigrationRequiredError()
            }

            throw error
        }
        // 現在の構成キーを高速に照合する集合
        const currentItemKeySet = new Set(currentItemKeys)
        // 入力キーの重複を除いた集合
        const uniqueItemKeys = new Set(itemKeys)

        // 現在の全構成を一度ずつ含む完全な並び順かを確認
        // 所有していない構成や重複・欠落を受け付けない
        if (
            uniqueItemKeys.size !== itemKeys.length ||
            uniqueItemKeys.size !== currentItemKeys.length ||
            itemKeys.some((itemKey) => !currentItemKeySet.has(itemKey))
        ) {
            throw new InvalidConfigOrderError()
        }

        // 既存の表示順を削除し、受け取った順に再登録するSQL群
        const statements = [
            // 現在の順序を削除して受け取った順番を先頭から登録し直す
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
            // 並び順の保存に必要なテーブルが無い場合もマイグレーション未適用として通知
            if (isMissingConfigOrderTableError(error)) {
                throw new ConfigOrderMigrationRequiredError()
            }

            throw error
        }

        return itemKeys
    }
}

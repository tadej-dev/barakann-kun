import Database from "better-sqlite3"
import {readdirSync, readFileSync} from "node:fs"
import path from "node:path"
import {fileURLToPath} from "node:url"

// D1の prepare / bind / all / first / run に合わせた最小の実装
class SqliteStatement {
    // SQLとパラメーターを保持する文を用意
    constructor(
        private readonly database: Database.Database,
        private readonly sql: string,
        private readonly parameters: unknown[] = [],
    ) {}

    // パラメーターを差し替えた新しい文を返す
    bind(...parameters: unknown[]) {
        return new SqliteStatement(this.database, this.sql, parameters)
    }

    // 全行を取得してD1の応答形式で返す
    async all<T>() {
        const results = this.database
            .prepare(this.sql)
            .all(...this.parameters) as T[]

        return {results, success: true, meta: {}}
    }

    // 先頭1行を取得し、無ければnullを返す
    async first<T>() {
        const row = this.database
            .prepare(this.sql)
            .get(...this.parameters) as T | undefined

        return row ?? null
    }

    // 書き込みを非同期APIとして実行
    async run() {
        return this.runSync()
    }

    // バッチ内で同期的に実行
    runSync() {
        const result = this.database
            .prepare(this.sql)
            .run(...this.parameters)

        return {success: true, meta: {changes: result.changes}}
    }
}

// D1と同じ形でSQLiteを操作できるデータベースを作る
export function createSqliteD1() {
    const sqlite = new Database(":memory:")
    // D1と同じく外部キーを有効にする
    sqlite.pragma("foreign_keys = ON")

    const database = {
        // SQLを受け取り、SQLiteの文を用意
        prepare(sql: string) {
            return new SqliteStatement(sqlite, sql)
        },
        // D1と同じく、バッチは1つのトランザクションとして順に実行
        async batch(statements: SqliteStatement[]) {
            // 複数の文をまとめて実行するトランザクション関数
            const apply = sqlite.transaction(() =>
                statements.map((statement) => statement.runSync()))

            return apply()
        },
        // SQLをまとめて実行
        exec(sql: string) {
            sqlite.exec(sql)
        },
        // SQLiteの設定を取得・変更
        pragma(pragma: string) {
            return sqlite.pragma(pragma)
        },
    }

    return {database: database as unknown as D1Database, sqlite}
}

// マイグレーションを名前順に適用
export function applyMigrations(sqlite: Database.Database) {
    const currentDir = path.dirname(fileURLToPath(import.meta.url))
    const migrationsDir = path.resolve(currentDir, "../../migrations")
    const files = readdirSync(migrationsDir)
        .filter((file) => file.endsWith(".sql"))
        .sort()

    for (const file of files) {
        sqlite.exec(readFileSync(path.join(migrationsDir, file), "utf8"))
    }

    return files
}

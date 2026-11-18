import Database from "better-sqlite3"
import {readdirSync, readFileSync} from "node:fs"
import path from "node:path"
import {fileURLToPath} from "node:url"

// D1の prepare / bind / all / first / run に合わせた最小の実装
class SqliteStatement {
    constructor(
        private readonly database: Database.Database,
        private readonly sql: string,
        private readonly parameters: unknown[] = [],
    ) {}

    bind(...parameters: unknown[]) {
        return new SqliteStatement(this.database, this.sql, parameters)
    }

    async all<T>() {
        const results = this.database
            .prepare(this.sql)
            .all(...this.parameters) as T[]

        return {results, success: true, meta: {}}
    }

    async first<T>() {
        const row = this.database
            .prepare(this.sql)
            .get(...this.parameters) as T | undefined

        return row ?? null
    }

    async run() {
        return this.runSync()
    }

    // バッチ内で同期的に実行する
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
        prepare(sql: string) {
            return new SqliteStatement(sqlite, sql)
        },
        // D1と同じく、バッチは1つのトランザクションとして順に実行する
        async batch(statements: SqliteStatement[]) {
            const apply = sqlite.transaction(() =>
                statements.map((statement) => statement.runSync()))

            return apply()
        },
        exec(sql: string) {
            sqlite.exec(sql)
        },
        pragma(pragma: string) {
            return sqlite.pragma(pragma)
        },
    }

    return {database: database as unknown as D1Database, sqlite}
}

// マイグレーションを名前順に適用する
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

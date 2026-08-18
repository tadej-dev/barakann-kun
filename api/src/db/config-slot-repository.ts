import type {
    SavedBuildPart,
    SavedBuildPartInput,
} from "./saved-build-repository"
import {
    loadValidatedPartSnapshots,
    MissingSavedBuildPartsError,
} from "./saved-build-repository"

// 固定スロットとして扱う構成ID
export const CONFIG_SLOT_IDS = ["1", "2", "3", "4"] as const

export type ConfigSlotId = (typeof CONFIG_SLOT_IDS)[number]

// ユーザーごとの固定構成スロット
export type ConfigSlot = {
    configId: ConfigSlotId
    name: string
    version: number
    updatedAt: string | null
    parts: SavedBuildPart[]
}

// 固定構成の変更結果
export type ConfigSlotMutationResult =
    | {kind: "updated"; slot: ConfigSlot}
    | {kind: "not_found"}
    | {kind: "conflict"}

// 固定構成用マイグレーション未適用を画面で扱えるエラーへ分類
export class ConfigSlotMigrationRequiredError extends Error {
    constructor() {
        super("構成1〜4の保存機能が未適用です。D1マイグレーションを実行してください")
        this.name = "ConfigSlotMigrationRequiredError"
    }
}

// D1のラップされたcauseを含め、0003・0004の未適用エラーを判定
export function isMissingConfigSlotSchemaError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false
    }

    if (/no such (table|column):\s*(saved_builds|saved_build_parts|config_slot)/i.test(error.message)) {
        return true
    }

    return isMissingConfigSlotSchemaError(
        (error as Error & {cause?: unknown}).cause,
    )
}

// 固定構成APIからDB層へ渡す契約
export interface ConfigSlotRepository {
    list(userId: string): Promise<ConfigSlot[]>
    rename(
        userId: string,
        configId: ConfigSlotId,
        version: number,
        name: string,
    ): Promise<ConfigSlotMutationResult>
    save(
        userId: string,
        configId: ConfigSlotId,
        version: number,
        name: string,
        parts: SavedBuildPartInput[],
    ): Promise<ConfigSlotMutationResult>
    clear(
        userId: string,
        configId: ConfigSlotId,
        version: number,
    ): Promise<ConfigSlotMutationResult>
}

type ConfigSlotRow = {
    id: string
    config_slot: string
    name: string
    version: number
    updated_at: string
}

type ConfigSlotPartRow = {
    saved_build_id: string
    slot_key: string
    part_id: number
    price: number
    weight: number
}

// IN句へ渡すプレースホルダー一覧を生成
function placeholders(length: number): string {
    return Array.from({length}, () => "?").join(", ")
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

// 構成IDから、未保存状態でも表示できる既定スロットを作成
function createDefaultSlot(configId: ConfigSlotId): ConfigSlot {
    return {
        configId,
        name: `構成${configId}`,
        version: 0,
        updatedAt: null,
        parts: [],
    }
}

// D1上の固定構成を扱うリポジトリ
export class D1ConfigSlotRepository implements ConfigSlotRepository {
    constructor(private readonly database: D1Database) {}

    async list(userId: string): Promise<ConfigSlot[]> {
        const rows = await queryRows<ConfigSlotRow>(
            this.database,
            `SELECT id, config_slot, name, version, updated_at
             FROM saved_builds
             WHERE user_id = ? AND config_slot IS NOT NULL
             ORDER BY config_slot ASC`,
            [userId],
        )
        const partsByBuildId = await this.loadPartsByBuildId(
            rows.map((row) => row.id),
        )
        const rowsByConfigId = new Map(
            rows.map((row) => [row.config_slot, row]),
        )

        return CONFIG_SLOT_IDS.map((configId) => {
            const row = rowsByConfigId.get(configId)

            return row
                ? this.toConfigSlot(row, partsByBuildId)
                : createDefaultSlot(configId)
        })
    }

    async rename(
        userId: string,
        configId: ConfigSlotId,
        version: number,
        name: string,
    ): Promise<ConfigSlotMutationResult> {
        const now = new Date().toISOString()

        if (version === 0) {
            const id = crypto.randomUUID()
            const result = await this.database.prepare(
                `INSERT INTO saved_builds (
                     id, user_id, config_slot, name, version,
                     created_at, updated_at
                 )
                 SELECT ?, ?, ?, ?, 1, ?, ?
                 WHERE NOT EXISTS (
                     SELECT 1
                     FROM saved_builds
                     WHERE user_id = ? AND config_slot = ?
                 )`,
            ).bind(
                id,
                userId,
                configId,
                name,
                now,
                now,
                userId,
                configId,
            ).run()

            if (result.meta.changes === 0) {
                return this.currentMutationResult(userId, configId)
            }
        } else {
            const current = await this.findRow(userId, configId)

            if (!current) {
                return {kind: "not_found"}
            }

            const result = await this.database.prepare(
                `UPDATE saved_builds
                 SET name = ?, version = version + 1, updated_at = ?
                 WHERE user_id = ? AND config_slot = ? AND version = ?
                   AND updated_at = ?`,
            ).bind(
                name,
                now,
                userId,
                configId,
                version,
                current.updated_at,
            ).run()

            if (result.meta.changes === 0) {
                return this.currentMutationResult(userId, configId)
            }
        }

        return this.updatedMutationResult(userId, configId)
    }

    async save(
        userId: string,
        configId: ConfigSlotId,
        version: number,
        name: string,
        parts: SavedBuildPartInput[],
    ): Promise<ConfigSlotMutationResult> {
        const snapshots = await this.loadPartSnapshots(parts)
        const now = new Date().toISOString()

        if (version === 0) {
            const id = crypto.randomUUID()
            const statements = [
                this.database.prepare(
                    `INSERT INTO saved_builds (
                         id, user_id, config_slot, name, version,
                         created_at, updated_at
                     )
                     SELECT ?, ?, ?, ?, 1, ?, ?
                     WHERE NOT EXISTS (
                         SELECT 1
                         FROM saved_builds
                         WHERE user_id = ? AND config_slot = ?
                     )`,
                ).bind(
                    id,
                    userId,
                    configId,
                    name,
                    now,
                    now,
                    userId,
                    configId,
                ),
                ...this.createPartInsertStatements(
                    id,
                    userId,
                    configId,
                    1,
                    now,
                    parts,
                    snapshots,
                ),
            ]
            const results = await this.database.batch(statements)

            if (results[0]?.meta.changes === 0) {
                return this.currentMutationResult(userId, configId)
            }
        } else {
            const nextVersion = version + 1
            const current = await this.findRow(userId, configId)

            if (!current) {
                return {kind: "not_found"}
            }

            const statements = [
                this.database.prepare(
                    `UPDATE saved_builds
                     SET name = ?, version = version + 1, updated_at = ?
                     WHERE user_id = ? AND config_slot = ? AND version = ?
                       AND updated_at = ?`,
                ).bind(
                    name,
                    now,
                    userId,
                    configId,
                    version,
                    current.updated_at,
                ),
                this.database.prepare(
                    `DELETE FROM saved_build_parts
                     WHERE saved_build_id = ?
                       AND EXISTS (
                           SELECT 1
                           FROM saved_builds
                           WHERE id = ? AND user_id = ?
                             AND config_slot = ? AND version = ?
                             AND updated_at = ?
                       )`,
                ).bind(
                    current.id,
                    current.id,
                    userId,
                    configId,
                    nextVersion,
                    now,
                ),
                ...this.createPartInsertStatements(
                    current.id,
                    userId,
                    configId,
                    nextVersion,
                    now,
                    parts,
                    snapshots,
                    now,
                ),
            ]
            const results = await this.database.batch(statements)

            if (results[0]?.meta.changes === 0) {
                return this.currentMutationResult(userId, configId)
            }
        }

        return this.updatedMutationResult(userId, configId)
    }

    async clear(
        userId: string,
        configId: ConfigSlotId,
        version: number,
    ): Promise<ConfigSlotMutationResult> {
        if (version === 0) {
            const current = await this.findRow(userId, configId)

            return current
                ? {kind: "conflict"}
                : {kind: "updated", slot: createDefaultSlot(configId)}
        }

        const current = await this.findRow(userId, configId)

        if (!current) {
            return {kind: "not_found"}
        }

        const nextVersion = version + 1
        const now = new Date().toISOString()
        const results = await this.database.batch([
            this.database.prepare(
                `UPDATE saved_builds
                 SET version = version + 1, updated_at = ?
                 WHERE user_id = ? AND config_slot = ? AND version = ?
                   AND updated_at = ?`,
            ).bind(now, userId, configId, version, current.updated_at),
            this.database.prepare(
                `DELETE FROM saved_build_parts
                 WHERE saved_build_id = ?
                   AND EXISTS (
                       SELECT 1
                       FROM saved_builds
                       WHERE id = ? AND user_id = ?
                         AND config_slot = ? AND version = ?
                         AND updated_at = ?
                   )`,
            ).bind(
                current.id,
                current.id,
                userId,
                configId,
                nextVersion,
                now,
            ),
        ])

        if (results[0]?.meta.changes === 0) {
            return this.currentMutationResult(userId, configId)
        }

        return this.updatedMutationResult(userId, configId)
    }

    // 固定構成の現在値を競合・所有者エラーの判定へ利用
    private async currentMutationResult(
        userId: string,
        configId: ConfigSlotId,
    ): Promise<ConfigSlotMutationResult> {
        const current = await this.findSlot(userId, configId)

        return current
            ? {kind: "conflict"}
            : {kind: "not_found"}
    }

    // 更新後の固定構成をパーツ付きで返す
    private async updatedMutationResult(
        userId: string,
        configId: ConfigSlotId,
    ): Promise<ConfigSlotMutationResult> {
        const slot = await this.findSlot(userId, configId)

        if (!slot) {
            throw new Error("固定構成の更新結果を取得できませんでした")
        }

        return {kind: "updated", slot}
    }

    // 固定構成の行を1件取得
    private async findRow(
        userId: string,
        configId: ConfigSlotId,
    ): Promise<ConfigSlotRow | null> {
        const rows = await queryRows<ConfigSlotRow>(
            this.database,
            `SELECT id, config_slot, name, version, updated_at
             FROM saved_builds
             WHERE user_id = ? AND config_slot = ?`,
            [userId, configId],
        )

        return rows[0] ?? null
    }

    // 固定構成をパーツ付きで取得
    private async findSlot(
        userId: string,
        configId: ConfigSlotId,
    ): Promise<ConfigSlot | null> {
        const row = await this.findRow(userId, configId)

        if (!row) {
            return null
        }

        const partsByBuildId = await this.loadPartsByBuildId([row.id])

        return this.toConfigSlot(row, partsByBuildId)
    }

    // パーツ保存用の条件付きINSERT文を作成
    private createPartInsertStatements(
        buildId: string,
        userId: string,
        configId: ConfigSlotId,
        version: number,
        now: string,
        parts: SavedBuildPartInput[],
        snapshots: Map<number, {id: number; price: number; weight: number}>,
        guardUpdatedAt?: string,
    ) {
        const updatedAtGuard = guardUpdatedAt
            ? " AND updated_at = ?"
            : ""

        return parts.map((part) => {
            const snapshot = snapshots.get(part.partId)

            if (!snapshot) {
                throw new MissingSavedBuildPartsError([part.partId])
            }

            return this.database.prepare(
                `INSERT INTO saved_build_parts (
                     saved_build_id, slot_key, part_id, price, weight,
                     created_at, updated_at
                 )
                 SELECT ?, ?, ?, ?, ?, ?, ?
                 WHERE EXISTS (
                     SELECT 1
                     FROM saved_builds
                     WHERE id = ? AND user_id = ?
                       AND config_slot = ? AND version = ?
                       ${updatedAtGuard}
                 )`,
            ).bind(
                buildId,
                part.slotKey,
                part.partId,
                snapshot.price,
                snapshot.weight,
                now,
                now,
                buildId,
                userId,
                configId,
                version,
                ...(guardUpdatedAt ? [guardUpdatedAt] : []),
            )
        })
    }

    // パーツIDから保存時点の価格・重量を取得
    private async loadPartSnapshots(
        parts: SavedBuildPartInput[],
    ) {
        return loadValidatedPartSnapshots(this.database, parts)
    }

    // 保存構成ID一覧へスロット別パーツを付加
    private async loadPartsByBuildId(
        buildIds: string[],
    ): Promise<Map<string, SavedBuildPart[]>> {
        if (buildIds.length === 0) {
            return new Map()
        }

        const rows = await queryRows<ConfigSlotPartRow>(
            this.database,
            `SELECT saved_build_id, slot_key, part_id, price, weight
             FROM saved_build_parts
             WHERE saved_build_id IN (${placeholders(buildIds.length)})
             ORDER BY saved_build_id ASC, slot_key ASC`,
            buildIds,
        )
        const partsByBuildId = new Map<string, SavedBuildPart[]>()

        for (const row of rows) {
            const parts = partsByBuildId.get(row.saved_build_id) ?? []
            parts.push({
                slotKey: row.slot_key,
                partId: row.part_id,
                price: row.price,
                weight: row.weight,
            })
            partsByBuildId.set(row.saved_build_id, parts)
        }

        return partsByBuildId
    }

    // DBの行をAPIレスポンス用の固定構成へ変換
    private toConfigSlot(
        row: ConfigSlotRow,
        partsByBuildId: Map<string, SavedBuildPart[]>,
    ): ConfigSlot {
        const configId = CONFIG_SLOT_IDS.find((id) => id === row.config_slot)

        if (!configId) {
            throw new Error("固定構成IDが不正です")
        }

        return {
            configId,
            name: row.name,
            version: row.version,
            updatedAt: row.updated_at,
            parts: partsByBuildId.get(row.id) ?? [],
        }
    }
}

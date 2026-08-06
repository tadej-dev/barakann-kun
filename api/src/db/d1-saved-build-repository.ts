import type {
    DeleteSavedBuildResult,
    SavedBuild,
    SavedBuildPart,
    SavedBuildPartInput,
    SavedBuildRepository,
    UpdateSavedBuildResult,
} from "./saved-build-repository"
import {MissingSavedBuildPartsError} from "./saved-build-repository"

type SavedBuildRow = {
    id: string
    name: string
    version: number
    created_at: string
    updated_at: string
}

type SavedBuildPartRow = {
    saved_build_id: string
    slot_key: string
    part_id: number
    price: number
    weight: number
}

type PartSnapshotRow = {
    id: number
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

// D1を利用した保存構成リポジトリ
export class D1SavedBuildRepository implements SavedBuildRepository {
    constructor(private readonly database: D1Database) {}

    async list(userId: string): Promise<SavedBuild[]> {
        const buildRows = await queryRows<SavedBuildRow>(
            this.database,
            `SELECT id, name, version, created_at, updated_at
             FROM saved_builds
             WHERE user_id = ?
             ORDER BY updated_at DESC, id ASC`,
            [userId],
        )

        return this.attachParts(buildRows)
    }

    async findById(
        userId: string,
        buildId: string,
    ): Promise<SavedBuild | null> {
        const buildRows = await queryRows<SavedBuildRow>(
            this.database,
            `SELECT id, name, version, created_at, updated_at
             FROM saved_builds
             WHERE user_id = ? AND id = ?`,
            [userId, buildId],
        )

        const builds = await this.attachParts(buildRows)

        return builds[0] ?? null
    }

    async create(
        userId: string,
        name: string,
        parts: SavedBuildPartInput[],
    ): Promise<SavedBuild> {
        const snapshots = await this.loadPartSnapshots(parts)
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const statements = [
            this.database.prepare(
                `INSERT INTO saved_builds (
                     id, user_id, name, version, created_at, updated_at
                 ) VALUES (?, ?, ?, 1, ?, ?)`,
            ).bind(id, userId, name, now, now),
            ...parts.map((part) => {
                const snapshot = snapshots.get(part.partId)

                if (!snapshot) {
                    throw new MissingSavedBuildPartsError([part.partId])
                }

                return this.database.prepare(
                    `INSERT INTO saved_build_parts (
                         saved_build_id, slot_key, part_id, price, weight,
                         created_at, updated_at
                     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ).bind(
                    id,
                    part.slotKey,
                    part.partId,
                    snapshot.price,
                    snapshot.weight,
                    now,
                    now,
                )
            }),
        ]

        // 構成本体とパーツを同じD1バッチで登録する
        await this.database.batch(statements)

        const build = await this.findById(userId, id)

        if (!build) {
            throw new Error("保存構成の作成結果を取得できませんでした")
        }

        return build
    }

    async update(
        userId: string,
        buildId: string,
        version: number,
        name: string,
        parts: SavedBuildPartInput[],
    ): Promise<UpdateSavedBuildResult> {
        const snapshots = await this.loadPartSnapshots(parts)
        const nextVersion = version + 1
        const now = new Date().toISOString()
        const versionGuard = `EXISTS (
            SELECT 1
            FROM saved_builds
            WHERE id = ?
              AND user_id = ?
              AND version = ?
              AND updated_at = ?
        )`
        const guardParameters = [buildId, userId, nextVersion, now]
        const statements = [
            this.database.prepare(
                `UPDATE saved_builds
                 SET name = ?, version = version + 1, updated_at = ?
                 WHERE id = ? AND user_id = ? AND version = ?`,
            ).bind(name, now, buildId, userId, version),
            this.database.prepare(
                `DELETE FROM saved_build_parts
                 WHERE saved_build_id = ? AND ${versionGuard}`,
            ).bind(buildId, ...guardParameters),
            ...parts.map((part) => {
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
                     WHERE ${versionGuard}`,
                ).bind(
                    buildId,
                    part.slotKey,
                    part.partId,
                    snapshot.price,
                    snapshot.weight,
                    now,
                    now,
                    ...guardParameters,
                )
            }),
        ]

        // version条件と構成パーツの置き換えを同一バッチで実行する
        const results = await this.database.batch(statements)
        const buildUpdate = results[0]

        if (!buildUpdate) {
            throw new Error("保存構成の更新結果を取得できませんでした")
        }

        if (buildUpdate.meta.changes === 0) {
            const currentBuild = await this.findById(userId, buildId)

            return currentBuild
                ? {kind: "conflict"}
                : {kind: "not_found"}
        }

        const build = await this.findById(userId, buildId)

        if (!build) {
            throw new Error("保存構成の更新結果を取得できませんでした")
        }

        return {kind: "updated", build}
    }

    async delete(
        userId: string,
        buildId: string,
        version: number,
    ): Promise<DeleteSavedBuildResult> {
        const result = await this.database.prepare(
            `DELETE FROM saved_builds
             WHERE id = ? AND user_id = ? AND version = ?`,
        ).bind(buildId, userId, version).run()

        if (result.meta.changes > 0) {
            return {kind: "deleted"}
        }

        const currentBuild = await this.findById(userId, buildId)

        return currentBuild
            ? {kind: "conflict"}
            : {kind: "not_found"}
    }

    // パーツIDから保存時点の価格・重量を取得
    private async loadPartSnapshots(
        parts: SavedBuildPartInput[],
    ): Promise<Map<number, PartSnapshotRow>> {
        const partIds = Array.from(new Set(parts.map((part) => part.partId)))

        if (partIds.length === 0) {
            return new Map()
        }

        const rows = await queryRows<PartSnapshotRow>(
            this.database,
            `SELECT id, price, weight
             FROM parts
             WHERE id IN (${placeholders(partIds.length)})`,
            partIds,
        )
        const snapshots = new Map(rows.map((row) => [row.id, row]))
        const missingPartIds = partIds.filter((id) => !snapshots.has(id))

        if (missingPartIds.length > 0) {
            throw new MissingSavedBuildPartsError(missingPartIds)
        }

        return snapshots
    }

    // 構成本体へスロット別パーツを付加
    private async attachParts(rows: SavedBuildRow[]): Promise<SavedBuild[]> {
        if (rows.length === 0) {
            return []
        }

        const buildIds = rows.map((row) => row.id)
        const partRows = await queryRows<SavedBuildPartRow>(
            this.database,
            `SELECT saved_build_id, slot_key, part_id, price, weight
             FROM saved_build_parts
             WHERE saved_build_id IN (${placeholders(buildIds.length)})
             ORDER BY saved_build_id ASC, slot_key ASC`,
            buildIds,
        )
        const partsByBuildId = new Map<string, SavedBuildPart[]>()

        for (const row of partRows) {
            const parts = partsByBuildId.get(row.saved_build_id) ?? []
            parts.push({
                slotKey: row.slot_key,
                partId: row.part_id,
                price: row.price,
                weight: row.weight,
            })
            partsByBuildId.set(row.saved_build_id, parts)
        }

        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            version: row.version,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            parts: partsByBuildId.get(row.id) ?? [],
        }))
    }
}

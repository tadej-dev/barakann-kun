import type {
    DeleteSavedBuildResult,
    RenameSavedBuildResult,
    SavedBuild,
    SavedBuildPart,
    SavedBuildPartInput,
    SavedBuildRepository,
    UpdateSavedBuildResult,
} from "./saved-build-repository"
import {
    MAX_SAVED_BUILDS_PER_USER,
    loadValidatedPartSnapshots,
    MissingSavedBuildPartsError,
    SavedBuildLimitExceededError,
} from "./saved-build-repository"

type SavedBuildRow = {
    id: string
    name: string
    version: number
    created_at: string
    updated_at: string
    is_default: number
}

type SavedBuildPartRow = {
    saved_build_id: string
    slot_key: string
    part_id: number
    price: number
    weight: number
}

type CountRow = {
    count: number
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
    // 保存構成の所有者条件と世代条件をすべての操作で統一する
    constructor(private readonly database: D1Database) {}

    async countAll(userId: string): Promise<number> {
        // 固定枠を含む全構成の件数を数える
        const rows = await queryRows<CountRow>(
            this.database,
            `SELECT COUNT(*) AS count
             FROM saved_builds
             WHERE user_id = ?`,
            [userId],
        )

        return rows[0]?.count ?? 0
    }

    async listAll(userId: string): Promise<SavedBuild[]> {
        // 固定枠か追加枠かを問わず、すべての構成を返す
        const buildRows = await queryRows<SavedBuildRow>(
            this.database,
            `SELECT id, name, version, created_at, updated_at, is_default
             FROM saved_builds
             WHERE user_id = ?
             ORDER BY updated_at DESC, id ASC`,
            [userId],
        )

        return this.attachParts(buildRows)
    }

    async ensureDefault(userId: string): Promise<void> {
        const now = new Date().toISOString()
        const id = crypto.randomUUID()

        // 行はあるが既定が無い場合は、最も古い構成を既定にする
        await this.database.prepare(
            `UPDATE saved_builds
             SET is_default = 1
             WHERE id = (
                 SELECT id
                 FROM saved_builds
                 WHERE user_id = ?
                 ORDER BY created_at, id
                 LIMIT 1
             )
               AND NOT EXISTS (
                   SELECT 1
                   FROM saved_builds
                   WHERE user_id = ? AND is_default = 1
               )`,
        ).bind(userId, userId).run()

        // 1件も無い場合は、既定の構成を1件作る
        await this.database.prepare(
            `INSERT INTO saved_builds (
                 id, user_id, name, version, is_default, created_at, updated_at
             )
             SELECT ?, ?, ?, 1, 1, ?, ?
             WHERE NOT EXISTS (
                 SELECT 1 FROM saved_builds WHERE user_id = ?
             )`,
        ).bind(id, userId, "構成1", now, now, userId).run()
    }

    async findById(
        userId: string,
        buildId: string,
    ): Promise<SavedBuild | null> {
        // IDと所有者を同時に指定して他ユーザーの構成を取得させない
        const buildRows = await queryRows<SavedBuildRow>(
            this.database,
            `SELECT id, name, version, created_at, updated_at, is_default
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
        // 選択パーツを検証して保存時点の価格と重量を確定する
        const snapshots = await this.loadPartSnapshots(parts)
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const statements = [
            this.database.prepare(
                `INSERT INTO saved_builds (
                     id, user_id, name, version, created_at, updated_at
                 )
                 SELECT ?, ?, ?, 1, ?, ?
                 WHERE (
                     SELECT COUNT(*)
                     FROM saved_builds
                     WHERE user_id = ?
                 ) < ?`,
            ).bind(
                id,
                userId,
                name,
                now,
                now,
                userId,
                MAX_SAVED_BUILDS_PER_USER,
            ),
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
                     WHERE EXISTS (
                         SELECT 1 FROM saved_builds WHERE id = ?
                     )`,
                ).bind(
                    id,
                    part.slotKey,
                    part.partId,
                    snapshot.price,
                    snapshot.weight,
                    now,
                    now,
                    id,
                )
            }),
        ]

        // 構成本体とパーツを同じD1バッチで登録する
        const results = await this.database.batch(statements)

        // 条件付きINSERTが0件なら同時作成を含めて上限到達と判断する
        if (results[0]?.meta.changes === 0) {
            throw new SavedBuildLimitExceededError()
        }

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
        // 更新後のパーツを事前検証して同じ新世代でまとめて置き換える
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
            // 対象が残っていれば世代競合で存在しなければ削除済みと判断する
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

    async rename(
        userId: string,
        buildId: string,
        version: number,
        name: string,
    ): Promise<RenameSavedBuildResult> {
        // 名前だけの変更でもversionを進めて他端末との競合を検出する
        const now = new Date().toISOString()
        const result = await this.database.prepare(
            `UPDATE saved_builds
             SET name = ?, version = version + 1, updated_at = ?
             WHERE id = ? AND user_id = ? AND version = ?`,
        ).bind(name, now, buildId, userId, version).run()

        if (result.meta.changes === 0) {
            const currentBuild = await this.findById(userId, buildId)

            return currentBuild
                ? {kind: "conflict"}
                : {kind: "not_found"}
        }

        const build = await this.findById(userId, buildId)

        if (!build) {
            throw new Error("保存構成の名称変更結果を取得できませんでした")
        }

        return {kind: "updated", build}
    }

    async delete(
        userId: string,
        buildId: string,
        version: number,
    ): Promise<DeleteSavedBuildResult> {
        // 指定versionと一致する所有中の構成を削除する
        // すべて削除した場合は、画面側が「構成1」を作り直す
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

    // パーツIDの存在・カテゴリー・対応位置を検証し、保存時点の価格・重量を取得
    private async loadPartSnapshots(
        parts: SavedBuildPartInput[],
    ) {
        return loadValidatedPartSnapshots(this.database, parts)
    }

    // 構成本体へスロット別パーツを付加
    private async attachParts(rows: SavedBuildRow[]): Promise<SavedBuild[]> {
        if (rows.length === 0) {
            return []
        }

        // 複数構成のパーツを一度に取得して構成IDごとに振り分ける
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
            isDefault: row.is_default === 1,
            parts: partsByBuildId.get(row.id) ?? [],
        }))
    }
}

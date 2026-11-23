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

// saved_buildsテーブルの行
type SavedBuildRow = {
    id: string
    name: string
    version: number
    created_at: string
    updated_at: string
}

// saved_build_partsテーブルの行
type SavedBuildPartRow = {
    saved_build_id: string
    slot_key: string
    part_id: number
    price: number
    weight: number
}

// COUNT(*)の結果行
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
    // 保存構成の所有者条件を各操作で統一し、更新系は世代条件も検証
    constructor(private readonly database: D1Database) {}

    // 保存件数上限の判定に使う構成の件数を取得
    async countAll(userId: string): Promise<number> {
        // ユーザーの全構成の件数を数える
        const rows = await queryRows<CountRow>(
            this.database,
            `SELECT COUNT(*) AS count
             FROM saved_builds
             WHERE user_id = ?`,
            [userId],
        )

        return rows[0]?.count ?? 0
    }

    // 保存構成一覧を更新日時の新しい順で返す
    async listAll(userId: string): Promise<SavedBuild[]> {
        // すべての構成を更新日時の新しい順で返す
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

    // 構成が1件も無い場合だけ初期構成を作成
    async ensureInitialConfig(userId: string): Promise<void> {
        // 初期構成の登録日時と更新日時
        const now = new Date().toISOString()
        // 初期構成のID
        const id = crypto.randomUUID()

        // 構成が1件も無い場合だけ、初期表示用の構成を作る
        await this.database.prepare(
            `INSERT INTO saved_builds (
                 id, user_id, name, version, created_at, updated_at
             )
             SELECT ?, ?, ?, 1, ?, ?
             WHERE NOT EXISTS (
                 SELECT 1 FROM saved_builds WHERE user_id = ?
             )`,
        ).bind(id, userId, "構成1", now, now, userId).run()
    }

    // 所有者とIDが一致する構成を1件取得
    async findById(
        userId: string,
        buildId: string,
    ): Promise<SavedBuild | null> {
        // IDと所有者を同時に指定して他ユーザーの構成を取得させない
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

    // 上限を確認しつつ構成本体とパーツをまとめて登録
    async create(
        userId: string,
        name: string,
        parts: SavedBuildPartInput[],
    ): Promise<SavedBuild> {
        // 選択パーツを検証して保存時点の価格と重量を確定
        const snapshots = await this.loadPartSnapshots(parts)
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        // 構成本体とパーツを同じバッチで登録するSQL群
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
                // 検証済みの価格と重量
                const snapshot = snapshots.get(part.partId)

                // 検証結果にパーツが無い場合は欠落エラー
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

        // 構成本体とパーツを同じD1バッチで登録
        const results = await this.database.batch(statements)

        // 条件付きINSERTが0件なら同時作成を含めて上限到達と判断
        if (results[0]?.meta.changes === 0) {
            throw new SavedBuildLimitExceededError()
        }

        const build = await this.findById(userId, id)

        // 作成直後に構成を取得できない場合は異常として扱う
        if (!build) {
            throw new Error("保存構成の作成結果を取得できませんでした")
        }

        return build
    }

    // 世代と更新トークンを検証して構成とパーツを更新
    async update(
        userId: string,
        buildId: string,
        version: number,
        name: string,
        parts: SavedBuildPartInput[],
    ): Promise<UpdateSavedBuildResult> {
        // 更新後のパーツを事前検証して同じ新世代でまとめて置き換える
        const snapshots = await this.loadPartSnapshots(parts)
        const now = new Date().toISOString()
        // 1回の更新を識別するトークン。別の更新と取り違えないために使う
        const updateToken = crypto.randomUUID()
        // 同じ更新トークンを持つ行だけを操作する条件
        const tokenGuard = `EXISTS (
            SELECT 1
            FROM saved_builds
            WHERE id = ?
              AND user_id = ?
              AND update_token = ?
        )`
        // 更新トークン条件へ渡す値（構成ID・ユーザーID・トークン）
        const guardParameters = [buildId, userId, updateToken]
        // 構成本体の更新とパーツ置き換えを同一バッチで実行するSQL群
        const statements = [
            this.database.prepare(
                 `UPDATE saved_builds
                 SET name = ?, version = version + 1,
                     updated_at = ?, update_token = ?
                 WHERE id = ? AND user_id = ? AND version = ?`,
            ).bind(name, now, updateToken, buildId, userId, version),
            this.database.prepare(
                `DELETE FROM saved_build_parts
                 WHERE saved_build_id = ? AND ${tokenGuard}`,
            ).bind(buildId, ...guardParameters),
            ...parts.map((part) => {
                // 検証済みの価格と重量
                const snapshot = snapshots.get(part.partId)

                // 検証結果にパーツが無い場合は欠落エラー
                if (!snapshot) {
                    throw new MissingSavedBuildPartsError([part.partId])
                }

                return this.database.prepare(
                    `INSERT INTO saved_build_parts (
                         saved_build_id, slot_key, part_id, price, weight,
                         created_at, updated_at
                     )
                     SELECT ?, ?, ?, ?, ?, ?, ?
                     WHERE ${tokenGuard}`,
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

        // version条件付きの更新と、トークンで守ったパーツ置き換えを同一バッチで実行
        const results = await this.database.batch(statements)
        // 先頭の構成本体更新の結果
        const buildUpdate = results[0]

        // 更新結果が取得できない場合は異常として扱う
        if (!buildUpdate) {
            throw new Error("保存構成の更新結果を取得できませんでした")
        }

        // 世代不一致または削除済みの場合
        if (buildUpdate.meta.changes === 0) {
            // 対象が残っていれば世代競合、存在しなければ削除済みと判断
            const currentBuild = await this.findById(userId, buildId)

            return currentBuild
                ? {kind: "conflict"}
                : {kind: "not_found"}
        }

        const build = await this.findById(userId, buildId)

        // 更新後の構成を取得できない場合は異常として扱う
        if (!build) {
            throw new Error("保存構成の更新結果を取得できませんでした")
        }

        return {kind: "updated", build}
    }

    // 世代を検証して構成名だけを変更
    async rename(
        userId: string,
        buildId: string,
        version: number,
        name: string,
    ): Promise<RenameSavedBuildResult> {
        // 名前だけの変更でもversionを進めて他端末との競合を検出
        const now = new Date().toISOString()
        const result = await this.database.prepare(
            `UPDATE saved_builds
             SET name = ?, version = version + 1, updated_at = ?
             WHERE id = ? AND user_id = ? AND version = ?`,
        ).bind(name, now, buildId, userId, version).run()

        // 世代不一致または削除済みの場合
        if (result.meta.changes === 0) {
            const currentBuild = await this.findById(userId, buildId)

            return currentBuild
                ? {kind: "conflict"}
                : {kind: "not_found"}
        }

        const build = await this.findById(userId, buildId)

        // 名称変更後の構成を取得できない場合は異常として扱う
        if (!build) {
            throw new Error("保存構成の名称変更結果を取得できませんでした")
        }

        return {kind: "updated", build}
    }

    // 世代を検証して構成を削除
    async delete(
        userId: string,
        buildId: string,
        version: number,
    ): Promise<DeleteSavedBuildResult> {
        // 指定versionと一致する所有中の構成を削除
        // すべて削除した場合は、画面側が「構成1」を作り直す
        const result = await this.database.prepare(
            `DELETE FROM saved_builds
             WHERE id = ? AND user_id = ? AND version = ?`,
        ).bind(buildId, userId, version).run()

        // 削除できた場合は成功を返す
        if (result.meta.changes > 0) {
            return {kind: "deleted"}
        }

        const currentBuild = await this.findById(userId, buildId)

        return currentBuild
            ? {kind: "conflict"}
            : {kind: "not_found"}
    }

    // パーツの存在・カテゴリー・前後位置・規格を検証し、保存時点の価格・重量を取得
    private async loadPartSnapshots(
        parts: SavedBuildPartInput[],
    ) {
        return loadValidatedPartSnapshots(this.database, parts)
    }

    // 構成本体へスロット別パーツを付加
    private async attachParts(rows: SavedBuildRow[]): Promise<SavedBuild[]> {
        // 構成が無い場合はパーツ取得を省略
        if (rows.length === 0) {
            return []
        }

        // 複数構成のパーツを一度に取得して構成IDごとに振り分ける
        // パーツをまとめて取得する対象の構成ID
        const buildIds = rows.map((row) => row.id)
        const partRows = await queryRows<SavedBuildPartRow>(
            this.database,
            `SELECT saved_build_id, slot_key, part_id, price, weight
             FROM saved_build_parts
             WHERE saved_build_id IN (${placeholders(buildIds.length)})
             ORDER BY saved_build_id ASC, slot_key ASC`,
            buildIds,
        )
        // 構成IDごとのパーツ一覧
        const partsByBuildId = new Map<string, SavedBuildPart[]>()

        for (const row of partRows) {
            // 構成へ追加するパーツ一覧
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

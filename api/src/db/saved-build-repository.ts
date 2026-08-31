import {
    findIncompatiblePartPairs,
    type CompatibilityPart,
} from "./part-compatibility"

// 保存構成へ登録するパーツの入力値
export const MAX_SAVED_BUILDS_PER_USER = 20

export type SavedBuildPartInput = {
    // 価格と重量はクライアントから受け取らずDBのマスターを使用する
    slotKey: string
    partId: number
}

// 保存構成に保持するパーツのスナップショット
export type SavedBuildPart = SavedBuildPartInput & {
    // 保存後にマスターデータが変わっても当時の合計を再現するための値
    price: number
    weight: number
}

// 保存構成のAPIレスポンス
export type SavedBuild = {
    // versionは別端末からの同時更新を検出するための世代番号
    id: string
    name: string
    version: number
    createdAt: string
    updatedAt: string
    // nullは非公開、値がある場合だけ読み取り専用URLから参照できる
    shareToken: string | null
    parts: SavedBuildPart[]
}

// 更新結果の分類
export type UpdateSavedBuildResult =
    | {kind: "updated"; build: SavedBuild}
    | {kind: "not_found"}
    | {kind: "conflict"}

// 名称変更結果の分類
export type RenameSavedBuildResult = UpdateSavedBuildResult

// 削除結果の分類
export type DeleteSavedBuildResult =
    | {kind: "deleted"}
    | {kind: "not_found"}
    | {kind: "conflict"}

// 保存構成APIからDB層へ渡す契約
export interface SavedBuildRepository {
    // ルート層からSQLを隠し所有者条件を各操作で統一する
    count(userId: string): Promise<number>
    list(userId: string): Promise<SavedBuild[]>
    findById(userId: string, buildId: string): Promise<SavedBuild | null>
    findPublicByToken(shareToken: string): Promise<SavedBuild | null>
    create(
        userId: string,
        name: string,
        parts: SavedBuildPartInput[],
    ): Promise<SavedBuild>
    update(
        userId: string,
        buildId: string,
        version: number,
        name: string,
        parts: SavedBuildPartInput[],
    ): Promise<UpdateSavedBuildResult>
    rename(
        userId: string,
        buildId: string,
        version: number,
        name: string,
    ): Promise<RenameSavedBuildResult>
    setSharing(
        userId: string,
        buildId: string,
        version: number,
        enabled: boolean,
    ): Promise<UpdateSavedBuildResult>
    delete(
        userId: string,
        buildId: string,
        version: number,
    ): Promise<DeleteSavedBuildResult>
}

// 指定されたパーツIDがpartsテーブルにない場合のエラー
export class MissingSavedBuildPartsError extends Error {
    constructor(readonly partIds: number[]) {
        super("保存構成に存在しないパーツが含まれています")
        this.name = "MissingSavedBuildPartsError"
    }
}

// スロットとパーツカテゴリー・対応位置の不一致を表すエラー
export type InvalidSavedBuildPartIssue = {
    slotKey: string
    partId: number
    reason: "category" | "position" | "compatibility"
    relatedSlotKey?: string
    relatedPartId?: number
    detail?: string
}

export class InvalidSavedBuildPartsError extends Error {
    constructor(
        readonly issues: InvalidSavedBuildPartIssue[],
    ) {
        const details = Array.from(new Set(
            issues
                .map((issue) => issue.detail)
                .filter((detail): detail is string => Boolean(detail)),
        ))

        super(details.length > 0
            ? `保存構成のパーツが互換性を満たしていません: ${details.join("、")}`
            : "保存構成のスロットとパーツの適合条件が一致しません")
        this.name = "InvalidSavedBuildPartsError"
    }

    get partIds(): number[] {
        // 同じパーツに複数の問題があってもAPIには重複なしで返す
        return Array.from(new Set(this.issues.flatMap((issue) => [
            issue.partId,
            ...(issue.relatedPartId === undefined
                ? []
                : [issue.relatedPartId]),
        ])))
    }
}

// 構成関連テーブルのマイグレーション未適用を判定するエラー
export function isMissingSavedBuildSchemaError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false
    }

    if (/no such (table|column):\s*(saved_builds|saved_build_parts|config_slot|share_token)/i.test(error.message)) {
        return true
    }

    // D1がSQLiteエラーをcauseへ包む場合もあるため原因を再帰的に確認する
    return isMissingSavedBuildSchemaError(
        (error as Error & {cause?: unknown}).cause,
    )
}

// 保存構成APIが必要とするスロット・パーツの組み合わせを検証する行
type ValidatablePartRow = {
    id: number
    price: number
    weight: number
    category_key: string
    allowed_position: string | null
}

type PartCategoryRelationRow = {
    part_id: number
    category_key: string
}

type PartSpecificationRow = {
    part_id: number
    spec_key: string
    spec_value: string
}

// D1のバインド変数上限を超えないよう、入力数に合わせたIN句を作成
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

// スロットキーからカテゴリーと前後位置を分解
function parseSlotKey(slotKey: string) {
    const [categoryKey, position] = slotKey.split(":")

    return {
        categoryKey,
        position: position === "front" || position === "rear"
            ? position
            : null,
    }
}

// パーツの存在・カテゴリー・対応位置を一度のクエリで検証し、価格重量を返す
export async function loadValidatedPartSnapshots(
    database: D1Database,
    parts: SavedBuildPartInput[],
): Promise<Map<number, {id: number; price: number; weight: number}>> {
    // 同じパーツが複数スロットにあってもDB照会は一度にまとめる
    const partIds = Array.from(new Set(parts.map((part) => part.partId)))

    if (partIds.length === 0) {
        return new Map()
    }

    const rows = await queryRows<ValidatablePartRow>(
        database,
        `SELECT parts.id,
                parts.price,
                parts.weight,
                categories.key AS category_key,
                (
                    SELECT specification.spec_value
                    FROM part_specifications AS specification
                    WHERE specification.part_id = parts.id
                      AND specification.spec_key = 'allowed_position'
                    LIMIT 1
                ) AS allowed_position
         FROM parts
         JOIN categories ON categories.id = parts.category_id
         WHERE parts.id IN (${placeholders(partIds.length)})`,
        partIds,
    )
    const rowsByPartId = new Map(rows.map((row) => [row.id, row]))
    const missingPartIds = partIds.filter((partId) => !rowsByPartId.has(partId))

    // 存在しないIDを黙って除外すると画面と保存結果が一致しなくなる
    if (missingPartIds.length > 0) {
        throw new MissingSavedBuildPartsError(missingPartIds)
    }

    const issues: InvalidSavedBuildPartIssue[] = []

    for (const part of parts) {
        const row = rowsByPartId.get(part.partId)

        if (!row) {
            continue
        }

        const slot = parseSlotKey(part.slotKey)

        // スロットのカテゴリーとパーツの実カテゴリーが一致するか確認する
        if (row.category_key !== slot.categoryKey) {
            issues.push({
                slotKey: part.slotKey,
                partId: part.partId,
                reason: "category",
            })

            continue
        }

        if (
            slot.position &&
            row.allowed_position &&
            row.allowed_position !== slot.position
        ) {
            // 前後指定のあるパーツが反対側へ保存されることを防ぐ
            issues.push({
                slotKey: part.slotKey,
                partId: part.partId,
                reason: "position",
            })
        }
    }

    if (issues.length > 0) {
        // 不一致をまとめて返し一度の応答で修正箇所を判断できるようにする
        throw new InvalidSavedBuildPartsError(issues)
    }

    // 保存時も候補選択と同じ規格判定を行い、古い画面や直接API呼び出しを信頼しない
    const placeholdersSql = placeholders(partIds.length)
    const [blockedCategoryRows, includedCategoryRows, specificationRows] =
        await Promise.all([
            queryRows<PartCategoryRelationRow>(
                database,
                `SELECT blocked.part_id, categories.key AS category_key
                 FROM part_blocked_categories AS blocked
                 JOIN categories ON categories.id = blocked.category_id
                 WHERE blocked.part_id IN (${placeholdersSql})`,
                partIds,
            ),
            queryRows<PartCategoryRelationRow>(
                database,
                `SELECT items.part_id, categories.key AS category_key
                 FROM part_included_items AS items
                 JOIN categories ON categories.id = items.included_category_id
                 WHERE items.part_id IN (${placeholdersSql})`,
                partIds,
            ),
            queryRows<PartSpecificationRow>(
                database,
                `SELECT part_id, spec_key, spec_value
                 FROM part_specifications
                 WHERE part_id IN (${placeholdersSql})`,
                partIds,
            ),
        ])
    const blockedCategoryKeys = new Map<number, Set<string>>()
    const specifications = new Map<number, Record<string, string>>()

    // 明示的な排他カテゴリーと付属品カテゴリーを一つの集合へまとめる
    for (const row of [...blockedCategoryRows, ...includedCategoryRows]) {
        if (
            typeof row.part_id !== "number" ||
            typeof row.category_key !== "string"
        ) {
            continue
        }

        const keys = blockedCategoryKeys.get(row.part_id) ?? new Set<string>()
        keys.add(row.category_key)
        blockedCategoryKeys.set(row.part_id, keys)
    }

    // 同一パーツの規格キーを保存時判定用のオブジェクトへ変換する
    for (const row of specificationRows) {
        if (
            typeof row.part_id !== "number" ||
            typeof row.spec_key !== "string" ||
            typeof row.spec_value !== "string"
        ) {
            continue
        }

        const partSpecifications = specifications.get(row.part_id) ?? {}
        partSpecifications[row.spec_key] = row.spec_value
        specifications.set(row.part_id, partSpecifications)
    }

    const compatibilityParts = parts.flatMap((part): {
        slotKey: string
        part: CompatibilityPart
    }[] => {
        const row = rowsByPartId.get(part.partId)

        if (!row) {
            return []
        }

        return [{
            slotKey: part.slotKey,
            part: {
                id: row.id,
                categoryKey: row.category_key,
                blockedCategoryKeys: Array.from(
                    blockedCategoryKeys.get(row.id) ?? [],
                ),
                specifications: specifications.get(row.id) ?? {},
            },
        }]
    })
    const compatibilityIssues = findIncompatiblePartPairs(compatibilityParts)

    if (compatibilityIssues.length > 0) {
        // API利用者が修正対象を特定できるよう、競合する両パーツをエラーへ含める
        throw new InvalidSavedBuildPartsError(
            compatibilityIssues.map((issue) => ({
                slotKey: issue.slotKeys[0] ?? "",
                partId: issue.partIds[0] ?? 0,
                reason: "compatibility" as const,
                relatedSlotKey: issue.slotKeys[1],
                relatedPartId: issue.partIds[1],
                detail: issue.reasons.join("、"),
            })),
        )
    }

    return new Map(rows.map((row) => [row.id, {
        id: row.id,
        price: row.price,
        weight: row.weight,
    }]))
}

// 同時リクエストを含めて保存上限へ達した場合のエラー
export class SavedBuildLimitExceededError extends Error {
    constructor() {
        super(`保存できる構成は${MAX_SAVED_BUILDS_PER_USER}件までです`)
        this.name = "SavedBuildLimitExceededError"
    }
}

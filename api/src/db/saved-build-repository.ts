import {
    findIncompatiblePartPairs,
    type CompatibilityPart,
} from "./part-compatibility"

// 1ユーザーが保存できる構成の上限(20件)
export const MAX_SAVED_BUILDS_PER_USER = 20

// 保存構成へ登録するパーツの入力値
export type SavedBuildPartInput = {
    // 価格と重量はクライアントから受け取らずDBのマスターを使用
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
    id: string
    name: string
    // 別端末からの同時更新を検出するための世代番号
    version: number
    createdAt: string
    updatedAt: string
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
    // ルート層からSQLを隠し所有者条件を各操作で統一
    // 全構成の件数(0〜20件)
    countAll(userId: string): Promise<number>
    // 全構成の一覧
    listAll(userId: string): Promise<SavedBuild[]>
    // 構成が1件も無ければ、初期表示用の構成を作る
    ensureInitialConfig(userId: string): Promise<void>
    // 所有者の構成からIDで1件取得
    findById(userId: string, buildId: string): Promise<SavedBuild | null>
    // 新しい構成を保存
    create(
        userId: string,
        name: string,
        parts: SavedBuildPartInput[],
    ): Promise<SavedBuild>
    // version一致時だけ構成とパーツを更新
    update(
        userId: string,
        buildId: string,
        version: number,
        name: string,
        parts: SavedBuildPartInput[],
    ): Promise<UpdateSavedBuildResult>
    // version一致時だけ構成名を変更
    rename(
        userId: string,
        buildId: string,
        version: number,
        name: string,
    ): Promise<RenameSavedBuildResult>
    // version一致時だけ構成を削除
    delete(
        userId: string,
        buildId: string,
        version: number,
    ): Promise<DeleteSavedBuildResult>
}

// 指定されたパーツIDがpartsテーブルにない場合のエラー
export class MissingSavedBuildPartsError extends Error {
    // 欠落したパーツIDを保持するエラーを生成
    constructor(readonly partIds: number[]) {
        super("保存構成に存在しないパーツが含まれています")
        this.name = "MissingSavedBuildPartsError"
    }
}

// 保存構成のパーツがスロット・前後位置・規格に合わない理由
export type InvalidSavedBuildPartIssue = {
    // 不一致が見つかったスロットキー
    slotKey: string
    // 不一致が見つかったパーツID
    partId: number
    // 不一致の種類（category・position・compatibility）
    reason: "category" | "position" | "compatibility"
    // 規格競合した相手パーツのスロットキー
    relatedSlotKey?: string
    // 規格競合した相手パーツのID
    relatedPartId?: number
    // 画面に表示する不一致の詳細
    detail?: string
}

// 保存構成のパーツが適合条件を満たさない場合のエラー
export class InvalidSavedBuildPartsError extends Error {
    // 不一致の内容を保持するエラーを生成
    constructor(
        readonly issues: InvalidSavedBuildPartIssue[],
    ) {
        // 画面に表示する不一致理由の重複なし一覧
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

    // エラーに関係するパーツIDを重複なしで返す
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

// 構成関連テーブルのマイグレーション未適用を判定
export function isMissingSavedBuildSchemaError(error: unknown): boolean {
    // Error以外はスキーマ不足の判定対象外
    if (!(error instanceof Error)) {
        return false
    }

    // 保存構成に必要なテーブル・列の不足を検出
    if (/no such (table|column):\s*(saved_builds|saved_build_parts)/i.test(error.message)) {
        return true
    }

    // D1がSQLiteエラーをcauseへ包む場合もあるため原因を再帰的に確認
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

// パーツとカテゴリーの関連行
type PartCategoryRelationRow = {
    part_id: number
    category_key: string
}

// part_specificationsテーブルの行
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

// パーツの存在・カテゴリー・前後位置・規格を検証し、価格と重量を返す
export async function loadValidatedPartSnapshots(
    database: D1Database,
    parts: SavedBuildPartInput[],
): Promise<Map<number, {id: number; price: number; weight: number}>> {
    // 同じパーツが複数スロットにあってもDB照会は一度にまとめる
    // 検証対象のパーツID（重複を除く）
    const partIds = Array.from(new Set(parts.map((part) => part.partId)))

    // パーツ指定が無い場合はDB照会を省略
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
    // パーツIDから照会結果を引くための表
    const rowsByPartId = new Map(rows.map((row) => [row.id, row]))
    // partsテーブルに存在しないパーツID
    const missingPartIds = partIds.filter((partId) => !rowsByPartId.has(partId))

    // 存在しないIDを黙って除外すると画面と保存結果が一致しなくなる
    if (missingPartIds.length > 0) {
        throw new MissingSavedBuildPartsError(missingPartIds)
    }

    // カテゴリー・前後位置の不一致一覧
    const issues: InvalidSavedBuildPartIssue[] = []

    for (const part of parts) {
        const row = rowsByPartId.get(part.partId)

        // 念のため照会結果に無いパーツは読み飛ばす
        if (!row) {
            continue
        }

        // スロットキーから分解したカテゴリーと前後位置
        const slot = parseSlotKey(part.slotKey)

        // スロットのカテゴリーとパーツの実カテゴリーが一致するか確認
        if (row.category_key !== slot.categoryKey) {
            issues.push({
                slotKey: part.slotKey,
                partId: part.partId,
                reason: "category",
            })

            continue
        }

        // 前後位置の指定がある場合は反対側への保存を防ぐ
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

    // カテゴリー・前後位置の不一致をまとめてエラーにする
    if (issues.length > 0) {
        // 不一致をまとめて返し一度の応答で修正箇所を判断できるようにする
        throw new InvalidSavedBuildPartsError(issues)
    }

    // 保存時も候補選択と同じ規格判定を行い、古い画面や直接API呼び出しを信頼しない
    // IN句へ渡すプレースホルダー一覧
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
    // パーツごとの選択不可カテゴリー
    const blockedCategoryKeys = new Map<number, Set<string>>()
    // パーツごとの規格キーと値
    const specifications = new Map<number, Record<string, string>>()

    // 明示的な排他カテゴリーと付属品カテゴリーを一つの集合へまとめる
    for (const row of [...blockedCategoryRows, ...includedCategoryRows]) {
        // 型が想定外の関連行はスキップ
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

    // 同一パーツの規格キーを保存時判定用のオブジェクトへ変換
    for (const row of specificationRows) {
        // 型が想定外の規格行はスキップ
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

    // 規格判定へ渡すスロットとパーツの組
    const compatibilityParts = parts.flatMap((part): {
        slotKey: string
        part: CompatibilityPart
    }[] => {
        const row = rowsByPartId.get(part.partId)

        // 照会結果に無いパーツは互換判定に含めない
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
    // 保存構成内で見つかった規格不一致
    const compatibilityIssues = findIncompatiblePartPairs(compatibilityParts)

    // 規格の不一致をまとめてエラーにする
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
    // 保存上限超過のエラーを生成
    constructor() {
        super(`保存できる構成は${MAX_SAVED_BUILDS_PER_USER}件までです`)
        this.name = "SavedBuildLimitExceededError"
    }
}

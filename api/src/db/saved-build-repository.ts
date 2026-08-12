// 保存構成へ登録するパーツの入力値
export const MAX_SAVED_BUILDS_PER_USER = 20

export type SavedBuildPartInput = {
    slotKey: string
    partId: number
}

// 保存構成に保持するパーツのスナップショット
export type SavedBuildPart = SavedBuildPartInput & {
    price: number
    weight: number
}

// 保存構成のAPIレスポンス
export type SavedBuild = {
    id: string
    name: string
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
    count(userId: string): Promise<number>
    list(userId: string): Promise<SavedBuild[]>
    findById(userId: string, buildId: string): Promise<SavedBuild | null>
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

// 同時リクエストを含めて保存上限へ達した場合のエラー
export class SavedBuildLimitExceededError extends Error {
    constructor() {
        super(`保存できる構成は${MAX_SAVED_BUILDS_PER_USER}件までです`)
        this.name = "SavedBuildLimitExceededError"
    }
}

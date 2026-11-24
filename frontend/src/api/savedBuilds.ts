import {fetchCsrfToken} from "@/features/auth/authApi"
import {
    isNonNegativeFiniteNumber,
    isPartSlotKey,
    isPositiveSafeInteger,
} from "@/api/responseValidation"

// 保存できる構成の上限（20件）。サーバー側と同じ値
export const MAX_SAVED_BUILDS = 20
// 1構成に保存できるパーツの上限（100件）。サーバー側と同じ値
export const MAX_PARTS_PER_BUILD = 100
// 構成IDとしてURLへ渡せる最大文字数（200文字）
const MAX_SAVED_BUILD_ID_LENGTH = 200
// 保存日時として受け付ける最大文字数（64文字）
const MAX_TIMESTAMP_LENGTH = 64

// 保存構成APIの入出力で扱う型と値の範囲

// D1へ保存する構成内パーツの入力
export type SavedBuildPartInput = {
    slotKey: string // 構成内のパーツ位置を表すスロットキー
    partId: number // 選択したパーツID
}

// 保存構成に含まれる、保存時点のパーツ情報
export type SavedBuildPart = SavedBuildPartInput & {
    price: number // 保存時点の価格(円)
    weight: number // 保存時点の重量(g)
}

// 保存構成APIから返される構成
export type SavedBuild = {
    id: string // 構成ID（UUIDなど不透明な文字列）
    name: string // 構成名（1〜50文字）
    version: number // 楽観ロック用の版番号
    createdAt: string // 作成日時（ISO文字列）
    updatedAt: string // 更新日時（ISO文字列）
    parts: SavedBuildPart[] // 保存時点のパーツ情報
}

// 構成APIのエラー本文
type ApiErrorPayload = {
    error?: {
        code?: unknown
        message?: unknown
        partIds?: unknown
    }
}

// APIエラーを呼び出し側で扱いやすい形にする
export class SavedBuildApiError extends Error {
    // APIが返すエラーコード。未設定はnull
    readonly code: string | null
    // 保存に失敗したパーツID
    readonly partIds: number[]

    // 構成APIのエラーをメッセージ・コード・パーツID付きで生成
    constructor(
        message: string,
        code: string | null = null,
        partIds: number[] = [],
    ) {
        super(message)
        this.name = "SavedBuildApiError"
        this.code = code
        this.partIds = partIds
    }
}

// 構成APIのエラー本文を読み取り、画面表示用の例外へ変換
async function throwApiError(
    response: Response,
    fallbackMessage: string,
): Promise<never> {
    // APIのエラー本文は形式が保証されないため、読める項目だけを画面用例外へ移す
    let message = fallbackMessage
    let code: string | null = null
    // APIが返した保存に失敗したパーツID
    let partIds: number[] = []

    try {
        const payload = await response.json() as ApiErrorPayload

        // エラー本文にメッセージがあれば画面表示用に採用
        if (typeof payload.error?.message === "string") {
            message = payload.error.message
        }

        // エラー本文にコードがあれば呼び出し元の分岐用に採用
        if (typeof payload.error?.code === "string") {
            code = payload.error.code
        }

        // エラー本文のパーツIDが正の整数だけで構成される場合に採用
        if (
            Array.isArray(payload.error?.partIds) &&
            payload.error.partIds.every(
                (partId) => isPositiveSafeInteger(partId),
            )
        ) {
            partIds = payload.error.partIds as number[]
        }
    } catch {
        // JSON形式でないエラーは呼び出し元の既定メッセージを使う
    }

    throw new SavedBuildApiError(message, code, partIds)
}

// DB由来のIDを画面へ流す前に、URLへ安全に渡せる長さと形式を確認
// 実DBはUUIDだが、移行処理やテスト用リポジトリの不透明なIDも扱えるようにする
export function isSavedBuildId(value: unknown): value is string {
    return typeof value === "string" &&
        value.length > 0 &&
        value.length <= MAX_SAVED_BUILD_ID_LENGTH &&
        /^[A-Za-z0-9_-]+$/.test(value)
}

// 構成名として受け付ける1〜50文字の文字列か判定
function isSavedBuildText(value: unknown): value is string {
    return typeof value === "string" &&
        value.length > 0 &&
        value.length <= 50
}

// 保存日時として受け付ける1〜64文字の文字列か判定
function isTimestamp(value: unknown): value is string {
    return typeof value === "string" &&
        value.length > 0 &&
        value.length <= MAX_TIMESTAMP_LENGTH
}

// 保存構成のパーツ配列を検証し、スロットキーと数値を取り出す
function parseSavedBuildParts(value: unknown): SavedBuildPart[] {
    // 配列でない、または上限（100件）を超える場合はエラー
    if (!Array.isArray(value) || value.length > MAX_PARTS_PER_BUILD) {
        throw new SavedBuildApiError(
            "保存構成のパーツ情報を解釈できませんでした",
        )
    }

    // 検証済みの構成内パーツ
    const parsedParts = value.flatMap((part) => {
        // 不正なパーツ要素は後段で件数差分として検出し、部分的な構成を受け付けない
        if (typeof part !== "object" || part === null) {
            return []
        }

        const partRecord = part as Record<string, unknown>

        // スロットキー・パーツID・価格・重量のいずれかが不正なら読み飛ばす
        if (
            !isPartSlotKey(partRecord.slotKey) ||
            !isPositiveSafeInteger(partRecord.partId) ||
            !isNonNegativeFiniteNumber(partRecord.price) ||
            !isNonNegativeFiniteNumber(partRecord.weight)
        ) {
            return []
        }

        return [{
            slotKey: partRecord.slotKey,
            partId: partRecord.partId,
            price: partRecord.price,
            weight: partRecord.weight,
        }]
    })

    // 要素の欠落や重複スロットがあると復元結果が不定になるため一覧を返さない
    if (
        parsedParts.length !== value.length ||
        new Set(parsedParts.map((part) => part.slotKey)).size !== parsedParts.length
    ) {
        throw new SavedBuildApiError(
            "保存構成のパーツ情報を解釈できませんでした",
        )
    }

    return parsedParts
}

// APIレスポンスの構造を検証し、予期しないJSONを画面へ流さない
function parseSavedBuild(value: unknown): SavedBuild {
    // オブジェクト以外は保存構成として扱えないためエラー
    if (
        typeof value !== "object" ||
        value === null
    ) {
        throw new SavedBuildApiError(
            "保存構成のレスポンスを解釈できませんでした",
        )
    }

    const record = value as Record<string, unknown>
    const parts = record.parts

    // ID・名称・version・日時がそろわない構成は全体を無効として扱う
    if (
        !isSavedBuildId(record.id) ||
        !isSavedBuildText(record.name) ||
        !isPositiveSafeInteger(record.version) ||
        !isTimestamp(record.createdAt) ||
        !isTimestamp(record.updatedAt)
    ) {
        throw new SavedBuildApiError(
            "保存構成のレスポンスを解釈できませんでした",
        )
    }

    // 検証済みの構成内パーツ
    const parsedParts = parseSavedBuildParts(parts)

    return {
        id: record.id,
        name: record.name,
        version: record.version,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        parts: parsedParts,
    }
}

// 一覧レスポンスも1件ずつ検証し、不正な要素を黙って欠落させない
function parseSavedBuildList(value: unknown): SavedBuild[] {
    // API側の上限を超える一覧を受け取った場合は、表示だけでなくレスポンス自体を拒否
    if (
        !Array.isArray(value) ||
        value.length > MAX_SAVED_BUILDS
    ) {
        throw new SavedBuildApiError(
            "保存構成一覧のレスポンスを解釈できませんでした",
        )
    }

    // 検証済みの保存構成一覧
    const builds = value.map(parseSavedBuild)

    // 同じIDが複数あると更新・削除対象を誤るため、重複を検出
    if (new Set(builds.map((build) => build.id)).size !== builds.length) {
        throw new SavedBuildApiError(
            "保存構成一覧のレスポンスに重複した構成があります",
        )
    }

    return builds
}

// ログインユーザーの保存構成一覧を更新日時順で取得
export async function fetchSavedBuilds(
    signal?: AbortSignal,
): Promise<SavedBuild[]> {
    // 一覧取得はCookieセッションだけを使い、レスポンスは構造検証後に返す
    const response = await fetch("/api/builds", {
        credentials: "same-origin",
        signal,
        headers: {Accept: "application/json"},
    })

    // 一覧取得の失敗を、呼び出し元で分岐できる例外へ変換
    if (!response.ok) {
        return throwApiError(response, "保存構成一覧の取得に失敗しました")
    }

    return parseSavedBuildList(await response.json())
}

// localStorage移行で1構成をD1へ登録
export async function createSavedBuild(
    name: string,
    parts: SavedBuildPartInput[],
    signal?: AbortSignal,
): Promise<SavedBuild> {
    // D1の保存APIはCookie認証に加えてCSRFトークンを要求
    const csrfToken = await fetchCsrfToken()
    // 作成操作では、入力名と選択中スロットを同じリクエストへまとめる
    const response = await fetch("/api/builds", {
        method: "POST",
        credentials: "same-origin",
        signal,
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({name, parts, csrfToken}),
    })

    // 上限超過・不正パーツ・マイグレーション未適用をコード付きで返す
    if (!response.ok) {
        return throwApiError(response, "構成の保存に失敗しました")
    }

    return parseSavedBuild(await response.json())
}

// 現在の選択内容で保存構成を上書き
export async function updateSavedBuild(
    buildId: string,
    version: number,
    name: string,
    parts: SavedBuildPartInput[],
): Promise<SavedBuild> {
    // versionを含めたPUTで、別端末の編集を検知できるようにする
    const csrfToken = await fetchCsrfToken()
    const response = await fetch(`/api/builds/${encodeURIComponent(buildId)}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({name, version, parts, csrfToken}),
    })

    // 上書きに失敗した場合はエラー本文のコードを保持して例外化
    if (!response.ok) {
        return throwApiError(response, "構成の上書きに失敗しました")
    }

    return parseSavedBuild(await response.json())
}

// 保存済みパーツのスナップショットを維持したまま名称を変更
export async function renameSavedBuild(
    buildId: string,
    version: number,
    name: string,
): Promise<SavedBuild> {
    // パーツを送らず名前だけをPATCHし、保存済みスナップショットを維持
    const csrfToken = await fetchCsrfToken()
    const response = await fetch(`/api/builds/${encodeURIComponent(buildId)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({name, version, csrfToken}),
    })

    // 名称変更に失敗した場合はエラー本文のコードを保持して例外化
    if (!response.ok) {
        return throwApiError(response, "構成名の変更に失敗しました")
    }

    return parseSavedBuild(await response.json())
}

// version一致時だけ保存構成を削除
export async function deleteSavedBuild(
    buildId: string,
    version: number,
): Promise<void> {
    // version一致をサーバー側で確認し、古い画面からの削除を防ぐ
    const csrfToken = await fetchCsrfToken()
    const response = await fetch(`/api/builds/${encodeURIComponent(buildId)}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({version, csrfToken}),
    })

    // 削除に失敗した場合はエラー本文のコードを保持して例外化
    if (!response.ok) {
        return throwApiError(response, "構成の削除に失敗しました")
    }
}

import {fetchCsrfToken} from "@/features/auth/authApi"

// サーバー側と同じ保存上限をUI表示にも利用する
export const MAX_SAVED_BUILDS = 20

// D1へ保存する構成内パーツの入力
export type SavedBuildPartInput = {
    slotKey: string
    partId: number
}

// 保存構成に含まれる、保存時点のパーツ情報
export type SavedBuildPart = SavedBuildPartInput & {
    price: number
    weight: number
}

// 保存構成APIから返される構成
export type SavedBuild = {
    id: string
    name: string
    version: number
    createdAt: string
    updatedAt: string
    parts: SavedBuildPart[]
}

type ApiErrorPayload = {
    error?: {
        code?: unknown
        message?: unknown
        partIds?: unknown
    }
}

// APIエラーを呼び出し側で扱いやすい形にする
export class SavedBuildApiError extends Error {
    readonly code: string | null
    readonly partIds: number[]

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
    let message = fallbackMessage
    let code: string | null = null
    let partIds: number[] = []

    try {
        const payload = await response.json() as ApiErrorPayload

        if (typeof payload.error?.message === "string") {
            message = payload.error.message
        }

        if (typeof payload.error?.code === "string") {
            code = payload.error.code
        }

        if (
            Array.isArray(payload.error?.partIds) &&
            payload.error.partIds.every(
                (partId) => typeof partId === "number",
            )
        ) {
            partIds = payload.error.partIds as number[]
        }
    } catch {
        // JSON形式でないエラーは呼び出し元の既定メッセージを使う
    }

    throw new SavedBuildApiError(message, code, partIds)
}

// APIレスポンスの構造を検証し、予期しないJSONを画面へ流さない
function parseSavedBuild(value: unknown): SavedBuild {
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

    if (
        typeof record.id !== "string" ||
        typeof record.name !== "string" ||
        typeof record.version !== "number" ||
        typeof record.createdAt !== "string" ||
        typeof record.updatedAt !== "string" ||
        !Array.isArray(parts)
    ) {
        throw new SavedBuildApiError(
            "保存構成のレスポンスを解釈できませんでした",
        )
    }

    const parsedParts = parts.flatMap((part) => {
        if (typeof part !== "object" || part === null) {
            return []
        }

        const partRecord = part as Record<string, unknown>

        if (
            typeof partRecord.slotKey !== "string" ||
            typeof partRecord.partId !== "number" ||
            typeof partRecord.price !== "number" ||
            typeof partRecord.weight !== "number"
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

    if (parsedParts.length !== parts.length) {
        throw new SavedBuildApiError(
            "保存構成のパーツ情報を解釈できませんでした",
        )
    }

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
    if (!Array.isArray(value)) {
        throw new SavedBuildApiError(
            "保存構成一覧のレスポンスを解釈できませんでした",
        )
    }

    return value.map(parseSavedBuild)
}

// ログインユーザーの保存構成一覧を更新日時順で取得
export async function fetchSavedBuilds(
    signal?: AbortSignal,
): Promise<SavedBuild[]> {
    const response = await fetch("/api/builds", {
        credentials: "same-origin",
        signal,
        headers: {Accept: "application/json"},
    })

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
    // D1の保存APIはCookie認証に加えてCSRFトークンを要求する
    const csrfToken = await fetchCsrfToken()
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

    if (!response.ok) {
        return throwApiError(response, "構成の削除に失敗しました")
    }
}

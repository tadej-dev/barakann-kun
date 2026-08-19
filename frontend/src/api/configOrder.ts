import {fetchCsrfToken} from "@/features/auth/authApi"
import {isRecord} from "@/api/responseValidation"

// 構成表示順APIのエラー
export class ConfigOrderApiError extends Error {
    readonly code: string | null

    constructor(message: string, code: string | null = null) {
        super(message)
        this.name = "ConfigOrderApiError"
        this.code = code
    }
}

type ApiErrorPayload = {
    error?: {
        code?: unknown
        message?: unknown
    }
}

type ConfigOrderPayload = {
    items?: unknown
}

const MIN_CONFIG_ORDER_ITEMS = 4
const MAX_CONFIG_ORDER_ITEMS = 24
const MAX_CONFIG_ORDER_ITEM_LENGTH = 200

// 構成キーは空文字や巨大な値を受け付けず、画面で扱える文字列に限定する。
function isConfigOrderItem(value: unknown): value is string {
    return typeof value === "string" &&
        value.length > 0 &&
        value.length <= MAX_CONFIG_ORDER_ITEM_LENGTH
}

// 表示順の件数は固定4枠を下限、保存可能な追加構成を含む24件を上限とする。
function hasValidConfigOrderLength(items: unknown[]): boolean {
    return items.length >= MIN_CONFIG_ORDER_ITEMS &&
        items.length <= MAX_CONFIG_ORDER_ITEMS
}

// 同じキーが複数あるとSortableの描画対象を一意に特定できないため、重複を拒否する。
function hasUniqueConfigOrderItems(items: string[]): boolean {
    return new Set(items).size === items.length
}

// APIのitemsを検証し、検証後は呼び出し元がstring[]として利用できるようにする。
function isValidConfigOrderItems(value: unknown): value is string[] {
    if (!Array.isArray(value) || !hasValidConfigOrderLength(value)) {
        return false
    }

    if (!value.every(isConfigOrderItem)) {
        return false
    }

    return hasUniqueConfigOrderItems(value)
}

// APIエラーを画面表示用の例外へ変換
async function throwApiError(
    response: Response,
    fallbackMessage: string,
): Promise<never> {
    // APIのJSONが不正でも、画面に生のレスポンスを流さず既定メッセージへ戻す。
    let message = fallbackMessage
    let code: string | null = null

    try {
        const payload = await response.json() as ApiErrorPayload

        if (typeof payload.error?.message === "string") {
            message = payload.error.message
        }

        if (typeof payload.error?.code === "string") {
            code = payload.error.code
        }
    } catch {
        // JSON形式でないエラーは既定メッセージを使う
    }

    throw new ConfigOrderApiError(message, code)
}

// APIレスポンスの配列を検証し、予期しない値を画面へ流さない
function parseConfigOrder(value: unknown): string[] {
    // 構成IDと追加構成IDを混在させた順序を、UIがそのまま描画できる配列へ検証する。
    if (!isRecord(value)) {
        throw new ConfigOrderApiError(
            "構成の並び順レスポンスを解釈できませんでした",
        )
    }

    const record = value as ConfigOrderPayload

    if (!isValidConfigOrderItems(record.items)) {
        throw new ConfigOrderApiError(
            "構成の並び順レスポンスを解釈できませんでした",
        )
    }

    return record.items
}

// ログインユーザーの構成表示順を取得
export async function fetchConfigOrder(
    signal?: AbortSignal,
): Promise<string[]> {
    // 表示順はユーザー単位のセッションから取得し、配列の重複・件数を検証する。
    const response = await fetch("/api/config-order", {
        credentials: "same-origin",
        signal,
        headers: {Accept: "application/json"},
    })

    if (!response.ok) {
        // マイグレーション未適用時も呼び出し元で再試行表示できるよう、コードを保持する。
        return throwApiError(response, "構成の並び順の取得に失敗しました")
    }

    return parseConfigOrder(await response.json())
}

// 構成表示順をD1へ保存
export async function saveConfigOrder(
    items: string[],
): Promise<string[]> {
    // 保存前にCSRFを取得し、並び順変更も認証済みセッションの操作として送信する。
    const csrfToken = await fetchCsrfToken()
    const response = await fetch("/api/config-order", {
        method: "PUT",
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({items, csrfToken}),
    })

    if (!response.ok) {
        return throwApiError(response, "構成の並び順の保存に失敗しました")
    }

    return parseConfigOrder(await response.json())
}

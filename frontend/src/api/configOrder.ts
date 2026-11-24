import {fetchCsrfToken} from "@/features/auth/authApi"
import {isRecord} from "@/api/responseValidation"

// 構成表示順APIのエラー
export class ConfigOrderApiError extends Error {
    // APIが返すエラーコード。未設定はnull
    readonly code: string | null

    // 構成表示順APIのエラーをメッセージとコード付きで生成
    constructor(message: string, code: string | null = null) {
        super(message)
        this.name = "ConfigOrderApiError"
        this.code = code
    }
}

// 構成表示順APIのエラー本文
type ApiErrorPayload = {
    error?: {
        code?: unknown
        message?: unknown
    }
}

// 構成表示順APIのレスポンス本文
type ConfigOrderPayload = {
    items?: unknown
}

// 構成表示順の最小件数（1件）
const MIN_CONFIG_ORDER_ITEMS = 1
// 構成表示順の最大件数（20件）
export const MAX_CONFIG_ORDER_ITEMS = 20
// 構成キー1件あたりの最大文字数（200文字）
export const MAX_CONFIG_ORDER_ITEM_LENGTH = 200

// 構成キーは空文字や巨大な値を受け付けず、画面で扱える文字列に限定
function isConfigOrderItem(value: unknown): value is string {
    return typeof value === "string" &&
        value.length > 0 &&
        value.length <= MAX_CONFIG_ORDER_ITEM_LENGTH
}

// 構成キーの件数が1件以上20件以下か判定
function hasValidConfigOrderLength(items: unknown[]): boolean {
    return items.length >= MIN_CONFIG_ORDER_ITEMS &&
        items.length <= MAX_CONFIG_ORDER_ITEMS
}

// 同じキーが複数あるとSortableの描画対象を一意に特定できないため、重複を拒否
function hasUniqueConfigOrderItems(items: string[]): boolean {
    return new Set(items).size === items.length
}

// APIのitemsを検証し、検証後は呼び出し元がstring[]として利用できる
function isValidConfigOrderItems(value: unknown): value is string[] {
    // 配列でない、または件数が範囲外の場合は不正
    if (!Array.isArray(value) || !hasValidConfigOrderLength(value)) {
        return false
    }

    // 文字列以外や長さ超過の構成キーが含まれる場合は不正
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
    // APIのJSONが不正でも、画面に生のレスポンスを流さず既定メッセージへ戻す
    let message = fallbackMessage
    let code: string | null = null

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
    } catch {
        // JSON形式でないエラーは既定メッセージを使う
    }

    throw new ConfigOrderApiError(message, code)
}

// 構成キーの配列を検証し、予期しない値を画面へ流さない
function parseConfigOrder(value: unknown): string[] {
    // 構成IDと追加構成IDを混在させた順序を、UIが描画できる配列へ検証
    if (!isRecord(value)) {
        throw new ConfigOrderApiError(
            "構成の並び順レスポンスを解釈できませんでした",
        )
    }

    const record = value as ConfigOrderPayload

    // itemsが構成キーの配列でない場合はエラー
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
    // 表示順はユーザー単位のセッションから取得し、配列の重複・件数を検証
    const response = await fetch("/api/config-order", {
        credentials: "same-origin",
        signal,
        headers: {Accept: "application/json"},
    })

    // マイグレーション未適用時も呼び出し元で再試行表示できるよう、コードを保持
    if (!response.ok) {
        return throwApiError(response, "構成の並び順の取得に失敗しました")
    }

    return parseConfigOrder(await response.json())
}

// 構成表示順をD1へ保存
export async function saveConfigOrder(
    items: string[],
): Promise<string[]> {
    // 保存前にCSRFを取得し、並び順変更も認証済みセッションの操作として送信
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

    // 保存に失敗した場合はAPIエラー本文のコードを保持して例外化
    if (!response.ok) {
        return throwApiError(response, "構成の並び順の保存に失敗しました")
    }

    return parseConfigOrder(await response.json())
}

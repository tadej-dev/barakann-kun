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

// APIエラーを画面表示用の例外へ変換
async function throwApiError(
    response: Response,
    fallbackMessage: string,
): Promise<never> {
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
    if (!isRecord(value)) {
        throw new ConfigOrderApiError(
            "構成の並び順レスポンスを解釈できませんでした",
        )
    }

    const record = value as ConfigOrderPayload

    if (
        !Array.isArray(record.items) ||
        record.items.length < 4 ||
        record.items.length > 24 ||
        !record.items.every((item) =>
            typeof item === "string" &&
            item.length > 0 &&
            item.length <= 200,
        ) ||
        new Set(record.items).size !== record.items.length
    ) {
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
    const response = await fetch("/api/config-order", {
        credentials: "same-origin",
        signal,
        headers: {Accept: "application/json"},
    })

    if (!response.ok) {
        return throwApiError(response, "構成の並び順の取得に失敗しました")
    }

    return parseConfigOrder(await response.json())
}

// 構成表示順をD1へ保存
export async function saveConfigOrder(
    items: string[],
): Promise<string[]> {
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

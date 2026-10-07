import {fetchCsrfToken} from "@/features/auth/authApi"
import type {
    SavedBuildPart,
    SavedBuildPartInput,
} from "@/api/savedBuilds"
import {
    CONFIG_IDS,
    type ConfigId,
} from "@/features/simulator/simulatorTypes"
import {
    isNonNegativeFiniteNumber,
    isNonNegativeSafeInteger,
    isPartSlotKey,
    isPositiveSafeInteger,
} from "@/api/responseValidation"

const MAX_PARTS_PER_CONFIG_SLOT = 100

// APIから受け取るパーツ数の上限を、異常に大きいレスポンスで画面が固まらないようにする。

// D1へ同期する構成1〜4のスロット
export type ConfigSlot = {
    configId: ConfigId
    name: string
    version: number
    updatedAt: string | null
    shareToken: string | null
    parts: SavedBuildPart[]
}

type ApiErrorPayload = {
    error?: {
        code?: unknown
        message?: unknown
        partIds?: unknown
    }
}

// 固定構成APIのエラーを呼び出し側で判定できる形へ変換
export class ConfigSlotApiError extends Error {
    readonly code: string | null
    readonly partIds: number[]

    constructor(
        message: string,
        code: string | null = null,
        partIds: number[] = [],
    ) {
        super(message)
        this.name = "ConfigSlotApiError"
        this.code = code
        this.partIds = partIds
    }
}

// 固定構成APIのエラー本文を読み取り、画面表示用の例外へ変換
async function throwApiError(
    response: Response,
    fallbackMessage: string,
): Promise<never> {
    // サーバーのエラー形式が崩れていても、呼び出し元へは共通の例外型で返す。
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
                (partId) => isPositiveSafeInteger(partId),
            )
        ) {
            partIds = payload.error.partIds as number[]
        }
    } catch {
        // JSON形式でないエラーは呼び出し元の既定メッセージを使う
    }

    throw new ConfigSlotApiError(message, code, partIds)
}

// APIレスポンスの構造を検証し、予期しないJSONを画面へ流さない
function parseConfigSlot(value: unknown): ConfigSlot {
    if (typeof value !== "object" || value === null) {
        throw new ConfigSlotApiError(
            "構成スロットのレスポンスを解釈できませんでした",
        )
    }

    const record = value as Record<string, unknown>
    const parts = record.parts
    const shareToken = record.shareToken ?? null

    if (
        typeof record.configId !== "string" ||
        !CONFIG_IDS.includes(record.configId as ConfigId) ||
        typeof record.name !== "string" ||
        record.name.length === 0 ||
        record.name.length > 50 ||
        !isNonNegativeSafeInteger(record.version) ||
        (record.updatedAt !== null && typeof record.updatedAt !== "string") ||
        (typeof record.updatedAt === "string" &&
            (record.updatedAt.length === 0 || record.updatedAt.length > 64)) ||
        (shareToken !== null && (
            typeof shareToken !== "string" ||
            !/^[a-f0-9]{32}$/.test(shareToken)
        )) ||
        !Array.isArray(parts) ||
        parts.length > MAX_PARTS_PER_CONFIG_SLOT
    ) {
        // name・version・日時・partsを同時に検査し、部分的に正しい構成を受け付けない。
        throw new ConfigSlotApiError(
            "構成スロットのレスポンスを解釈できませんでした",
        )
    }

    const parsedParts = parts.flatMap((part) => {
        // 不正な要素を黙って捨てず、後段の件数比較でレスポンス全体を拒否する。
        if (typeof part !== "object" || part === null) {
            return []
        }

        const partRecord = part as Record<string, unknown>

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

    if (
        parsedParts.length !== parts.length ||
        new Set(parsedParts.map((part) => part.slotKey)).size !== parsedParts.length
    ) {
        // 同じスロットが複数返った場合も状態を一意に復元できないため拒否する。
        throw new ConfigSlotApiError(
            "構成スロットのパーツ情報を解釈できませんでした",
        )
    }

    return {
        configId: record.configId as ConfigId,
        name: record.name,
        version: record.version,
        updatedAt: record.updatedAt,
        shareToken,
        parts: parsedParts,
    }
}

// 構成1〜4の一覧レスポンスを検証
function parseConfigSlotList(value: unknown): ConfigSlot[] {
    // 固定枠は必ず4件必要なので、件数とconfigIdの重複を先に確認する。
    if (!Array.isArray(value)) {
        throw new ConfigSlotApiError(
            "構成スロット一覧のレスポンスを解釈できませんでした",
        )
    }

    const slots = value.map(parseConfigSlot)

    if (
        slots.length !== CONFIG_IDS.length ||
        new Set(slots.map((slot) => slot.configId)).size !== slots.length
    ) {
        throw new ConfigSlotApiError(
            "構成スロット一覧のレスポンスを解釈できませんでした",
        )
    }

    return CONFIG_IDS.map((configId) => {
        const slot = slots.find((candidate) => candidate.configId === configId)

        if (!slot) {
            // 並び順に依存せず、固定ID順の配列へ正規化する。
            throw new ConfigSlotApiError(
                "構成スロット一覧に不足している構成があります",
            )
        }

        return slot
    })
}

// ログインユーザーの構成1〜4を取得
export async function fetchConfigSlots(
    signal?: AbortSignal,
): Promise<ConfigSlot[]> {
    // 固定構成はログインユーザーのCookieに紐づくため、IDをURLから受け取らない。
    const response = await fetch("/api/config-slots", {
        credentials: "same-origin",
        signal,
        headers: {Accept: "application/json"},
    })

    if (!response.ok) {
        // 競合・マイグレーション未適用などを、画面側が再試行できるコード付き例外へ変換する。
        return throwApiError(response, "構成の取得に失敗しました")
    }

    return parseConfigSlotList(await response.json())
}

// 構成名をD1へ保存
export async function renameConfigSlot(
    configId: ConfigId,
    version: number,
    name: string,
): Promise<ConfigSlot> {
    // 名称変更もversion付きで送り、別端末の更新を誤って上書きしない。
    const csrfToken = await fetchCsrfToken()
    const response = await fetch(
        `/api/config-slots/${encodeURIComponent(configId)}`,
        {
            method: "PATCH",
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({name, version, csrfToken}),
        },
    )

    if (!response.ok) {
        return throwApiError(response, "構成名の変更に失敗しました")
    }

    return parseConfigSlot(await response.json())
}

// 現在の選択パーツと名前をD1へ保存・上書き
export async function saveConfigSlot(
    configId: ConfigId,
    version: number,
    name: string,
    parts: SavedBuildPartInput[],
): Promise<ConfigSlot> {
    // パーツ一覧と名称を同じversionで更新し、保存後のスナップショットを返す。
    const csrfToken = await fetchCsrfToken()
    const response = await fetch(
        `/api/config-slots/${encodeURIComponent(configId)}`,
        {
            method: "PUT",
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({name, version, parts, csrfToken}),
        },
    )

    if (!response.ok) {
        return throwApiError(response, "構成の保存に失敗しました")
    }

    return parseConfigSlot(await response.json())
}

// D1上の選択パーツを空にし、構成名を残す
export async function clearConfigSlot(
    configId: ConfigId,
    version: number,
): Promise<ConfigSlot> {
    // 削除では枠自体を消さず、選択パーツだけを空にする。
    const csrfToken = await fetchCsrfToken()
    const response = await fetch(
        `/api/config-slots/${encodeURIComponent(configId)}`,
        {
            method: "DELETE",
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({version, csrfToken}),
        },
    )

    if (!response.ok) {
        return throwApiError(response, "構成のクリアに失敗しました")
    }

    return parseConfigSlot(await response.json())
}

// 固定構成の公開URLを発行または無効化
export async function updateConfigSlotSharing(
    configId: ConfigId,
    version: number,
    enabled: boolean,
): Promise<ConfigSlot> {
    const csrfToken = await fetchCsrfToken()
    const response = await fetch(
        `/api/config-slots/${encodeURIComponent(configId)}/sharing`,
        {
            method: "PATCH",
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({version, enabled, csrfToken}),
        },
    )

    if (!response.ok) {
        return throwApiError(response, "構成の共有設定に失敗しました")
    }

    return parseConfigSlot(await response.json())
}

// APIレスポンスの基本的な値を検証する共通ガード
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isPositiveSafeInteger(value: unknown): value is number {
    return typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value > 0
}

export function isNonNegativeSafeInteger(value: unknown): value is number {
    return typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value >= 0
}

export function isNonNegativeFiniteNumber(value: unknown): value is number {
    return typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
}

export function isOptionalNullableString(
    value: unknown,
): value is string | null | undefined {
    return value === undefined || value === null || typeof value === "string"
}

// 保存構成APIで共有するパーツスロットキーの形式
export function isPartSlotKey(value: unknown): value is string {
    return typeof value === "string" &&
        value.length > 0 &&
        value.length <= 100 &&
        /^[a-z][a-z0-9_-]*(:(front|rear))?$/.test(value)
}

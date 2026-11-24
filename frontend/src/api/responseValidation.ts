// APIレスポンスの基本的な値を検証する共通ガード
// 配列やnullを除いたオブジェクトだけを、レスポンスのフィールド検査へ渡す
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

// IDなど、正の安全な整数として扱える値だけを許可
export function isPositiveSafeInteger(value: unknown): value is number {
    return typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value > 0
}

// 数量・versionなど、0を許容する安全な整数の検査に使う
export function isNonNegativeSafeInteger(value: unknown): value is number {
    return typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value >= 0
}

// 重量・価格にNaNやInfinity、負数を混入させない
export function isNonNegativeFiniteNumber(value: unknown): value is number {
    return typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
}

// APIで省略・nullを許す文字列を、画面側で安全に扱える型へ絞る
export function isOptionalNullableString(
    value: unknown,
): value is string | null | undefined {
    return value === undefined || value === null || typeof value === "string"
}

// モデルイヤーなど、省略・nullを許す年号を安全な整数へ絞る
export function isOptionalNullableSafeInteger(
    value: unknown,
): value is number | null | undefined {
    return value === undefined || value === null ||
        (typeof value === "number" &&
            Number.isSafeInteger(value) &&
            value >= 0)
}

// 保存構成APIで共有するパーツスロットキーの形式
// 保存構成の入力に任意のキーを混ぜず、既知のスロット形式だけを受け付ける
export function isPartSlotKey(value: unknown): value is string {
    return typeof value === "string" &&
        value.length > 0 &&
        value.length <= 100 &&
        /^[a-z][a-z0-9_-]*(:(front|rear))?$/.test(value)
}

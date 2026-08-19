// APIレスポンスの基本的な値を検証する共通ガード
export function isRecord(value: unknown): value is Record<string, unknown> {
    // 配列やnullを除いたオブジェクトだけを、レスポンスのフィールド検査へ渡す。
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isPositiveSafeInteger(value: unknown): value is number {
    // IDなど、正の安全な整数として扱える値だけを許可する。
    return typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value > 0
}

export function isNonNegativeSafeInteger(value: unknown): value is number {
    // 数量・versionなど、0を許容する安全な整数の検査に使う。
    return typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value >= 0
}

export function isNonNegativeFiniteNumber(value: unknown): value is number {
    // 重量・価格にNaNやInfinity、負数を混入させない。
    return typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
}

export function isOptionalNullableString(
    value: unknown,
): value is string | null | undefined {
    // APIで省略・nullを許す文字列を、画面側で安全に扱える型へ絞る。
    return value === undefined || value === null || typeof value === "string"
}

// 保存構成APIで共有するパーツスロットキーの形式
export function isPartSlotKey(value: unknown): value is string {
    // 保存構成の入力に任意のキーを混ぜず、既知のスロット形式だけを受け付ける。
    return typeof value === "string" &&
        value.length > 0 &&
        value.length <= 100 &&
        /^[a-z][a-z0-9_-]*(:(front|rear))?$/.test(value)
}

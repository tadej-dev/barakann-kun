// 表示名の上限(users.display_nameのCHECK制約と同じ)
export const MAX_DISPLAY_NAME_LENGTH = 100

// 新しく登録したユーザーの仮の表示名
// Googleの名前は受け取らないため、利用者が変更するまで仮の表示名を使う
export const DEFAULT_DISPLAY_NAME = "ユーザー"

// 利用者が入力した表示名を保存できる形に整える
// 文字列以外・前後の空白を除いて空・上限超過はnull
// 文字数はDBのlength()と同じ数え方
export function normalizeDisplayName(value: unknown): string | null {
    // 文字列以外は表示名として保存できないためnull
    if (typeof value !== "string") {
        return null
    }

    // 前後の空白を除いた表示名
    const trimmed = value.trim()
    // 表示名の文字数（DBのlength()と同じ数え方）
    const length = Array.from(trimmed).length

    // 空文字と上限超過は保存できないためnull
    if (length === 0 || length > MAX_DISPLAY_NAME_LENGTH) {
        return null
    }

    return trimmed
}

// 表示名の上限(users.display_nameのCHECK制約と同じ)
export const MAX_DISPLAY_NAME_LENGTH = 100

// 新しく登録したユーザーの仮の表示名
// Googleの名前は受け取らないため、利用者が自分で変更するまでこの名前を使う。
export const DEFAULT_DISPLAY_NAME = "ユーザー"

// 利用者が入力した表示名を、保存できる形に整える
// 前後の空白を除き、空または上限を超える場合はnullを返す。
// 文字数は絵文字なども1文字として数える(DBのlength()と同じ数え方)。
export function normalizeDisplayName(value: unknown): string | null {
    if (typeof value !== "string") {
        return null
    }

    const trimmed = value.trim()
    const length = Array.from(trimmed).length

    if (length === 0 || length > MAX_DISPLAY_NAME_LENGTH) {
        return null
    }

    return trimmed
}

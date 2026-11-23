import {z} from "zod"

// URLパラメーターとして許可するカテゴリーキー
const categorySchema = z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z][a-z0-9_]*$/)

// URLパラメーターとして許可するパーツID
const partIdSchema = z
    .string()
    .regex(/^[1-9][0-9]*$/)
    // クエリ文字列を数値へ変換してから安全な整数か確認
    .transform(Number)
    .refine(Number.isSafeInteger)

// 一度に取得できるパーツID一覧（1〜100件）
const partIdsSchema = z.array(partIdSchema).min(1).max(100)

// categoryクエリの検証
export function parseCategory(value: string | undefined) {
    // DBのカテゴリーキーと同じ半角英小文字で始まる英小文字・数字・アンダースコア形式に限定
    return categorySchema.safeParse(value)
}

// idsクエリの検証と重複IDの除去
export function parsePartIds(values: string[] | undefined) {
    // 同じパーツを重複取得しないよう検証後のIDを集合へまとめる
    return partIdsSchema
        .transform((ids) => Array.from(new Set(ids)))
        .safeParse(values)
}

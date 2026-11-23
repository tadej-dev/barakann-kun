import {z} from "zod"

// 保存構成IDに使うUUID形式
const savedBuildIdSchema = z.string().uuid()

// 構成名に許可する文字数（前後空白を除いて1〜50文字）
const savedBuildNameSchema = z.string().trim().min(1).max(50)

// UI上のパーツスロット名とパーツID
const savedBuildPartSchema = z.object({
    slotKey: z
        .string()
        .trim()
        .min(1)
        .max(100)
        // 前後位置付きスロットは「tire:front」「tire:rear」形式のキーを使用
        .regex(/^[a-z][a-z0-9_-]*(:(front|rear))?$/),
    // D1へ渡す前に正の安全な整数へ限定
    partId: z.number().int().positive().safe(),
})

// 一度の保存で扱えるスロット数（最大100件）と重複スロットを検証
const savedBuildPartsSchema = z
    .array(savedBuildPartSchema)
    .max(100)
    .superRefine((parts, context) => {
        // 1つのスロットに複数パーツが保存されないよう重複を確認
        const slotKeys = new Set<string>()

        for (const [index, part] of parts.entries()) {
            // 同一のスロットキーが2回目以降に現れた場合の重複エラー
            if (slotKeys.has(part.slotKey)) {
                context.addIssue({
                    code: "custom",
                    path: [index, "slotKey"],
                    message: "slotKeyは重複できません",
                })
            }

            slotKeys.add(part.slotKey)
        }
    })

// 保存構成の共通入力（名前・パーツ）
const savedBuildPayloadSchema = z.object({
    name: savedBuildNameSchema,
    parts: savedBuildPartsSchema,
})

// 保存構成の新規作成リクエストを検証
export function parseCreateSavedBuildPayload(value: unknown) {
    // 新規作成のversionはサーバー側で1に割り当てるため本文には要求しない
    return savedBuildPayloadSchema.safeParse(value)
}

// 保存構成の更新リクエストを検証
export function parseUpdateSavedBuildPayload(value: unknown) {
    // 更新では現在の正のversionを必須にして競合検出へ使用
    return savedBuildPayloadSchema.extend({
        version: z.number().int().positive().safe(),
    }).safeParse(value)
}

// 保存構成の名称変更リクエストを検証
export function parseRenameSavedBuildPayload(value: unknown) {
    // 名前だけの変更でもversionを要求して競合検出へ使用
    return z.object({
        name: savedBuildNameSchema,
        version: z.number().int().positive().safe(),
    }).safeParse(value)
}

// 保存構成の削除リクエストを検証
export function parseDeleteSavedBuildPayload(value: unknown) {
    // 削除対象の世代を必須にして古い画面からの削除を防ぐ
    return z.object({
        version: z.number().int().positive().safe(),
    }).safeParse(value)
}

// URLパラメーターの保存構成IDを検証
export function parseSavedBuildId(value: string) {
    // 公開IDとして使用しているUUID形式だけを受け付ける
    return savedBuildIdSchema.safeParse(value)
}

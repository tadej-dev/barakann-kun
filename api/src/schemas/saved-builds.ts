import {z} from "zod"

// D1で生成する保存構成IDの形式
const savedBuildIdSchema = z.string().uuid()

// 構成名に許可する文字数
const savedBuildNameSchema = z.string().trim().min(1).max(100)

// UI上のパーツスロット名とパーツID
const savedBuildPartSchema = z.object({
    slotKey: z
        .string()
        .trim()
        .min(1)
        .max(100)
        // 前後スロットは「tire:front」のように内部キーをそのまま保存する
        .regex(/^[a-z][a-z0-9_-]*(:(front|rear))?$/),
    partId: z.number().int().positive().safe(),
})

// 一度の保存で扱えるスロット数と重複スロットを検証
const savedBuildPartsSchema = z
    .array(savedBuildPartSchema)
    .max(100)
    .superRefine((parts, context) => {
        const slotKeys = new Set<string>()

        for (const [index, part] of parts.entries()) {
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

const savedBuildPayloadSchema = z.object({
    name: savedBuildNameSchema,
    parts: savedBuildPartsSchema,
})

// 保存構成の新規作成リクエストを検証
export function parseCreateSavedBuildPayload(value: unknown) {
    return savedBuildPayloadSchema.safeParse(value)
}

// 保存構成の更新リクエストを検証
export function parseUpdateSavedBuildPayload(value: unknown) {
    return savedBuildPayloadSchema.extend({
        version: z.number().int().positive().safe(),
    }).safeParse(value)
}

// 保存構成の削除リクエストを検証
export function parseDeleteSavedBuildPayload(value: unknown) {
    return z.object({
        version: z.number().int().positive().safe(),
    }).safeParse(value)
}

// URLパラメーターの保存構成IDを検証
export function parseSavedBuildId(value: string) {
    return savedBuildIdSchema.safeParse(value)
}

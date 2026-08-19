import {z} from "zod"

// 構成1〜4に対応する固定スロットID
const configSlotIdSchema = z.enum(["1", "2", "3", "4"])

// 構成名に許可する文字数
const configSlotNameSchema = z.string().trim().min(1).max(50)

// 構成内のパーツスロットとパーツID
const configSlotPartSchema = z.object({
    slotKey: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .regex(/^[a-z][a-z0-9_-]*(:(front|rear))?$/),
    // D1へ渡す前に正の安全な整数へ限定する
    partId: z.number().int().positive().safe(),
})

// 重複スロットを含む不正な構成を受け付けない
const configSlotPartsSchema = z
    .array(configSlotPartSchema)
    .max(100)
    .superRefine((parts, context) => {
        // 1つのスロットに複数パーツが保存されないよう重複を確認する
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

// 構成IDのURLパラメーターを検証
export function parseConfigSlotId(value: string) {
    // 任意文字列を固定スロットの1から4だけに絞り込む
    return configSlotIdSchema.safeParse(value)
}

// 未保存スロットはversion 0として扱う
const configSlotVersionSchema = z.number().int().nonnegative().safe()

// 構成名の変更リクエストを検証
export function parseRenameConfigSlotPayload(value: unknown) {
    // 未保存を示すversion 0も名前変更の初回保存として許可する
    return z.object({
        name: configSlotNameSchema,
        version: configSlotVersionSchema,
    }).safeParse(value)
}

// 構成名と選択パーツの保存リクエストを検証
export function parseSaveConfigSlotPayload(value: unknown) {
    // 名前と世代とパーツをまとめて検証して部分的な解釈を防ぐ
    return z.object({
        name: configSlotNameSchema,
        version: configSlotVersionSchema,
        parts: configSlotPartsSchema,
    }).safeParse(value)
}

// 構成クリアのリクエストを検証
export function parseClearConfigSlotPayload(value: unknown) {
    // クリア時にも世代を要求して古い画面からの操作を検出する
    return z.object({
        version: configSlotVersionSchema,
    }).safeParse(value)
}

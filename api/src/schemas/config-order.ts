import {z} from "zod"

// 固定構成と追加構成の表示順を検証
const configOrderItemsSchema = z
    .array(z.string().trim().min(1).max(200))
    .min(4)
    .max(24)
    .superRefine((items, context) => {
        // 同じ構成キーが複数含まれていないか集合を使って確認する
        const seen = new Set<string>()

        for (const [index, item] of items.entries()) {
            if (seen.has(item)) {
                context.addIssue({
                    code: "custom",
                    path: [index],
                    message: "構成の並び順に重複があります",
                })
            }

            seen.add(item)
        }
    })

// 構成表示順の保存リクエストを検証
export function parseConfigOrderPayload(value: unknown) {
    // 例外を投げずルート側で400応答へ変換できる結果を返す
    return z.object({
        items: configOrderItemsSchema,
    }).safeParse(value)
}

import {z} from "zod"

// 表示順に使う構成キーの配列（1〜20件・各1〜200文字・重複なし）
const configOrderItemsSchema = z
    .array(z.string().trim().min(1).max(200))
    .min(1)
    .max(20)
    .superRefine((items, context) => {
        // 同じ構成キーが複数含まれていないか集合を使って確認
        const seen = new Set<string>()

        for (const [index, item] of items.entries()) {
            // 同一の構成キーが2回目以降に現れた場合の重複エラー
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

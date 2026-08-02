import {Hono} from "hono"

import type {AppEnv} from "../app-env"
import {parseCategory, parsePartIds} from "../schemas/parts"

// パーツ一覧・詳細取得API
export const partsRoute = new Hono<AppEnv>()

partsRoute.get("/by-ids", async (context) => {
    // 複数クエリパラメーターを配列として受け取り、形式を検証
    const parsedIds = parsePartIds(context.req.queries("ids"))

    if (!parsedIds.success) {
        // 不正なIDをデータベースへ渡さないための早期応答
        return context.json(
            {
                error: {
                    code: "INVALID_PART_IDS",
                    message: "idsは1件以上100件以下の正の整数で指定してください",
                },
            },
            400,
        )
    }

    // 検証済みのIDに対応するパーツを取得
    const parts = await context.var.catalogRepository.findPartsByIds(
        parsedIds.data,
    )

    return context.json(parts)
})

partsRoute.get("/", async (context) => {
    // categoryクエリの形式を検証
    const parsedCategory = parseCategory(context.req.query("category"))

    if (!parsedCategory.success) {
        // 不正なカテゴリーをデータベースへ渡さないための早期応答
        return context.json(
            {
                error: {
                    code: "INVALID_CATEGORY",
                    message: "categoryを半角英小文字と数字、アンダースコアで指定してください",
                },
            },
            400,
        )
    }

    // 検証済みのカテゴリーに属するパーツを取得
    const parts = await context.var.catalogRepository.findPartsByCategory(
        parsedCategory.data,
    )

    return context.json(parts)
})

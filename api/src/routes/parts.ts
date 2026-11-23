import {Hono} from "hono"

import type {AppEnv} from "../app-env"
import {parseCategory, parsePartIds} from "../schemas/parts"

// パーツ一覧とID指定取得API
export const partsRoute = new Hono<AppEnv>()

// 複数パーツIDの一括取得
partsRoute.get("/by-ids", async (context) => {
    // 保存構成の復元など複数の既知IDをまとめて取得する入口
    // 複数クエリパラメーターを配列として受け取り、形式を検証
    const parsedIds = parsePartIds(context.req.queries("ids"))

    // 不正なIDをデータベースへ渡さないための早期応答
    if (!parsedIds.success) {
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

// カテゴリー別パーツ一覧の取得
partsRoute.get("/", async (context) => {
    // シミュレーターの候補表示用にカテゴリー単位で取得する入口
    // categoryクエリの形式を検証
    const parsedCategory = parseCategory(context.req.query("category"))

    // 不正なカテゴリーをデータベースへ渡さないための早期応答
    if (!parsedCategory.success) {
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

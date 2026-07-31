import {Hono} from "hono"

import type {AppEnv} from "../app-env"
import {parseCategory, parsePartIds} from "../schemas/parts"

export const partsRoute = new Hono<AppEnv>()

partsRoute.get("/by-ids", async (context) => {
    const parsedIds = parsePartIds(context.req.queries("ids"))

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

    const parts = await context.var.catalogRepository.findPartsByIds(
        parsedIds.data,
    )

    return context.json(parts)
})

partsRoute.get("/", async (context) => {
    const parsedCategory = parseCategory(context.req.query("category"))

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

    const parts = await context.var.catalogRepository.findPartsByCategory(
        parsedCategory.data,
    )

    return context.json(parts)
})

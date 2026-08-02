import {Hono} from "hono"

import type {AppEnv} from "../app-env"

// カテゴリー一覧API
export const categoriesRoute = new Hono<AppEnv>()

categoriesRoute.get("/", async (context) => {
    // Contextに登録されたリポジトリからカテゴリーを取得
    const categories = await context.var.catalogRepository.findCategories()

    return context.json(categories)
})

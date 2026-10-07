import {Hono} from "hono"

import type {AppEnv} from "../app-env"

// カテゴリー一覧API
export const categoriesRoute = new Hono<AppEnv>()

categoriesRoute.get("/", async (context) => {
    // Contextに登録されたリポジトリからカテゴリーを取得
    const categories = await context.var.catalogRepository.findCategories()

    // 公開マスターデータとして認証情報を含めず一覧だけを返す
    return context.json(categories)
})

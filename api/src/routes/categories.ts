import {Hono} from "hono"

import type {AppEnv} from "../app-env"

export const categoriesRoute = new Hono<AppEnv>()

categoriesRoute.get("/", async (context) => {
    const categories = await context.var.catalogRepository.findCategories()

    return context.json(categories)
})

import {Hono} from "hono"
import {secureHeaders} from "hono/secure-headers"

import type {AppEnv} from "./app-env"
import type {CatalogRepository} from "./db/catalog-repository"
import {D1CatalogRepository} from "./db/d1-catalog-repository"
import {categoriesRoute} from "./routes/categories"
import {partsRoute} from "./routes/parts"

type AppDependencies = {
    catalogRepository?: CatalogRepository
}

export function createApp(dependencies: AppDependencies = {}) {
    const app = new Hono<AppEnv>()

    app.use("*", secureHeaders())
    app.use("/api/*", async (context, next) => {
        const repository = dependencies.catalogRepository
            ?? new D1CatalogRepository(context.env.DB)

        context.set("catalogRepository", repository)
        await next()
    })

    app.get("/api/health", (context) => context.json({status: "ok"}))
    app.route("/api/categories", categoriesRoute)
    app.route("/api/parts", partsRoute)

    app.notFound((context) => context.json(
        {
            error: {
                code: "NOT_FOUND",
                message: "指定されたAPIが見つかりません",
            },
        },
        404,
    ))

    app.onError((error, context) => {
        console.error("Unhandled API error", error)

        return context.json(
            {
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "サーバーでエラーが発生しました",
                },
            },
            500,
        )
    })

    return app
}

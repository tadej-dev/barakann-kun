import {Hono} from "hono"
import {secureHeaders} from "hono/secure-headers"

import type {AppEnv} from "./app-env"
import type {CatalogRepository} from "./db/catalog-repository"
import {D1CatalogRepository} from "./db/d1-catalog-repository"
import {categoriesRoute} from "./routes/categories"
import {partsRoute} from "./routes/parts"

// テスト時に差し替え可能なアプリケーション依存関係
type AppDependencies = {
    catalogRepository?: CatalogRepository
}

// Honoアプリケーションの生成
export function createApp(dependencies: AppDependencies = {}) {
    const app = new Hono<AppEnv>()

    // APIと静的アセットに共通するセキュリティヘッダー
    app.use("*", secureHeaders())

    // APIリクエストごとにカタログリポジトリをContextへ登録
    app.use("/api/*", async (context, next) => {
        const repository = dependencies.catalogRepository
            ?? new D1CatalogRepository(context.env.DB)

        context.set("catalogRepository", repository)
        await next()
    })

    // カタログAPIのルート登録
    app.get("/api/health", (context) => context.json({status: "ok"}))
    app.route("/api/categories", categoriesRoute)
    app.route("/api/parts", partsRoute)

    // 未定義のAPIパスに対するJSON応答
    app.notFound((context) => context.json(
        {
            error: {
                code: "NOT_FOUND",
                message: "指定されたAPIが見つかりません",
            },
        },
        404,
    ))

    // 予期しない例外に対する共通エラー応答
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

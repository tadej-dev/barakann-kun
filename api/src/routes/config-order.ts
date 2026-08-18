import {Hono} from "hono"

import {
    getUserId,
    hasValidCsrfToken,
    invalidCsrf,
    readJson,
    unauthenticated,
    type ApiRouteContext,
} from "./route-helpers"
import type {AppEnv} from "../app-env"
import {
    ConfigOrderMigrationRequiredError,
    InvalidConfigOrderError,
} from "../db/config-order-repository"
import {parseConfigOrderPayload} from "../schemas/config-order"

// 固定構成・追加構成の表示順API
export const configOrderRoute = new Hono<AppEnv>()
type ConfigOrderContext = ApiRouteContext

// 表示順入力の形式エラー応答
function invalidPayload(context: ConfigOrderContext) {
    return context.json(
        {
            error: {
                code: "INVALID_CONFIG_ORDER",
                message: "構成の並び順が正しくありません",
            },
        },
        400,
    )
}

// 表示順テーブルが未作成の場合の案内応答
function migrationRequired(context: ConfigOrderContext) {
    return context.json(
        {
            error: {
                code: "CONFIG_ORDER_MIGRATION_REQUIRED",
                message: "構成の並び順保存機能が未適用です。apiでD1マイグレーションを実行してください",
            },
        },
        503,
    )
}

// ログインユーザーの現在の表示順を取得
configOrderRoute.get("/", async (context) => {
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    let items: string[]

    try {
        items = await context.var.configOrderRepository.list(userId)
    } catch (error) {
        if (error instanceof ConfigOrderMigrationRequiredError) {
            return migrationRequired(context)
        }

        throw error
    }

    return context.json({items})
})

// 表示順をユーザー所有の構成だけで置き換え
configOrderRoute.put("/", async (context) => {
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    const payload = await readJson(context)

    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const parsedPayload = parseConfigOrderPayload(payload)

    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    try {
        const items = await context.var.configOrderRepository.save(
            userId,
            parsedPayload.data.items,
        )

        return context.json({items})
    } catch (error) {
        if (error instanceof ConfigOrderMigrationRequiredError) {
            return migrationRequired(context)
        }

        if (error instanceof InvalidConfigOrderError) {
            return invalidPayload(context)
        }

        throw error
    }
})

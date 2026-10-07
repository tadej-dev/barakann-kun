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
    // 表示順はユーザー固有データなのでセッションから所有者を取得する
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    let items: string[]

    try {
        // 保存順と現在存在する構成の照合はRepositoryへ任せる
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
    // 本文からユーザーIDを受け取らずセッションの所有者へ保存する
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    const payload = await readJson(context)

    // 並び替えもサーバー状態を変更するためCSRF検証を行う
    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const parsedPayload = parseConfigOrderPayload(payload)

    // 配列の件数や重複を確認してからRepositoryへ渡す
    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    try {
        // Repositoryで現在の所有構成と一致する完全な順列か再確認する
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

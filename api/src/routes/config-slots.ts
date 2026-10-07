import {Hono} from "hono"

import type {AppEnv} from "../app-env"
import {
    ConfigSlotMigrationRequiredError,
    type ConfigSlot,
    type ConfigSlotId,
    type ConfigSlotMutationResult,
    isMissingConfigSlotSchemaError,
} from "../db/config-slot-repository"
import {
    InvalidSavedBuildPartsError,
    MissingSavedBuildPartsError,
} from "../db/saved-build-repository"
import {
    parseClearConfigSlotPayload,
    parseConfigSlotSharingPayload,
    parseConfigSlotId,
    parseRenameConfigSlotPayload,
    parseSaveConfigSlotPayload,
} from "../schemas/config-slots"
import {
    getUserId,
    hasValidCsrfToken,
    invalidCsrf,
    readJson,
    unauthenticated,
    type ApiRouteContext,
} from "./route-helpers"

// 構成1〜4の同期API
export const configSlotsRoute = new Hono<AppEnv>()
type ConfigSlotContext = ApiRouteContext

// 構成IDの形式エラー応答
function invalidConfigSlotId(context: ConfigSlotContext) {
    return context.json(
        {
            error: {
                code: "INVALID_CONFIG_SLOT_ID",
                message: "構成IDの形式が正しくありません",
            },
        },
        400,
    )
}

// 構成入力の形式エラー応答
function invalidPayload(context: ConfigSlotContext) {
    return context.json(
        {
            error: {
                code: "INVALID_CONFIG_SLOT",
                message: "構成の入力内容が正しくありません",
            },
        },
        400,
    )
}

// パーツIDがマスターデータにない場合の応答
function invalidParts(
    context: ConfigSlotContext,
    error: MissingSavedBuildPartsError | InvalidSavedBuildPartsError,
) {
    return context.json(
        {
            error: {
                code: "INVALID_CONFIG_SLOT_PARTS",
                message: error.message,
                partIds: error.partIds,
            },
        },
        400,
    )
}

// version競合時の応答
function conflict(context: ConfigSlotContext) {
    return context.json(
        {
            error: {
                code: "CONFIG_SLOT_CONFLICT",
                message: "構成が別の端末で更新されています。最新状態を取得してください",
            },
        },
        409,
    )
}

// 構成スロット用マイグレーション未適用の案内応答
function migrationRequired(context: ConfigSlotContext) {
    return context.json(
        {
            error: {
                code: "CONFIG_SLOT_MIGRATION_REQUIRED",
                message: "構成1〜4の保存機能が未適用です。apiでD1マイグレーションを実行してください",
            },
        },
        503,
    )
}

// D1エラーを利用者向けのマイグレーション案内へ変換
function migrationResponse(
    context: ConfigSlotContext,
    error: unknown,
): Response | null {
    return error instanceof ConfigSlotMigrationRequiredError ||
        isMissingConfigSlotSchemaError(error)
        ? migrationRequired(context)
        : null
}

// リポジトリ結果をHTTP応答へ変換
function mutationResponse(
    context: ConfigSlotContext,
    result: ConfigSlotMutationResult,
) {
    if (result.kind === "conflict") {
        return conflict(context)
    }

    if (result.kind === "not_found") {
        return context.json(
            {
                error: {
                    code: "CONFIG_SLOT_NOT_FOUND",
                    message: "構成が見つかりません",
                },
            },
            404,
        )
    }

    return context.json(result.slot)
}

// ログインユーザーの構成1〜4を取得
configSlotsRoute.get("/", async (context) => {
    // 固定構成はユーザー固有データなので認証済みの所有者だけ取得する
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    let slots: ConfigSlot[]

    try {
        // スキーマ未適用だけを利用者向けの503応答へ変換する
        slots = await context.var.configSlotRepository.list(userId)
    } catch (error) {
        const response = migrationResponse(context, error)

        if (response) {
            return response
        }

        throw error
    }

    return context.json(slots)
})

// URLパラメーターとユーザーIDを共通検証
type ValidConfigSlotRequest = {
    userId: string
    configId: ConfigSlotId
}

async function getConfigSlotRequest(
    context: ConfigSlotContext,
): Promise<ValidConfigSlotRequest | Response> {
    // 各変更ルートで共通となる認証と構成番号の検証をまとめる
    const userId = await getUserId(context)
    const parsedConfigId = parseConfigSlotId(
        context.req.param("configId") ?? "",
    )

    if (!userId) {
        return unauthenticated(context)
    }

    if (!parsedConfigId.success) {
        return invalidConfigSlotId(context)
    }

    return {userId, configId: parsedConfigId.data}
}

// 固定構成の読み取り専用共有を開始または停止
configSlotsRoute.patch("/:configId/sharing", async (context) => {
    const request = await getConfigSlotRequest(context)

    if (request instanceof Response) {
        return request
    }

    const payload = await readJson(context)

    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const parsedPayload = parseConfigSlotSharingPayload(payload)

    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    try {
        const result = await context.var.configSlotRepository.setSharing(
            request.userId,
            request.configId,
            parsedPayload.data.version,
            parsedPayload.data.enabled,
        )

        return mutationResponse(context, result)
    } catch (error) {
        const response = migrationResponse(context, error)

        if (response) {
            return response
        }

        throw error
    }
})

// 構成名だけを変更
configSlotsRoute.patch("/:configId", async (context) => {
    // URLの構成番号とログインユーザーを共通処理で確定する
    const request = await getConfigSlotRequest(context)

    if (request instanceof Response) {
        return request
    }

    const payload = await readJson(context)

    // 名前変更は別端末へ同期されるためCSRF検証を行う
    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const parsedPayload = parseRenameConfigSlotPayload(payload)

    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    let result: ConfigSlotMutationResult

    try {
        // versionを渡して別端末による先行更新を検出する
        result = await context.var.configSlotRepository.rename(
            request.userId,
            request.configId,
            parsedPayload.data.version,
            parsedPayload.data.name,
        )
    } catch (error) {
        const response = migrationResponse(context, error)

        if (response) {
            return response
        }

        throw error
    }

    return mutationResponse(context, result)
})

// 現在の選択パーツと名前を固定構成へ保存・上書き
configSlotsRoute.put("/:configId", async (context) => {
    // URLの構成番号とログインユーザーを共通処理で確定する
    const request = await getConfigSlotRequest(context)

    if (request instanceof Response) {
        return request
    }

    const payload = await readJson(context)

    // 自動保存のリクエストでも毎回CSRFトークンを照合する
    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const parsedPayload = parseSaveConfigSlotPayload(payload)

    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    try {
        // 価格や重量はRepositoryがパーツマスターから取得し直す
        const result = await context.var.configSlotRepository.save(
            request.userId,
            request.configId,
            parsedPayload.data.version,
            parsedPayload.data.name,
            parsedPayload.data.parts,
        )

        return mutationResponse(context, result)
    } catch (error) {
        // パーツ不正とスキーマ未適用を利用者が区別できる応答へ変換する
        if (
            error instanceof MissingSavedBuildPartsError ||
            error instanceof InvalidSavedBuildPartsError
        ) {
            return invalidParts(context, error)
        }

        const response = migrationResponse(context, error)

        if (response) {
            return response
        }

        throw error
    }
})

// 現在の選択パーツを空にし、構成名は維持
configSlotsRoute.delete("/:configId", async (context) => {
    // URLの構成番号とログインユーザーを共通処理で確定する
    const request = await getConfigSlotRequest(context)

    if (request instanceof Response) {
        return request
    }

    const payload = await readJson(context)

    // 構成クリアは状態変更のためCSRFトークンを照合する
    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const parsedPayload = parseClearConfigSlotPayload(payload)

    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    let result: ConfigSlotMutationResult

    try {
        // version一致時だけパーツを空にして古い画面からの上書きを防ぐ
        result = await context.var.configSlotRepository.clear(
            request.userId,
            request.configId,
            parsedPayload.data.version,
        )
    } catch (error) {
        const response = migrationResponse(context, error)

        if (response) {
            return response
        }

        throw error
    }

    return mutationResponse(context, result)
})

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
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    let slots: ConfigSlot[]

    try {
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

// 構成名だけを変更
configSlotsRoute.patch("/:configId", async (context) => {
    const request = await getConfigSlotRequest(context)

    if (request instanceof Response) {
        return request
    }

    const payload = await readJson(context)

    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const parsedPayload = parseRenameConfigSlotPayload(payload)

    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    let result: ConfigSlotMutationResult

    try {
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
    const request = await getConfigSlotRequest(context)

    if (request instanceof Response) {
        return request
    }

    const payload = await readJson(context)

    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const parsedPayload = parseSaveConfigSlotPayload(payload)

    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    try {
        const result = await context.var.configSlotRepository.save(
            request.userId,
            request.configId,
            parsedPayload.data.version,
            parsedPayload.data.name,
            parsedPayload.data.parts,
        )

        return mutationResponse(context, result)
    } catch (error) {
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
    const request = await getConfigSlotRequest(context)

    if (request instanceof Response) {
        return request
    }

    const payload = await readJson(context)

    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const parsedPayload = parseClearConfigSlotPayload(payload)

    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    let result: ConfigSlotMutationResult

    try {
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

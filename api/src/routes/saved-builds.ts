import {Hono} from "hono"

import type {AppEnv} from "../app-env"
import {
    getUserId,
    hasValidCsrfToken,
    invalidCsrf,
    readJson,
    unauthenticated,
    type ApiRouteContext,
} from "./route-helpers"
import {
    MAX_SAVED_BUILDS_PER_USER,
    InvalidSavedBuildPartsError,
    MissingSavedBuildPartsError,
    SavedBuildLimitExceededError,
    isMissingSavedBuildSchemaError,
    type DeleteSavedBuildResult,
    type RenameSavedBuildResult,
    type SavedBuild,
} from "../db/saved-build-repository"
import {
    parseCreateSavedBuildPayload,
    parseDeleteSavedBuildPayload,
    parseRenameSavedBuildPayload,
    parseSavedBuildId,
    parseUpdateSavedBuildPayload,
} from "../schemas/saved-builds"

// 保存構成API
export const savedBuildsRoute = new Hono<AppEnv>()
type SavedBuildContext = ApiRouteContext

// 保存構成IDの形式エラー応答
function invalidBuildId(context: SavedBuildContext) {
    return context.json(
        {
            error: {
                code: "INVALID_SAVED_BUILD_ID",
                message: "保存構成IDの形式が正しくありません",
            },
        },
        400,
    )
}

// 保存構成入力の形式エラー応答
function invalidPayload(context: SavedBuildContext) {
    return context.json(
        {
            error: {
                code: "INVALID_SAVED_BUILD",
                message: "保存構成の入力内容が正しくありません",
            },
        },
        400,
    )
}

// 保存構成に存在しないパーツのエラー応答
function invalidParts(
    context: SavedBuildContext,
    error: MissingSavedBuildPartsError | InvalidSavedBuildPartsError,
) {
    return context.json(
        {
            error: {
                code: "INVALID_SAVED_BUILD_PARTS",
                message: error.message,
                partIds: error.partIds,
            },
        },
        400,
    )
}

// 保存構成関連マイグレーション未適用の案内応答
function migrationRequired(context: SavedBuildContext) {
    return context.json(
        {
            error: {
                code: "SAVED_BUILD_MIGRATION_REQUIRED",
                message: "構成保存機能が未適用です。apiでD1マイグレーションを実行してください",
            },
        },
        503,
    )
}

// D1エラーを利用者向けのマイグレーション案内へ変換
function migrationResponse(
    context: SavedBuildContext,
    error: unknown,
): Response | null {
    return isMissingSavedBuildSchemaError(error)
        ? migrationRequired(context)
        : null
}

// 保存件数上限は事前確認とD1の条件付きINSERTの両方で利用する
function savedBuildLimitExceeded(context: SavedBuildContext) {
    return context.json(
        {
            error: {
                code: "SAVED_BUILD_LIMIT_EXCEEDED",
                message: `保存できる構成は${MAX_SAVED_BUILDS_PER_USER}件までです`,
            },
        },
        409,
    )
}

// 保存構成一覧を取得
savedBuildsRoute.get("/", async (context) => {
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    let builds: SavedBuild[]

    try {
        builds = await context.var.savedBuildRepository.list(userId)
    } catch (error) {
        const response = migrationResponse(context, error)

        if (response) {
            return response
        }

        throw error
    }

    return context.json(builds)
})

// 保存構成を新規作成
savedBuildsRoute.post("/", async (context) => {
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    const payload = await readJson(context)

    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const parsedPayload = parseCreateSavedBuildPayload(payload)

    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    try {
        const savedBuildCount = await context.var.savedBuildRepository.count(userId)

        if (savedBuildCount >= MAX_SAVED_BUILDS_PER_USER) {
            return savedBuildLimitExceeded(context)
        }

        const build = await context.var.savedBuildRepository.create(
            userId,
            parsedPayload.data.name,
            parsedPayload.data.parts,
        )

        return context.json(build, 201)
    } catch (error) {
        if (error instanceof MissingSavedBuildPartsError) {
            return invalidParts(context, error)
        }

        if (error instanceof InvalidSavedBuildPartsError) {
            return invalidParts(context, error)
        }

        const response = migrationResponse(context, error)

        if (response) {
            return response
        }

        if (error instanceof SavedBuildLimitExceededError) {
            return savedBuildLimitExceeded(context)
        }

        throw error
    }
})

// 保存構成を1件取得
savedBuildsRoute.get("/:buildId", async (context) => {
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    const buildId = context.req.param("buildId")

    if (!parseSavedBuildId(buildId).success) {
        return invalidBuildId(context)
    }

    let build: SavedBuild | null

    try {
        build = await context.var.savedBuildRepository.findById(
            userId,
            buildId,
        )
    } catch (error) {
        const response = migrationResponse(context, error)

        if (response) {
            return response
        }

        throw error
    }

    if (!build) {
        return context.json(
            {
                error: {
                    code: "SAVED_BUILD_NOT_FOUND",
                    message: "保存構成が見つかりません",
                },
            },
            404,
        )
    }

    return context.json(build)
})

// 保存構成をversion一致時だけ更新
savedBuildsRoute.put("/:buildId", async (context) => {
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    const buildId = context.req.param("buildId")

    if (!parseSavedBuildId(buildId).success) {
        return invalidBuildId(context)
    }

    const payload = await readJson(context)

    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const parsedPayload = parseUpdateSavedBuildPayload(payload)

    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    try {
        const result = await context.var.savedBuildRepository.update(
            userId,
            buildId,
            parsedPayload.data.version,
            parsedPayload.data.name,
            parsedPayload.data.parts,
        )

        if (result.kind === "not_found") {
            return context.json(
                {
                    error: {
                        code: "SAVED_BUILD_NOT_FOUND",
                        message: "保存構成が見つかりません",
                    },
                },
                404,
            )
        }

        if (result.kind === "conflict") {
            return context.json(
                {
                    error: {
                        code: "SAVED_BUILD_CONFLICT",
                        message: "保存構成が先に更新されています。最新状態を取得してください",
                    },
                },
                409,
            )
        }

        return context.json(result.build)
    } catch (error) {
        if (error instanceof MissingSavedBuildPartsError) {
            return invalidParts(context, error)
        }

        if (error instanceof InvalidSavedBuildPartsError) {
            return invalidParts(context, error)
        }

        const response = migrationResponse(context, error)

        if (response) {
            return response
        }

        throw error
    }
})

// パーツの保存時点情報を維持したまま名称だけを変更
savedBuildsRoute.patch("/:buildId", async (context) => {
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    const buildId = context.req.param("buildId")

    if (!parseSavedBuildId(buildId).success) {
        return invalidBuildId(context)
    }

    const payload = await readJson(context)

    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const parsedPayload = parseRenameSavedBuildPayload(payload)

    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    let result: RenameSavedBuildResult

    try {
        result = await context.var.savedBuildRepository.rename(
            userId,
            buildId,
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

    if (result.kind === "not_found") {
        return context.json(
            {
                error: {
                    code: "SAVED_BUILD_NOT_FOUND",
                    message: "保存構成が見つかりません",
                },
            },
            404,
        )
    }

    if (result.kind === "conflict") {
        return context.json(
            {
                error: {
                    code: "SAVED_BUILD_CONFLICT",
                    message: "保存構成が先に更新されています。最新状態を取得してください",
                },
            },
            409,
        )
    }

    return context.json(result.build)
})

// 保存構成をversion一致時だけ削除
savedBuildsRoute.delete("/:buildId", async (context) => {
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    const buildId = context.req.param("buildId")

    if (!parseSavedBuildId(buildId).success) {
        return invalidBuildId(context)
    }

    const payload = await readJson(context)

    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const parsedPayload = parseDeleteSavedBuildPayload(payload)

    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    let result: DeleteSavedBuildResult

    try {
        result = await context.var.savedBuildRepository.delete(
            userId,
            buildId,
            parsedPayload.data.version,
        )
    } catch (error) {
        const response = migrationResponse(context, error)

        if (response) {
            return response
        }

        throw error
    }

    if (result.kind === "not_found") {
        return context.json(
            {
                error: {
                    code: "SAVED_BUILD_NOT_FOUND",
                    message: "保存構成が見つかりません",
                },
            },
            404,
        )
    }

    if (result.kind === "conflict") {
        return context.json(
            {
                error: {
                    code: "SAVED_BUILD_CONFLICT",
                    message: "保存構成が先に更新されています。最新状態を取得してください",
                },
            },
            409,
        )
    }

    return context.body(null, 204)
})

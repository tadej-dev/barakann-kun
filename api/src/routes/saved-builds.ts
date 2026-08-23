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
    type UpdateSavedBuildResult,
} from "../db/saved-build-repository"
import {
    parseCreateSavedBuildPayload,
    parseDeleteSavedBuildPayload,
    parseRenameSavedBuildPayload,
    parseSavedBuildId,
    parseSavedBuildShareToken,
    parseSavedBuildSharingPayload,
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

// 公開トークンは固定長の16進数だけを受け付ける
function invalidShareToken(context: SavedBuildContext) {
    return context.json(
        {
            error: {
                code: "INVALID_SHARE_TOKEN",
                message: "共有URLの形式が正しくありません",
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
    // 保存構成はユーザー固有データなのでセッションから所有者を取得する
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    let builds: SavedBuild[]

    try {
        // 固定スロットを除いた追加構成の一覧取得はRepositoryへ任せる
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
    // 作成先のユーザーは本文ではなくセッションから確定する
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    const payload = await readJson(context)

    // 新規作成はサーバー状態を変更するためCSRF検証を行う
    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const parsedPayload = parseCreateSavedBuildPayload(payload)

    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    try {
        // 早期応答用に件数を確認し実際の上限判定はD1側でも行う
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
        // 利用者が修正できるパーツ不正は400応答へ変換する
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
            // 同時作成によって上限へ達した場合も事前確認と同じ応答にする
            return savedBuildLimitExceeded(context)
        }

        throw error
    }
})

// 公開設定された構成を所有者情報なしで取得
savedBuildsRoute.get("/public/:shareToken", async (context) => {
    const shareToken = context.req.param("shareToken")

    if (!parseSavedBuildShareToken(shareToken).success) {
        return invalidShareToken(context)
    }

    let build: SavedBuild | null

    try {
        build = await context.var.savedBuildRepository.findPublicByToken(
            shareToken,
        )
    } catch (error) {
        const response = migrationResponse(context, error)

        if (response) {
            return response
        }

        throw error
    }

    if (!build) {
        // 公開停止済みと存在しないトークンを同じ応答にして状態を推測させない
        return context.json(
            {
                error: {
                    code: "SHARED_BUILD_NOT_FOUND",
                    message: "共有された構成が見つかりません",
                },
            },
            404,
        )
    }

    // 公開応答には所有者向けID・version・共有トークン・作成日時を含めない
    // 共有停止後にブラウザや中継キャッシュから古い構成を再表示させない
    context.header("Cache-Control", "no-store")

    return context.json({
        name: build.name,
        parts: build.parts,
    })
})

// 保存構成を1件取得
savedBuildsRoute.get("/:buildId", async (context) => {
    // 個別構成もログイン中の所有者へ限定して取得する
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    const buildId = context.req.param("buildId")

    // UUID形式でない値をD1の検索条件へ渡す前に拒否する
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
        // 他ユーザーのIDを指定した場合も存在を推測できない404応答にする
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
    // 更新対象はセッション所有者の追加構成に限定する
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    const buildId = context.req.param("buildId")

    if (!parseSavedBuildId(buildId).success) {
        return invalidBuildId(context)
    }

    const payload = await readJson(context)

    // パーツと名前の一括更新前にCSRFトークンを照合する
    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const parsedPayload = parseUpdateSavedBuildPayload(payload)

    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    try {
        // Repositoryへversionを渡して他端末の先行更新を検出する
        const result = await context.var.savedBuildRepository.update(
            userId,
            buildId,
            parsedPayload.data.version,
            parsedPayload.data.name,
            parsedPayload.data.parts,
        )

        // 対象なしと世代競合を分けて画面の次の処理を判断できるようにする
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
    // 名前変更もセッション所有者の追加構成だけに許可する
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    const buildId = context.req.param("buildId")

    if (!parseSavedBuildId(buildId).success) {
        return invalidBuildId(context)
    }

    const payload = await readJson(context)

    // パーツを変更しない操作でもCSRFとversionの検証を行う
    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const parsedPayload = parseRenameSavedBuildPayload(payload)

    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    let result: RenameSavedBuildResult

    try {
        // Repositoryで所有者と世代が一致した場合だけ名称を変更する
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
        // 所有していない構成IDも対象なしとして同じ404応答にする
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

// 保存構成の読み取り専用共有を開始または停止
savedBuildsRoute.patch("/:buildId/sharing", async (context) => {
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

    const parsedPayload = parseSavedBuildSharingPayload(payload)

    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    let result: UpdateSavedBuildResult

    try {
        result = await context.var.savedBuildRepository.setSharing(
            userId,
            buildId,
            parsedPayload.data.version,
            parsedPayload.data.enabled,
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
    // 削除対象はセッション所有者の追加構成に限定する
    const userId = await getUserId(context)

    if (!userId) {
        return unauthenticated(context)
    }

    const buildId = context.req.param("buildId")

    if (!parseSavedBuildId(buildId).success) {
        return invalidBuildId(context)
    }

    const payload = await readJson(context)

    // 削除は元に戻せないためCSRFとversionの両方を検証する
    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    const parsedPayload = parseDeleteSavedBuildPayload(payload)

    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    let result: DeleteSavedBuildResult

    try {
        // Repositoryで所有者と世代が一致した場合だけ削除する
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
        // 古い画面から最新の構成を削除しないよう競合を明示する
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

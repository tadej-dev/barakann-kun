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
// 保存構成APIのContext型
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

// 保存構成のパーツ不存在・不適合のエラー応答
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

// スキーマ未適用エラーだけマイグレーション案内へ変換
function migrationResponse(
    context: SavedBuildContext,
    error: unknown,
): Response | null {
    return isMissingSavedBuildSchemaError(error)
        ? migrationRequired(context)
        : null
}

// 保存件数上限に達した場合の応答
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
    // 保存構成はユーザー固有データなのでセッションから所有者を取得
    const userId = await getUserId(context)

    // 未ログイン時の401応答
    if (!userId) {
        return unauthenticated(context)
    }

    // ログインユーザーが保存した構成の一覧
    let builds: SavedBuild[]

    try {
        // 構成が1件も無い場合は、初期表示用の構成を用意
        await context.var.savedBuildRepository.ensureInitialConfig(userId)
        builds = await context.var.savedBuildRepository.listAll(userId)
    } catch (error) {
        const response = migrationResponse(context, error)

        // スキーマ未適用時の503案内応答
        if (response) {
            return response
        }

        throw error
    }

    return context.json(builds)
})

// 保存構成を新規作成
savedBuildsRoute.post("/", async (context) => {
    // 作成先のユーザーは本文ではなくセッションから確定
    const userId = await getUserId(context)

    // 未ログイン時の401応答
    if (!userId) {
        return unauthenticated(context)
    }

    const payload = await readJson(context)

    // 新規作成はサーバー状態を変更するためCSRF検証を行う
    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    // 名前・パーツの形式検証結果（成功時は保存用データ）
    const parsedPayload = parseCreateSavedBuildPayload(payload)

    // 入力形式が不正な場合の400応答
    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    try {
        // 早期応答用に件数を確認し実際の上限判定はD1側でも行う
        const savedBuildCount = await context.var.savedBuildRepository.countAll(userId)

        // 保存上限の20件に達した場合の409応答
        if (savedBuildCount >= MAX_SAVED_BUILDS_PER_USER) {
            return savedBuildLimitExceeded(context)
        }

        // 作成した保存構成（名前・パーツ・version=1）
        const build = await context.var.savedBuildRepository.create(
            userId,
            parsedPayload.data.name,
            parsedPayload.data.parts,
        )

        return context.json(build, 201)
    } catch (error) {
        // 利用者が修正できるパーツ不正は400応答へ変換
        if (error instanceof MissingSavedBuildPartsError) {
            return invalidParts(context, error)
        }

        // パーツのカテゴリー・前後位置・規格が不適合な場合の400応答
        if (error instanceof InvalidSavedBuildPartsError) {
            return invalidParts(context, error)
        }

        const response = migrationResponse(context, error)

        // スキーマ未適用時の503案内応答
        if (response) {
            return response
        }

        // 同時作成によって上限へ達した場合も事前確認と同じ応答にする
        if (error instanceof SavedBuildLimitExceededError) {
            return savedBuildLimitExceeded(context)
        }

        throw error
    }
})

// 保存構成を1件取得
savedBuildsRoute.get("/:buildId", async (context) => {
    // 個別構成もログイン中の所有者へ限定して取得
    const userId = await getUserId(context)

    // 未ログイン時の401応答
    if (!userId) {
        return unauthenticated(context)
    }

    const buildId = context.req.param("buildId")

    // UUID形式でない値をD1の検索条件へ渡す前に拒否
    if (!parseSavedBuildId(buildId).success) {
        return invalidBuildId(context)
    }

    // 取得した保存構成（未所有・不存在はnull）
    let build: SavedBuild | null

    try {
        build = await context.var.savedBuildRepository.findById(
            userId,
            buildId,
        )
    } catch (error) {
        const response = migrationResponse(context, error)

        // スキーマ未適用時の503案内応答
        if (response) {
            return response
        }

        throw error
    }

    // 他ユーザーのIDを指定した場合も存在を推測できない404応答にする
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
    // 更新対象はセッション所有者の保存構成に限定
    const userId = await getUserId(context)

    // 未ログイン時の401応答
    if (!userId) {
        return unauthenticated(context)
    }

    const buildId = context.req.param("buildId")

    // UUID形式でない保存構成IDの拒否
    if (!parseSavedBuildId(buildId).success) {
        return invalidBuildId(context)
    }

    const payload = await readJson(context)

    // パーツと名前の一括更新前にCSRFトークンを照合
    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    // 名前・パーツ・versionの形式検証結果
    const parsedPayload = parseUpdateSavedBuildPayload(payload)

    // 入力形式が不正な場合の400応答
    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    try {
        // Repositoryへversionを渡して他端末の先行更新を検出
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

        // versionが一致しない場合の409応答
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
        // パーツ不存在の場合の400応答
        if (error instanceof MissingSavedBuildPartsError) {
            return invalidParts(context, error)
        }

        // パーツのカテゴリー・前後位置・規格が不適合な場合の400応答
        if (error instanceof InvalidSavedBuildPartsError) {
            return invalidParts(context, error)
        }

        const response = migrationResponse(context, error)

        // スキーマ未適用時の503案内応答
        if (response) {
            return response
        }

        throw error
    }
})

// パーツの保存時点情報を維持したまま名称だけを変更
savedBuildsRoute.patch("/:buildId", async (context) => {
    // 名前変更もセッション所有者の保存構成だけに許可
    const userId = await getUserId(context)

    // 未ログイン時の401応答
    if (!userId) {
        return unauthenticated(context)
    }

    const buildId = context.req.param("buildId")

    // UUID形式でない保存構成IDの拒否
    if (!parseSavedBuildId(buildId).success) {
        return invalidBuildId(context)
    }

    const payload = await readJson(context)

    // パーツを変更しない操作でもCSRFとversionの検証を行う
    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    // 名前とversionの形式検証結果
    const parsedPayload = parseRenameSavedBuildPayload(payload)

    // 入力形式が不正な場合の400応答
    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    // 名称変更の結果（not_found・conflict・更新後の構成）
    let result: RenameSavedBuildResult

    try {
        // Repositoryで所有者と世代が一致した場合だけ名称を変更
        result = await context.var.savedBuildRepository.rename(
            userId,
            buildId,
            parsedPayload.data.version,
            parsedPayload.data.name,
        )
    } catch (error) {
        const response = migrationResponse(context, error)

        // スキーマ未適用時の503案内応答
        if (response) {
            return response
        }

        throw error
    }

    // 所有していない構成IDも対象なしとして同じ404応答にする
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

    // versionが一致しない場合の409応答
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
    // 削除対象はセッション所有者の保存構成に限定
    const userId = await getUserId(context)

    // 未ログイン時の401応答
    if (!userId) {
        return unauthenticated(context)
    }

    const buildId = context.req.param("buildId")

    // UUID形式でない保存構成IDの拒否
    if (!parseSavedBuildId(buildId).success) {
        return invalidBuildId(context)
    }

    const payload = await readJson(context)

    // 削除は元に戻せないためCSRFとversionの両方を検証
    if (!(await hasValidCsrfToken(context, payload))) {
        return invalidCsrf(context)
    }

    // 削除対象のversionの形式検証結果
    const parsedPayload = parseDeleteSavedBuildPayload(payload)

    // 入力形式が不正な場合の400応答
    if (!parsedPayload.success) {
        return invalidPayload(context)
    }

    // 削除結果（not_found・conflict・削除済み）
    let result: DeleteSavedBuildResult

    try {
        // Repositoryで所有者と世代が一致した場合だけ削除
        result = await context.var.savedBuildRepository.delete(
            userId,
            buildId,
            parsedPayload.data.version,
        )
    } catch (error) {
        const response = migrationResponse(context, error)

        // スキーマ未適用時の503案内応答
        if (response) {
            return response
        }

        throw error
    }

    // 対象の構成が無い場合の404応答
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

    // 古い画面から最新の構成を削除しないよう競合を明示
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

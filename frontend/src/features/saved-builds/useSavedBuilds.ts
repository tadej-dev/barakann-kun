import {useCallback, useEffect, useRef, useState} from "react"

import {
    createSavedBuild,
    deleteSavedBuild,
    fetchSavedBuilds,
    renameSavedBuild,
    updateSavedBuild,
    type SavedBuild,
    type SavedBuildPart,
} from "@/api/savedBuilds"

// 保存構成の変更操作（作成・名前変更・更新・削除）
type SavedBuildOperation = "create" | "rename" | "update" | "delete"

// APIへはスロット名とパーツIDだけを送り、価格・重量はサーバーが確定する
function toPartInputs(parts: SavedBuildPart[]) {
    return parts.map(({slotKey, partId}) => ({slotKey, partId}))
}

// useSavedBuildsが受け取るオプション
type UseSavedBuildsOptions = {
    enabled: boolean
    userId: string | null
    reloadKey?: number
}

// 保存構成一覧と変更系APIの状態をシミュレーターUIから分離
export function useSavedBuilds({
    enabled,
    userId,
    reloadKey = 0,
}: UseSavedBuildsOptions) {
    // 一覧、通信中の操作、ユーザー・reloadKey単位の読み込み結果を別々に保持する。
    const [builds, setBuilds] = useState<SavedBuild[]>([]) // 保存構成一覧
    const [isLoading, setIsLoading] = useState(false) // 一覧の読み込み中フラグ
    const [operation, setOperation] = useState<SavedBuildOperation | null>(null) // 実行中の変更操作
    const [operationUserId, setOperationUserId] = useState<string | null>(null) // 変更操作を開始したユーザーID
    const [errorMessage, setErrorMessage] = useState("") // 取得・変更のエラーメッセージ
    const [errorUserId, setErrorUserId] = useState<string | null>(null) // エラーが発生したユーザーID
    const [errorReloadKey, setErrorReloadKey] = useState<number | null>(null) // エラーが発生した再取得キー
    const [loadedUserId, setLoadedUserId] = useState<string | null>(null) // 一覧を読み込んだユーザーID
    const currentUserIdRef = useRef(userId) // 非同期処理から最新のユーザーIDを参照するための記録
    const [loadedReloadKey, setLoadedReloadKey] = useState<number | null>(null) // 一覧を読み込んだ再取得キー
    const operationRequestIdRef = useRef(0) // 変更操作の実行番号（古い応答の破棄用）

    // 最新のユーザーIDを非同期処理向けに記録
    useEffect(() => {
        currentUserIdRef.current = userId
    }, [userId])

    // 保存構成一覧を取得し、取得結果を返す
    const reload = useCallback(async (signal?: AbortSignal) => {
        // 取得対象のユーザーID
        const requestUserId = userId

        // 未ログイン時は前ユーザーの保存構成を消し、認証後に改めて一覧を取得する。
        if (!enabled || !requestUserId) {
            setBuilds([])
            setLoadedUserId(null)
            setLoadedReloadKey(null)
            setErrorMessage("")
            setErrorUserId(null)
            setErrorReloadKey(null)

            return []
        }

        setIsLoading(true)

        try {
            // 明示的な再読み込みでは、現在のCookieセッションの一覧を取り直す。
            // サーバーが返した保存構成一覧
            const nextBuilds = await fetchSavedBuilds(signal)

            // 読み込み中にユーザーが変わった応答は、現在の一覧へ適用しない。
            if (
                signal?.aborted ||
                currentUserIdRef.current !== requestUserId
            ) {
                return undefined
            }

            setBuilds(nextBuilds)
            setErrorMessage("")
            setErrorUserId(null)
            setErrorReloadKey(null)
            setLoadedUserId(requestUserId)
            setLoadedReloadKey(reloadKey)

            return nextBuilds
        } catch (error) {
            // 中止・ユーザー切り替え後の応答を除き、現在のユーザーの失敗だけ表示
            if (
                !signal?.aborted &&
                currentUserIdRef.current === requestUserId
            ) {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "保存構成一覧の取得に失敗しました",
                )
                setErrorUserId(requestUserId)
                setErrorReloadKey(reloadKey)
            }

            return undefined
        } finally {
            // 取得結果が現ユーザーのものだけなら、読み込み表示を解除する。
            if (
                !signal?.aborted &&
                currentUserIdRef.current === requestUserId
            ) {
                setIsLoading(false)
            }
        }
    }, [enabled, reloadKey, userId])

    // 認証ユーザーの保存構成一覧を取得
    useEffect(() => {
        // 取得対象のユーザーID
        const requestUserId = userId

        // 認証されていない間はD1への一覧取得を開始しない。
        if (!enabled || !requestUserId) {
            return
        }

        // 一覧取得を中断する制御
        const controller = new AbortController()

        // enabled・userIdが変わるたびに、前回の一覧を破棄して現ユーザーの一覧を取得する。
        // 初回・移行完了時の取得は通信後にだけ状態を更新し、Effect直後の再描画を避ける
        async function load() {
            try {
                // サーバーが返した保存構成一覧
                const nextBuilds = await fetchSavedBuilds(controller.signal)

                // アンマウント後・ユーザー切り替え後の応答によるstate更新を防ぐ。
                if (
                    controller.signal.aborted ||
                    currentUserIdRef.current !== requestUserId
                ) {
                    return
                }

                setBuilds(nextBuilds)
                setErrorMessage("")
                setErrorUserId(null)
                setErrorReloadKey(null)
                setLoadedUserId(requestUserId)
                setLoadedReloadKey(reloadKey)
            } catch (error) {
                // 中止・ユーザー切り替え後の応答を除き、現在のユーザーの失敗だけ表示
                if (
                    !controller.signal.aborted &&
                    currentUserIdRef.current === requestUserId
                ) {
                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : "保存構成一覧の取得に失敗しました",
                    )
                    setErrorUserId(requestUserId)
                    setErrorReloadKey(reloadKey)
                }
            } finally {
                // 中止・ユーザー切り替え後の応答を除き、読み込み中表示を解除
                if (
                    !controller.signal.aborted &&
                    currentUserIdRef.current === requestUserId
                ) {
                    setIsLoading(false)
                }
            }
        }

        void load()

        return () => controller.abort()
    }, [enabled, reloadKey, userId])

    // 変更操作の共通処理（実行番号・操作表示・エラー表示を管理）
    const runOperation = useCallback(async <T,>(
        nextOperation: SavedBuildOperation,
        request: () => Promise<T>,
    ): Promise<T> => {
        // 操作を開始したユーザーID
        const requestUserId = userId
        // 操作の実行番号
        const requestId = ++operationRequestIdRef.current
        // 同時操作が発生した場合、最後に開始した操作だけがエラー表示を確定する。
        setOperation(nextOperation)
        setOperationUserId(requestUserId)
        setErrorMessage("")
        setErrorUserId(null)
        setErrorReloadKey(null)

        try {
            // create/rename/update/deleteのAPI呼び出しを共通化し、操作表示とエラー状態を揃える。
            return await request()
        } catch (error) {
            // 競合などの例外は呼び出し元にも返し、UI側で解決方法を選べるようにする。
            // 最後に開始した操作だけがエラー表示を確定
            if (
                currentUserIdRef.current === requestUserId &&
                operationRequestIdRef.current === requestId
            ) {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "保存構成の操作に失敗しました",
                )
                setErrorUserId(requestUserId)
                setErrorReloadKey(reloadKey)

            }

            throw error
        } finally {
            // 最後に開始した操作だけが操作中表示を解除
            if (operationRequestIdRef.current === requestId) {
                setOperation(null)
                setOperationUserId(null)
            }
        }
    }, [reloadKey, userId])

    // 構成を1件作成し、作成結果を一覧へ反映
    const create = useCallback(async (
        name: string,
        parts: SavedBuildPart[],
    ) => {
        // 作成を開始したユーザーID
        const requestUserId = userId

        return runOperation("create", async () => {
            // 新規作成は一覧の先頭へ追加し、同じIDが既にあれば重複を除く。
            const build = await createSavedBuild(name, toPartInputs(parts))

            // 認証ユーザーが同じ場合だけ、一覧へ作成結果を即時反映する。
            if (currentUserIdRef.current === requestUserId) {
                setBuilds((current) => [
                    build,
                    ...current.filter((candidate) => candidate.id !== build.id),
                ])
            }

            return build
        })
    }, [runOperation, userId])

    // 構成名を変更し、変更結果を一覧へ反映
    const rename = useCallback(async (build: SavedBuild, name: string) => {
        // 変更を開始したユーザーID
        const requestUserId = userId

        return runOperation("rename", async () => {
            // versionを含むPATCHの結果を、同一IDの一覧要素と置き換える。
            const renamed = await renameSavedBuild(
                build.id,
                build.version,
                name,
            )
            // PATCHの応答を差し替え、再取得を待たずに新しいversionを使えるようにする。
            if (currentUserIdRef.current === requestUserId) {
                setBuilds((current) => [
                    renamed,
                    ...current.filter((candidate) => candidate.id !== renamed.id),
                ])
            }

            return renamed
        })
    }, [runOperation, userId])

    // 構成のパーツを更新し、更新結果を一覧へ反映
    const update = useCallback(async (
        build: SavedBuild,
        parts: SavedBuildPart[],
    ) => {
        // 更新を開始したユーザーID
        const requestUserId = userId

        return runOperation("update", async () => {
            // 現在の構成パーツでPUTし、次回操作に新しいversionを利用する。
            const updated = await updateSavedBuild(
                build.id,
                build.version,
                build.name,
                toPartInputs(parts),
            )
            // PUT応答を一覧へ反映し、次回の自動保存が最新versionを参照できるようにする。
            if (currentUserIdRef.current === requestUserId) {
                setBuilds((current) => [
                    updated,
                    ...current.filter((candidate) => candidate.id !== updated.id),
                ])
            }

            return updated
        })
    }, [runOperation, userId])

    // 構成を1件削除し、一覧からも除外
    const remove = useCallback(async (build: SavedBuild) => {
        // 削除を開始したユーザーID
        const requestUserId = userId

        return runOperation("delete", async () => {
            // 削除APIが成功してから一覧から除外し、失敗時の再試行対象を保持する。
            await deleteSavedBuild(build.id, build.version)
            // 削除成功後だけ一覧から除外し、失敗時は競合対象を残して利用者へ知らせる。
            if (currentUserIdRef.current === requestUserId) {
                setBuilds((current) => current.filter(
                    (candidate) => candidate.id !== build.id,
                ))
            }
        })
    }, [runOperation, userId])

    // 現在のユーザー・再取得キーで読み込んだ一覧か
    const hasCurrentUserData = enabled && Boolean(userId) &&
        loadedUserId === userId && loadedReloadKey === reloadKey
    // 現在のユーザー・再取得キーで発生したエラーか
    const hasCurrentError = Boolean(errorMessage) &&
        errorUserId === userId &&
        errorReloadKey === reloadKey

    return {
        // 認証ユーザー・reloadKeyが一致しない一時状態は、別ユーザーへ公開しない。
        builds: hasCurrentUserData ? builds : [],
        create,
        errorMessage: hasCurrentError ? errorMessage : "",
        isLoading: enabled && (
            isLoading ||
            (!hasCurrentUserData && !hasCurrentError)
        ),
        operation: hasCurrentUserData && operationUserId === userId
            ? operation
            : null,
        reload,
        remove,
        rename,
        update,
    }
}

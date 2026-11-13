import {useCallback, useEffect, useRef, useState} from "react"

import {
    createSavedBuild,
    deleteSavedBuild,
    fetchSavedBuilds,
    renameSavedBuild,
    updateSavedBuild,
    type SavedBuild,
    type SavedBuildPartInput,
} from "@/api/savedBuilds"

type SavedBuildOperation = "create" | "rename" | "update" | "delete"

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
    const [builds, setBuilds] = useState<SavedBuild[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [operation, setOperation] = useState<SavedBuildOperation | null>(null)
    const [operationUserId, setOperationUserId] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState("")
    const [errorUserId, setErrorUserId] = useState<string | null>(null)
    const [errorReloadKey, setErrorReloadKey] = useState<number | null>(null)
    const [loadedUserId, setLoadedUserId] = useState<string | null>(null)
    const currentUserIdRef = useRef(userId)
    const [loadedReloadKey, setLoadedReloadKey] = useState<number | null>(null)
    const operationRequestIdRef = useRef(0)

    useEffect(() => {
        currentUserIdRef.current = userId
    }, [userId])

    const reload = useCallback(async (signal?: AbortSignal) => {
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

    useEffect(() => {
        const requestUserId = userId

        // 認証されていない間はD1への一覧取得を開始しない。
        if (!enabled || !requestUserId) {
            return
        }

        const controller = new AbortController()

        // enabled・userIdが変わるたびに、前回の一覧を破棄して現ユーザーの一覧を取得する。
        // 初回・移行完了時の取得は通信後にだけ状態を更新し、Effect直後の再描画を避ける
        async function load() {
            try {
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

    const runOperation = useCallback(async <T,>(
        nextOperation: SavedBuildOperation,
        request: () => Promise<T>,
    ): Promise<T> => {
        const requestUserId = userId
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
            if (operationRequestIdRef.current === requestId) {
                setOperation(null)
                setOperationUserId(null)
            }
        }
    }, [reloadKey, userId])

    const create = useCallback(async (
        name: string,
        parts: SavedBuildPartInput[],
    ) => {
        const requestUserId = userId

        return runOperation("create", async () => {
            // 新規作成は一覧の先頭へ追加し、同じIDが既にあれば重複を除く。
            const build = await createSavedBuild(name, parts)

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

    const rename = useCallback(async (build: SavedBuild, name: string) => {
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

    const update = useCallback(async (
        build: SavedBuild,
        parts: SavedBuildPartInput[],
    ) => {
        const requestUserId = userId

        return runOperation("update", async () => {
            // 現在の構成パーツでPUTし、次回操作に新しいversionを利用する。
            const updated = await updateSavedBuild(
                build.id,
                build.version,
                build.name,
                parts,
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

    const remove = useCallback(async (build: SavedBuild) => {
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

    const hasCurrentUserData = enabled && Boolean(userId) &&
        loadedUserId === userId && loadedReloadKey === reloadKey
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

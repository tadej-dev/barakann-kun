import {useCallback, useEffect, useState} from "react"

import {
    createSavedBuild,
    deleteSavedBuild,
    fetchSavedBuilds,
    renameSavedBuild,
    SavedBuildApiError,
    updateSavedBuild,
    type SavedBuild,
    type SavedBuildPartInput,
} from "@/api/savedBuilds"

type SavedBuildOperation = "create" | "rename" | "update" | "delete"

type UseSavedBuildsOptions = {
    enabled: boolean
    reloadKey?: number
}

// 競合時は古いversionを画面へ残さず、再取得後の操作を促す
function shouldReloadAfterError(error: unknown): boolean {
    return error instanceof SavedBuildApiError && (
        error.code === "SAVED_BUILD_CONFLICT" ||
        error.code === "SAVED_BUILD_NOT_FOUND"
    )
}

// 保存構成一覧と変更系APIの状態をシミュレーターUIから分離
export function useSavedBuilds({
    enabled,
    reloadKey = 0,
}: UseSavedBuildsOptions) {
    const [builds, setBuilds] = useState<SavedBuild[]>([])
    const [hasLoaded, setHasLoaded] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [operation, setOperation] = useState<SavedBuildOperation | null>(null)
    const [errorMessage, setErrorMessage] = useState("")

    const reload = useCallback(async (signal?: AbortSignal) => {
        if (!enabled) {
            setBuilds([])
            setErrorMessage("")

            return
        }

        setIsLoading(true)

        try {
            const nextBuilds = await fetchSavedBuilds(signal)
            setBuilds(nextBuilds)
            setErrorMessage("")
        } catch (error) {
            if (!signal?.aborted) {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "保存構成一覧の取得に失敗しました",
                )
            }
        } finally {
            if (!signal?.aborted) {
                setIsLoading(false)
            }
        }
    }, [enabled])

    useEffect(() => {
        if (!enabled) {
            return
        }

        const controller = new AbortController()

        // 初回・移行完了時の取得は通信後にだけ状態を更新し、Effect直後の再描画を避ける
        async function load() {
            try {
                const nextBuilds = await fetchSavedBuilds(controller.signal)
                setBuilds(nextBuilds)
                setErrorMessage("")
            } catch (error) {
                if (!controller.signal.aborted) {
                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : "保存構成一覧の取得に失敗しました",
                    )
                }
            } finally {
                if (!controller.signal.aborted) {
                    setHasLoaded(true)
                }
            }
        }

        void load()

        return () => controller.abort()
    }, [enabled, reloadKey])

    const runOperation = useCallback(async <T,>(
        nextOperation: SavedBuildOperation,
        request: () => Promise<T>,
    ): Promise<T> => {
        setOperation(nextOperation)
        setErrorMessage("")

        try {
            return await request()
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "保存構成の操作に失敗しました",
            )

            if (shouldReloadAfterError(error)) {
                await reload()
            }

            throw error
        } finally {
            setOperation(null)
        }
    }, [reload])

    const create = useCallback(async (
        name: string,
        parts: SavedBuildPartInput[],
    ) => runOperation("create", async () => {
        const build = await createSavedBuild(name, parts)
        setBuilds((current) => [
            build,
            ...current.filter((candidate) => candidate.id !== build.id),
        ])

        return build
    }), [runOperation])

    const rename = useCallback(async (build: SavedBuild, name: string) => (
        runOperation("rename", async () => {
            const renamed = await renameSavedBuild(
                build.id,
                build.version,
                name,
            )
            setBuilds((current) => [
                renamed,
                ...current.filter((candidate) => candidate.id !== renamed.id),
            ])

            return renamed
        })
    ), [runOperation])

    const update = useCallback(async (
        build: SavedBuild,
        parts: SavedBuildPartInput[],
    ) => runOperation("update", async () => {
        const updated = await updateSavedBuild(
            build.id,
            build.version,
            build.name,
            parts,
        )
        setBuilds((current) => [
            updated,
            ...current.filter((candidate) => candidate.id !== updated.id),
        ])

        return updated
    }), [runOperation])

    const remove = useCallback(async (build: SavedBuild) => (
        runOperation("delete", async () => {
            await deleteSavedBuild(build.id, build.version)
            setBuilds((current) => current.filter(
                (candidate) => candidate.id !== build.id,
            ))
        })
    ), [runOperation])

    return {
        builds,
        create,
        errorMessage,
        isLoading: isLoading || (enabled && !hasLoaded),
        operation,
        reload,
        remove,
        rename,
        update,
    }
}

import {useCallback, useEffect, useRef, useState} from "react"

import {
    fetchConfigOrder,
    saveConfigOrder,
} from "@/api/configOrder"

type UseConfigOrderOptions = {
    enabled: boolean
    userId: string | null
    reloadKey?: number
}

// 固定構成だけでも一覧を安定させるため、読み込み前は空配列を使う
export function useConfigOrder({
    enabled,
    userId,
    reloadKey = 0,
}: UseConfigOrderOptions) {
    const [order, setOrder] = useState<string[]>([])
    const [hasLoaded, setHasLoaded] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [savingUserId, setSavingUserId] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState("")
    const [errorUserId, setErrorUserId] = useState<string | null>(null)
    const [errorReloadKey, setErrorReloadKey] = useState<number | null>(null)
    const [loadedUserId, setLoadedUserId] = useState<string | null>(null)
    const [loadedReloadKey, setLoadedReloadKey] = useState<number | null>(null)
    const currentUserIdRef = useRef(userId)
    const saveRequestIdRef = useRef(0)
    const pendingOrderRef = useRef<string[] | null>(null)
    const saveQueuePromiseRef = useRef<Promise<string[]> | null>(null)

    useEffect(() => {
        currentUserIdRef.current = userId
    }, [userId])

    const reload = useCallback(async (signal?: AbortSignal) => {
        const requestUserId = userId

        if (!enabled || !requestUserId) {
            setOrder([])
            setHasLoaded(false)
            setLoadedUserId(null)
            setLoadedReloadKey(null)
            setErrorMessage("")
            setErrorUserId(null)
            setErrorReloadKey(null)

            return
        }

        setIsLoading(true)

        try {
            const nextOrder = await fetchConfigOrder(signal)

            if (
                signal?.aborted ||
                currentUserIdRef.current !== requestUserId
            ) {
                return
            }

            setOrder(nextOrder)
            setErrorMessage("")
            setErrorUserId(null)
            setErrorReloadKey(null)
            setLoadedUserId(requestUserId)
            setLoadedReloadKey(reloadKey)
        } catch (error) {
            if (
                !signal?.aborted &&
                currentUserIdRef.current === requestUserId
            ) {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "構成の並び順の取得に失敗しました",
                )
                setErrorUserId(requestUserId)
                setErrorReloadKey(reloadKey)
            }
        } finally {
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

        if (!enabled || !requestUserId) {
            saveRequestIdRef.current += 1
            return
        }

        const controller = new AbortController()

        // ログイン後・保存構成の追加後にD1の表示順を取得
        async function load() {
            try {
                const nextOrder = await fetchConfigOrder(controller.signal)

                if (
                    controller.signal.aborted ||
                    currentUserIdRef.current !== requestUserId
                ) {
                    return
                }

                setOrder(nextOrder)
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
                            : "構成の並び順の取得に失敗しました",
                    )
                    setErrorUserId(requestUserId)
                    setErrorReloadKey(reloadKey)
                }
            } finally {
                if (
                    !controller.signal.aborted &&
                    currentUserIdRef.current === requestUserId
                ) {
                    setHasLoaded(true)
                    setIsLoading(false)
                }
            }
        }

        void load()

        return () => controller.abort()
    }, [enabled, reloadKey, userId])

    // ドラッグ操作をキューへまとめ、保存中の次の操作を破棄しない
    const save = useCallback(async (nextOrder: string[]) => {
        if (
            !enabled ||
            !userId ||
            loadedUserId !== userId
        ) {
            return
        }

        const requestUserId = userId
        setOrder(nextOrder)
        pendingOrderRef.current = nextOrder

        if (saveQueuePromiseRef.current) {
            return saveQueuePromiseRef.current
        }

        const processQueue = async () => {
            let lastSavedOrder = nextOrder

            while (
                pendingOrderRef.current &&
                currentUserIdRef.current === requestUserId
            ) {
                const orderToSave = pendingOrderRef.current
                pendingOrderRef.current = null
                const requestId = ++saveRequestIdRef.current

                setIsSaving(true)
                setSavingUserId(requestUserId)
                setErrorMessage("")
                setErrorUserId(null)
                setErrorReloadKey(null)

                try {
                    const savedOrder = await saveConfigOrder(orderToSave)

                    if (
                        currentUserIdRef.current === requestUserId &&
                        saveRequestIdRef.current === requestId
                    ) {
                        setOrder(savedOrder)
                        lastSavedOrder = savedOrder
                    }
                } catch (error) {
                    pendingOrderRef.current = null

                    if (
                        currentUserIdRef.current === requestUserId &&
                        saveRequestIdRef.current === requestId
                    ) {
                        setErrorMessage(
                            error instanceof Error
                                ? error.message
                                : "構成の並び順の保存に失敗しました",
                        )
                        setErrorUserId(requestUserId)
                        setErrorReloadKey(reloadKey)
                        await reload()
                    }

                    throw error
                } finally {
                    if (saveRequestIdRef.current === requestId) {
                        setIsSaving(false)
                        setSavingUserId(null)
                    }
                }
            }

            return lastSavedOrder
        }

        const queuePromise = processQueue()
        saveQueuePromiseRef.current = queuePromise

        void queuePromise.then(
            () => {
                if (saveQueuePromiseRef.current === queuePromise) {
                    saveQueuePromiseRef.current = null
                }
            },
            () => {
                if (saveQueuePromiseRef.current === queuePromise) {
                    saveQueuePromiseRef.current = null
                }
            },
        )

        return queuePromise
    }, [enabled, loadedUserId, reload, reloadKey, userId])

    const hasCurrentUserData = enabled && Boolean(userId) &&
        loadedUserId === userId && loadedReloadKey === reloadKey
    const hasCurrentError = Boolean(errorMessage) &&
        errorUserId === userId &&
        errorReloadKey === reloadKey

    return {
        errorMessage: hasCurrentError ? errorMessage : "",
        hasLoaded: hasCurrentUserData && hasLoaded,
        isLoading: enabled && (
            isLoading ||
            (!hasCurrentUserData && !hasCurrentError)
        ),
        isSaving: hasCurrentUserData && isSaving && savingUserId === userId,
        order: hasCurrentUserData ? order : [],
        reload,
        save,
    }
}

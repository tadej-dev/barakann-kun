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
    // order本体と「誰の・どのreloadKeyの結果か」を分けて、古い一覧を表示しない。
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

        // 未ログイン時は前ユーザーの並び順を残さず、次のログイン時に再取得する。
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

            // 取得中にログアウト・ユーザー切り替えが起きたレスポンスは適用しない。
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

        // 未ログイン時は取得処理を開始せず、進行中の保存結果も古いユーザーとして扱う。
        if (!enabled || !requestUserId) {
            saveRequestIdRef.current += 1
            return
        }

        const controller = new AbortController()

        // ログイン後・保存構成の追加後にD1の表示順を取得
        async function load() {
            try {
                const nextOrder = await fetchConfigOrder(controller.signal)

                // 画面が破棄された、またはユーザーが変わった場合は状態を更新しない。
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
        // 表示順の初期取得前に保存すると、未取得の項目を欠落させるため送信しない。
        if (
            !enabled ||
            !userId ||
            loadedUserId !== userId
        ) {
            return
        }

        const requestUserId = userId
        // UIは先に並び替え、API保存はキューで後追いするためドラッグ操作を遅延させない。
        setOrder(nextOrder)
        pendingOrderRef.current = nextOrder

        // 既存リクエストがある場合は最新のpendingOrderだけを後続処理へ渡す。
        if (saveQueuePromiseRef.current) {
            return saveQueuePromiseRef.current
        }

        const processQueue = async () => {
            let lastSavedOrder = nextOrder

            while (
                pendingOrderRef.current &&
                currentUserIdRef.current === requestUserId
            ) {
                // pendingOrderが更新されている間だけ、最新の順序を順番に保存する。
                // 連続ドラッグでは、APIへ送る直前の最新順を一件ずつ処理する。
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

                    // 後から開始した保存やユーザー切り替えで、古い応答を画面へ戻さない。
                    if (
                        currentUserIdRef.current === requestUserId &&
                        saveRequestIdRef.current === requestId
                    ) {
                        setOrder(savedOrder)
                        lastSavedOrder = savedOrder
                    }
                } catch (error) {
                    // 並び順の競合・失敗後に古い順序を再送しないよう、待機中の値を破棄する。
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

        // queuePromiseを共有し、同時に発生したドラッグ操作が同じ保存チェーンへ合流する。
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
        // 取得対象と一致しないデータは、認証切り替え直後の一時表示として公開しない。
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

import {useCallback, useEffect, useRef, useState} from "react"

import {
    clearConfigSlot,
    fetchConfigSlots,
    renameConfigSlot,
    saveConfigSlot,
    type ConfigSlot,
} from "@/api/configSlots"
import type {SavedBuildPartInput} from "@/api/savedBuilds"
import {
    CONFIG_IDS,
} from "@/features/simulator/simulatorTypes"

type ConfigSlotOperation = "rename" | "save" | "clear"

type UseConfigSlotsOptions = {
    enabled: boolean
    userId: string | null
    reloadKey?: number
}

// 未保存の固定構成を画面へ表示する既定値
function createDefaultConfigSlots(): ConfigSlot[] {
    // 未ログイン時の表示とAPI失敗時のフォールバックを同じ初期名で揃える。
    return CONFIG_IDS.map((configId) => ({
        configId,
        name: `構成${configId}`,
        version: 0,
        updatedAt: null,
        parts: [],
    }))
}

// 構成1〜4のD1同期と変更処理をUIから分離
export function useConfigSlots({
    enabled,
    userId,
    reloadKey = 0,
}: UseConfigSlotsOptions) {
    // 固定枠の値と読み込み・操作対象ユーザーを別々に管理する。
    const [slots, setSlots] = useState(createDefaultConfigSlots)
    const [hasLoadedSuccessfully, setHasLoadedSuccessfully] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [operation, setOperation] = useState<ConfigSlotOperation | null>(null)
    const [operationUserId, setOperationUserId] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState("")
    const [errorUserId, setErrorUserId] = useState<string | null>(null)
    const [errorReloadKey, setErrorReloadKey] = useState<number | null>(null)
    const [loadedUserId, setLoadedUserId] = useState<string | null>(null)
    const [loadedReloadKey, setLoadedReloadKey] = useState<number | null>(null)
    const currentUserIdRef = useRef(userId)
    const operationRequestIdRef = useRef(0)

    useEffect(() => {
        currentUserIdRef.current = userId
    }, [userId])

    const reload = useCallback(async (signal?: AbortSignal) => {
        const requestUserId = userId

        // 未ログイン時は前ユーザーの固定構成を表示せず、未保存の既定値へ戻す。
        if (!enabled || !requestUserId) {
            setSlots(createDefaultConfigSlots())
            setHasLoadedSuccessfully(false)
            setLoadedUserId(null)
            setLoadedReloadKey(null)
            setErrorMessage("")
            setErrorUserId(null)
            setErrorReloadKey(null)

            return []
        }

        setIsLoading(true)

        try {
            const nextSlots = await fetchConfigSlots(signal)

            // 取得開始後にユーザーが変わった場合、前ユーザーの構成を新しい画面へ混ぜない。
            if (
                signal?.aborted ||
                currentUserIdRef.current !== requestUserId
            ) {
                return undefined
            }

            setSlots(nextSlots)
            setErrorMessage("")
            setErrorUserId(null)
            setErrorReloadKey(null)
            setHasLoadedSuccessfully(true)
            setLoadedUserId(requestUserId)
            setLoadedReloadKey(reloadKey)

            return nextSlots
        } catch (error) {
            if (
                !signal?.aborted &&
                currentUserIdRef.current === requestUserId
            ) {
                setHasLoadedSuccessfully(false)
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "構成の取得に失敗しました",
                )
                setErrorUserId(requestUserId)
                setErrorReloadKey(reloadKey)
            }

            return undefined
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

        // 認証されていない間はD1取得を開始しない。
        if (!enabled || !requestUserId) {
            return
        }

        const controller = new AbortController()

        // ログイン後・保存構成の移行後にD1の固定構成を取得
        async function load() {
            try {
                const nextSlots = await fetchConfigSlots(controller.signal)

                // アンマウント後・ユーザー切り替え後の応答はReact stateへ反映しない。
                if (
                    controller.signal.aborted ||
                    currentUserIdRef.current !== requestUserId
                ) {
                    return
                }

                setSlots(nextSlots)
                setErrorMessage("")
                setErrorUserId(null)
                setErrorReloadKey(null)
                setHasLoadedSuccessfully(true)
                setLoadedUserId(requestUserId)
                setLoadedReloadKey(reloadKey)
            } catch (error) {
                if (
                    !controller.signal.aborted &&
                    currentUserIdRef.current === requestUserId
                ) {
                    setHasLoadedSuccessfully(false)
                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : "構成の取得に失敗しました",
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

    // 未ログイン中はD1の値を表示せず、固定スロットの既定名へ戻す
    const visibleSlots = enabled ? slots : createDefaultConfigSlots()

    const runOperation = useCallback(async <T,>(
        nextOperation: ConfigSlotOperation,
        request: () => Promise<T>,
    ): Promise<T> => {
        // 名称変更・パーツ保存・クリアで共通する操作中表示と競合エラー処理をまとめる。
        const requestUserId = userId
        const requestId = ++operationRequestIdRef.current
        setOperation(nextOperation)
        setOperationUserId(requestUserId)
        setErrorMessage("")
        setErrorUserId(null)
        setErrorReloadKey(null)

        try {
            return await request()
        } catch (error) {
            if (
                currentUserIdRef.current === requestUserId &&
                operationRequestIdRef.current === requestId
            ) {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "構成の操作に失敗しました",
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

    const replaceSlot = useCallback((
        nextSlot: ConfigSlot,
        expectedUserId: string | null,
    ) => {
        // API応答が返るまでにログアウトした場合、前ユーザーの結果を画面へ戻さない。
        if (
            !expectedUserId ||
            currentUserIdRef.current !== expectedUserId
        ) {
            return
        }

        setSlots((current) => current.map((slot) =>
            slot.configId === nextSlot.configId ? nextSlot : slot,
        ))
    }, [])

    const rename = useCallback(async (
        slot: ConfigSlot,
        name: string,
    ) => {
        const requestUserId = userId

        return runOperation("rename", async () => {
            // PATCH結果を受け取った固定枠だけ差し替える。
            const renamed = await renameConfigSlot(
                slot.configId,
                slot.version,
                name,
            )
            replaceSlot(renamed, requestUserId)

            return renamed
        })
    }, [replaceSlot, runOperation, userId])

    const save = useCallback(async (
        slot: ConfigSlot,
        name: string,
        parts: SavedBuildPartInput[],
    ) => {
        const requestUserId = userId

        return runOperation("save", async () => {
            // 現在のパーツ配列と名前をPUTし、返却されたversionを保持する。
            const saved = await saveConfigSlot(
                slot.configId,
                slot.version,
                name,
                parts,
            )
            replaceSlot(saved, requestUserId)

            return saved
        })
    }, [replaceSlot, runOperation, userId])

    const clear = useCallback(async (slot: ConfigSlot) => {
        const requestUserId = userId

        return runOperation("clear", async () => {
            // DELETE後の空スロットを一覧へ反映し、次の自動保存が新versionを使えるようにする。
            const cleared = await clearConfigSlot(
                slot.configId,
                slot.version,
            )
            replaceSlot(cleared, requestUserId)

            return cleared
        })
    }, [replaceSlot, runOperation, userId])

    const hasCurrentUserData = enabled && Boolean(userId) &&
        loadedUserId === userId && loadedReloadKey === reloadKey
    const hasCurrentError = Boolean(errorMessage) &&
        errorUserId === userId &&
        errorReloadKey === reloadKey

    return {
        clear,
        errorMessage: hasCurrentError ? errorMessage : "",
        hasLoadedSuccessfully: hasCurrentUserData && hasLoadedSuccessfully,
        isLoading: enabled && (
            isLoading ||
            (!hasCurrentUserData && !hasCurrentError)
        ),
        operation: hasCurrentUserData && operationUserId === userId
            ? operation
            : null,
        reload,
        rename,
        save,
        slots: hasCurrentUserData ? visibleSlots : createDefaultConfigSlots(),
    }
}

import {useCallback, useEffect, useRef, useState} from "react"

import {
    AUTH_LOGOUT_FLUSH_EVENT,
    type LogoutFlushDetail,
} from "@/features/auth/authEvents"

import {toSavedBuildParts} from "@/features/saved-builds/savedBuildMapper"
import type {ConfigCollection} from "@/features/simulator/useConfigCollection"
import type {
    ConfigId,
    SelectedParts,
} from "@/features/simulator/simulatorTypes"

// 保存待ち時間
const AUTO_SAVE_DELAY_MS = 800

type UseConfigAutoSaveProps = {
    collection: ConfigCollection
    selectedParts: SelectedParts // 編集中パーツ
    activeConfigId: ConfigId // 編集中の構成
    isConfigLoading: boolean // 読み込み中
    isActiveConfigLoaded: boolean // 未読込
    autoSaveEnabled: boolean // 復元中
}

// パーツの組み合わせを比較するためのキーを作る
function createPartsFingerprint(
    parts: {slotKey: string; partId: number}[],
): string {
    return parts
        .map((part) => `${part.slotKey}:${part.partId}`)
        .sort()
        .join("|")
}

// 編集中の構成の変更を、待ち時間の後に保存する
// 未ログイン時はlocalStorage、ログイン時はAPIへ保存する
export function useConfigAutoSave({
    collection,
    selectedParts,
    activeConfigId,
    isConfigLoading,
    isActiveConfigLoaded,
    autoSaveEnabled,
}: UseConfigAutoSaveProps) {
    const {
        configs,
        configsOperation,
        updateConfig,
    } = collection

    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const inFlightRef = useRef(false)
    // 実行中の保存。ログアウト時の確定依頼で完了を待つ
    const inFlightPromiseRef = useRef<Promise<boolean> | null>(null)
    const pendingRef = useRef(false)
    const fingerprintRef = useRef("")
    const currentConfigIdRef = useRef(activeConfigId)
    const [revision, setRevision] = useState(0)
    // 非同期処理から最新の状態を参照するためのref
    const latestRef = useRef({
        configs,
        selectedParts,
        autoSaveEnabled,
        isActiveConfigLoaded,
        isConfigLoading,
    })

    useEffect(() => {
        currentConfigIdRef.current = activeConfigId
    }, [activeConfigId])

    useEffect(() => {
        latestRef.current = {
            configs,
            selectedParts,
            autoSaveEnabled,
            isActiveConfigLoaded,
            isConfigLoading,
        }
    }, [
        configs,
        selectedParts,
        autoSaveEnabled,
        isActiveConfigLoaded,
        isConfigLoading,
    ])

    const save = useCallback(async (): Promise<boolean> => {
        const latest = latestRef.current
        const config = latest.configs.find((candidate) =>
            candidate.id === currentConfigIdRef.current)

        if (!config) {
            return false
        }

        const parts = toSavedBuildParts(latest.selectedParts)
        inFlightRef.current = true

        const task = (async (): Promise<boolean> => {
            try {
                await updateConfig(config, parts)
                // 同じ構成・同じ内容の再保存を抑止する
                fingerprintRef.current =
                    `${config.id}:${createPartsFingerprint(parts)}`

                return true
            } catch {
                // 失敗時は次回の変更で再試行する
                return false
            } finally {
                inFlightRef.current = false

                if (pendingRef.current) {
                    pendingRef.current = false
                    setRevision((current) => current + 1)
                }
            }
        })()

        inFlightPromiseRef.current = task

        try {
            return await task
        } finally {
            if (inFlightPromiseRef.current === task) {
                inFlightPromiseRef.current = null
            }
        }
    }, [updateConfig])

    // ログアウト直前に、待機中の自動保存を確定させる
    useEffect(() => {
        async function flushPendingSave(event: Event) {
            const detail = (event as CustomEvent<LogoutFlushDetail>).detail

            if (!detail) {
                return
            }

            // 依頼を処理したことを示し、保存できたかを返す
            detail.handled = true
            const finish = (ok: boolean) => detail.respond(ok)

            // 待機中のタイマーがあれば取り消し、その場で保存する
            if (timerRef.current) {
                clearTimeout(timerRef.current)
                timerRef.current = undefined
            }

            // 実行中の保存があれば、終わるまで待つ
            if (inFlightPromiseRef.current) {
                const ok = await inFlightPromiseRef.current

                if (!ok) {
                    finish(false)
                    return
                }
            }

            // 待機中に別の保存が始まっていた場合も、もう一度待つ
            if (inFlightPromiseRef.current) {
                const ok = await inFlightPromiseRef.current

                if (!ok) {
                    finish(false)
                    return
                }
            }

            const latest = latestRef.current

            if (!latest.autoSaveEnabled || !latest.isActiveConfigLoaded ||
                latest.isConfigLoading) {
                finish(false)
                return
            }

            const config = latest.configs.find((candidate) =>
                candidate.id === currentConfigIdRef.current)

            // 対象構成が無い場合は保存できない
            if (!config) {
                finish(false)
                return
            }

            const parts = toSavedBuildParts(latest.selectedParts)
            const fingerprint =
                `${config.id}:${createPartsFingerprint(parts)}`
            const loadedFingerprint =
                `${config.id}:${createPartsFingerprint(config.parts)}`

            // 読み込み時と同じ、またはこのセッションで保存済みなら追加の保存は不要
            if (fingerprint === loadedFingerprint ||
                fingerprint === fingerprintRef.current) {
                finish(true)
                return
            }

            // 明示操作中でも、保存はサーバー側のversionで守られるためここでは止めない
            // 保存後に加えた変更があれば、最新の状態でもう一度保存する
            const ok = await save()

            finish(ok)
        }

        window.addEventListener(AUTH_LOGOUT_FLUSH_EVENT, flushPendingSave)

        return () => {
            window.removeEventListener(AUTH_LOGOUT_FLUSH_EVENT, flushPendingSave)
        }
    }, [save])

    useEffect(() => {
        // 初期取得中・明示操作中は、未確定の状態を自動保存しない
        if (
            !autoSaveEnabled ||
            !activeConfigId ||
            !isActiveConfigLoaded ||
            isConfigLoading ||
            configsOperation !== null
        ) {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
                timerRef.current = undefined
            }

            return
        }

        const config = configs.find((candidate) =>
            candidate.id === activeConfigId)

        // 一覧の再取得直後など、対象構成がまだ見つからない段階では保存を予約しない
        if (!config) {
            return
        }

        const parts = toSavedBuildParts(selectedParts)
        const fingerprint = `${config.id}:${createPartsFingerprint(parts)}`
        const savedFingerprint =
            `${config.id}:${createPartsFingerprint(config.parts)}`

        // 保存済みと同じ内容、または同じ内容を送信済みなら保存しない
        if (fingerprint === savedFingerprint ||
            fingerprintRef.current === fingerprint
        ) {
            return
        }

        if (inFlightRef.current) {
            // 保存中も最新の変更だけをpendingとして残す
            pendingRef.current = true

            return
        }

        if (timerRef.current) {
            clearTimeout(timerRef.current)
        }

        timerRef.current = setTimeout(() => {
            timerRef.current = undefined
            void save()
        }, AUTO_SAVE_DELAY_MS)

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
                timerRef.current = undefined
            }
        }
    }, [
        activeConfigId,
        autoSaveEnabled,
        configs,
        configsOperation,
        isActiveConfigLoaded,
        isConfigLoading,
        revision,
        save,
        selectedParts,
    ])
}

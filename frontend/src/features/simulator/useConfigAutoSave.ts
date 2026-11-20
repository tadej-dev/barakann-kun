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
    const pendingRef = useRef(false)
    const fingerprintRef = useRef("")
    const currentConfigIdRef = useRef(activeConfigId)
    const [revision, setRevision] = useState(0)

    useEffect(() => {
        currentConfigIdRef.current = activeConfigId
    }, [activeConfigId])

    const save = useCallback(async (): Promise<boolean> => {
        const config = configs.find((candidate) =>
            candidate.id === currentConfigIdRef.current)

        if (!config) {
            return false
        }

        const parts = toSavedBuildParts(selectedParts)
        inFlightRef.current = true

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
    }, [configs, selectedParts, updateConfig])

    // ログアウト直前に、待機中の自動保存を確定させる
    useEffect(() => {
        function flushPendingSave(event: Event) {
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

            // 保存中・操作中・読み込み中は、確実に保存できたと言えないため失敗とする
            if (inFlightRef.current ||
                !autoSaveEnabled || !isActiveConfigLoaded ||
                isConfigLoading || configsOperation !== null) {
                finish(false)
                return
            }

            const config = configs.find((candidate) =>
                candidate.id === activeConfigId)

            // 対象構成が無い場合は保存できない
            if (!config) {
                finish(false)
                return
            }

            const parts = toSavedBuildParts(selectedParts)

            // 保存対象が無ければ、そのまま完了を通知する
            if (`${config.id}:${createPartsFingerprint(parts)}` ===
                `${config.id}:${createPartsFingerprint(config.parts)}`) {
                finish(true)
                return
            }

            void save().then(finish)
        }

        window.addEventListener(AUTH_LOGOUT_FLUSH_EVENT, flushPendingSave)

        return () => {
            window.removeEventListener(AUTH_LOGOUT_FLUSH_EVENT, flushPendingSave)
        }
    }, [
        autoSaveEnabled,
        isActiveConfigLoaded,
        isConfigLoading,
        configsOperation,
        configs,
        activeConfigId,
        selectedParts,
        save,
    ])

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

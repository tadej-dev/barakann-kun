import {useCallback, useEffect, useRef, useState} from "react"

import {toSavedBuildParts} from "@/features/saved-builds/savedBuildMapper"
import type {ConfigCollection} from "@/features/simulator/useConfigCollection"
import type {
    ConfigId,
    SelectedParts,
} from "@/features/simulator/simulatorTypes"

// 変更が落ち着いてから保存するまでの待ち時間
const AUTO_SAVE_DELAY_MS = 800

type UseConfigAutoSaveProps = {
    collection: ConfigCollection
    selectedParts: SelectedParts // 現在編集中のパーツ
    activeConfigId: ConfigId // 編集中の構成
    isConfigLoading: boolean // 構成の読み込み中は保存しない
    isActiveConfigLoaded: boolean // 保存内容を読み込む前の構成は上書きしない
    autoSaveEnabled: boolean // 復元が終わるまでは保存しない
}

// パーツの組み合わせを比較するための指紋
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

    const save = useCallback(async () => {
        const config = configs.find((candidate) =>
            candidate.id === currentConfigIdRef.current)

        if (!config) {
            return
        }

        const parts = toSavedBuildParts(selectedParts)
        inFlightRef.current = true

        try {
            await updateConfig(config, parts)
            // 同じ構成・同じ内容の再保存を抑止する
            fingerprintRef.current =
                `${config.id}:${createPartsFingerprint(parts)}`
        } catch {
            // 失敗時は次回の変更で再試行する
        } finally {
            inFlightRef.current = false

            if (pendingRef.current) {
                pendingRef.current = false
                setRevision((current) => current + 1)
            }
        }
    }, [configs, selectedParts, updateConfig])

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

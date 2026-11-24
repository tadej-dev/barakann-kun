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

// useConfigAutoSaveが受け取るプロパティ
type UseConfigAutoSaveProps = {
    collection: ConfigCollection // 構成一覧と保存処理
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

    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined) // 自動保存の待機タイマー
    const inFlightRef = useRef(false) // 保存処理の実行中フラグ
    const inFlightPromiseRef = useRef<Promise<boolean> | null>(null) // 実行中の保存。ログアウト時の確定依頼で完了を待つ
    const pendingRef = useRef(false) // 保存中に変更があったか
    const fingerprintRef = useRef("") // 最後に保存した内容の指紋
    const currentConfigIdRef = useRef(activeConfigId) // 非同期処理から最新の構成IDを参照するための記録
    const [revision, setRevision] = useState(0) // 保存完了後に自動保存を再評価するための更新番号
    const latestRef = useRef({ // 非同期処理から最新の状態を参照するためのref
        configs,
        selectedParts,
        autoSaveEnabled,
        isActiveConfigLoaded,
        isConfigLoading,
    })

    // 最新の構成IDを非同期処理向けに記録
    useEffect(() => {
        currentConfigIdRef.current = activeConfigId
    }, [activeConfigId])

    // 最新の保存対象を非同期処理向けに記録
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

    const save = useCallback(async (): Promise<boolean> => { // 編集中の構成を現在の選択内容で保存し、成功したかを返す
        const latest = latestRef.current // 保存時点の最新状態
        const config = latest.configs.find((candidate) => // 編集中の構成
            candidate.id === currentConfigIdRef.current)

        // 対象構成が無ければ保存しない
        if (!config) {
            return false
        }

        // 保存するパーツ一覧（スロットキーとID）
        const parts = toSavedBuildParts(latest.selectedParts)
        inFlightRef.current = true

        // 保存処理本体（成功時は送信内容を記録）
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

                // 保存中の変更は完了後にもう一度保存
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
            // 完了した保存が最新の実行中保存なら参照を消す
            if (inFlightPromiseRef.current === task) {
                inFlightPromiseRef.current = null
            }
        }
    }, [updateConfig])

    // ログアウト直前に、待機中の自動保存を確定させる
    useEffect(() => {
        // 自動保存の確定依頼を受け、保存できたかを返す
        async function flushPendingSave(event: Event) {
            // 確定依頼の内容（handled・respond）
            const detail = (event as CustomEvent<LogoutFlushDetail>).detail

            // 依頼内容が無いイベントは処理しない
            if (!detail) {
                return
            }

            // 依頼を処理したことを示し、保存できたかを返す
            detail.handled = true
            // 保存結果を確定依頼の応答として返す関数
            const finish = (ok: boolean) => detail.respond(ok)

            // 待機中のタイマーがあれば取り消し、その場で保存する
            if (timerRef.current) {
                clearTimeout(timerRef.current)
                timerRef.current = undefined
            }

            // 実行中の保存があれば、終わるまで待つ
            if (inFlightPromiseRef.current) {
                const ok = await inFlightPromiseRef.current

                // 実行中の保存が失敗したら確定依頼に失敗を返す
                if (!ok) {
                    finish(false)
                    return
                }
            }

            // 待機中に別の保存が始まっていた場合も、もう一度待つ
            if (inFlightPromiseRef.current) {
                const ok = await inFlightPromiseRef.current

                // 待機後に開始された保存が失敗したら確定依頼に失敗を返す
                if (!ok) {
                    finish(false)
                    return
                }
            }

            // 確定時点の最新状態
            const latest = latestRef.current

            // 自動保存できない状態なら確定依頼に失敗を返す
            if (!latest.autoSaveEnabled || !latest.isActiveConfigLoaded ||
                latest.isConfigLoading) {
                finish(false)
                return
            }

            // 編集中の構成
            const config = latest.configs.find((candidate) =>
                candidate.id === currentConfigIdRef.current)

            // 対象構成が無い場合は保存できない
            if (!config) {
                finish(false)
                return
            }

            // 保存するパーツ一覧
            const parts = toSavedBuildParts(latest.selectedParts)
            // 選択中の内容の指紋
            const fingerprint =
                `${config.id}:${createPartsFingerprint(parts)}`
            // 保存済みの内容の指紋
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
            // 確定のための保存結果
            const ok = await save()

            finish(ok)
        }

        window.addEventListener(AUTH_LOGOUT_FLUSH_EVENT, flushPendingSave)

        return () => {
            window.removeEventListener(AUTH_LOGOUT_FLUSH_EVENT, flushPendingSave)
        }
    }, [save])

    // パーツ変更を検知し、待ち時間後に自動保存を予約
    useEffect(() => {
        // 初期取得中・明示操作中は、未確定の状態を自動保存しない
        if (
            !autoSaveEnabled ||
            !activeConfigId ||
            !isActiveConfigLoaded ||
            isConfigLoading ||
            configsOperation !== null
        ) {
            // 待機中の予約があれば取り消す
            if (timerRef.current) {
                clearTimeout(timerRef.current)
                timerRef.current = undefined
            }

            return
        }

        // 編集中の構成
        const config = configs.find((candidate) =>
            candidate.id === activeConfigId)

        // 一覧の再取得直後など、対象構成がまだ見つからない段階では保存を予約しない
        if (!config) {
            return
        }

        // 保存するパーツ一覧
        const parts = toSavedBuildParts(selectedParts)
        // 選択中の内容の指紋
        const fingerprint = `${config.id}:${createPartsFingerprint(parts)}`
        // 保存済みの内容の指紋
        const savedFingerprint =
            `${config.id}:${createPartsFingerprint(config.parts)}`

        // 保存済みと同じ内容、または同じ内容を送信済みなら保存しない
        if (fingerprint === savedFingerprint ||
            fingerprintRef.current === fingerprint
        ) {
            return
        }

        // 保存中なら最新の変更を保留として記録
        if (inFlightRef.current) {
            // 保存中も最新の変更だけをpendingとして残す
            pendingRef.current = true

            return
        }

        // 既存の予約を取り消してから新しい予約を作る
        if (timerRef.current) {
            clearTimeout(timerRef.current)
        }

        timerRef.current = setTimeout(() => {
            timerRef.current = undefined
            void save()
        }, AUTO_SAVE_DELAY_MS)

        return () => {
            // 再実行時に古い予約を取り消す
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

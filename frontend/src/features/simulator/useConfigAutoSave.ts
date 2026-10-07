import {useEffect, useRef, useState} from "react"

import {
    ConfigSlotApiError,
    type ConfigSlot,
} from "@/api/configSlots"
import {
    SavedBuildApiError,
    type SavedBuild,
    type SavedBuildPartInput,
} from "@/api/savedBuilds"
import {toSavedBuildPartInputs} from "@/features/saved-builds/savedBuildMapper"
import type {ConfigCollection} from "@/features/simulator/useConfigCollection"
import type {
    ConfigId,
    ConfigStates,
    SelectedParts,
} from "@/features/simulator/simulatorTypes"

// 自動保存が別端末の更新とぶつかった構成
export type AutoSaveConflict =
    | {type: "slot"; configId: ConfigId}
    | {type: "build"; buildId: string}

// 競合の解決方法(最新を読み込む／この端末で上書き)
export type AutoSaveConflictResolution = "reload" | "overwrite"

type UseConfigAutoSaveProps = {
    collection: ConfigCollection // 保存先の構成データと保存処理
    configStates: ConfigStates // 構成1〜4の選択パーツ
    selectedParts: SelectedParts // 選択中の構成のパーツ(追加構成の保存に使う)
    activeConfigId: ConfigId
    activeSavedBuildId: string | null
    isSavedBuildLoading: boolean // 追加構成の読み込み中は保存しない
    autoSaveEnabled: boolean // 初期復元・移行完了後だけ自動保存する
    onConfigChange: (configId: ConfigId) => void
    onRestoreConfigSlot: (slot: ConfigSlot) => Promise<void>
    onRestoreSavedBuild: (build: SavedBuild) => Promise<void>
}

// 自動保存の待ち時間(ミリ秒)。短時間の連続変更は最後の状態だけを保存する。
const AUTO_SAVE_DELAY_MS = 800

// パーツ順に依存しない自動保存比較用の識別値を作成
function createPartsFingerprint(parts: SavedBuildPartInput[]): string {
    // 同じ選択内容なら保存順が違っても同じ指紋になり、不要なPUTを省略できる。
    return parts
        .slice()
        .sort((first, second) => first.slotKey.localeCompare(second.slotKey))
        .map((part) => `${part.slotKey}=${part.partId}`)
        .join("&")
}

// 選択内容の変更を、固定枠・追加構成へ自動保存する
// 構成一覧の表示とは関係なく、選択中のパーツとサーバーの保存内容を同期する処理のため、
// 画面の上位(Simulator)で呼ぶ。
export function useConfigAutoSave({
    collection,
    configStates,
    selectedParts,
    activeConfigId,
    activeSavedBuildId,
    isSavedBuildLoading,
    autoSaveEnabled,
    onConfigChange,
    onRestoreConfigSlot,
    onRestoreSavedBuild,
}: UseConfigAutoSaveProps) {
    const {
        isAuthenticated,
        authUserId,
        slots,
        slotOperation,
        isSlotsLoading,
        hasLoadedConfigSlots,
        saveSlot,
        reloadConfigSlots,
        savedBuilds,
        savedBuildsOperation,
        updateSavedBuild,
        reloadSavedBuilds,
    } = collection

    // 自動保存の進行状況は再描画で失わないようrefで持つ。
    const autoSaveTimersRef = useRef<Partial<Record<ConfigId, ReturnType<typeof setTimeout>>>>({})
    const autoSaveInFlightRef = useRef<Partial<Record<ConfigId, boolean>>>({})
    const autoSavePendingRef = useRef<Partial<Record<ConfigId, boolean>>>({})
    const autoSaveFingerprintsRef = useRef<Partial<Record<ConfigId, string>>>({})
    const [autoSaveRevision, setAutoSaveRevision] = useState(0)
    const savedBuildAutoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const savedBuildAutoSaveInFlightRef = useRef(false)
    const savedBuildAutoSavePendingRef = useRef(false)
    const savedBuildAutoSaveBuildIdRef = useRef<string | null>(null)
    const savedBuildAutoSaveFingerprintRef = useRef("")
    const blockedAutoSaveSlotsRef = useRef<Partial<Record<ConfigId, boolean>>>({})
    const blockedSavedBuildIdRef = useRef<string | null>(null)
    const [autoSaveConflict, setAutoSaveConflict] =
        useState<AutoSaveConflict | null>(null)
    const [savedBuildAutoSaveRevision, setSavedBuildAutoSaveRevision] =
        useState(0)
    const currentAuthUserIdRef = useRef(authUserId)
    const previousAuthUserIdRef = useRef(authUserId)

    // 認証ユーザーが変わったら、前ユーザーの自動保存キューと競合表示を破棄
    useEffect(() => {
        currentAuthUserIdRef.current = authUserId

        // 初回実行では前回値と同じため、破棄処理は認証ユーザーの切り替え時だけ行う。
        if (previousAuthUserIdRef.current === authUserId) {
            return
        }

        previousAuthUserIdRef.current = authUserId

        for (const timer of Object.values(autoSaveTimersRef.current)) {
            if (timer) {
                clearTimeout(timer)
            }
        }

        autoSaveTimersRef.current = {}
        autoSaveInFlightRef.current = {}
        autoSavePendingRef.current = {}
        autoSaveFingerprintsRef.current = {}

        if (savedBuildAutoSaveTimerRef.current) {
            clearTimeout(savedBuildAutoSaveTimerRef.current)
            savedBuildAutoSaveTimerRef.current = undefined
        }

        savedBuildAutoSaveInFlightRef.current = false
        savedBuildAutoSavePendingRef.current = false
        savedBuildAutoSaveBuildIdRef.current = null
        savedBuildAutoSaveFingerprintRef.current = ""
        blockedAutoSaveSlotsRef.current = {}
        blockedSavedBuildIdRef.current = null

        // 前ユーザーの競合表示を残さない。
        setAutoSaveConflict(null)
    }, [authUserId])

    // 選択内容が落ち着いた後に、変更された固定構成だけを非同期保存
    useEffect(() => {
        // 未ログイン・初期取得中・明示操作中は、未確定の状態を自動保存しない。
        if (
            !isAuthenticated ||
            !autoSaveEnabled ||
            !hasLoadedConfigSlots ||
            isSlotsLoading ||
            slotOperation !== null
        ) {
            return
        }

        const requestUserId = authUserId

        for (const slot of slots) {
            const localParts = toSavedBuildPartInputs(
                configStates[slot.configId],
            )
            const localFingerprint = createPartsFingerprint(localParts)
            const savedFingerprint = createPartsFingerprint(slot.parts)

            // 競合した構成は、利用者が解決方法を選ぶまで自動上書きしない
            if (blockedAutoSaveSlotsRef.current[slot.configId]) {
                continue
            }

            if (
                localFingerprint === savedFingerprint ||
                autoSaveFingerprintsRef.current[slot.configId] === localFingerprint
            ) {
                // 保存済みと同じ状態、または同一指紋を既に送信済みならタイマーを作らない。
                continue
            }

            if (autoSaveInFlightRef.current[slot.configId]) {
                // 保存中の変更はpendingへ記録し、現在のリクエスト完了後に再評価する。
                autoSavePendingRef.current[slot.configId] = true

                continue
            }

            const existingTimer = autoSaveTimersRef.current[slot.configId]

            // 同じ構成を短時間に何度も変更した場合は、最後の状態だけを保存する。
            if (existingTimer) {
                clearTimeout(existingTimer)
            }

            autoSaveTimersRef.current[slot.configId] = setTimeout(() => {
                // タイマー発火前にログアウト・ユーザー切り替えが起きた場合は送信しない。
                if (currentAuthUserIdRef.current !== requestUserId) {
                    return
                }

                autoSaveTimersRef.current[slot.configId] = undefined
                autoSaveInFlightRef.current[slot.configId] = true

                void saveSlot(slot, slot.name, localParts)
                    .then(() => {
                        // 成功した指紋だけを記録し、失敗した状態を保存済みと誤認しない。
                        if (currentAuthUserIdRef.current === requestUserId) {
                            autoSaveFingerprintsRef.current[slot.configId] =
                                localFingerprint
                        }
                    })
                    .catch((error) => {
                        // 競合だけを自動保存停止対象とし、その他の一時エラーは通常のエラー表示へ渡す。
                        if (
                            error instanceof ConfigSlotApiError &&
                            (error.code === "CONFIG_SLOT_CONFLICT" ||
                                error.code === "CONFIG_SLOT_NOT_FOUND")
                        ) {
                            blockedAutoSaveSlotsRef.current[slot.configId] = true
                            setAutoSaveConflict({
                                type: "slot",
                                configId: slot.configId,
                            })
                        }

                        // 競合後に最新versionで自動再試行すると他端末の変更を上書きするため停止
                    })
                    .finally(() => {
                        // 保留変更があればrevisionを増やし、Effectで最新状態を再度判定する。
                        if (currentAuthUserIdRef.current !== requestUserId) {
                            return
                        }

                        autoSaveInFlightRef.current[slot.configId] = false

                        if (autoSavePendingRef.current[slot.configId]) {
                            autoSavePendingRef.current[slot.configId] = false
                            setAutoSaveRevision((current) => current + 1)
                        }
                    })
            }, AUTO_SAVE_DELAY_MS)
        }

        const timers = autoSaveTimersRef.current

        return () => {
            for (const timer of Object.values(timers)) {
                if (timer) {
                    clearTimeout(timer)
                }
            }
        }
    }, [
        autoSaveEnabled,
        autoSaveRevision,
        configStates,
        hasLoadedConfigSlots,
        authUserId,
        isAuthenticated,
        isSlotsLoading,
        slotOperation,
        saveSlot,
        slots,
    ])

    // 追加構成の選択内容も固定構成と同じく、変更が落ち着いた後に非同期保存
    useEffect(() => {
        // 追加構成を選択していない間は、固定構成の自動保存だけを対象にする。
        if (
            !isAuthenticated ||
            !autoSaveEnabled ||
            !activeSavedBuildId ||
            isSavedBuildLoading ||
            savedBuildsOperation !== null
        ) {
            if (savedBuildAutoSaveTimerRef.current) {
                clearTimeout(savedBuildAutoSaveTimerRef.current)
                savedBuildAutoSaveTimerRef.current = undefined
            }

            return
        }

        const requestUserId = authUserId

        const build = savedBuilds.find((candidate) =>
            candidate.id === activeSavedBuildId,
        )

        // 一覧の再取得直後など、対象構成がまだ見つからない段階では保存を予約しない。
        if (!build) {
            return
        }

        // 競合した追加構成は、利用者が解決方法を選ぶまで自動上書きしない
        if (blockedSavedBuildIdRef.current === activeSavedBuildId) {
            return
        }

        // 構成を切り替えた際は、前の構成の比較結果を引き継がない
        if (savedBuildAutoSaveBuildIdRef.current !== activeSavedBuildId) {
            savedBuildAutoSaveBuildIdRef.current = activeSavedBuildId
            savedBuildAutoSaveFingerprintRef.current = ""
        }

        const localParts = toSavedBuildPartInputs(selectedParts)
        const localFingerprint = createPartsFingerprint(localParts)
        const savedFingerprint = createPartsFingerprint(
            build.parts.map(({slotKey, partId}) => ({slotKey, partId})),
        )

        if (
            localFingerprint === savedFingerprint ||
            savedBuildAutoSaveFingerprintRef.current === localFingerprint
        ) {
            return
        }

        if (savedBuildAutoSaveInFlightRef.current) {
            // 追加構成の保存中も最新の変更だけをpendingとして残す。
            savedBuildAutoSavePendingRef.current = true

            return
        }

        if (savedBuildAutoSaveTimerRef.current) {
            clearTimeout(savedBuildAutoSaveTimerRef.current)
        }

        savedBuildAutoSaveTimerRef.current = setTimeout(() => {
            // 保存待ちの間に認証ユーザーが変わった場合、前ユーザーの内容を送信しない。
            if (currentAuthUserIdRef.current !== requestUserId) {
                return
            }

            savedBuildAutoSaveTimerRef.current = undefined
            savedBuildAutoSaveInFlightRef.current = true

            void updateSavedBuild(build, localParts)
                .then(() => {
                    // 返却されたversionを一覧へ反映した後、同じ内容の再保存を抑止する。
                    if (currentAuthUserIdRef.current === requestUserId) {
                        savedBuildAutoSaveFingerprintRef.current = localFingerprint
                    }
                })
                .catch((error) => {
                    // 追加構成の競合は対象IDを記録し、明示的な解決まで自動保存を止める。
                    if (
                        error instanceof SavedBuildApiError &&
                        (error.code === "SAVED_BUILD_CONFLICT" ||
                            error.code === "SAVED_BUILD_NOT_FOUND")
                    ) {
                        blockedSavedBuildIdRef.current = activeSavedBuildId
                        setAutoSaveConflict({
                            type: "build",
                            buildId: activeSavedBuildId,
                        })
                    }

                    // 競合後に最新versionで自動再試行すると他端末の変更を上書きするため停止
                })
                .finally(() => {
                    // 保存完了後にpending変更があれば、次のrevisionで再度保存判定を行う。
                    if (currentAuthUserIdRef.current !== requestUserId) {
                        return
                    }

                    savedBuildAutoSaveInFlightRef.current = false

                    if (savedBuildAutoSavePendingRef.current) {
                        savedBuildAutoSavePendingRef.current = false
                        setSavedBuildAutoSaveRevision((current) => current + 1)
                    }
                })
        }, AUTO_SAVE_DELAY_MS)

        return () => {
            if (savedBuildAutoSaveTimerRef.current) {
                clearTimeout(savedBuildAutoSaveTimerRef.current)
                savedBuildAutoSaveTimerRef.current = undefined
            }
        }
    }, [
        activeSavedBuildId,
        authUserId,
        autoSaveEnabled,
        isAuthenticated,
        isSavedBuildLoading,
        savedBuildAutoSaveRevision,
        savedBuilds,
        savedBuildsOperation,
        selectedParts,
        updateSavedBuild,
    ])

    // 競合した自動保存を、最新状態の採用または明示的な上書きで解決
    async function resolveAutoSaveConflict(
        resolution: AutoSaveConflictResolution,
    ) {
        const conflict = autoSaveConflict

        // 通知が閉じている状態では、解決対象の競合が存在しない。
        if (!conflict) {
            return
        }

        try {
            if (conflict.type === "slot") {
                // 固定枠は最新slotを取得し、reloadならその内容をローカルへ復元する。
                const latestSlots = await reloadConfigSlots()
                const latestSlot = latestSlots?.find((slot) =>
                    slot.configId === conflict.configId,
                )

                // 最新一覧から対象が消えていた場合は、競合状態を維持して再取得を待つ。
                if (!latestSlot) {
                    return
                }

                if (resolution === "reload") {
                    await onRestoreConfigSlot(latestSlot)
                }

                delete blockedAutoSaveSlotsRef.current[conflict.configId]
            } else {
                // 追加構成は最新buildを取得し、削除済みなら固定枠へ編集対象を戻す。
                const latestBuilds = await reloadSavedBuilds()
                const latestBuild = latestBuilds?.find((build) =>
                    build.id === conflict.buildId,
                )

                if (!latestBuild) {
                    // 削除済みなら、存在する固定構成へ編集対象を戻す
                    onConfigChange(activeConfigId)
                    blockedSavedBuildIdRef.current = null
                    setAutoSaveConflict(null)

                    return
                }

                if (resolution === "reload") {
                    await onRestoreSavedBuild(latestBuild)
                }

                blockedSavedBuildIdRef.current = null
            }

            setAutoSaveConflict(null)
            setAutoSaveRevision((current) => current + 1)
            setSavedBuildAutoSaveRevision((current) => current + 1)
        } catch {
            // 最新状態の取得・復元に失敗した場合は競合状態を保持する
        }
    }

    return {
        autoSaveConflict,
        resolveAutoSaveConflict,
    }
}

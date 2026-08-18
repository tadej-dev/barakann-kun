import {useEffect, useRef, useState} from "react"

import {
    ConfigSlotApiError,
    type ConfigSlot,
} from "@/api/configSlots"
import {
    MAX_SAVED_BUILDS,
    SavedBuildApiError,
    type SavedBuild,
    type SavedBuildPartInput,
} from "@/api/savedBuilds"
import {useAuth} from "@/features/auth/useAuth"
import {toSavedBuildPartInputs} from "@/features/saved-builds/savedBuildMapper"
import {useSavedBuilds} from "@/features/saved-builds/useSavedBuilds"
import {useConfigOrder} from "@/features/simulator/useConfigOrder"
import {useConfigSlots} from "@/features/simulator/useConfigSlots"
import {
    CONFIG_IDS,
    type ConfigId,
    type ConfigStates,
    type SelectedParts,
} from "@/features/simulator/simulatorTypes"

export const MAX_CONFIG_NAME_LENGTH = 50

type UseConfigListControllerProps = {
    activeConfigId: ConfigId
    activeSavedBuildId: string | null
    configStates: ConfigStates
    selectedParts: SelectedParts
    isSavedBuildLoading: boolean
    savedBuildsReloadKey: number
    autoSaveEnabled: boolean
    onConfigChange: (configId: ConfigId) => void
    onRestoreSavedBuild: (build: SavedBuild) => Promise<void>
    onClearConfig: (configId: ConfigId) => Promise<void>
    onRestoreConfigSlot: (slot: ConfigSlot) => Promise<void>
}

type NameDialogState = {
    slot: ConfigSlot
    name: string
}

type ConfirmationState =
    | {type: "clear"; slot: ConfigSlot}

type SavedBuildDialogState =
    | {type: "create"; name: string}
    | {type: "rename"; build: SavedBuild; name: string}
    | {type: "delete"; build: SavedBuild}
    | {type: "delete-many"; builds: SavedBuild[]}

export type ConfigListItem =
    | {key: string; kind: "slot"; slot: ConfigSlot}
    | {key: string; kind: "build"; build: SavedBuild}

export type AutoSaveConflict =
    | {type: "slot"; configId: ConfigId}
    | {type: "build"; buildId: string}

export type AutoSaveConflictResolution = "reload" | "overwrite"

// 固定構成・追加構成を同じドラッグ対象として扱うキーを作成
function configSlotItemKey(configId: ConfigId): string {
    return `config:${configId}`
}

// 追加構成をドラッグ対象として扱うキーを作成
function savedBuildItemKey(buildId: string): string {
    return `build:${buildId}`
}

// パーツ順に依存しない自動保存比較用の識別値を作成
function createPartsFingerprint(parts: SavedBuildPartInput[]): string {
    return parts
        .slice()
        .sort((first, second) => first.slotKey.localeCompare(second.slotKey))
        .map((part) => `${part.slotKey}=${part.partId}`)
        .join("&")
}

// 構成一覧の取得・保存とダイアログ状態を管理する
export function useConfigListController({
                                            activeConfigId,
                                            activeSavedBuildId,
                                            configStates,
    selectedParts,
    isSavedBuildLoading,
    savedBuildsReloadKey,
    autoSaveEnabled,
    onConfigChange,
    onRestoreSavedBuild,
    onClearConfig,
    onRestoreConfigSlot,
}: UseConfigListControllerProps) {
    const {status: authStatus, user} = useAuth()
    const isAuthenticated = authStatus === "authenticated"
    const authUserId = isAuthenticated ? user?.id ?? null : null
    const {
        clear,
        errorMessage,
        hasLoadedSuccessfully: hasLoadedConfigSlots,
        isLoading,
        operation,
        rename,
        reload: reloadConfigSlots,
        save,
        slots,
    } = useConfigSlots({
        enabled: isAuthenticated,
        userId: authUserId,
    })
    const {
        errorMessage: configOrderErrorMessage,
        hasLoaded: hasLoadedConfigOrder,
        isLoading: isLoadingConfigOrder,
        isSaving: isSavingConfigOrder,
        order: savedConfigOrder,
        reload: reloadConfigOrder,
        save: saveConfigOrder,
    } = useConfigOrder({
        enabled: isAuthenticated,
        userId: authUserId,
        reloadKey: savedBuildsReloadKey,
    })
    const {
        builds: savedBuilds,
        create: createSavedBuild,
        errorMessage: savedBuildsErrorMessage,
        isLoading: isSavedBuildsLoading,
        operation: savedBuildsOperation,
        reload: reloadSavedBuilds,
        remove: removeSavedBuild,
        rename: renameSavedBuild,
        update: updateSavedBuild,
    } = useSavedBuilds({
        enabled: isAuthenticated,
        userId: authUserId,
        reloadKey: savedBuildsReloadKey,
    })
    const [nameDialog, setNameDialog] = useState<NameDialogState | null>(null)
    const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null)
    const [savedBuildDialog, setSavedBuildDialog] =
        useState<SavedBuildDialogState | null>(null)
    const [selectedSavedBuildIds, setSelectedSavedBuildIds] = useState<string[]>([])
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

    // 認証ユーザーが変わったら、前ユーザーの自動保存キューとダイアログを破棄
    useEffect(() => {
        currentAuthUserIdRef.current = authUserId

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

        // 外部認証状態とUIを同期し、前ユーザーの操作対象を残さない。
        setSelectedSavedBuildIds([])
        setNameDialog(null)
        setConfirmation(null)
        setSavedBuildDialog(null)
        setAutoSaveConflict(null)
    }, [authUserId])

    const isOperating = operation !== null ||
        savedBuildsOperation !== null ||
        isSavingConfigOrder ||
        isSavedBuildLoading
    const selectedPartInputs = toSavedBuildPartInputs(selectedParts)
    const isNameValid = Boolean(
        nameDialog &&
        nameDialog.name.trim().length > 0 &&
        nameDialog.name.trim().length <= MAX_CONFIG_NAME_LENGTH,
    )
    const isSavedBuildNameDialog = savedBuildDialog?.type === "create" ||
        savedBuildDialog?.type === "rename"
    const savedBuildDialogName = isSavedBuildNameDialog
        ? savedBuildDialog.name
        : ""
    const isSavedBuildNameValid = savedBuildDialogName.trim().length > 0 &&
        savedBuildDialogName.trim().length <= MAX_CONFIG_NAME_LENGTH
    // 構成1〜4は固定の保存枠として常に件数へ含める
    const totalSavedCount = CONFIG_IDS.length + savedBuilds.length
    const selectedSavedBuilds = savedBuilds.filter((build) =>
        selectedSavedBuildIds.includes(build.id),
    )
    const availableItems: ConfigListItem[] = [
        ...slots.map((slot) => ({
            key: configSlotItemKey(slot.configId),
            kind: "slot" as const,
            slot,
        })),
        ...savedBuilds.map((build) => ({
            key: savedBuildItemKey(build.id),
            kind: "build" as const,
            build,
        })),
    ]
    const availableItemMap = new Map(
        availableItems.map((item) => [item.key, item]),
    )
    const availableItemKeys = availableItems.map((item) => item.key)
    const orderedItemKeys = [
        ...savedConfigOrder.filter((itemKey) => availableItemMap.has(itemKey)),
        ...availableItemKeys.filter((itemKey) => !savedConfigOrder.includes(itemKey)),
    ]
    const orderedItems = orderedItemKeys.flatMap((itemKey) => {
        const item = availableItemMap.get(itemKey)

        return item ? [item] : []
    })

    // 別端末でアクティブな追加構成が削除された場合は固定構成へ戻す
    useEffect(() => {
        if (
            !isAuthenticated ||
            !activeSavedBuildId ||
            isSavedBuildsLoading ||
            savedBuilds.some((build) => build.id === activeSavedBuildId)
        ) {
            return
        }

        onConfigChange(activeConfigId)
    }, [
        activeConfigId,
        activeSavedBuildId,
        isAuthenticated,
        isSavedBuildsLoading,
        onConfigChange,
        savedBuilds,
    ])

    // 追加構成の削除対象を切り替え
    function toggleSavedBuildSelection(
        buildId: string,
        checked: boolean | "indeterminate",
    ) {
        setSelectedSavedBuildIds((current) => {
            if (checked === true) {
                return current.includes(buildId)
                    ? current
                    : [...current, buildId]
            }

            return current.filter((currentBuildId) => currentBuildId !== buildId)
        })
    }

    // 選択済み追加構成の削除確認を開く
    function openDeleteSelectedBuildsDialog() {
        if (selectedSavedBuilds.length === 0 || isOperating) {
            return
        }

        setSavedBuildDialog({
            type: "delete-many",
            builds: selectedSavedBuilds,
        })
    }

    // 構成名の変更ダイアログを開く
    function openNameDialog(slot: ConfigSlot) {
        setNameDialog({slot, name: slot.name})
    }

    // 構成名の入力値を更新
    function changeName(name: string) {
        setNameDialog((current) => current
            ? {...current, name}
            : null)
    }

    // 構成名をD1へ保存
    async function submitName() {
        if (!nameDialog || !isNameValid || isOperating) {
            return
        }

        try {
            await rename(nameDialog.slot, nameDialog.name.trim())
            setNameDialog(null)
        } catch {
            // APIエラーはカード上部へ表示する
        }
    }

    // D1とローカルの固定構成をクリア
    async function clearConfig(slot: ConfigSlot) {
        if (isOperating) {
            return
        }

        try {
            await clear(slot)
            await onClearConfig(slot.configId)
            setConfirmation(null)
        } catch {
            // APIエラー時はローカル状態を変更しない
        }
    }

    // 保存済み構成の新規追加ダイアログを開く
    function openCreateSavedBuildDialog() {
        if (
            savedBuildsOperation !== null ||
            totalSavedCount >= MAX_SAVED_BUILDS
        ) {
            return
        }

        setSavedBuildDialog({
            type: "create",
            name: "",
        })
    }

    // ドラッグ終了時に表示順をD1へ保存
    function changeConfigOrder(nextItems: ConfigListItem[]) {
        if (!hasLoadedConfigOrder) {
            return
        }

        void saveConfigOrder(nextItems.map((item) => item.key)).catch(() => {
            // APIエラーはカード下部の共通メッセージへ表示する
        })
    }

    // 選択内容が落ち着いた後に、変更された固定構成だけを非同期保存
    useEffect(() => {
        if (
            !isAuthenticated ||
            !autoSaveEnabled ||
            !hasLoadedConfigSlots ||
            isLoading ||
            operation !== null
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
                continue
            }

            if (autoSaveInFlightRef.current[slot.configId]) {
                autoSavePendingRef.current[slot.configId] = true

                continue
            }

            const existingTimer = autoSaveTimersRef.current[slot.configId]

            if (existingTimer) {
                clearTimeout(existingTimer)
            }

            autoSaveTimersRef.current[slot.configId] = setTimeout(() => {
                if (currentAuthUserIdRef.current !== requestUserId) {
                    return
                }

                autoSaveTimersRef.current[slot.configId] = undefined
                autoSaveInFlightRef.current[slot.configId] = true

                void save(slot, slot.name, localParts)
                    .then(() => {
                        if (currentAuthUserIdRef.current === requestUserId) {
                            autoSaveFingerprintsRef.current[slot.configId] =
                                localFingerprint
                        }
                    })
                    .catch((error) => {
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
                        if (currentAuthUserIdRef.current !== requestUserId) {
                            return
                        }

                        autoSaveInFlightRef.current[slot.configId] = false

                        if (autoSavePendingRef.current[slot.configId]) {
                            autoSavePendingRef.current[slot.configId] = false
                            setAutoSaveRevision((current) => current + 1)
                        }
                    })
            }, 800)
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
        isLoading,
        operation,
        save,
        slots,
    ])

    // 追加構成の選択内容も固定構成と同じく、変更が落ち着いた後に非同期保存
    useEffect(() => {
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
            savedBuildAutoSavePendingRef.current = true

            return
        }

        if (savedBuildAutoSaveTimerRef.current) {
            clearTimeout(savedBuildAutoSaveTimerRef.current)
        }

        savedBuildAutoSaveTimerRef.current = setTimeout(() => {
            if (currentAuthUserIdRef.current !== requestUserId) {
                return
            }

            savedBuildAutoSaveTimerRef.current = undefined
            savedBuildAutoSaveInFlightRef.current = true

            void updateSavedBuild(build, localParts)
                .then(() => {
                    if (currentAuthUserIdRef.current === requestUserId) {
                        savedBuildAutoSaveFingerprintRef.current = localFingerprint
                    }
                })
                .catch((error) => {
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
                    if (currentAuthUserIdRef.current !== requestUserId) {
                        return
                    }

                    savedBuildAutoSaveInFlightRef.current = false

                    if (savedBuildAutoSavePendingRef.current) {
                        savedBuildAutoSavePendingRef.current = false
                        setSavedBuildAutoSaveRevision((current) => current + 1)
                    }
                })
        }, 800)

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

        if (!conflict) {
            return
        }

        try {
            if (conflict.type === "slot") {
                const latestSlots = await reloadConfigSlots()
                const latestSlot = latestSlots?.find((slot) =>
                    slot.configId === conflict.configId,
                )

                if (!latestSlot) {
                    return
                }

                if (resolution === "reload") {
                    await onRestoreConfigSlot(latestSlot)
                }

                delete blockedAutoSaveSlotsRef.current[conflict.configId]
            } else {
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

    // 保存済み構成の名前入力値を更新
    function changeSavedBuildName(name: string) {
        setSavedBuildDialog((current) => {
            if (!current || (current.type !== "create" && current.type !== "rename")) {
                return current
            }

            return {...current, name}
        })
    }

    // 保存済み構成の操作内容を確定
    async function submitSavedBuildDialog() {
        if (!savedBuildDialog || savedBuildsOperation !== null) {
            return
        }

        try {
            if (savedBuildDialog.type === "create") {
                const build = await createSavedBuild(
                    savedBuildDialog.name.trim(),
                    selectedPartInputs,
                )
                // 構成本体の保存が完了した時点でダイアログを閉じ、表示順保存の失敗で操作をやり直させない
                setSavedBuildDialog(null)

                try {
                    await saveConfigOrder([
                        ...orderedItemKeys,
                        savedBuildItemKey(build.id),
                    ])
                } catch {
                    // 並び順は次回取得時に末尾へ補完されるため、構成作成自体は成功扱いにする
                }
            } else if (savedBuildDialog.type === "rename") {
                await renameSavedBuild(
                    savedBuildDialog.build,
                    savedBuildDialog.name.trim(),
                )
                setSavedBuildDialog(null)
            } else if (savedBuildDialog.type === "delete-many") {
                const buildsToDelete = savedBuildDialog.builds
                const deletedBuildIds: string[] = []

                for (const build of buildsToDelete) {
                    try {
                        await removeSavedBuild(build)
                        deletedBuildIds.push(build.id)
                    } catch {
                        // 失敗した構成は残し、成功分だけを削除済みとして扱う
                        break
                    }
                }

                setSelectedSavedBuildIds((current) => current.filter((buildId) =>
                    !deletedBuildIds.includes(buildId),
                ))

                const remainingBuilds = buildsToDelete.filter((build) =>
                    !deletedBuildIds.includes(build.id),
                )

                if (remainingBuilds.length === 0) {
                    if (deletedBuildIds.includes(activeSavedBuildId ?? "")) {
                        onConfigChange(activeConfigId)
                    }

                    setSavedBuildDialog(null)
                } else {
                    setSavedBuildDialog({
                        type: "delete-many",
                        builds: remainingBuilds,
                    })
                }

                try {
                    await saveConfigOrder(orderedItemKeys.filter((itemKey) =>
                        !deletedBuildIds.includes(
                            itemKey.startsWith("build:")
                                ? itemKey.slice("build:".length)
                                : "",
                        ),
                    ))
                } catch {
                    // 削除自体は成功しているため、並び順は次回取得時に補正する
                }
            } else {
                const deletedBuild = savedBuildDialog.build
                await removeSavedBuild(deletedBuild)
                setSelectedSavedBuildIds((current) => current.filter((buildId) =>
                    buildId !== deletedBuild.id,
                ))
                if (deletedBuild.id === activeSavedBuildId) {
                    onConfigChange(activeConfigId)
                }
                // 削除APIが成功したら、表示順APIの状態に関係なく確認ダイアログを閉じる
                setSavedBuildDialog(null)

                try {
                    await saveConfigOrder(orderedItemKeys.filter((itemKey) =>
                        itemKey !== savedBuildItemKey(deletedBuild.id),
                    ))
                } catch {
                    // 削除自体は成功しているため、並び順は次回取得時に補正する
                }
            }
        } catch {
            // APIエラーはカード下部へ表示する
        }
    }

    // 現在選択中のパーツを追加構成へ明示的に保存
    async function saveToSavedBuild(build: SavedBuild) {
        if (isOperating) {
            return
        }

        try {
            await updateSavedBuild(build, selectedPartInputs)
        } catch {
            // APIエラーはカード下部の共通メッセージへ表示する
        }
    }

    // 保存済み構成の操作内容に応じた確認文言
    function getSavedBuildDialogContent() {
        if (!savedBuildDialog) {
            return null
        }

        if (savedBuildDialog.type === "create") {
            return {
                title: "新しい構成を追加",
                description: selectedPartInputs.length > 0
                    ? `構成${activeConfigId}の選択パーツを名前付き構成として保存します。`
                    : "選択中のパーツがない空の構成として保存します。",
                confirmLabel: "追加する",
                destructive: false,
            }
        }

        if (savedBuildDialog.type === "rename") {
            return {
                title: "保存構成の名前を変更",
                description: "保存済みのパーツ内容は変更されません。",
                confirmLabel: "変更する",
                destructive: false,
            }
        }

        if (savedBuildDialog.type === "delete-many") {
            return {
                title: "追加構成を一括削除",
                description: `${savedBuildDialog.builds.length}件の追加構成を削除します。この操作は元に戻せません。`,
                confirmLabel: "まとめて削除する",
                destructive: true,
            }
        }

        return {
            title: "保存構成を削除",
            description: `「${savedBuildDialog.build.name}」を削除します。この操作は元に戻せません。`,
            confirmLabel: "削除する",
            destructive: true,
        }
    }

    return {
        changeConfigOrder,
        changeName,
        changeSavedBuildName,
        clearConfig,
        configOrderErrorMessage,
        confirmation,
        errorMessage,
        autoSaveConflict,
        isAuthenticated,
        isLoading,
        isLoadingConfigOrder,
        isNameValid,
        isOperating,
        isSavedBuildNameDialog,
        isSavedBuildNameValid,
        isSavedBuildsLoading,
        nameDialog,
        openCreateSavedBuildDialog,
        openDeleteSelectedBuildsDialog,
        openNameDialog,
        orderedItems,
        reloadConfigOrder,
        reloadSavedBuilds,
        saveToSavedBuild,
        savedBuildDialog,
        savedBuildDialogContent: getSavedBuildDialogContent(),
        savedBuildDialogName,
        savedBuildsErrorMessage,
        savedBuildsOperation,
        selectedSavedBuildIds,
        selectedSavedBuilds,
        setConfirmation,
        setNameDialog,
        setSavedBuildDialog,
        submitName,
        submitSavedBuildDialog,
        toggleSavedBuildSelection,
        totalSavedCount,
        resolveAutoSaveConflict,
    }
}

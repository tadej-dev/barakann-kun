import {useEffect, useRef, useState} from "react"

import type {ConfigSlot} from "@/api/configSlots"
import {
    MAX_SAVED_BUILDS,
    type SavedBuild,
} from "@/api/savedBuilds"
import {toSavedBuildPartInputs} from "@/features/saved-builds/savedBuildMapper"
import {
    savedBuildItemKey,
    type ConfigCollection,
    type ConfigListItem,
} from "@/features/simulator/useConfigCollection"
import type {
    ConfigId,
    SelectedParts,
} from "@/features/simulator/simulatorTypes"

// 固定枠名・追加構成名の入力とAPIレスポンスに同じ文字数制限を適用する。
export const MAX_CONFIG_NAME_LENGTH = 50

type UseConfigListControllerProps = {
    collection: ConfigCollection // 構成データと保存処理
    activeConfigId: ConfigId
    activeSavedBuildId: string | null
    selectedParts: SelectedParts // 追加・保存するときの選択パーツ
    isSavedBuildLoading: boolean // 追加構成の読み込み中は操作させない
    onConfigChange: (configId: ConfigId) => void
    onClearConfig: (configId: ConfigId) => Promise<void>
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

// 構成一覧の操作(ダイアログ・一括削除の選択・追加・名前変更・削除・クリア・並べ替え)を管理する
// データの取得は useConfigCollection、自動保存は useConfigAutoSave が受け持つ。
export function useConfigListController({
    collection,
    activeConfigId,
    activeSavedBuildId,
    selectedParts,
    isSavedBuildLoading,
    onConfigChange,
    onClearConfig,
}: UseConfigListControllerProps) {
    const {
        authUserId,
        slotOperation,
        clearSlot,
        renameSlot,
        savedBuilds,
        savedBuildsOperation,
        createSavedBuild,
        updateSavedBuild,
        renameSavedBuild,
        removeSavedBuild,
        isSavingConfigOrder,
        hasLoadedConfigOrder,
        saveConfigOrder,
        orderedItemKeys,
        totalSavedCount,
    } = collection

    const [nameDialog, setNameDialog] = useState<NameDialogState | null>(null)
    const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null)
    const [savedBuildDialog, setSavedBuildDialog] =
        useState<SavedBuildDialogState | null>(null)
    const [selectedSavedBuildIds, setSelectedSavedBuildIds] = useState<string[]>([])
    const previousAuthUserIdRef = useRef(authUserId)

    // 認証ユーザーが変わったら、前ユーザーの操作対象とダイアログを破棄
    useEffect(() => {
        // 初回実行では前回値と同じため、破棄処理は認証ユーザーの切り替え時だけ行う。
        if (previousAuthUserIdRef.current === authUserId) {
            return
        }

        previousAuthUserIdRef.current = authUserId

        // 外部認証状態とUIを同期し、前ユーザーの操作対象を残さない。
        setSelectedSavedBuildIds([])
        setNameDialog(null)
        setConfirmation(null)
        setSavedBuildDialog(null)
    }, [authUserId])

    // いずれかの通信中は、名前変更・削除・ドラッグ保存を同時に実行させない。
    const isOperating = slotOperation !== null ||
        savedBuildsOperation !== null ||
        isSavingConfigOrder ||
        isSavedBuildLoading
    // 現在編集中のパーツだけをAPI入力へ変換し、UIのPartオブジェクトを送信しない。
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
    // チェックボックスのIDから、削除確認に表示する実体を解決する。
    const selectedSavedBuilds = savedBuilds.filter((build) =>
        selectedSavedBuildIds.includes(build.id),
    )
    // 保存上限に達していないか(追加ボタンの可否)
    const canCreateSavedBuild = savedBuildsOperation === null &&
        totalSavedCount < MAX_SAVED_BUILDS

    // 追加構成の削除対象を切り替え
    function toggleSavedBuildSelection(
        buildId: string,
        checked: boolean | "indeterminate",
    ) {
        setSelectedSavedBuildIds((current) => {
            // チェックされた構成だけを一括削除対象へ追加し、解除・indeterminateは対象から外す。
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
        // 対象がない、または別操作中なら確認ダイアログを開かない。
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
        // 現在の名前を初期値にして、保存済み名称を編集前に失わない。
        setNameDialog({slot, name: slot.name})
    }

    // 構成名の入力値を更新
    function changeName(name: string) {
        // ダイアログが閉じた後の入力イベントは無視し、null状態を復活させない。
        setNameDialog((current) => current
            ? {...current, name}
            : null)
    }

    // 構成名をD1へ保存
    async function submitName() {
        // 入力途中・入力不正・別操作中は、サーバーへ不完全な名称を送らない。
        if (!nameDialog || !isNameValid || isOperating) {
            return
        }

        try {
            await renameSlot(nameDialog.slot, nameDialog.name.trim())
            // API成功後だけ閉じ、失敗時は入力内容とエラーを確認できるようにする。
            setNameDialog(null)
        } catch {
            // APIエラーはカード上部へ表示する
        }
    }

    // D1とローカルの固定構成をクリア
    async function clearConfig(slot: ConfigSlot) {
        // D1保存が完了する前にローカルだけ消すと表示とDBがずれるため、操作中は拒否する。
        if (isOperating) {
            return
        }

        try {
            await clearSlot(slot)
            // D1削除後にローカルReducerを更新し、表示とサーバーの順序を一致させる。
            await onClearConfig(slot.configId)
            setConfirmation(null)
        } catch {
            // APIエラー時はローカル状態を変更しない
        }
    }

    // 保存済み構成の新規追加ダイアログを開く
    function openCreateSavedBuildDialog() {
        // 保存上限到達後は、作成ダイアログを開いても登録できないため入口で止める。
        if (!canCreateSavedBuild) {
            return
        }

        setSavedBuildDialog({
            type: "create",
            name: "",
        })
    }

    // 追加構成の名前変更ダイアログを開く
    function openRenameSavedBuildDialog(build: SavedBuild) {
        setSavedBuildDialog({
            type: "rename",
            build,
            name: build.name,
        })
    }

    // 追加構成の削除確認ダイアログを開く
    function openDeleteSavedBuildDialog(build: SavedBuild) {
        setSavedBuildDialog({
            type: "delete",
            build,
        })
    }

    // 固定枠のクリア確認ダイアログを開く
    function openClearConfirmation(slot: ConfigSlot) {
        setConfirmation({type: "clear", slot})
    }

    // ドラッグ終了時に表示順をD1へ保存
    function changeConfigOrder(nextItems: ConfigListItem[]) {
        // Sortableの表示変更は即時反映され、API側にはキーだけを保存する。
        // 初回取得前の並び順は未確定なので、ユーザー操作として保存しない。
        if (!hasLoadedConfigOrder) {
            return
        }

        void saveConfigOrder(nextItems.map((item) => item.key)).catch(() => {
            // APIエラーはカード下部の共通メッセージへ表示する
        })
    }

    // 保存済み構成の名前入力値を更新
    function changeSavedBuildName(name: string) {
        setSavedBuildDialog((current) => {
            // create/rename以外のダイアログでは名前入力を変更しない。
            if (!current || (current.type !== "create" && current.type !== "rename")) {
                return current
            }

            return {...current, name}
        })
    }

    // 保存済み構成の操作内容を確定
    async function submitSavedBuildDialog() {
        // ダイアログが閉じている、または別の保存操作中なら二重送信を防いで終了する。
        if (!savedBuildDialog || savedBuildsOperation !== null) {
            return
        }

        try {
            if (savedBuildDialog.type === "create") {
                // 新規作成後に表示順保存が失敗しても、構成本体の保存成功は維持する。
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
                // 名前変更はパーツ内容を送らず、保存構成のversionだけ更新する。
                await renameSavedBuild(
                    savedBuildDialog.build,
                    savedBuildDialog.name.trim(),
                )
                setSavedBuildDialog(null)
            } else if (savedBuildDialog.type === "delete-many") {
                // 一括削除は順番に実行し、途中失敗時は残った構成だけ再確認できるようにする。
                const buildsToDelete = savedBuildDialog.builds
                const deletedBuildIds: string[] = []

                for (const build of buildsToDelete) {
                    try {
                        await removeSavedBuild(build)
                        deletedBuildIds.push(build.id)
                    } catch {
                        // 失敗位置で止め、後続を暗黙に削除しない。
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
                // 単件削除成功後はアクティブ対象を固定枠へ戻し、表示順からも対象を除く。
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
        // 名前変更・削除・自動保存などの処理中は、古いversionで上書きしない。
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
        // ダイアログ種別ごとの説明・ボタン文言をUIから分離する。
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
        isOperating,
        canCreateSavedBuild,
        // 固定枠の名前変更ダイアログ
        nameDialog,
        isNameValid,
        openNameDialog,
        changeName,
        submitName,
        closeNameDialog: () => setNameDialog(null),
        // 固定枠のクリア確認
        confirmation,
        openClearConfirmation,
        closeConfirmation: () => setConfirmation(null),
        clearConfig,
        // 追加構成のダイアログ
        savedBuildDialog,
        savedBuildDialogContent: getSavedBuildDialogContent(),
        savedBuildDialogName,
        isSavedBuildNameDialog,
        isSavedBuildNameValid,
        openCreateSavedBuildDialog,
        openRenameSavedBuildDialog,
        openDeleteSavedBuildDialog,
        changeSavedBuildName,
        submitSavedBuildDialog,
        closeSavedBuildDialog: () => setSavedBuildDialog(null),
        // 一括削除の選択
        selectedSavedBuildIds,
        selectedSavedBuilds,
        toggleSavedBuildSelection,
        openDeleteSelectedBuildsDialog,
        // その他の操作
        saveToSavedBuild,
        changeConfigOrder,
    }
}

// 構成一覧の操作のまとまり。ダイアログの部品へ、このまとまりのまま渡す。
export type ConfigListController = ReturnType<typeof useConfigListController>

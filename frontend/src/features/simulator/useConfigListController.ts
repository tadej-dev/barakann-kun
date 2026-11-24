import {useEffect, useRef, useState} from "react"

import type {SavedBuild} from "@/api/savedBuilds"
import {toSavedBuildParts} from "@/features/saved-builds/savedBuildMapper"
import {configItemKey} from "@/features/saved-builds/configRules"
import type {ConfigCollection} from "@/features/simulator/useConfigCollection"
import type {
    ConfigId,
    SelectedParts,
} from "@/features/simulator/simulatorTypes"

// 構成名の入力とAPIレスポンスに同じ文字数制限を適用する。
export const MAX_CONFIG_NAME_LENGTH = 50

// useConfigListControllerが受け取るプロパティ
type UseConfigListControllerProps = {
    collection: ConfigCollection // 構成データと保存処理
    activeConfigId: ConfigId
    selectedParts: SelectedParts // 追加・保存するときの選択パーツ
    isConfigLoading: boolean // 構成の読み込み中は操作させない
    onConfigChange: (configId: ConfigId) => void
    onClearConfig: (configId: ConfigId) => void
}

// ダイアログの種類
type DialogState =
    | {type: "create"; name: string}
    | {type: "rename"; config: SavedBuild; name: string}
    | {type: "clear"; config: SavedBuild}
    | {type: "delete"; config: SavedBuild}
    | {type: "delete-many"; configs: SavedBuild[]}

// ダイアログに表示する内容
export type ConfigDialogContent = {
    title: string
    description: string
    confirmLabel: string
    destructive: boolean
    needsName: boolean
}

// 構成一覧の操作(ダイアログ・一括削除の選択・追加・名前変更・クリア・削除・並べ替え)を管理する
export function useConfigListController({
    collection,
    activeConfigId,
    selectedParts,
    isConfigLoading,
    onConfigChange,
    onClearConfig,
}: UseConfigListControllerProps) {
    const {
        authUserId,
        configs,
        configsOperation,
        createConfig,
        updateConfig,
        renameConfig,
        removeConfig,
        isSavingConfigOrder,
        saveConfigOrder,
        orderedConfigKeys,
        totalSavedCount,
        maxConfigs,
    } = collection

    const [dialog, setDialog] = useState<DialogState | null>(null) // 表示中のダイアログ（非表示はnull）
    const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>([]) // 一括削除で選択した構成ID
    const previousAuthUserIdRef = useRef(authUserId) // 直前の認証ユーザーID

    // 認証ユーザーが変わったら、前ユーザーの操作対象とダイアログを破棄
    useEffect(() => {
        // 認証ユーザーが変わっていなければ何もしない
        if (previousAuthUserIdRef.current === authUserId) {
            return
        }

        previousAuthUserIdRef.current = authUserId
        setSelectedConfigIds([])
        setDialog(null)
    }, [authUserId])

    // いずれかの通信中は、名前変更・削除・ドラッグ保存を同時に実行させない。
    const isOperating = configsOperation !== null ||
        isSavingConfigOrder ||
        isConfigLoading

    // 構成の変更操作中でなく、保存数が上限未満か
    const canCreate = configsOperation === null &&
        totalSavedCount < maxConfigs

    // 現在編集中のパーツを、保存に必要な価格・重量込みで取り出す。
    const selectedPartInputs = toSavedBuildParts(selectedParts)

    // すべて削除した場合は「構成1」を作り直すため、常に削除できる
    const canDelete = configs.length > 0
    // 削除対象にできる構成一覧
    const deletableConfigs = configs

    // 追加構成のダイアログを開く
    function openCreateDialog() {
        // 追加できない状態ではダイアログを開かない
        if (!canCreate) {
            return
        }

        setDialog({type: "create", name: `構成${totalSavedCount + 1}`})
    }

    // 名前変更ダイアログを開く
    function openRenameDialog(config: SavedBuild) {
        setDialog({type: "rename", config, name: config.name})
    }

    // クリア確認を開く
    function openClearDialog(config: SavedBuild) {
        setDialog({type: "clear", config})
    }

    // 削除確認を開く
    function openDeleteDialog(config: SavedBuild) {
        // 削除できる構成が無ければダイアログを開かない
        if (!canDelete) {
            return
        }

        setDialog({type: "delete", config})
    }

    // 選択した構成の一括削除を開く
    function openDeleteSelectedDialog() {
        // 一括削除で選択された構成
        const targets = deletableConfigs.filter((config) =>
            selectedConfigIds.includes(config.id))

        // 選択が無ければ一括削除を開かない
        if (targets.length === 0) {
            return
        }

        setDialog({type: "delete-many", configs: targets})
    }

    // ダイアログの入力名を変更
    function changeDialogName(name: string) {
        setDialog((current) => {
            // 名前入力を持つダイアログ以外は変更しない
            if (!current || (current.type !== "create" && current.type !== "rename")) {
                return current
            }

            return {...current, name}
        })
    }

    // 通信中でなければダイアログを閉じる
    function closeDialog() {
        // 通信中はダイアログを閉じない
        if (isOperating) {
            return
        }

        setDialog(null)
    }

    // 一括削除の対象を切り替え
    function toggleConfigSelection(configId: string, checked: boolean | "indeterminate") {
        setSelectedConfigIds((current) => {
            // チェックされていなければ選択対象から外す
            if (checked !== true) {
                return current.filter((id) => id !== configId)
            }

            return current.includes(configId)
                ? current
                : [...current, configId]
        })
    }

    // すべて削除したときに、初期表示用の「構成1」を作り直す
    async function recreateInitialConfig() {
        // 作り直した初期構成
        const created = await createConfig("構成1", [])

        onConfigChange(created.id)

        try {
            await saveConfigOrder([configItemKey(created.id)])
        } catch {
            // 並び順は次回取得時に補正される
        }
    }

    // 保存済みの並び順を更新
    function changeConfigOrder(nextConfigs: SavedBuild[]) {
        return saveConfigOrder(nextConfigs.map((config) =>
            configItemKey(config.id)))
    }

    // ダイアログの入力名が有効か
    const dialogName = dialog?.type === "create" || dialog?.type === "rename"
        ? dialog.name
        : ""
    // 前後の空白を除いて1〜50文字に収まっているか
    const isNameValid = dialogName.trim().length > 0 &&
        dialogName.trim().length <= MAX_CONFIG_NAME_LENGTH

    // ダイアログの表示内容
    function getDialogContent(): ConfigDialogContent | null {
        // ダイアログ非表示なら内容を作らない
        if (!dialog) {
            return null
        }

        // 追加ダイアログの文言
        if (dialog.type === "create") {
            return {
                title: "新しい構成を追加",
                description: selectedPartInputs.length > 0
                    ? `構成「${collection.activeConfigName}」の選択パーツを新しい構成として保存します。`
                    : "選択中のパーツがない空の構成として保存します。",
                confirmLabel: "追加する",
                destructive: false,
                needsName: true,
            }
        }

        // 名前変更ダイアログの文言
        if (dialog.type === "rename") {
            return {
                title: "構成の名前を変更",
                description: "保存済みのパーツ内容は変更されません。",
                confirmLabel: "変更する",
                destructive: false,
                needsName: true,
            }
        }

        // クリア確認ダイアログの文言
        if (dialog.type === "clear") {
            return {
                title: `「${dialog.config.name}」をクリアしますか？`,
                description: "この構成のパーツがすべて解除されます。この操作は元に戻せません。",
                confirmLabel: "クリア",
                destructive: true,
                needsName: false,
            }
        }

        // 一括削除ダイアログの文言
        if (dialog.type === "delete-many") {
            // 削除対象が分かるよう、選択した構成名をすべて並べる
            const names = dialog.configs
                .map((config) => `「${config.name}」`)
                .join("、")

            return {
                title: "選択した構成を削除",
                description: `${names}を削除します。この操作は元に戻せません。`,
                confirmLabel: "削除する",
                destructive: true,
                needsName: false,
            }
        }

        return {
            title: "構成を削除",
            description: `「${dialog.config.name}」を削除します。この操作は元に戻せません。`,
            confirmLabel: "削除する",
            destructive: true,
            needsName: false,
        }
    }

    // 操作を確定する
    async function submitDialog() {
        // ダイアログ非表示・通信中は確定しない
        if (!dialog || configsOperation !== null || isSavingConfigOrder) {
            return
        }

        try {
            // 追加操作の確定
            if (dialog.type === "create") {
                // 名前が不正なら追加しない
                if (!isNameValid) {
                    return
                }

                // 作成した構成
                const config = await createConfig(
                    dialog.name.trim(),
                    selectedPartInputs,
                )
                setDialog(null)

                try {
                    await saveConfigOrder([
                        ...orderedConfigKeys,
                        configItemKey(config.id),
                    ])
                } catch {
                    // 並び順は次回取得時に末尾へ補完されるため、作成自体は成功扱いにする
                }
            // 名前変更操作の確定
            } else if (dialog.type === "rename") {
                // 名前が不正なら変更しない
                if (!isNameValid) {
                    return
                }

                await renameConfig(dialog.config, dialog.name.trim())
                setDialog(null)
            // クリア操作の確定
            } else if (dialog.type === "clear") {
                // パーツを空にし、編集中の状態も合わせて初期化する
                await updateConfig(dialog.config, [])
                onClearConfig(dialog.config.id)
                setDialog(null)
            // 削除操作の確定
            } else if (dialog.type === "delete") {
                // 削除対象の構成
                const target = dialog.config
                // 削除後に残る構成
                const remainingConfigs = configs.filter((config) =>
                    config.id !== target.id)

                await removeConfig(target)
                setSelectedConfigIds((current) => current.filter((id) =>
                    id !== target.id))

                setDialog(null)

                // すべて削除した場合は初期構成を作り直す
                if (remainingConfigs.length === 0) {
                    // すべて削除した場合は「構成1」を作り直して初期表示する
                    await recreateInitialConfig()

                    return
                }

                // 編集中の構成を削除した場合は先頭の構成へ切り替える
                if (target.id === activeConfigId) {
                    onConfigChange(remainingConfigs[0]!.id)
                }

                try {
                    await saveConfigOrder(orderedConfigKeys.filter((key) =>
                        key !== configItemKey(target.id)))
                } catch {
                    // 削除自体は成功しているため、並び順は次回取得時に補正する
                }
            } else {
                // 削除に成功した構成ID
                const deletedIds: string[] = []

                for (const config of dialog.configs) {
                    try {
                        await removeConfig(config)
                        deletedIds.push(config.id)
                    } catch {
                        break
                    }
                }

                setSelectedConfigIds((current) => current.filter((id) =>
                    !deletedIds.includes(id)))

                const remaining = dialog.configs.filter((config) =>
                    !deletedIds.includes(config.id))

                // 削除できなかった構成が残っていれば再確認を表示
                if (remaining.length > 0) {
                    setDialog({type: "delete-many", configs: remaining})
                } else {
                    setDialog(null)

                    // 一括削除後に残る構成
                    const leftConfigs = configs.filter((config) =>
                        !deletedIds.includes(config.id))

                    // すべて削除した場合は初期構成を作り直す
                    if (leftConfigs.length === 0) {
                        // すべて削除した場合は「構成1」を作り直して初期表示する
                        await recreateInitialConfig()

                        return
                    }

                    // 編集中の構成を削除した場合は先頭の構成へ切り替える
                    if (deletedIds.includes(activeConfigId)) {
                        onConfigChange(leftConfigs[0]!.id)
                    }
                }

                try {
                    await saveConfigOrder(orderedConfigKeys.filter((key) =>
                        !deletedIds.some((id) => key === configItemKey(id))))
                } catch {
                    // 削除自体は成功しているため、並び順は次回取得時に補正する
                }
            }
        } catch {
            // APIやStorageのエラーはカード下部の共通メッセージへ表示する
        }
    }

    return {
        activeConfigId,
        canCreate,
        canDelete,
        changeConfigOrder,
        changeDialogName,
        closeDialog,
        configs,
        dialog,
        dialogContent: getDialogContent(),
        dialogName,
        isNameValid,
        isOperating,
        openClearDialog,
        openCreateDialog,
        openDeleteDialog,
        openDeleteSelectedDialog,
        openRenameDialog,
        selectedConfigIds,
        selectedDeletableConfigs: deletableConfigs.filter((config) =>
            selectedConfigIds.includes(config.id)),
        submitDialog,
        toggleConfigSelection,
    }
}

// 構成一覧の操作をまとめたフックの戻り値
export type ConfigListController = ReturnType<typeof useConfigListController>

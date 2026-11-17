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

    const [dialog, setDialog] = useState<DialogState | null>(null)
    const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>([])
    const previousAuthUserIdRef = useRef(authUserId)

    // 認証ユーザーが変わったら、前ユーザーの操作対象とダイアログを破棄
    useEffect(() => {
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

    const canCreate = configsOperation === null &&
        totalSavedCount < maxConfigs

    // 現在編集中のパーツを、保存に必要な価格・重量込みで取り出す。
    const selectedPartInputs = toSavedBuildParts(selectedParts)

    // すべて削除した場合は「構成1」を作り直すため、常に削除できる
    const canDelete = configs.length > 0
    const deletableConfigs = configs

    // 追加構成のダイアログを開く
    function openCreateDialog() {
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
        if (!canDelete) {
            return
        }

        setDialog({type: "delete", config})
    }

    // 選択した構成の一括削除を開く
    function openDeleteSelectedDialog() {
        const targets = deletableConfigs.filter((config) =>
            selectedConfigIds.includes(config.id))

        if (targets.length === 0) {
            return
        }

        setDialog({type: "delete-many", configs: targets})
    }

    // ダイアログの入力名を変更
    function changeDialogName(name: string) {
        setDialog((current) => {
            if (!current || (current.type !== "create" && current.type !== "rename")) {
                return current
            }

            return {...current, name}
        })
    }

    function closeDialog() {
        if (isOperating) {
            return
        }

        setDialog(null)
    }

    // 一括削除の対象を切り替え
    function toggleConfigSelection(configId: string, checked: boolean | "indeterminate") {
        setSelectedConfigIds((current) => {
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
    const isNameValid = dialogName.trim().length > 0 &&
        dialogName.trim().length <= MAX_CONFIG_NAME_LENGTH

    // ダイアログの表示内容
    function getDialogContent(): ConfigDialogContent | null {
        if (!dialog) {
            return null
        }

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

        if (dialog.type === "rename") {
            return {
                title: "構成の名前を変更",
                description: "保存済みのパーツ内容は変更されません。",
                confirmLabel: "変更する",
                destructive: false,
                needsName: true,
            }
        }

        if (dialog.type === "clear") {
            return {
                title: `「${dialog.config.name}」をクリアしますか？`,
                description: "この構成のパーツがすべて解除されます。この操作は元に戻せません。",
                confirmLabel: "クリア",
                destructive: true,
                needsName: false,
            }
        }

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
        if (!dialog || configsOperation !== null || isSavingConfigOrder) {
            return
        }

        try {
            if (dialog.type === "create") {
                if (!isNameValid) {
                    return
                }

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
            } else if (dialog.type === "rename") {
                if (!isNameValid) {
                    return
                }

                await renameConfig(dialog.config, dialog.name.trim())
                setDialog(null)
            } else if (dialog.type === "clear") {
                // パーツを空にし、編集中の状態も合わせて初期化する
                await updateConfig(dialog.config, [])
                onClearConfig(dialog.config.id)
                setDialog(null)
            } else if (dialog.type === "delete") {
                const target = dialog.config
                const remainingConfigs = configs.filter((config) =>
                    config.id !== target.id)

                await removeConfig(target)
                setSelectedConfigIds((current) => current.filter((id) =>
                    id !== target.id))

                setDialog(null)

                if (remainingConfigs.length === 0) {
                    // すべて削除した場合は「構成1」を作り直して初期表示する
                    await recreateInitialConfig()

                    return
                }

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

                if (remaining.length > 0) {
                    setDialog({type: "delete-many", configs: remaining})
                } else {
                    setDialog(null)

                    const leftConfigs = configs.filter((config) =>
                        !deletedIds.includes(config.id))

                    if (leftConfigs.length === 0) {
                        // すべて削除した場合は「構成1」を作り直して初期表示する
                        await recreateInitialConfig()

                        return
                    }

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

export type ConfigListController = ReturnType<typeof useConfigListController>

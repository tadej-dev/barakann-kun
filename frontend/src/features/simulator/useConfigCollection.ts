import {useEffect, useState} from "react"

import {MAX_SAVED_BUILDS} from "@/api/savedBuilds"
import {useAuth} from "@/features/auth/useAuth"
import {MAX_CONFIGS, configItemKey} from "@/features/saved-builds/configRules"
import {useLocalConfigCollection} from "@/features/saved-builds/useLocalConfigCollection"
import {useSavedBuilds} from "@/features/saved-builds/useSavedBuilds"
import {useConfigOrder} from "@/features/simulator/useConfigOrder"
import type {ConfigId} from "@/features/simulator/simulatorTypes"

// useConfigCollectionが受け取るプロパティ
type UseConfigCollectionProps = {
    savedBuildsReloadKey: number // 構成一覧を再取得するためのキー
    activeConfigId: ConfigId // 選択中の構成
    onConfigChange: (configId: ConfigId) => void // 構成への切り替え
}

// 構成(構成一覧・表示順)のデータを取得し、画面で使う形にまとめる
// 一覧の表示・自動保存・上部カードの構成名など、複数の場所から同じデータを使うため、
// 画面の上位(Simulator)で1回だけ呼び、結果を各部品へ渡す。
export function useConfigCollection({
    savedBuildsReloadKey,
    activeConfigId,
    onConfigChange,
}: UseConfigCollectionProps) {
    const {status: authStatus, user} = useAuth()
    const isAuthenticated = authStatus === "authenticated" // ログイン済みか
    const authUserId = isAuthenticated ? user?.id ?? null : null // ログイン中のユーザーID（未ログインはnull）
    const isAuthLoading = authStatus === "loading" // 認証確認中は、ログイン前用の一覧を一瞬表示しないように区別する。

    // ログイン時の保存構成を扱うフック
    const serverBuilds = useSavedBuilds({
        enabled: isAuthenticated,
        userId: authUserId,
        reloadKey: savedBuildsReloadKey,
    })
    // ログイン時の構成の表示順を扱うフック
    const serverOrder = useConfigOrder({
        enabled: isAuthenticated,
        userId: authUserId,
        reloadKey: savedBuildsReloadKey,
    })
    // 未ログイン時は、同じ操作をlocalStorageに対して行う
    const local = useLocalConfigCollection({
        enabled: !isAuthenticated && !isAuthLoading,
    })

    const configsState = isAuthenticated ? serverBuilds : local.builds // ログイン状態に応じた構成一覧
    const configOrder = isAuthenticated ? serverOrder : local.order // ログイン状態に応じた表示順
    const configs = configsState.builds // 表示対象の構成一覧

    // 一覧を初めて表示できる状態になった認証ユーザー。
    // 一度そろった後は再取得中も一覧を出し続け、操作のたびに一覧が消えないようにする。
    const [configListReadyUserId, setConfigListReadyUserId] = useState<string | null>(null)

    // 構成の件数
    const totalConfigCount = configs.length

    // 保存済みの順に並べ、順序に無い構成は末尾へ補う
    // 構成一覧の表示順キー
    const availableKeys = configs.map((config) => configItemKey(config.id))
    // 保存済みの順に並べ、未登録の構成を末尾へ補ったキー
    const orderedConfigKeys = [
        ...configOrder.order.filter((itemKey) => availableKeys.includes(itemKey)),
        ...availableKeys.filter((itemKey) => !configOrder.order.includes(itemKey)),
    ]
    // 表示順キーから構成を引く対応表
    const configMap = new Map(configs.map((config) => [
        configItemKey(config.id),
        config,
    ]))
    // 表示順に並べた構成
    const orderedConfigs = orderedConfigKeys.flatMap((itemKey) => {
        const config = configMap.get(itemKey)

        return config ? [config] : []
    })

    // 構成一覧の取得が「完了」または「エラー」になったか
    const isConfigsSettled = !configsState.isLoading
    // 表示順の取得が完了またはエラーになったか
    const isConfigOrderSettled = configOrder.hasLoaded ||
        configOrder.errorMessage !== ""
    // 構成一覧と表示順の取得がそろったか
    const isConfigListSettled = isAuthLoading
        ? false
        : isAuthenticated
            ? isConfigsSettled && isConfigOrderSettled
            : local.isReady

    // 初回の取得がそろった時点のユーザーを記録する
    if (isConfigListSettled && configListReadyUserId !== authUserId) {
        setConfigListReadyUserId(authUserId)
    }

    // 構成一覧を表示できる状態か
    const isConfigListReady = !isAuthLoading && (
        isAuthenticated
            ? isConfigListSettled || configListReadyUserId === authUserId
            : local.isReady
    )

    // 削除などで選択中の構成が消えた場合は、先頭の構成へ戻す
    useEffect(() => {
        // 一覧が未準備・空なら構成の切り替えをしない
        if (!isConfigListReady || orderedConfigs.length === 0) {
            return
        }

        // 選択中の構成が一覧に残っていれば切り替えない
        if (orderedConfigs.some((config) => config.id === activeConfigId)) {
            return
        }

        onConfigChange(orderedConfigs[0]!.id)
    }, [activeConfigId, isConfigListReady, onConfigChange, orderedConfigs])

    // 選択中の構成名。見つからない場合は既定名へ戻す
    // 選択中の構成
    const activeConfig = orderedConfigs.find((config) =>
        config.id === activeConfigId)
    const activeConfigName = activeConfig?.name ?? "構成"

    return {
        // 認証
        isAuthenticated,
        isAuthLoading,
        authUserId,
        // 構成一覧
        configs,
        configsOperation: configsState.operation,
        configsErrorMessage: configsState.errorMessage,
        isConfigsLoading: configsState.isLoading,
        createConfig: configsState.create,
        updateConfig: configsState.update,
        renameConfig: configsState.rename,
        removeConfig: configsState.remove,
        reloadConfigs: configsState.reload,
        // 表示順
        configOrderErrorMessage: configOrder.errorMessage,
        isLoadingConfigOrder: configOrder.isLoading,
        isSavingConfigOrder: configOrder.isSaving,
        hasLoadedConfigOrder: configOrder.hasLoaded,
        saveConfigOrder: configOrder.save,
        reloadConfigOrder: configOrder.reload,
        // 画面向けにまとめた値
        orderedConfigs,
        orderedConfigKeys,
        totalSavedCount: totalConfigCount,
        maxConfigs: MAX_CONFIGS,
        isConfigListReady,
        activeConfigName,
    }
}

// 構成データのまとまり。一覧や自動保存の部品へ、このまとまりのまま渡す。
export type ConfigCollection = ReturnType<typeof useConfigCollection>

// 従来の上限値との互換のため、API側の上限も公開しておく
export {MAX_SAVED_BUILDS}

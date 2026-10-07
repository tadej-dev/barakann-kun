import {useEffect, useState} from "react"

import type {ConfigSlot} from "@/api/configSlots"
import type {SavedBuild} from "@/api/savedBuilds"
import {useAuth} from "@/features/auth/useAuth"
import {useSavedBuilds} from "@/features/saved-builds/useSavedBuilds"
import {useConfigOrder} from "@/features/simulator/useConfigOrder"
import {useConfigSlots} from "@/features/simulator/useConfigSlots"
import {
    CONFIG_IDS,
    type ConfigId,
} from "@/features/simulator/simulatorTypes"

// 固定枠と追加構成を、同じ並び替え対象として扱うための1件分
export type ConfigListItem =
    | {key: string; kind: "slot"; slot: ConfigSlot}
    | {key: string; kind: "build"; build: SavedBuild}

type UseConfigCollectionProps = {
    savedBuildsReloadKey: number // 保存済み構成を再取得するためのキー
    activeConfigId: ConfigId // 選択中の固定枠
    activeSavedBuildId: string | null // 選択中の追加構成
    onConfigChange: (configId: ConfigId) => void // 固定枠への切り替え
}

// 固定構成・追加構成を同じドラッグ対象として扱うキーを作成
export function configSlotItemKey(configId: ConfigId): string {
    // 固定枠と追加構成のID空間を分け、Sortableのキー衝突を防ぐ。
    return `config:${configId}`
}

// 追加構成をドラッグ対象として扱うキーを作成
export function savedBuildItemKey(buildId: string): string {
    // DBのIDを表示順APIで扱える文字列キーへ変換する。
    return `build:${buildId}`
}

// 構成(固定枠・追加構成・表示順)のデータを取得し、画面で使う形にまとめる
// 一覧の表示・自動保存・上部カードの構成名など、複数の場所から同じデータを使うため、
// 画面の上位(Simulator)で1回だけ呼び、結果を各部品へ渡す。
export function useConfigCollection({
    savedBuildsReloadKey,
    activeConfigId,
    activeSavedBuildId,
    onConfigChange,
}: UseConfigCollectionProps) {
    // 3つの同期フックを組み合わせ、固定枠・追加構成・表示順を一つの状態へまとめる。
    const {status: authStatus, user} = useAuth()
    const isAuthenticated = authStatus === "authenticated"
    const authUserId = isAuthenticated ? user?.id ?? null : null
    // 認証確認中は、ログイン前用のボタンを一瞬表示しないように区別する。
    const isAuthLoading = authStatus === "loading"

    const configSlots = useConfigSlots({
        enabled: isAuthenticated,
        userId: authUserId,
    })
    const configOrder = useConfigOrder({
        enabled: isAuthenticated,
        userId: authUserId,
        reloadKey: savedBuildsReloadKey,
    })
    const savedBuildsState = useSavedBuilds({
        enabled: isAuthenticated,
        userId: authUserId,
        reloadKey: savedBuildsReloadKey,
    })
    const savedBuilds = savedBuildsState.builds
    const isSavedBuildsLoading = savedBuildsState.isLoading

    // 構成一覧を初めて表示できる状態になった認証ユーザー。
    // 一度そろった後は再取得中も一覧を出し続け、操作のたびに一覧が消えないようにする。
    const [configListReadyUserId, setConfigListReadyUserId] = useState<string | null>(null)

    // 構成1〜4は固定の保存枠として常に件数へ含める
    const totalSavedCount = CONFIG_IDS.length + savedBuilds.length

    // 固定枠と追加構成を同じ配列にし、Sortable・保存順の処理を共通化する。
    const availableItems: ConfigListItem[] = [
        ...configSlots.slots.map((slot) => ({
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
    // 保存済み順に存在しない新規項目は末尾へ補完し、一覧から突然消えないようにする。
    const orderedItemKeys = [
        ...configOrder.order.filter((itemKey) => availableItemMap.has(itemKey)),
        ...availableItemKeys.filter((itemKey) => !configOrder.order.includes(itemKey)),
    ]
    const orderedItems = orderedItemKeys.flatMap((itemKey) => {
        const item = availableItemMap.get(itemKey)

        // 不正な順序キーは静かに除外し、実在する構成だけを描画する。
        return item ? [item] : []
    })

    // 固定枠・並び順・追加構成の取得がすべて「完了」または「エラー」になったか。
    // どれか1つでも未取得のまま表示すると、既定順で描画した後に並び替わってちらつく。
    const isConfigSlotsSettled = configSlots.hasLoadedSuccessfully ||
        configSlots.errorMessage !== ""
    const isConfigOrderSettled = configOrder.hasLoaded ||
        configOrder.errorMessage !== ""
    const isSavedBuildsSettled = !isSavedBuildsLoading
    const isConfigListSettled = isAuthenticated &&
        isConfigSlotsSettled &&
        isConfigOrderSettled &&
        isSavedBuildsSettled

    // 初回の取得がそろった時点のユーザーを記録する。
    // Effectを挟まず描画中に反映し、一覧が出るまでの余計な1フレームを作らない。
    if (isConfigListSettled && configListReadyUserId !== authUserId) {
        setConfigListReadyUserId(authUserId)
    }

    const isConfigListReady = isAuthenticated && (
        isConfigListSettled ||
        configListReadyUserId === authUserId
    )

    // 選択中の構成名を求める。上部カードに表示する。
    // 構成名はログイン時だけD1から取得するため、見つからない場合は固定枠の既定名へ戻す。
    const fallbackConfigName = `構成${activeConfigId}`
    const activeItem = isAuthenticated
        ? orderedItems.find((item) => {
            // 追加構成を選択中なら追加構成、そうでなければ固定枠を探す。
            if (activeSavedBuildId !== null) {
                return item.kind === "build" && item.build.id === activeSavedBuildId
            }

            return item.kind === "slot" && item.slot.configId === activeConfigId
        })
        : undefined
    const activeConfigName = activeItem
        ? activeItem.kind === "slot"
            ? activeItem.slot.name
            : activeItem.build.name
        : fallbackConfigName

    // 別端末でアクティブな追加構成が削除された場合は固定構成へ戻す
    useEffect(() => {
        // 一覧の再取得が終わるまでは一時的に構成が空に見えるため、復帰判定を遅らせる。
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

    return {
        // 認証
        isAuthenticated,
        isAuthLoading,
        authUserId,
        // 固定枠(構成1〜4)
        slots: configSlots.slots,
        slotOperation: configSlots.operation,
        slotsErrorMessage: configSlots.errorMessage,
        isSlotsLoading: configSlots.isLoading,
        hasLoadedConfigSlots: configSlots.hasLoadedSuccessfully,
        saveSlot: configSlots.save,
        clearSlot: configSlots.clear,
        renameSlot: configSlots.rename,
        reloadConfigSlots: configSlots.reload,
        setConfigSlotSharing: configSlots.setSharing,
        // 追加構成
        savedBuilds,
        savedBuildsOperation: savedBuildsState.operation,
        savedBuildsErrorMessage: savedBuildsState.errorMessage,
        isSavedBuildsLoading,
        createSavedBuild: savedBuildsState.create,
        updateSavedBuild: savedBuildsState.update,
        renameSavedBuild: savedBuildsState.rename,
        removeSavedBuild: savedBuildsState.remove,
        reloadSavedBuilds: savedBuildsState.reload,
        setSavedBuildSharing: savedBuildsState.setSharing,
        // 表示順
        configOrderErrorMessage: configOrder.errorMessage,
        isLoadingConfigOrder: configOrder.isLoading,
        isSavingConfigOrder: configOrder.isSaving,
        hasLoadedConfigOrder: configOrder.hasLoaded,
        saveConfigOrder: configOrder.save,
        reloadConfigOrder: configOrder.reload,
        // 画面向けにまとめた値
        orderedItems,
        orderedItemKeys,
        totalSavedCount,
        isConfigListReady,
        activeConfigName,
    }
}

// 構成データのまとまり。一覧や自動保存の部品へ、このまとまりのまま渡す。
export type ConfigCollection = ReturnType<typeof useConfigCollection>

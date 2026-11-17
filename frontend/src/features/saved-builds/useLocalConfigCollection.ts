import {useCallback, useEffect, useRef, useState} from "react"

import type {SavedBuild, SavedBuildPart} from "@/api/savedBuilds"
import {
    MAX_CONFIGS,
    configItemKey,
    type LocalConfigCollection,
    type StoredConfig,
} from "@/features/saved-builds/configRules"
import {
    loadLocalConfigCollection,
    saveLocalConfigCollection,
    subscribeToLocalConfigChanges,
} from "@/lib/simulator-storage"

type LocalBuildOperation = "create" | "rename" | "update" | "delete"

type UseLocalConfigCollectionOptions = {
    enabled: boolean // 未ログイン時だけローカルの内容を扱う
}

// 保存できなかったときに画面へ出す文言
const SAVE_ERROR_MESSAGE =
    "構成を保存できませんでした。ブラウザの保存領域を確認してください。"

// 保存済みの構成を、画面が扱う形へ変換する
function toSavedBuild(config: StoredConfig): SavedBuild {
    return {
        id: config.id,
        name: config.name,
        version: 1,
        // ローカル保存では作成日時を持たないため、未設定として扱う
        createdAt: "",
        updatedAt: "",
        isDefault: config.isDefault,
        parts: config.parts,
    }
}

// 表示順から削除済みの構成を除き、未登録の構成を末尾へ補う
function normalizeItemKeys(order: string[], configs: StoredConfig[]) {
    const configKeys = configs.map((config) => configItemKey(config.id))
    const existingKeys = new Set(configKeys)
    const knownKeys = order.filter((key) =>
        !key.startsWith("config:") || existingKeys.has(key))

    return [
        ...knownKeys,
        ...configKeys.filter((key) => !knownKeys.includes(key)),
    ]
}

// 構成一覧を読み込み、1件も無ければ既定の構成を用意する
function loadCollection(): LocalConfigCollection {
    const loaded = loadLocalConfigCollection()

    if (loaded.configs.length > 0) {
        return loaded
    }

    // 構成は必ず1件以上にする。既定の構成は削除できない
    const config: StoredConfig = {
        id: crypto.randomUUID(),
        name: "構成1",
        isDefault: true,
        parts: [],
    }

    saveLocalConfigCollection([config], [configItemKey(config.id)])

    return {
        configs: [config],
        order: [configItemKey(config.id)],
    }
}

// 未ログイン時の構成と並び順を、localStorageを使って管理する
export function useLocalConfigCollection({
    enabled,
}: UseLocalConfigCollectionOptions) {
    // localStorageは同期的に読めるため、初回描画時に読み込んでおく
    const [collection, setCollection] = useState<LocalConfigCollection>(
        loadCollection,
    )
    const [operation, setOperation] = useState<LocalBuildOperation | null>(null)
    const [isSavingOrder, setIsSavingOrder] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    // 操作のたびに最新の内容を参照するため、stateとは別に保持する
    const collectionRef = useRef(collection)

    useEffect(() => {
        collectionRef.current = collection
    }, [collection])

    // 他のタブで保存された内容に追従する
    useEffect(() => {
        if (!enabled) {
            return
        }

        return subscribeToLocalConfigChanges((next) => {
            setCollection(next)
            collectionRef.current = next
        })
    }, [enabled])

    // 保存に失敗したときは、画面が気づけるようエラーを残して呼び出し側へ伝える
    const persist = useCallback((next: LocalConfigCollection) => {
        if (!saveLocalConfigCollection(next.configs, next.order)) {
            setErrorMessage(SAVE_ERROR_MESSAGE)
            throw new Error(SAVE_ERROR_MESSAGE)
        }

        setErrorMessage("")
        setCollection(next)
        collectionRef.current = next

        return next
    }, [])

    const reload = useCallback(async () => {
        const loaded = loadCollection()

        setCollection(loaded)
        collectionRef.current = loaded
        setErrorMessage("")

        return loaded.configs.map(toSavedBuild)
    }, [])

    const create = useCallback(async (name: string, parts: SavedBuildPart[]) => {
        const current = collectionRef.current

        if (current.configs.length >= MAX_CONFIGS) {
            const message = `構成は${MAX_CONFIGS}件までです`

            setErrorMessage(message)
            throw new Error(message)
        }

        // 構成のIDは、サーバーと同じUUID形式で発行する
        const config: StoredConfig = {
            id: crypto.randomUUID(),
            name,
            isDefault: false,
            parts,
        }

        setOperation("create")

        try {
            const nextConfigs = [...current.configs, config]
            const next = persist({
                configs: nextConfigs,
                order: normalizeItemKeys(current.order, nextConfigs),
            })

            return toSavedBuild(
                next.configs.find((candidate) => candidate.id === config.id) ??
                config,
            )
        } finally {
            setOperation(null)
        }
    }, [persist])

    const update = useCallback(async (build: SavedBuild, parts: SavedBuildPart[]) => {
        const current = collectionRef.current
        const nextConfigs = current.configs.map((candidate) =>
            candidate.id === build.id
                ? {...candidate, parts}
                : candidate)

        setOperation("update")

        try {
            persist({
                configs: nextConfigs,
                order: current.order,
            })

            return toSavedBuild(
                nextConfigs.find((candidate) => candidate.id === build.id) ??
                {...build, parts},
            )
        } finally {
            setOperation(null)
        }
    }, [persist])

    const rename = useCallback(async (build: SavedBuild, name: string) => {
        const current = collectionRef.current
        const nextConfigs = current.configs.map((candidate) =>
            candidate.id === build.id
                ? {...candidate, name}
                : candidate)

        setOperation("rename")

        try {
            persist({
                configs: nextConfigs,
                order: current.order,
            })

            return toSavedBuild(
                nextConfigs.find((candidate) => candidate.id === build.id) ??
                {...build, name},
            )
        } finally {
            setOperation(null)
        }
    }, [persist])

    const remove = useCallback(async (build: SavedBuild) => {
        const current = collectionRef.current
        const nextConfigs = current.configs.filter((candidate) =>
            candidate.id !== build.id)

        setOperation("delete")

        try {
            persist({
                configs: nextConfigs,
                order: normalizeItemKeys(current.order, nextConfigs),
            })
        } finally {
            setOperation(null)
        }
    }, [persist])

    const saveOrder = useCallback(async (order: string[]) => {
        const current = collectionRef.current
        const nextOrder = normalizeItemKeys(order, current.configs)

        setIsSavingOrder(true)

        try {
            persist({configs: current.configs, order: nextOrder})

            return nextOrder
        } finally {
            setIsSavingOrder(false)
        }
    }, [persist])

    const isReady = enabled

    return {
        builds: {
            builds: enabled ? collection.configs.map(toSavedBuild) : [],
            create,
            errorMessage: enabled ? errorMessage : "",
            isLoading: false,
            operation: enabled ? operation : null,
            reload,
            remove,
            rename,
            update,
        },
        order: {
            errorMessage: enabled ? errorMessage : "",
            hasLoaded: isReady,
            isLoading: false,
            isSaving: enabled && isSavingOrder,
            order: enabled ? collection.order : [],
            reload,
            save: saveOrder,
        },
        isReady,
    }
}

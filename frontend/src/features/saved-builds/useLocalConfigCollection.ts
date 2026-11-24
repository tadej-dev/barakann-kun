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

// ローカル保存の変更操作（作成・名前変更・更新・削除）
type LocalBuildOperation = "create" | "rename" | "update" | "delete"

// useLocalConfigCollectionが受け取るオプション
type UseLocalConfigCollectionOptions = {
    enabled: boolean // ローカル利用時のみ
}

// 保存失敗メッセージ
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
        parts: config.parts,
    }
}

// 表示順から削除済みの構成を除き、未登録の構成を末尾へ補う
function normalizeItemKeys(order: string[], configs: StoredConfig[]) {
    const configKeys = configs.map((config) => configItemKey(config.id)) // 構成一覧の表示順キー
    const existingKeys = new Set(configKeys) // 存在する構成の表示順キー
    const knownKeys = order.filter((key) => // 削除済み構成を除いた表示順
        !key.startsWith("config:") || existingKeys.has(key))

    return [
        ...knownKeys,
        ...configKeys.filter((key) => !knownKeys.includes(key)),
    ]
}

// 構成一覧を読み込み、1件も無ければ初期構成を用意する
function loadCollection(): LocalConfigCollection {
    // localStorageから読み込んだ構成一覧
    const loaded = loadLocalConfigCollection()

    // 保存済み構成が1件以上あれば読み込み結果を使う
    if (loaded.configs.length > 0) {
        return loaded
    }

    // 構成が1件も無いときのために、初期表示用の構成を用意する
    const config: StoredConfig = {
        id: crypto.randomUUID(),
        name: "構成1",
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
    // 初回読み込み
    const [collection, setCollection] = useState<LocalConfigCollection>(
        loadCollection,
    )
    const [operation, setOperation] = useState<LocalBuildOperation | null>(null) // 実行中の操作
    const [isSavingOrder, setIsSavingOrder] = useState(false) // 表示順の保存中フラグ
    const [errorMessage, setErrorMessage] = useState("") // 保存や上限のエラーメッセージ
    const collectionRef = useRef(collection) // 最新内容の参照用

    // 最新の構成一覧を非同期処理向けに記録
    useEffect(() => {
        collectionRef.current = collection
    }, [collection])

    // 他のタブで保存された内容に追従する
    useEffect(() => {
        // ローカル利用でないときは変更購読を開始しない
        if (!enabled) {
            return
        }

        return subscribeToLocalConfigChanges((next) => {
            setCollection(next)
            collectionRef.current = next
        })
    }, [enabled])

    // ログアウト直後など、外部で保存された内容を読み直す。
    // 初回マウント時は読み込み済みなので、有効になった瞬間だけ実行する
    // 直前のenabled値（有効になった瞬間の判定用）
    const wasEnabledRef = useRef(enabled)

    useEffect(() => {
        // ローカル利用が有効になった直後か
        const becameEnabled = enabled && !wasEnabledRef.current

        wasEnabledRef.current = enabled

        // 有効になった瞬間でなければ読み直さない
        if (!becameEnabled) {
            return
        }

        // Effect内の同期的な更新を避けるため、マイクロタスクで反映する
        queueMicrotask(() => {
            // 読み直した構成一覧
            const next = loadCollection()

            setCollection(next)
            collectionRef.current = next
        })
    }, [enabled])

    // 保存に失敗したときは、画面が気づけるようエラーを残して呼び出し側へ伝える
    const persist = useCallback((next: LocalConfigCollection) => {
        // 保存できなければ呼び出し元へ例外を返す
        if (!saveLocalConfigCollection(next.configs, next.order)) {
            setErrorMessage(SAVE_ERROR_MESSAGE)
            throw new Error(SAVE_ERROR_MESSAGE)
        }

        setErrorMessage("")
        setCollection(next)
        collectionRef.current = next

        return next
    }, [])

    // 保存済みの構成一覧を読み直し、画面用の形で返す
    const reload = useCallback(async () => {
        // 読み直した構成一覧
        const loaded = loadCollection()

        setCollection(loaded)
        collectionRef.current = loaded
        setErrorMessage("")

        return loaded.configs.map(toSavedBuild)
    }, [])

    // 構成を1件追加し、保存後の構成を返す
    const create = useCallback(async (name: string, parts: SavedBuildPart[]) => {
        // 追加前の構成一覧
        const current = collectionRef.current

        // 構成数が上限（20件）に達している場合は追加しない
        if (current.configs.length >= MAX_CONFIGS) {
            // 上限の案内メッセージ
            const message = `構成は${MAX_CONFIGS}件までです`

            setErrorMessage(message)
            throw new Error(message)
        }

        // UUID形式のID
        // 追加する構成
        const config: StoredConfig = {
            id: crypto.randomUUID(),
            name,
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

    // 構成のパーツ内容を更新し、保存後の構成を返す
    const update = useCallback(async (build: SavedBuild, parts: SavedBuildPart[]) => {
        const current = collectionRef.current // 更新前の構成一覧
        const nextConfigs = current.configs.map((candidate) => // 対象構成だけを差し替えた一覧
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

    const rename = useCallback(async (build: SavedBuild, name: string) => { // 構成名を変更し、保存後の構成を返す
        const current = collectionRef.current // 変更前の構成一覧
        const nextConfigs = current.configs.map((candidate) => // 対象構成の名前だけを差し替えた一覧
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

    const remove = useCallback(async (build: SavedBuild) => { // 構成を1件削除し、表示順も更新
        const current = collectionRef.current // 削除前の構成一覧
        const nextConfigs = current.configs.filter((candidate) => // 削除対象を除いた構成一覧
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

    const saveOrder = useCallback(async (order: string[]) => { // 構成の表示順を保存し、補正後の表示順を返す
        const current = collectionRef.current // 保存前の構成一覧
        const nextOrder = normalizeItemKeys(order, current.configs) // 削除済み構成を除いて補正した表示順

        setIsSavingOrder(true)

        try {
            persist({configs: current.configs, order: nextOrder})

            return nextOrder
        } finally {
            setIsSavingOrder(false)
        }
    }, [persist])

    // localStorageの構成一覧を表示できる状態か
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

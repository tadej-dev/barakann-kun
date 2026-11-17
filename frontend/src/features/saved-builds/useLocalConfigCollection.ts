import {useCallback, useEffect, useRef, useState} from "react"

import type {SavedBuild, SavedBuildPart} from "@/api/savedBuilds"
import {
    MAX_ADDED_SAVED_BUILDS,
    type LocalConfigCollection,
    type StoredSavedBuild,
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

// 保存済みの形式を、画面が扱う構成一覧の形へ変換する
function toSavedBuild(build: StoredSavedBuild): SavedBuild {
    return {
        id: build.id,
        name: build.name,
        version: 1,
        // ローカル保存では作成日時を持たないため、未設定として扱う
        createdAt: "",
        updatedAt: "",
        parts: build.parts,
    }
}

// 表示順から削除済みの構成を除き、未登録の構成を末尾へ補う
function normalizeItemKeys(order: string[], builds: StoredSavedBuild[]) {
    const buildKeys = builds.map((build) => `build:${build.id}`)
    const existingKeys = new Set(buildKeys)
    const knownKeys = order.filter((key) =>
        !key.startsWith("build:") || existingKeys.has(key))

    return [
        ...knownKeys,
        ...buildKeys.filter((key) => !knownKeys.includes(key)),
    ]
}

// 未ログイン時の追加構成と並び順を、localStorageを使って管理する
export function useLocalConfigCollection({
    enabled,
}: UseLocalConfigCollectionOptions) {
    // localStorageは同期的に読めるため、初回描画時に読み込んでおく
    const [collection, setCollection] = useState<LocalConfigCollection>(
        loadLocalConfigCollection,
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
        if (!saveLocalConfigCollection(next.savedBuilds, next.order)) {
            setErrorMessage(SAVE_ERROR_MESSAGE)
            throw new Error(SAVE_ERROR_MESSAGE)
        }

        setErrorMessage("")
        setCollection(next)
        collectionRef.current = next

        return next
    }, [])

    const reload = useCallback(async () => {
        const loaded = loadLocalConfigCollection()

        setCollection(loaded)
        collectionRef.current = loaded
        setErrorMessage("")

        return loaded.savedBuilds.map(toSavedBuild)
    }, [])

    const create = useCallback(async (name: string, parts: SavedBuildPart[]) => {
        const current = collectionRef.current

        if (current.savedBuilds.length >= MAX_ADDED_SAVED_BUILDS) {
            const message = `追加できる構成は${MAX_ADDED_SAVED_BUILDS}件までです`

            setErrorMessage(message)
            throw new Error(message)
        }

        // 保存構成のIDは、サーバーと同じUUID形式で発行する
        const build: StoredSavedBuild = {
            id: crypto.randomUUID(),
            name,
            parts,
        }

        setOperation("create")

        try {
            const nextBuilds = [build, ...current.savedBuilds]
            const next = persist({
                savedBuilds: nextBuilds,
                // 既存の構成が並び順から落ちないよう、作成後の全件で整える
                order: normalizeItemKeys(current.order, nextBuilds),
            })

            return toSavedBuild(
                next.savedBuilds.find((candidate) => candidate.id === build.id) ??
                build,
            )
        } finally {
            setOperation(null)
        }
    }, [persist])

    const update = useCallback(async (build: SavedBuild, parts: SavedBuildPart[]) => {
        const current = collectionRef.current
        const nextBuilds = current.savedBuilds.map((candidate) =>
            candidate.id === build.id
                ? {id: candidate.id, name: candidate.name, parts}
                : candidate)

        setOperation("update")

        try {
            persist({
                savedBuilds: nextBuilds,
                order: normalizeItemKeys(current.order, nextBuilds),
            })

            return toSavedBuild(
                nextBuilds.find((candidate) => candidate.id === build.id) ??
                {id: build.id, name: build.name, parts},
            )
        } finally {
            setOperation(null)
        }
    }, [persist])

    const rename = useCallback(async (build: SavedBuild, name: string) => {
        const current = collectionRef.current
        const nextBuilds = current.savedBuilds.map((candidate) =>
            candidate.id === build.id
                ? {id: candidate.id, name, parts: candidate.parts}
                : candidate)

        setOperation("rename")

        try {
            persist({
                savedBuilds: nextBuilds,
                order: current.order,
            })

            return toSavedBuild(
                nextBuilds.find((candidate) => candidate.id === build.id) ??
                {id: build.id, name, parts: build.parts},
            )
        } finally {
            setOperation(null)
        }
    }, [persist])

    const remove = useCallback(async (build: SavedBuild) => {
        const current = collectionRef.current
        const nextBuilds = current.savedBuilds.filter((candidate) =>
            candidate.id !== build.id)

        setOperation("delete")

        try {
            persist({
                savedBuilds: nextBuilds,
                order: normalizeItemKeys(current.order, nextBuilds),
            })
        } finally {
            setOperation(null)
        }
    }, [persist])

    const saveOrder = useCallback(async (order: string[]) => {
        const current = collectionRef.current
        const nextOrder = normalizeItemKeys(order, current.savedBuilds)

        setIsSavingOrder(true)

        try {
            persist({savedBuilds: current.savedBuilds, order: nextOrder})

            return nextOrder
        } finally {
            setIsSavingOrder(false)
        }
    }, [persist])

    const isReady = enabled

    return {
        builds: {
            builds: enabled
                ? collection.savedBuilds.map(toSavedBuild)
                : [],
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

import {
    createSavedBuild,
    type SavedBuild,
    type SavedBuildPartInput,
} from "@/api/savedBuilds"
import {
    CONFIG_IDS,
    type ConfigId,
} from "@/features/simulator/simulatorTypes"
import type {StoredSimulatorState} from "@/lib/simulator-storage"

const MIGRATION_STORAGE_KEY = "barakann-saved-build-import-v1"

type MigrationEntry = {
    buildId: string
    fingerprint: string
    importedAt: string
}

type StoredMigrationState = {
    version: 1
    userId: string
    configs: Partial<Record<ConfigId, MigrationEntry>>
    dismissed?: Partial<Record<ConfigId, string>>
    completedAt?: string
}

export type SavedBuildMigrationResult = {
    created: Array<{configId: ConfigId; build: SavedBuild}>
    skipped: ConfigId[]
    failed: Array<{configId: ConfigId; message: string}>
}

// パーツが1つ以上ある構成だけを移行対象として抽出
export function getNonEmptyConfigIds(
    state: StoredSimulatorState,
): ConfigId[] {
    return CONFIG_IDS.filter((configId) =>
        Object.keys(state.configs[configId] ?? {}).length > 0,
    )
}

// Storageが使えない環境でも移行処理自体は画面を壊さず継続する
function getLocalStorage(): Storage | null {
    try {
        return typeof window === "undefined" ? null : window.localStorage
    } catch {
        return null
    }
}

// 構成のスロットとパーツIDから順序に依存しない識別値を作成
function createConfigFingerprint(
    selections: Record<string, number>,
): string {
    return Object.entries(selections)
        .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
        .map(([slotKey, partId]) => `${slotKey}=${partId}`)
        .join("&")
}

// 移行状態のJSONを安全に読み取る
function parseMigrationState(value: string): StoredMigrationState | null {
    try {
        const parsed: unknown = JSON.parse(value)

        if (
            typeof parsed !== "object" ||
            parsed === null
        ) {
            return null
        }

        const record = parsed as Record<string, unknown>

        if (
            record.version !== 1 ||
            typeof record.userId !== "string" ||
            typeof record.configs !== "object" ||
            record.configs === null ||
            Array.isArray(record.configs)
        ) {
            return null
        }

        const rawConfigs = record.configs as Record<string, unknown>
        const configs: Partial<Record<ConfigId, MigrationEntry>> = {}

        for (const configId of CONFIG_IDS) {
            const rawEntry = rawConfigs[configId]

            if (rawEntry === undefined) {
                continue
            }

            if (
                typeof rawEntry !== "object" ||
                rawEntry === null
            ) {
                return null
            }

            const entry = rawEntry as Record<string, unknown>

            if (
                typeof entry.buildId !== "string" ||
                typeof entry.fingerprint !== "string" ||
                typeof entry.importedAt !== "string"
            ) {
                return null
            }

            configs[configId] = {
                buildId: entry.buildId,
                fingerprint: entry.fingerprint,
                importedAt: entry.importedAt,
            }
        }

        const dismissed: Partial<Record<ConfigId, string>> = {}
        const rawDismissed = record.dismissed

        if (
            rawDismissed !== undefined &&
            (
                typeof rawDismissed !== "object" ||
                rawDismissed === null ||
                Array.isArray(rawDismissed)
            )
        ) {
            return null
        }

        if (rawDismissed && typeof rawDismissed === "object") {
            const dismissedRecord = rawDismissed as Record<string, unknown>

            for (const configId of CONFIG_IDS) {
                const fingerprint = dismissedRecord[configId]

                if (fingerprint === undefined) {
                    continue
                }

                if (typeof fingerprint !== "string") {
                    return null
                }

                dismissed[configId] = fingerprint
            }
        }

        if (
            record.completedAt !== undefined &&
            typeof record.completedAt !== "string"
        ) {
            return null
        }

        return {
            version: 1,
            userId: record.userId,
            configs,
            dismissed,
            completedAt: record.completedAt,
        }
    } catch {
        return null
    }
}

// ユーザー単位の移行済み構成一覧を取得
export function loadSavedBuildMigration(
    userId: string,
): StoredMigrationState | null {
    const storage = getLocalStorage()

    if (!storage) {
        return null
    }

    let value: string | null

    try {
        value = storage.getItem(MIGRATION_STORAGE_KEY)
    } catch {
        return null
    }

    if (!value) {
        return null
    }

    const state = parseMigrationState(value)

    return state?.userId === userId ? state : null
}

// 未移行の構成が残っているかを確認し、ログイン後の表示条件を決める
export function hasPendingLocalSimulatorMigration(
    userId: string,
    state: StoredSimulatorState,
): boolean {
    const migrationState = loadSavedBuildMigration(userId)

    // 一度アカウントへ保存したユーザーには、同じブラウザ構成の再移行を促さない
    if (migrationState?.completedAt) {
        return false
    }

    return getNonEmptyConfigIds(state).some((configId) => {
        if (migrationState?.configs[configId]) {
            return false
        }

        const fingerprint = createConfigFingerprint(
            state.configs[configId] ?? {},
        )

        return migrationState?.dismissed?.[configId] !== fingerprint
    })
}

// 今回は移行しない構成の内容を保存し、同じ構成の再表示を防ぐ
export function dismissLocalSimulatorMigration(
    userId: string,
    state: StoredSimulatorState,
) {
    const storage = getLocalStorage()

    if (!storage) {
        return
    }

    const current = loadSavedBuildMigration(userId) ?? {
        version: 1 as const,
        userId,
        configs: {},
    }
    const dismissed = {...current.dismissed}

    for (const configId of getNonEmptyConfigIds(state)) {
        if (current.configs[configId]) {
            continue
        }

        dismissed[configId] = createConfigFingerprint(
            state.configs[configId] ?? {},
        )
    }

    try {
        storage.setItem(
            MIGRATION_STORAGE_KEY,
            JSON.stringify({...current, dismissed}),
        )
    } catch {
        // Storageへ書き込めない場合は、次回表示を抑止できなくても移行を継続する
    }
}

// 構成ごとの移行成功を直ちに保存し、途中失敗時も再開可能にする
function saveMigrationEntry(
    userId: string,
    configId: ConfigId,
    entry: MigrationEntry,
) {
    const storage = getLocalStorage()

    if (!storage) {
        return
    }

    const current = loadSavedBuildMigration(userId) ?? {
        version: 1 as const,
        userId,
        configs: {},
    }
    const next: StoredMigrationState = {
        ...current,
        configs: {
            ...current.configs,
            [configId]: entry,
        },
        dismissed: {...current.dismissed},
    }

    delete next.dismissed?.[configId]

    try {
        storage.setItem(
            MIGRATION_STORAGE_KEY,
            JSON.stringify(next),
        )
    } catch {
        // Storageへ書き込めない場合でも、サーバー側の保存結果は維持する
    }
}

// すべての移行対象を保存できたことを記録し、次回以降の案内を止める
function markMigrationComplete(userId: string) {
    const storage = getLocalStorage()

    if (!storage) {
        return
    }

    const current = loadSavedBuildMigration(userId) ?? {
        version: 1 as const,
        userId,
        configs: {},
    }

    try {
        storage.setItem(
            MIGRATION_STORAGE_KEY,
            JSON.stringify({
                ...current,
                completedAt: new Date().toISOString(),
            }),
        )
    } catch {
        // Storageへ書き込めない場合でも、移行APIの結果は画面へ返す
    }
}

// localStorage上の1構成をAPI入力へ変換
function toSavedBuildParts(
    selections: Record<string, number>,
): SavedBuildPartInput[] {
    return Object.entries(selections)
        .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
        .map(([slotKey, partId]) => ({slotKey, partId}))
}

// 空の構成を除外し、ログインユーザーのD1へ旧構成を取り込む
export async function migrateLocalSimulatorState(
    userId: string,
    state: StoredSimulatorState,
    signal?: AbortSignal,
    names: Partial<Record<ConfigId, string>> = {},
): Promise<SavedBuildMigrationResult> {
    const migrationState = loadSavedBuildMigration(userId)
    const result: SavedBuildMigrationResult = {
        created: [],
        skipped: [],
        failed: [],
    }

    for (const configId of CONFIG_IDS) {
        const selections = state.configs[configId] ?? {}
        const partEntries = Object.entries(selections)

        // パーツ未選択の構成はD1に空レコードを作らない
        if (partEntries.length === 0) {
            continue
        }

        // 同じブラウザ・同じユーザーで成功済みの構成は二重登録しない
        if (migrationState?.configs[configId]) {
            result.skipped.push(configId)
            continue
        }

        try {
            const requestedName = names[configId]?.trim()
            const build = await createSavedBuild(
                requestedName || `構成${configId}`,
                toSavedBuildParts(selections),
                signal,
            )

            saveMigrationEntry(userId, configId, {
                buildId: build.id,
                fingerprint: createConfigFingerprint(selections),
                importedAt: new Date().toISOString(),
            })
            result.created.push({configId, build})
        } catch (error) {
            if (signal?.aborted) {
                throw error
            }

            result.failed.push({
                configId,
                message: error instanceof Error
                    ? error.message
                    : "構成の保存に失敗しました",
            })
        }
    }

    if (
        result.failed.length === 0 &&
        getNonEmptyConfigIds(state).length > 0
    ) {
        markMigrationComplete(userId)
    }

    return result
}

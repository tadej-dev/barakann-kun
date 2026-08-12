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

// ブラウザ環境以外では移行状態を読み書きしない
function canUseStorage() {
    return typeof window !== "undefined" && Boolean(window.localStorage)
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

        return {
            version: 1,
            userId: record.userId,
            configs,
        }
    } catch {
        return null
    }
}

// ユーザー単位の移行済み構成一覧を取得
export function loadSavedBuildMigration(
    userId: string,
): StoredMigrationState | null {
    if (!canUseStorage()) {
        return null
    }

    const value = window.localStorage.getItem(MIGRATION_STORAGE_KEY)

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

    return getNonEmptyConfigIds(state).some(
        (configId) => !migrationState?.configs[configId],
    )
}

// 構成ごとの移行成功を直ちに保存し、途中失敗時も再開可能にする
function saveMigrationEntry(
    userId: string,
    configId: ConfigId,
    entry: MigrationEntry,
) {
    if (!canUseStorage()) {
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
    }

    window.localStorage.setItem(
        MIGRATION_STORAGE_KEY,
        JSON.stringify(next),
    )
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

    return result
}

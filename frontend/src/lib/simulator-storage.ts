import {
    type ConfigId,
    type ConfigStates,
} from "@/features/simulator/simulatorTypes"
import {migrateLegacyPartSlotSelections} from "@/features/simulator/partSlots"
import {
    configItemKey,
    normalizeConfigOrder,
    normalizeConfigs,
    type LocalConfigCollection,
    type StoredConfig,
} from "@/features/saved-builds/configRules"

export type {LocalConfigCollection, StoredConfig}

// 構成の選択(選択中の構成と、構成ごとのパーツ)を保存するキー
const STORAGE_KEY = "barakann-simulator-configs-v4"

// 構成の一覧(名前・既定・パーツ)と並び順を保存するキー
const COLLECTION_STORAGE_KEY = "barakann-config-collection-v2"

// 以前の保存形式。読み込みのときだけ使う
const LEGACY_STORAGE_KEYS = [
    "barakann-simulator-configs-v3",
    "barakann-simulator-configs-v2",
    "barakann-simulator-configs-v1",
] as const
const LEGACY_COLLECTION_KEY = "barakann-config-collection-v1"

// フリーボディ統合で削除した旧パーツIDと、残したIDの対応。
const PART_ID_ALIASES: Record<number, number> = {
    442: 441,
    444: 443,
    446: 445,
    448: 447,
    450: 449,
    452: 451,
}

type StoredSelections = Record<string, number>
type StoredConfigStates = Record<ConfigId, StoredSelections>

export type StoredSimulatorState = {
    activeConfigId: ConfigId
    configs: StoredConfigStates
}

type SimulatorStorageSource = {
    activeConfigId: ConfigId
    configs: ConfigStates
}

// 追加構成が無いときの既定値
function emptyCollection(): LocalConfigCollection {
    return {configs: [], order: []}
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isConfigId(value: unknown): value is ConfigId {
    return typeof value === "string" && value.length > 0
}

// プライベートブラウズや容量超過でStorageが使えない場合も画面を壊さない
function getLocalStorage(): Storage | null {
    try {
        return typeof window === "undefined" ? null : window.localStorage
    } catch {
        return null
    }
}

// Storageの読み取りは失敗しても例外を画面へ伝播させない
function readItem(storage: Storage, key: string): string | null {
    try {
        return storage.getItem(key)
    } catch {
        return null
    }
}

function getStoredPartId(value: unknown) {
    if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
        return value
    }

    if (
        isRecord(value) &&
        typeof value.id === "number" &&
        Number.isSafeInteger(value.id) &&
        value.id > 0
    ) {
        return value.id
    }

    return null
}

function parseStoredState(value: string): StoredSimulatorState | null {
    try {
        const storedState: unknown = JSON.parse(value)

        if (
            !isRecord(storedState) ||
            !isConfigId(storedState.activeConfigId) ||
            !isRecord(storedState.configs)
        ) {
            return null
        }

        const configs = Object.fromEntries(
            Object.entries(storedState.configs).flatMap(([configId, rawSelections]) => {
                if (!isConfigId(configId) || !isRecord(rawSelections)) {
                    return []
                }

                // 旧形式・欠損した構成は空として扱い、他の構成の復元を継続する。
                const migratedSelections = migrateLegacyPartSlotSelections(
                    rawSelections,
                )
                const selections = Object.fromEntries(
                    Object.entries(migratedSelections).flatMap(
                        ([slotKey, storedPart]) => {
                            // 旧形式ではパーツ全体が保存されるため、IDだけを抽出して現行形式へ揃える。
                            const partId = getStoredPartId(storedPart)

                            return partId === null
                                ? []
                                : [[slotKey, PART_ID_ALIASES[partId] ?? partId]]
                        },
                    ),
                ) as StoredSelections

                return [[configId, selections]]
            }),
        ) as StoredConfigStates

        return {
            activeConfigId: storedState.activeConfigId,
            configs,
        }
    } catch {
        return null
    }
}

export function loadSimulatorState(): StoredSimulatorState | null {
    const storage = getLocalStorage()

    if (!storage) {
        return null
    }

    for (const storageKey of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
        const value = readItem(storage, storageKey)

        if (!value) {
            continue
        }

        const storedState = parseStoredState(value)

        if (storedState) {
            // 現行キーを優先し、なければ旧キーを読み取って後方互換を保つ。
            return storedState
        }
    }

    return null
}

// 構成の選択を保存する。保存できたかを返し、失敗時は画面側で知らせられるようにする。
export function saveSimulatorState(state: SimulatorStorageSource): boolean {
    const storage = getLocalStorage()

    if (!storage) {
        return false
    }

    const configs = Object.fromEntries(
        Object.entries(state.configs).map(([configId, selectedParts]) => [
            configId,
            Object.fromEntries(
                Object.entries(selectedParts).map(
                    ([slotKey, part]) => [slotKey, part.id],
                ),
            ),
        ]),
    ) as StoredConfigStates

    try {
        storage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                activeConfigId: state.activeConfigId,
                configs,
            } satisfies StoredSimulatorState),
        )

        return true
    } catch {
        // Storageへ書き込めない環境では、メモリ上の状態だけを維持する
        return false
    }
}

// 保存された構成一覧と並び順を取り出す
function parseCollection(value: string): LocalConfigCollection | null {
    try {
        const storedState: unknown = JSON.parse(value)

        if (!isRecord(storedState)) {
            return null
        }

        if (!Array.isArray(storedState.configs) && !Array.isArray(storedState.order)) {
            return null
        }

        return {
            configs: normalizeConfigs(storedState.configs),
            order: normalizeConfigOrder(storedState.order),
        }
    } catch {
        return null
    }
}

// 旧形式(固定枠の選択状態と追加構成が別々)から、1系統の構成一覧を組み立てる
function migrateLegacyConfigs(storage: Storage): LocalConfigCollection | null {
    const legacySelection = LEGACY_STORAGE_KEYS
        .map((key) => readItem(storage, key))
        .find((value): value is string => Boolean(value))
    const legacyCollection = readItem(storage, LEGACY_COLLECTION_KEY)

    const configs: StoredConfig[] = []

    // 旧形式の固定枠は、キーをそのまま構成IDとして引き継ぐ
    if (legacySelection) {
        const state = parseStoredState(legacySelection)

        for (const [configId, selections] of Object.entries(state?.configs ?? {})) {
            configs.push({
                id: configId,
                name: `構成${configId}`,
                isDefault: false,
                // 選択状態にはパーツIDしか無いため、パーツの内訳は空から始める
                parts: Object.entries(selections).map(([slotKey, partId]) => ({
                    slotKey,
                    partId,
                    price: 0,
                    weight: 0,
                })),
            })
        }
    }

    let order: string[] = []

    // キー分割前は選択状態と同じキーに追加構成が入っていたため、それも引き継ぐ
    const embeddedCollection = legacySelection
        ? (() => {
            try {
                const parsed: unknown = JSON.parse(legacySelection)

                return isRecord(parsed) &&
                    (Array.isArray(parsed.savedBuilds) || Array.isArray(parsed.order))
                    ? JSON.stringify(parsed)
                    : null
            } catch {
                return null
            }
        })()
        : null

    // 旧形式の追加構成は、そのまま構成として引き継ぐ
    if (legacyCollection || embeddedCollection) {
        try {
            const parsed: unknown = JSON.parse(
                legacyCollection ?? embeddedCollection ?? "{}",
            )

            if (isRecord(parsed) && Array.isArray(parsed.savedBuilds)) {
                // 既定は最後にまとめて決めるため、ここでは false のまま追加する
                configs.push(...parsed.savedBuilds.map((build) => {
                    const parts = isRecord(build) && Array.isArray(build.parts)
                        ? build.parts.map((part) =>
                            isRecord(part) && typeof part.partId === "number"
                                ? {
                                    ...part,
                                    partId: PART_ID_ALIASES[part.partId] ??
                                        part.partId,
                                }
                                : part)
                        : []

                    return {
                        id: isRecord(build) && typeof build.id === "string"
                            ? build.id
                            : "",
                        name: isRecord(build) && typeof build.name === "string"
                            ? build.name
                            : "",
                        isDefault: false,
                        parts,
                    }
                }))
            }

            if (isRecord(parsed) && Array.isArray(parsed.order)) {
                order = parsed.order.flatMap((key): string[] => {
                    if (typeof key !== "string") {
                        return []
                    }

                    // build:<id> は config:<id> と同じ扱いにする
                    if (key.startsWith("build:")) {
                        return [configItemKey(key.slice("build:".length))]
                    }

                    return [key]
                })
            }
        } catch {
            // 壊れた旧データは無視する
        }
    }

    if (configs.length === 0) {
        return null
    }

    // 既定は先頭の1件だけにする
    return {
        configs: normalizeConfigs(configs),
        order: normalizeConfigOrder(order),
    }
}

// 構成一覧と並び順を読み込む。壊れた項目は読み飛ばす
export function loadLocalConfigCollection(): LocalConfigCollection {
    const storage = getLocalStorage()

    if (!storage) {
        return emptyCollection()
    }

    const value = readItem(storage, COLLECTION_STORAGE_KEY)

    if (value) {
        const collection = parseCollection(value)

        if (collection) {
            return collection
        }
    }

    // 旧形式が残っていれば新しいキーへ引き継ぐ
    const migrated = migrateLegacyConfigs(storage)

    if (migrated) {
        saveLocalConfigCollection(migrated.configs, migrated.order)

        return migrated
    }

    return emptyCollection()
}

// 構成一覧と並び順を保存する。保存できたかを返す
export function saveLocalConfigCollection(
    configs: StoredConfig[],
    order: string[],
): boolean {
    const storage = getLocalStorage()

    if (!storage) {
        return false
    }

    const collection: LocalConfigCollection = {
        configs: normalizeConfigs(configs),
        order: normalizeConfigOrder(order),
    }

    try {
        storage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(collection))

        return true
    } catch {
        // 容量超過などで書き込めない場合は、メモリ上の状態だけを維持する
        return false
    }
}

// 別タブでの保存を検知し、呼び出し側の状態を最新へ追従させる
export function subscribeToLocalConfigChanges(
    listener: (collection: LocalConfigCollection) => void,
): () => void {
    if (typeof window === "undefined") {
        return () => {}
    }

    const handleStorage = (event: StorageEvent) => {
        // 構成一覧の更新と、Storage全体のclearのときだけ取り直す
        if (event.key !== null && event.key !== COLLECTION_STORAGE_KEY) {
            return
        }

        listener(loadLocalConfigCollection())
    }

    window.addEventListener("storage", handleStorage)

    return () => window.removeEventListener("storage", handleStorage)
}

export function clearSimulatorState() {
    const storage = getLocalStorage()

    if (!storage) {
        return
    }

    try {
        storage.removeItem(STORAGE_KEY)
        storage.removeItem(COLLECTION_STORAGE_KEY)
        storage.removeItem(LEGACY_COLLECTION_KEY)
        for (const storageKey of LEGACY_STORAGE_KEYS) {
            storage.removeItem(storageKey)
        }
    } catch {
        // Storageへアクセスできない場合も、画面上のクリア処理は継続する
    }
}

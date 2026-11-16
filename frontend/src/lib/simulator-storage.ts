import {
    CONFIG_IDS,
    type ConfigId,
    type ConfigStates,
} from "@/features/simulator/simulatorTypes"
import {migrateLegacyPartSlotSelections} from "@/features/simulator/partSlots"
import {
    normalizeConfigOrder,
    normalizeSavedBuilds,
    type LocalConfigCollection,
    type StoredSavedBuild,
} from "@/features/saved-builds/configRules"

export type {LocalConfigCollection, StoredSavedBuild}

// 構成の選択(構成1〜4と選択中の構成)を保存するキー
const STORAGE_KEY = "barakann-simulator-configs-v3"

// 追加構成と並び順を保存するキー
// 選択状態と同じキーへ書き込むと、複数タブで同時に保存したときに片方の項目が消えるため分ける。
const COLLECTION_STORAGE_KEY = "barakann-config-collection-v1"

const LEGACY_STORAGE_KEYS = [
    "barakann-simulator-configs-v2",
    "barakann-simulator-configs-v1",
] as const

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

// 追加構成が無いときの既定値。呼び出し側で同じ値を共有しないよう毎回作る。
function emptyCollection(): LocalConfigCollection {
    return {savedBuilds: [], order: []}
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isConfigId(value: unknown): value is ConfigId {
    return typeof value === "string" && CONFIG_IDS.includes(value as ConfigId)
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
            CONFIG_IDS.map((configId) => {
                // 旧形式・欠損した構成は空として扱い、他の構成の復元を継続する。
                const rawSelections = isRecord(storedState.configs)
                    && isRecord(storedState.configs[configId])
                    ? storedState.configs[configId]
                    : {}
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

                return [configId, selections]
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

// 保存済みの形式のまま書き込む。画面の状態から書き込む場合も移行時も同じ経路を使う
function writeStoredState(
    storage: Storage,
    state: StoredSimulatorState,
): boolean {
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
        // Storageへ書き込めない環境では、メモリ上の選択状態だけを維持する
        return false
    }

    // 保存自体は成功しているため、旧キーの後片付けに失敗しても成功として扱う
    try {
        for (const storageKey of LEGACY_STORAGE_KEYS) {
            storage.removeItem(storageKey)
        }
    } catch {
        // 後片付けに失敗しても、保存した内容は有効
    }

    return true
}

// 構成の選択を保存する。保存できたかを返し、失敗時は画面側で知らせられるようにする。
export function saveSimulatorState(state: SimulatorStorageSource): boolean {
    const storage = getLocalStorage()

    if (!storage) {
        return false
    }

    const configs = Object.fromEntries(
        CONFIG_IDS.map((configId) => [
            configId,
            Object.fromEntries(
                Object.entries(state.configs[configId]).map(
                    ([slotKey, part]) => [slotKey, part.id],
                ),
            ),
        ]),
    ) as StoredConfigStates

    // キー分割前の追加構成が残っていれば先に移行し、上書きで失わないようにする。
    // 移行に失敗した場合は、旧データを消さないよう書き換えない。
    if (migrateLegacyCollection(storage).status === "failed") {
        return false
    }

    return writeStoredState(storage, {
        activeConfigId: state.activeConfigId,
        configs,
    })
}

// 統合で削除した旧パーツIDを、残したIDへ読み替える
function migratePartIdAliases(
    collection: LocalConfigCollection,
): LocalConfigCollection {
    return {
        savedBuilds: collection.savedBuilds.map((build) => ({
            ...build,
            parts: build.parts.map((part) => ({
                ...part,
                partId: PART_ID_ALIASES[part.partId] ?? part.partId,
            })),
        })),
        order: collection.order,
    }
}

// 保存された追加構成と並び順を取り出す。キー分割前の形式も同じ形で読める
function parseCollection(value: string): LocalConfigCollection | null {
    try {
        const storedState: unknown = JSON.parse(value)

        if (!isRecord(storedState)) {
            return null
        }

        if (
            !Array.isArray(storedState.savedBuilds) &&
            !Array.isArray(storedState.order)
        ) {
            return null
        }

        const collection: LocalConfigCollection = {
            savedBuilds: normalizeSavedBuilds(storedState.savedBuilds),
            order: normalizeConfigOrder(storedState.order),
        }

        return migratePartIdAliases(collection)
    } catch {
        return null
    }
}

// 追加構成と並び順を読み込む。壊れた項目は読み飛ばして、正常な項目だけを返す。
export function loadLocalConfigCollection(): LocalConfigCollection {
    const storage = getLocalStorage()

    if (!storage) {
        return emptyCollection()
    }

    const value = readItem(storage, COLLECTION_STORAGE_KEY)

    // 項目の型が壊れている場合は、移行元の内容で置き換えられるよう移行へ進む
    if (value && hasStoredCollection(value)) {
        const collection = parseCollection(value)

        if (collection) {
            return collection
        }
    }

    // キー分割前のデータが残っていれば、新しいキーへ引き継ぐ。
    const migration = migrateLegacyCollection(storage)

    if (migration.status === "failed") {
        // 移行できなくても、画面には旧データを見せる（次回の読み込みで再試行する）
        return migration.collection
    }

    if (migration.status === "none") {
        return emptyCollection()
    }

    // 移行元からは追加構成の項目を消し、古い内容が再び読まれないようにする
    const state = parseStoredState(migration.source)

    if (state) {
        writeStoredState(storage, state)
    }

    return migration.collection
}

type LegacyMigration =
    | {status: "none"}
    | {status: "migrated"; collection: LocalConfigCollection; source: string}
    // 新しいキーへ保存できなかった場合も、読み込んだ内容は呼び出し側へ返す
    | {status: "failed"; collection: LocalConfigCollection}

// 既存データとして扱えるかは、追加構成と並び順の両方が配列であることまで確認する
function hasStoredCollection(value: string): boolean {
    try {
        const parsed: unknown = JSON.parse(value)

        return isRecord(parsed) &&
            Array.isArray(parsed.savedBuilds) &&
            Array.isArray(parsed.order)
    } catch {
        return false
    }
}

// キー分割前の保存内容(1つのキーに追加構成も入っていた形式)を新しいキーへ移す。
// 新しいキーに既にデータがあれば移行せず、古い値で上書きしない。
function migrateLegacyCollection(storage: Storage): LegacyMigration {
    const existingValue = readItem(storage, COLLECTION_STORAGE_KEY)

    // 壊れた内容は「データがある」とみなさず、移行元の内容で置き換える
    if (existingValue !== null && hasStoredCollection(existingValue)) {
        return {status: "none"}
    }

    const legacyValue = readItem(storage, STORAGE_KEY)

    if (!legacyValue) {
        return {status: "none"}
    }

    const collection = parseCollection(legacyValue)

    if (!collection) {
        return {status: "none"}
    }

    if (!saveLocalConfigCollection(collection.savedBuilds, collection.order)) {
        // 保存できなかった場合は移行元をそのまま残し、次回もう一度試す
        return {status: "failed", collection}
    }

    return {status: "migrated", collection, source: legacyValue}
}

// 追加構成と並び順を保存する。保存できたかを返し、失敗時は画面側で知らせられるようにする。
export function saveLocalConfigCollection(
    savedBuilds: StoredSavedBuild[],
    order: string[],
): boolean {
    const storage = getLocalStorage()

    if (!storage) {
        return false
    }

    // 画面から渡された値も、保存形式と同じルールで整えてから書き込む。
    const collection: LocalConfigCollection = {
        savedBuilds: normalizeSavedBuilds(savedBuilds),
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
        // 追加構成の更新と、Storage全体のclearのときだけ一覧を取り直す
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
        for (const storageKey of LEGACY_STORAGE_KEYS) {
            storage.removeItem(storageKey)
        }
    } catch {
        // Storageへアクセスできない場合も、画面上のクリア処理は継続する
    }
}

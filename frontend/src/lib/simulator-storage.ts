import {
    CONFIG_IDS,
    type ConfigId,
    type ConfigStates,
} from "@/features/simulator/simulatorTypes"
import {migrateLegacyPartSlotSelections} from "@/features/simulator/partSlots"

const STORAGE_KEY = "barakann-simulator-configs-v3"
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

// 未ログイン時に保存する追加構成。パーツは保存時点の価格・重量も持つ。
export type StoredSavedBuild = {
    id: string
    name: string
    parts: {
        slotKey: string
        partId: number
        price: number
        weight: number
    }[]
}

export type StoredSimulatorState = {
    activeConfigId: ConfigId
    configs: StoredConfigStates
    // 追加構成と表示順。旧形式には無いため空を既定にする。
    savedBuilds: StoredSavedBuild[]
    order: string[]
}

type SimulatorStorageSource = {
    activeConfigId: ConfigId
    configs: ConfigStates
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

        // 追加構成と表示順は、旧形式や壊れた値なら空として扱う。
        const savedBuilds = Array.isArray(storedState.savedBuilds)
            ? storedState.savedBuilds.flatMap((build) => {
                const parsed = parseStoredSavedBuild(build)

                return parsed ? [parsed] : []
            })
            : []
        const order = Array.isArray(storedState.order)
            ? storedState.order.filter((key): key is string =>
                typeof key === "string")
            : []

        return {
            activeConfigId: storedState.activeConfigId,
            configs,
            savedBuilds,
            order,
        }
    } catch {
        return null
    }
}

// 追加構成の1件を検証する。壊れた項目は読み飛ばし、他の構成の復元を続ける。
function parseStoredSavedBuild(value: unknown): StoredSavedBuild | null {
    if (
        !isRecord(value) ||
        typeof value.id !== "string" ||
        value.id.length === 0 ||
        typeof value.name !== "string" ||
        value.name.length === 0 ||
        !Array.isArray(value.parts)
    ) {
        return null
    }

    const parts = value.parts.flatMap((part) => {
        if (
            !isRecord(part) ||
            typeof part.slotKey !== "string" ||
            part.slotKey.length === 0
        ) {
            return []
        }

        const partId = getStoredPartId(part.partId)

        if (
            partId === null ||
            typeof part.price !== "number" ||
            !Number.isSafeInteger(part.price) ||
            part.price < 0 ||
            typeof part.weight !== "number" ||
            !Number.isSafeInteger(part.weight) ||
            part.weight < 0
        ) {
            return []
        }

        return [{
            slotKey: part.slotKey,
            partId: PART_ID_ALIASES[partId] ?? partId,
            price: part.price,
            weight: part.weight,
        }]
    })

    return {id: value.id, name: value.name, parts}
}

export function loadSimulatorState(): StoredSimulatorState | null {
    const storage = getLocalStorage()

    if (!storage) {
        return null
    }

    for (const storageKey of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
        let value: string | null

        try {
            value = storage.getItem(storageKey)
        } catch {
            return null
        }

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

export function saveSimulatorState(state: SimulatorStorageSource) {
    const storage = getLocalStorage()

    if (!storage) {
        return
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

    // 追加構成と並び順は別の更新経路で保存するため、現在値を引き継ぐ。
    const current = loadSimulatorState()

    try {
        storage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                activeConfigId: state.activeConfigId,
                configs,
                savedBuilds: current?.savedBuilds ?? [],
                order: current?.order ?? [],
            } satisfies StoredSimulatorState),
        )
        for (const storageKey of LEGACY_STORAGE_KEYS) {
            storage.removeItem(storageKey)
        }
    } catch {
        // Storageへ書き込めない環境では、メモリ上の選択状態だけを維持する
    }
}

// 未ログイン時の追加構成と並び順を保存する。構成の選択は画面側の保存に任せる。
export function saveLocalConfigCollection(
    savedBuilds: StoredSavedBuild[],
    order: string[],
) {
    const storage = getLocalStorage()

    if (!storage) {
        return
    }

    const current = loadSimulatorState()
    const configs: StoredConfigStates = current?.configs ?? Object.fromEntries(
        CONFIG_IDS.map((configId) => [configId, {}]),
    ) as StoredConfigStates

    try {
        storage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                activeConfigId: current?.activeConfigId ?? CONFIG_IDS[0],
                configs,
                savedBuilds,
                order,
            } satisfies StoredSimulatorState),
        )
        for (const storageKey of LEGACY_STORAGE_KEYS) {
            storage.removeItem(storageKey)
        }
    } catch {
        // Storageへ書き込めない環境では、メモリ上の状態だけを維持する
    }
}

export function clearSimulatorState() {
    const storage = getLocalStorage()

    if (!storage) {
        return
    }

    try {
        storage.removeItem(STORAGE_KEY)
        for (const storageKey of LEGACY_STORAGE_KEYS) {
            storage.removeItem(storageKey)
        }
    } catch {
        // Storageへアクセスできない場合も、画面上のクリア処理は継続する
    }
}

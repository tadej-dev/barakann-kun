import {
    CONFIG_IDS,
    type ConfigId,
    type ConfigStates,
} from "@/features/simulator/simulatorTypes"
import {migrateLegacyPartSlotSelections} from "@/features/simulator/partSlots"

const STORAGE_KEY = "barakann-simulator-configs-v2"
const LEGACY_STORAGE_KEY = "barakann-simulator-configs-v1"

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
                            const partId = getStoredPartId(storedPart)

                            return partId === null ? [] : [[slotKey, partId]]
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

    for (const storageKey of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
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

    try {
        storage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                activeConfigId: state.activeConfigId,
                configs,
            } satisfies StoredSimulatorState),
        )
        storage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
        // Storageへ書き込めない環境では、メモリ上の選択状態だけを維持する
    }
}

export function clearSimulatorState() {
    const storage = getLocalStorage()

    if (!storage) {
        return
    }

    try {
        storage.removeItem(STORAGE_KEY)
        storage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
        // Storageへアクセスできない場合も、画面上のクリア処理は継続する
    }
}

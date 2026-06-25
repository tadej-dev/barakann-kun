import type {
    ConfigId,
    ConfigStates,
} from "@/features/simulator/simulatorTypes"

// 保存キー
const STORAGE_KEY = "barakann-simulator-configs-v1"

// 保存対象の状態
type StoredSimulatorState = {
    activeConfigId: ConfigId // 最後に選択していた構成ID
    configs: ConfigStates // 構成別の選択状態
}

// localStorageから状態を取得
export function loadSimulatorState(): StoredSimulatorState | null {
    if (typeof window === "undefined") {
        return null
    }

    const value = window.localStorage.getItem(STORAGE_KEY)

    if (!value) {
        return null
    }

    try {
        return JSON.parse(value) as StoredSimulatorState
    } catch {
        return null
    }
}

// localStorageへ状態を保存
export function saveSimulatorState(
    state: StoredSimulatorState,
) {
    window.localStorage.setItem(
        STORAGE_KEY, // 保存キー
        JSON.stringify(state), // JSON文字列化した保存内容
    )
}

// localStorageの状態を削除
export function clearSimulatorState() {
    window.localStorage.removeItem(STORAGE_KEY)
}
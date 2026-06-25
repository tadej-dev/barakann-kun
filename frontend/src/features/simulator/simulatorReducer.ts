import type {
    ConfigId,
    ConfigStates,
    SimulatorState,
} from "@/features/simulator/simulatorTypes"
import type {Part} from "@/types/part"

// シミュレーター操作の種類
type SimulatorAction =
    | {
    type: "changeConfig"
    configId: ConfigId
}
    | {
    type: "changeCategory"
    category: string
}
    | {
    type: "selectPart"
    part: Part
}
    | {
    type: "clearActiveConfig"
}
    | {
    type: "restore"
    activeConfigId: ConfigId
    configs: ConfigStates
}

// 空の構成状態
function createEmptyConfigs(): ConfigStates {
    return {
        "1": {},
        "2": {},
        "3": {},
        "4": {},
    }
}

// 初期状態の作成
export function createInitialSimulatorState(
    initialCategory: string,
): SimulatorState {
    return {
        activeConfigId: "1", // 初期表示の構成
        activeCategory: initialCategory, // 初期表示のカテゴリー
        configs: createEmptyConfigs(), // 未選択状態の構成一覧
    }
}

// シミュレーター状態の更新処理
export function simulatorReducer(
    state: SimulatorState,
    action: SimulatorAction,
): SimulatorState {
    switch (action.type) {
        case "changeConfig":
            return {
                ...state, // 現在状態の引き継ぎ
                activeConfigId: action.configId, // 選択中構成の更新
            }

        case "changeCategory":
            return {
                ...state, // 現在状態の引き継ぎ
                activeCategory: action.category, // 選択中カテゴリーの更新
            }

        case "selectPart":
            return {
                ...state, // 現在状態の引き継ぎ
                configs: {
                    ...state.configs, // 他構成の選択状態
                    [state.activeConfigId]: {
                        ...state.configs[state.activeConfigId], // 現在構成の選択状態
                        [state.activeCategory]: action.part, // 現在カテゴリーの選択パーツ
                    },
                },
            }

        case "clearActiveConfig":
            return {
                ...state, // 現在状態の引き継ぎ
                configs: {
                    ...state.configs, // 他構成の選択状態
                    [state.activeConfigId]: {}, // 現在構成の初期化
                },
            }

        case "restore":
            return {
                ...state, // 現在状態の引き継ぎ
                activeConfigId: action.activeConfigId, // 保存済み構成の復元
                configs: action.configs, // 保存済み選択状態の復元
            }

        default:
            return state
    }
}
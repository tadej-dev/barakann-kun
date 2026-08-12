import type {
    ConfigId,
    ConfigStates,
    SimulatorState,
} from "@/features/simulator/simulatorTypes"
import {
    getPartSlots,
    getPartSlotCategoryKey,
    type PartSlot,
} from "@/features/simulator/partSlots"
import type {Part} from "@/types/part"

// シミュレーター操作の種類
type SimulatorAction =
    | {
    type: "changeConfig"
    configId: ConfigId
}
    | {
    type: "changeSlot"
    slot: PartSlot
}
    | {
    type: "selectPart"
    part: Part
    slotKeys?: string[]
    removeSlotKeys?: string[]
}
    | {
    type: "removeParts"
    slotKeys: string[]
}
    | {
    type: "clearActiveConfig"
}
    | {
    type: "restore"
    activeConfigId: ConfigId
    configs: ConfigStates
}
    | {
    type: "restoreActiveConfig"
    selectedParts: ConfigStates[ConfigId]
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
        activeSlot: getPartSlots(initialCategory)[0], // 初期表示の選択枠
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

        case "changeSlot":
            return {
                ...state, // 現在状態の引き継ぎ
                activeSlot: action.slot, // 選択中の選択枠更新
            }

        case "selectPart": {
            // 現在構成の選択済みパーツ
            const currentSelectedParts =
                state.configs[state.activeConfigId]
            const targetSlotKeys = action.slotKeys ?? [state.activeSlot.key]
            const removeSlotKeys = new Set(action.removeSlotKeys ?? [])

            // ほかの選択済みパーツが選択先カテゴリーを占有している場合は変更しない
            const isTargetCategoryBlocked = Object.entries(
                currentSelectedParts,
            ).some(([slotKey, part]) =>
                !removeSlotKeys.has(slotKey) &&
                (part.blockedCategoryKeys ?? []).includes(
                    state.activeSlot.categoryKey,
                ),
            )

            if (isTargetCategoryBlocked) {
                return state
            }

            // 選択するパーツが占有するカテゴリーの既存選択を解除
            const nextSelectedParts = {
                ...currentSelectedParts,
            }

            for (const slotKey of removeSlotKeys) {
                delete nextSelectedParts[slotKey]
            }

            for (const categoryKey of
                action.part.blockedCategoryKeys ?? []) {
                for (const slotKey of Object.keys(nextSelectedParts)) {
                    if (
                        getPartSlotCategoryKey(slotKey) === categoryKey
                    ) {
                        delete nextSelectedParts[slotKey]
                    }
                }
            }

            for (const slotKey of targetSlotKeys) {
                nextSelectedParts[slotKey] = action.part
            }

            return {
                ...state, // 現在状態の引き継ぎ
                configs: {
                    ...state.configs, // 他構成の選択状態
                    [state.activeConfigId]: nextSelectedParts,
                },
            }
        }

        case "removeParts": {
            // 現在構成の選択済みパーツ
            const nextSelectedParts = {
                ...state.configs[state.activeConfigId],
            }

            for (const slotKey of action.slotKeys) {
                delete nextSelectedParts[slotKey]
            }

            return {
                ...state, // 現在状態の引き継ぎ
                configs: {
                    ...state.configs, // 他構成の選択状態
                    [state.activeConfigId]: nextSelectedParts,
                },
            }
        }

        case "clearActiveConfig":
            return {
                ...state, // 現在状態の引き継ぎ
                activeSlot: getPartSlots("frame")[0], // フレーム選択へ戻す
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

        case "restoreActiveConfig":
            return {
                ...state,
                activeSlot: getPartSlots("frame")[0],
                configs: {
                    ...state.configs,
                    [state.activeConfigId]: action.selectedParts,
                },
            }

        default:
            return state
    }
}

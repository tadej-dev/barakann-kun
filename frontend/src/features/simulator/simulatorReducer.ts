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
    type: "selectSavedBuild"
    buildId: string
    parts: Record<string, Part>
}
    | {
    type: "restoreConfigSlot"
    configId: ConfigId
    parts: Record<string, Part>
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
    type: "clearConfig"
    configId: ConfigId
}
    | {
    type: "restore"
    activeConfigId: ConfigId
    configs: ConfigStates
}

// 現在選択中の固定構成・追加構成から編集対象を取得
function getActiveSelectedParts(state: SimulatorState) {
    return state.activeSavedBuildId
        ? state.savedBuildParts
        : state.configs[state.activeConfigId]
}

// 現在選択中の構成へパーツ変更を反映
function replaceActiveSelectedParts(
    state: SimulatorState,
    selectedParts: Record<string, Part>,
): SimulatorState {
    if (state.activeSavedBuildId) {
        return {
            ...state,
            savedBuildParts: selectedParts,
        }
    }

    return {
        ...state,
        configs: {
            ...state.configs,
            [state.activeConfigId]: selectedParts,
        },
    }
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
        activeSavedBuildId: null, // 初期表示では追加構成を選択しない
        activeSlot: getPartSlots(initialCategory)[0], // 初期表示の選択枠
        configs: createEmptyConfigs(), // 未選択状態の構成一覧
        savedBuildParts: {}, // 追加構成の未選択状態
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
                activeSavedBuildId: null, // 固定構成を選択したので追加構成を解除
                savedBuildParts: {}, // 次回の追加構成選択に備えて一時状態を初期化
            }

        case "selectSavedBuild":
            return {
                ...state, // 現在状態の引き継ぎ
                activeSavedBuildId: action.buildId, // 選択中追加構成の更新
                savedBuildParts: action.parts, // APIから取得したパーツを編集対象へ設定
            }

        case "restoreConfigSlot":
            return {
                ...state,
                configs: {
                    ...state.configs,
                    [action.configId]: action.parts,
                },
            }

        case "changeSlot":
            return {
                ...state, // 現在状態の引き継ぎ
                activeSlot: action.slot, // 選択中の選択枠更新
            }

        case "selectPart": {
            // 現在構成の選択済みパーツ
            const currentSelectedParts = getActiveSelectedParts(state)
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

            return replaceActiveSelectedParts(state, nextSelectedParts)
        }

        case "removeParts": {
            // 現在構成の選択済みパーツ
            const nextSelectedParts = {...getActiveSelectedParts(state)}

            for (const slotKey of action.slotKeys) {
                delete nextSelectedParts[slotKey]
            }

            return replaceActiveSelectedParts(state, nextSelectedParts)
        }

        case "clearActiveConfig":
            return {
                ...replaceActiveSelectedParts(state, {}),
                activeSlot: getPartSlots("frame")[0], // フレーム選択へ戻す
            }

        case "clearConfig":
            return {
                ...state,
                activeSlot: action.configId === state.activeConfigId &&
                    state.activeSavedBuildId === null
                    ? getPartSlots("frame")[0]
                    : state.activeSlot,
                configs: {
                    ...state.configs,
                    [action.configId]: {},
                },
            }

        case "restore":
            return {
                ...state, // 現在状態の引き継ぎ
                activeConfigId: action.activeConfigId, // 保存済み構成の復元
                activeSavedBuildId: null, // localStorage復元時は固定構成を選択
                configs: action.configs, // 保存済み選択状態の復元
                savedBuildParts: {}, // 追加構成の一時状態を初期化
            }

        default:
            return state
    }
}

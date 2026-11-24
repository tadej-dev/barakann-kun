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
import {blocksCategory} from "../../../../shared/part-compatibility-core"
import type {Part} from "@/types/part"

// シミュレーター操作の種類
type SimulatorAction =
    | {
    type: "changeConfig"
    configId: ConfigId
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
    type: "clearConfig"
    configId: ConfigId
}
    | {
    type: "restore"
    activeConfigId: ConfigId
    configs: ConfigStates
}

// 現在選択中の構成から編集対象を取得
function getActiveSelectedParts(state: SimulatorState) {
    return state.configs[state.activeConfigId] ?? {}
}

// 現在選択中の構成へパーツ変更を反映
function replaceActiveSelectedParts(
    state: SimulatorState,
    selectedParts: Record<string, Part>,
): SimulatorState {
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
    return {}
}

// 初期状態の作成
export function createInitialSimulatorState(
    initialCategory: string,
): SimulatorState {
    // カテゴリー取得後の最初の候補を、フレーム選択から開始する。
    return {
        activeConfigId: "1", // 構成一覧の読み込み後に実際のIDへ切り替える
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
                activeSlot: getPartSlots("frame")[0], // 構成を切り替えたのでフレーム選択へ戻す
            }

        case "restoreConfigSlot":
            // 保存済みの構成だけを差し替え、現在の選択枠は維持する。
            return {
                ...state,
                configs: {
                    ...state.configs,
                    [action.configId]: action.parts,
                },
            }

        case "changeSlot":
            // 表の行選択だけを変更し、パーツ選択状態は変更しない。
            return {
                ...state, // 現在状態の引き継ぎ
                activeSlot: action.slot, // 選択中の選択枠更新
            }

        case "selectPart": {
            const currentSelectedParts = getActiveSelectedParts(state) // 現在構成の選択済みパーツ
            const targetSlotKeys = action.slotKeys ?? [state.activeSlot.key] // 新しいパーツを登録するスロットキー
            const removeSlotKeys = new Set(action.removeSlotKeys ?? []) // 選択時に解除するスロットキー

            // ほかの選択済みパーツが選択先カテゴリーを占有している場合は変更しない
            // 交換可能な付属コックピットの占有は除き、規格判定側で可否を決める。
            // 他の選択済みパーツが対象カテゴリーを占有しているか
            const isTargetCategoryBlocked = Object.entries(
                currentSelectedParts,
            ).some(([slotKey, part]) =>
                !removeSlotKeys.has(slotKey) &&
                blocksCategory(part, state.activeSlot.categoryKey),
            )

            // 一体型パーツなどが対象カテゴリーを占有している場合は、排他条件を破る選択を無視する。
            if (isTargetCategoryBlocked) {
                return state
            }

            // 選択するパーツが占有するカテゴリーの既存選択を解除
            // 選択解除を反映する前の選択状態
            const nextSelectedParts = {
                ...currentSelectedParts,
            }

            for (const slotKey of removeSlotKeys) {
                delete nextSelectedParts[slotKey]
            }

            for (const categoryKey of
                action.part.blockedCategoryKeys ?? []) {
                // 新しいパーツが占有するカテゴリーの既存パーツを先に解除し、二重選択を防ぐ。
                for (const slotKey of Object.keys(nextSelectedParts)) {
                    // 選択中パーツが同じカテゴリーの枠にあれば解除
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

            // 指定されたスロットだけを削除し、他カテゴリーの選択は維持する。
            for (const slotKey of action.slotKeys) {
                delete nextSelectedParts[slotKey]
            }

            return replaceActiveSelectedParts(state, nextSelectedParts)
        }

        case "clearConfig":
            // 非アクティブ枠をクリアした場合は、現在の候補位置をそのまま維持する。
            return {
                ...state,
                activeSlot: action.configId === state.activeConfigId
                    ? getPartSlots("frame")[0]
                    : state.activeSlot,
                configs: {
                    ...state.configs,
                    [action.configId]: {},
                },
            }

        case "restore":
            // localStorageに保存した構成の選択状態を復元する
            return {
                ...state, // 現在状態の引き継ぎ
                activeConfigId: action.activeConfigId, // 保存済み構成の復元
                configs: action.configs, // 保存済み選択状態の復元
            }

        default:
            return state
    }
}

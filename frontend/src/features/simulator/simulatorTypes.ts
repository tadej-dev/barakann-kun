import type {Part} from "@/types/part"
import type {PartSlot} from "@/features/simulator/partSlots"

// 構成ID一覧
export const CONFIG_IDS = ["1", "2", "3", "4"] as const

// 構成IDの型
export type ConfigId = (typeof CONFIG_IDS)[number]

// 選択枠別の選択済みパーツ
export type SelectedParts = Record<string, Part>

// 構成別の選択済みパーツ
export type ConfigStates = Record<ConfigId, SelectedParts>

// シミュレーター全体の状態
export type SimulatorState = {
    activeConfigId: ConfigId // 選択中の構成ID
    activeSlot: PartSlot // 選択中のパーツ選択枠
    configs: ConfigStates // 構成別の選択状態
}

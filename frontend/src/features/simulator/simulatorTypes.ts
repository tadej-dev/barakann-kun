import type {Part} from "@/types/part"
import type {PartSlot} from "@/features/simulator/partSlots"

// 構成IDの型。1〜20件の構成を識別する
export type ConfigId = string

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

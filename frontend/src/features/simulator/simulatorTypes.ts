import type {Part} from "@/types/part"

// 構成ID一覧
export const CONFIG_IDS = ["1", "2", "3", "4"] as const

// 構成IDの型
export type ConfigId = (typeof CONFIG_IDS)[number]

// カテゴリー別の選択済みパーツ
export type SelectedParts = Record<string, Part>

// 構成別の選択済みパーツ
export type ConfigStates = Record<ConfigId, SelectedParts>

// シミュレーター全体の状態
export type SimulatorState = {
    activeConfigId: ConfigId // 選択中の構成ID
    activeCategory: string // 選択中のカテゴリーキー
    configs: ConfigStates // 構成別の選択状態
}
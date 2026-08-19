import type {SavedBuildPartInput} from "@/api/savedBuilds"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"

// UIの選択状態をAPIへ渡す安定した順序のスロット一覧へ変換
export function toSavedBuildPartInputs(
    selectedParts: SelectedParts,
): SavedBuildPartInput[] {
    // オブジェクトの挿入順に依存せず、同じ選択内容を同じAPI入力へ変換する。
    return Object.entries(selectedParts)
        .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
        .map(([slotKey, part]) => ({slotKey, partId: part.id}))
}

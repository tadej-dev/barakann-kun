import type {SavedBuildPart, SavedBuildPartInput} from "@/api/savedBuilds"
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

// UIの選択状態を、保存時点の価格・重量を含むパーツ一覧へ変換
// 未ログインのローカル保存では価格・重量も必要になるため、入力用とは別に用意する
export function toSavedBuildParts(
    selectedParts: SelectedParts,
): SavedBuildPart[] {
    return toSavedBuildPartInputs(selectedParts).map(({slotKey, partId}) => ({
        slotKey,
        partId,
        price: selectedParts[slotKey]?.price ?? 0,
        weight: selectedParts[slotKey]?.weight ?? 0,
    }))
}

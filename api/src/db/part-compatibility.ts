import {
    findCompatibilityIssues,
    type CompatibilityIssue,
} from "../../../shared/part-compatibility-core"

// 保存時の規格適合チェックへ渡す、カタログの最小データ
export type CompatibilityPart = {
    // パーツID
    id: number
    // 所属カテゴリーのキー
    categoryKey: string
    // 装着すると選択できなくなるカテゴリーキー
    blockedCategoryKeys: string[]
    // 規格キーと値の一覧
    specifications: Record<string, string>
}

// スロットキーと検証対象パーツの組
type StoredPart = {
    slotKey: string
    part: CompatibilityPart
}

// 保存構成の中にある既知の規格不一致を重複なしで一覧化
export function findIncompatiblePartPairs(
    storedParts: StoredPart[],
): CompatibilityIssue[] {
    return findCompatibilityIssues(storedParts).filter(
        (issue) => issue.status === "incompatible",
    )
}
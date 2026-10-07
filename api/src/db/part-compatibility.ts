import {
    findCompatibilityIssues,
    type CompatibilityIssue,
} from "../../../shared/part-compatibility-core"

// 保存時の規格適合チェックへ渡す、カタログの最小データ
export type CompatibilityPart = {
    id: number
    categoryKey: string
    blockedCategoryKeys: string[]
    specifications: Record<string, string>
}

type StoredPart = {
    slotKey: string
    part: CompatibilityPart
}

// 保存構成の中にある既知の規格不一致を、重複なしで一覧化する
export function findIncompatiblePartPairs(
    storedParts: StoredPart[],
): CompatibilityIssue[] {
    return findCompatibilityIssues(storedParts).filter(
        (issue) => issue.status === "incompatible",
    )
}
// パーツに付属する構成品。categoryKeyがある場合は排他判定にも利用する。
export type PartIncludedItem = {
    name: string
    quantity: number
    categoryKey: string | null
    // 完成重量へ加算する単品重量。未調査は0のまま加算対象外にする
    weight: number
}

// 候補一覧・選択状態・保存構成で共有するパーツの表示および規格情報。
export type Part = {
    id: number
    name: string
    modelName?: string | null
    variantName?: string | null
    // モデルイヤー。未確認はnull
    modelYear?: number | null
    // 世代・仕様名(Gen 7, SL8 など)。未確認はnull
    edition?: string | null
    brandName: string
    categoryKey?: string
    weight: number
    price: number
    priceUpdatedAt?: string | null
    includedItems?: PartIncludedItem[]
    blockedCategoryKeys: string[]
    specifications?: Record<string, string>
}

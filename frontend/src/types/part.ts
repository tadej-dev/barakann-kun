// パーツに付属する構成品。categoryKeyがある場合は排他判定にも利用
export type PartIncludedItem = {
    name: string // 付属品の名称
    quantity: number // 付属品の数量（1以上）
    categoryKey: string | null // 占有するカテゴリーキー。該当なしはnull
    weight: number // 完成重量へ加算する単品重量。未調査は0のまま加算対象外にする
    price?: number | null // 単品のメーカー希望小売価格(参考表示用で合計金額には加算しない)。未調査はnull
    isSetComponent?: boolean // セット構成品かどうか。trueなら重量はセット本体に含まれるため完成重量へ加算しない
}

// 候補一覧・選択状態・保存構成で共有するパーツの表示および規格情報
export type Part = {
    id: number // パーツID
    name: string // パーツ名
    modelName?: string | null // モデル名。未確認はnull
    variantName?: string | null // 仕様違い名。未確認はnull
    modelYear?: number | null // モデルイヤー。未確認はnull
    edition?: string | null // 世代・仕様名(Gen 7, SL8 など)。未確認はnull
    brandName: string // ブランド名
    categoryKey?: string // 所属カテゴリーキー
    weight: number // 重量(g)
    price: number // 価格(円)
    priceUpdatedAt?: string | null // 価格の更新日時。未確認はnull
    includedItems?: PartIncludedItem[] // 付属品・構成品の一覧
    blockedCategoryKeys: string[] // 装着すると選択できなくなるカテゴリーキー
    specifications?: Record<string, string> // 規格キーと値の一覧
}

export type PartIncludedItem = {
    name: string
    quantity: number
    categoryKey: string | null
}

export type Part = {
    id: number
    name: string
    modelName?: string | null
    variantName?: string | null
    brandName: string
    categoryKey?: string
    weight: number
    price: number
    priceUpdatedAt?: string | null
    includedItems?: PartIncludedItem[]
    blockedCategoryKeys: string[]
    specifications?: Record<string, string>
}

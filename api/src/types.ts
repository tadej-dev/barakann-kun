export type Category = {
    id: number
    key: string
    displayName: string
}

export type PartIncludedItem = {
    name: string
    quantity: number
    categoryKey: string | null
}

export type Part = {
    id: number
    name: string
    modelName: string
    variantName: string | null
    brandName: string
    categoryKey: string
    weight: number
    price: number
    priceUpdatedAt: string
    includedItems: PartIncludedItem[]
    blockedCategoryKeys: string[]
    specifications: Record<string, string>
}

export type ApiError = {
    error: {
        code: string
        message: string
    }
}

export type Bindings = {
    DB: D1Database
}

// カテゴリーAPIのレスポンス
export type Category = {
    id: number
    key: string
    displayName: string
}

// パーツに含まれる構成品
export type PartIncludedItem = {
    name: string
    quantity: number
    categoryKey: string | null
}

// パーツAPIのレスポンス
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

// APIエラーの共通形式
export type ApiError = {
    error: {
        code: string
        message: string
    }
}

// Cloudflare Workersから受け取るBindings
export type Bindings = {
    DB: D1Database
    AUTH_SECRET?: string
    AUTH_URL?: string
    // OAuthコールバックの原因調査時だけ有効にするAuth.jsの詳細ログ設定
    AUTH_DEBUG?: string
    GOOGLE_CLIENT_ID?: string
    GOOGLE_CLIENT_SECRET?: string
}

// カテゴリーAPIのレスポンス
export type Category = {
    // idはDB内の関連付けに使用しkeyはURLや画面の識別に使用する
    id: number
    key: string
    displayName: string
}

// パーツに含まれる構成品
export type PartIncludedItem = {
    // categoryKeyがある付属品は同カテゴリーの二重選択防止にも使用する
    name: string
    quantity: number
    categoryKey: string | null
    // 完成重量へ加算する単品重量。未調査は0のまま加算対象外にする
    weight: number
}

// パーツAPIのレスポンス
export type Part = {
    // DBのスネークケースを画面向けのキャメルケースへ変換した形式
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
    // codeは画面側の処理分岐に使用しmessageは利用者へ表示する
    error: {
        code: string
        message: string
    }
}

// Cloudflare Workersから受け取るBindings
export type Bindings = {
    // Workers環境で使用するD1データベース
    DB: D1Database
    AUTH_SECRET?: string
    AUTH_URL?: string
    // OAuthコールバックの原因調査時だけ有効にするAuth.jsの詳細ログ設定
    AUTH_DEBUG?: string
    GOOGLE_CLIENT_ID?: string
    GOOGLE_CLIENT_SECRET?: string
}

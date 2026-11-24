// カテゴリーAPIのレスポンス
export type Category = {
    // idはDB内の関連付け、keyはURLや画面の識別に使用
    id: number
    key: string
    // 画面に表示するカテゴリー名
    displayName: string
}

// パーツに含まれる構成品
export type PartIncludedItem = {
    // 付属品の名前
    name: string
    // 同梱数
    quantity: number
    // 同カテゴリーの二重選択防止・占有枠の表示・重量計算に使う付属品のカテゴリーキー(なしはnull)
    categoryKey: string | null
    // 完成重量へ加算する単品重量(未調査は0で加算対象外)
    weight: number
    // 単品のメーカー希望小売価格(参考表示用)。未調査はnull
    price: number | null
    // セット構成品かどうか。trueなら重量・価格はセット本体に含まれるため加算しない
    isSetComponent: boolean
}

// パーツAPIのレスポンス
export type Part = {
    // DBのスネークケースを画面向けのキャメルケースへ変換した形式
    // パーツを一意に識別するDBのID
    id: number
    // 画面に表示するパーツ名
    name: string
    // 型番などのモデル名
    modelName: string
    // 色や仕様などのバリエーション名（未確認はnull）
    variantName: string | null
    // モデルイヤー。未確認はnull
    modelYear: number | null
    // 世代・仕様名(Gen 7, SL8 など)。未確認はnull
    edition: string | null
    // ブランド名
    brandName: string
    // 所属カテゴリーのキー
    categoryKey: string
    // 重量(g)
    weight: number
    // 価格(円)
    price: number
    // 価格の更新日時(未設定はパーツ更新日時、ISO 8601形式)
    priceUpdatedAt: string
    // 同梱・付属する構成品
    includedItems: PartIncludedItem[]
    // 装着すると選択できなくなるカテゴリーキー
    blockedCategoryKeys: string[]
    // 規格キーと値の一覧
    specifications: Record<string, string>
}

// APIエラーの共通形式
export type ApiError = {
    // codeは画面側の処理分岐、messageは利用者への表示に使用
    error: {
        code: string
        message: string
    }
}

// Cloudflare Workersから受け取るBindings
export type Bindings = {
    // Workers環境で使用するD1データベース
    DB: D1Database
    // Auth.jsのセッション署名などに使うAUTH_SECRET
    AUTH_SECRET?: string
    // GoogleなどのアカウントIDをハッシュにして保存するための秘密鍵
    // AUTH_SECRETとは分け、AUTH_SECRETを作り直してもアカウントの紐付けが切れないようにする
    ACCOUNT_ID_HASH_SECRET?: string
    // 認証画面の基準URL（未設定はリクエストURL）
    AUTH_URL?: string
    // OAuthコールバックの原因調査時だけ有効にするAuth.jsの詳細ログ設定
    AUTH_DEBUG?: string
    // Google OAuthのクライアントID
    GOOGLE_CLIENT_ID?: string
    // Google OAuthのクライアントシークレット
    GOOGLE_CLIENT_SECRET?: string
    // E2EでGoogle認可エンドポイントをモックサーバーへ差し替える上書き先（未設定はGoogle本番）
    GOOGLE_AUTHORIZATION_ENDPOINT?: string
    // E2EでGoogleトークンエンドポイントをモックサーバーへ差し替える上書き先（未設定はGoogle本番）
    GOOGLE_TOKEN_ENDPOINT?: string
    // E2EでGoogleユーザー情報エンドポイントをモックサーバーへ差し替える上書き先（未設定はGoogle本番）
    GOOGLE_USERINFO_ENDPOINT?: string
}

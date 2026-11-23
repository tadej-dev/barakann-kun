import type {Category, Part} from "../types"

// カタログデータへのアクセス契約
export interface CatalogRepository {
    // シミュレーターのカテゴリー選択に使用する一覧を取得
    findCategories(): Promise<Category[]>
    // 候補パーツ表示に使用するカテゴリー別一覧を取得
    findPartsByCategory(categoryKey: string): Promise<Part[]>
    // 保存構成の復元に必要なパーツだけをまとめて取得
    findPartsByIds(ids: number[]): Promise<Part[]>
}

import type {Category, Part} from "../types"

// カタログデータへのアクセス契約
export interface CatalogRepository {
    // シミュレーターのカテゴリー選択に使用する一覧を取得する
    findCategories(): Promise<Category[]>
    // 候補パーツ表示に使用するカテゴリー別一覧を取得する
    findPartsByCategory(categoryKey: string): Promise<Part[]>
    // 保存構成の復元に必要なパーツだけをまとめて取得する
    findPartsByIds(ids: number[]): Promise<Part[]>
}

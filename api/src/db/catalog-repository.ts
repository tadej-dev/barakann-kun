import type {Category, Part} from "../types"

// カタログデータへのアクセス契約
export interface CatalogRepository {
    findCategories(): Promise<Category[]>
    findPartsByCategory(categoryKey: string): Promise<Part[]>
    findPartsByIds(ids: number[]): Promise<Part[]>
}

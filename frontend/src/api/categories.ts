import type {Category} from "@/types/category"

export async function fetchCategories(): Promise<Category[]> {
    const response = await fetch("/api/categories")

    if (!response.ok) {
        throw new Error("カテゴリーの取得に失敗しました")
    }

    return response.json()
}
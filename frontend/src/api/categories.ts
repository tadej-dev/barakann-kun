import {
    parseCategories,
    readCatalogJson,
} from "@/api/catalogResponse"
import type {Category} from "@/types/category"

// パーツカテゴリーの一覧を取得
export async function fetchCategories(): Promise<Category[]> {
    // 画面初期化からの呼び出しを想定し、中断処理を持たない取得として扱う
    const response = await fetch("/api/categories")

    // カテゴリーは初期表示に必要なため、HTTPエラーを画面側へ伝える
    if (!response.ok) {
        throw new Error("カテゴリーの取得に失敗しました")
    }

    return parseCategories(await readCatalogJson(
        response,
        "カテゴリー一覧のレスポンスを解釈できませんでした",
    ))
}

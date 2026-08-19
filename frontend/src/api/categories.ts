import {
    parseCategories,
    readCatalogJson,
} from "@/api/catalogResponse"
import type {Category} from "@/types/category"

export async function fetchCategories(): Promise<Category[]> {
    // 呼び出し元は画面初期化Effectなので、AbortSignalではなく単純取得として扱う。
    // カテゴリーはシミュレーターの初期表示に必要なため、HTTPエラーを画面側へ伝える。
    const response = await fetch("/api/categories")

    if (!response.ok) {
        throw new Error("カテゴリーの取得に失敗しました")
    }

    return parseCategories(await readCatalogJson(
        response,
        "カテゴリー一覧のレスポンスを解釈できませんでした",
    ))
}

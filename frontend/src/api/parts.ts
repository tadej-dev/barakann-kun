// frontend/src/api/parts.ts

import {
    parseParts,
    readCatalogJson,
} from "@/api/catalogResponse"
import type {Part} from "@/types/part"

// 1リクエストで送信できるパーツIDの上限（100件）
const MAX_PART_IDS_PER_REQUEST = 100

// カテゴリーに属するパーツ候補を取得
export async function fetchParts(
    category: string,
    signal?: AbortSignal,
): Promise<Part[]> {
    // カテゴリー単位の候補取得は、選択中カテゴリーが変わった時だけ呼ばれる
    const params = new URLSearchParams({category})

    const response = await fetch(`/api/parts?${params}`, {
        signal,
        headers: {Accept: "application/json"},
    })

    // HTTPエラーをパーツ配列として返さず、候補表のエラー表示へ渡す
    if (!response.ok) {
        throw new Error("パーツの取得に失敗しました")
    }

    return parseParts(await readCatalogJson(
        response,
        "パーツ一覧のレスポンスを解釈できませんでした",
    ))
}

// 複数のパーツIDに対応するパーツを取得
export async function fetchPartsByIds(
    ids: number[],
    signal?: AbortSignal,
): Promise<Part[]> {
    // 比較画面で100件を超えてもAPI上限内に収まるよう、重複を除いたパーツID
    const uniqueIds = Array.from(new Set(ids))

    // パーツIDが1件も無い場合はAPIを呼ばず空配列を返す
    if (uniqueIds.length === 0) {
        return []
    }

    // API上限（100件）ごとに分割したパーツIDの配列
    const chunks = Array.from(
        {length: Math.ceil(uniqueIds.length / MAX_PART_IDS_PER_REQUEST)},
        (_, index) => uniqueIds.slice(
            index * MAX_PART_IDS_PER_REQUEST,
            (index + 1) * MAX_PART_IDS_PER_REQUEST,
        ),
    )
    // 分割した各リクエストの取得結果
    const responses = await Promise.all(chunks.map(async (chunk) => {
        const params = new URLSearchParams()

        for (const id of chunk) {
            // 同じクエリキーを繰り返し、バックエンドの複数ID入力形式に合わせる
            params.append("ids", String(id))
        }

        const response = await fetch(`/api/parts/by-ids?${params}`, {
            signal,
            headers: {Accept: "application/json"},
        })

        // 1件でも取得に失敗した場合は保存済みパーツの取得エラーとして扱う
        if (!response.ok) {
            throw new Error("保存済みパーツの取得に失敗しました")
        }

        return parseParts(await readCatalogJson(
            response,
            "パーツ一覧のレスポンスを解釈できませんでした",
        ))
    }))

    return responses.flat()
}

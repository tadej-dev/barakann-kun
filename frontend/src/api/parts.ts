// frontend/src/api/parts.ts

import {
    parseParts,
    readCatalogJson,
} from "@/api/catalogResponse"
import type {Part} from "@/types/part"

const MAX_PART_IDS_PER_REQUEST = 100

export async function fetchParts(
    category: string,
    signal?: AbortSignal,
): Promise<Part[]> {
    // カテゴリー単位の候補取得は、選択中カテゴリーが変わった時だけ呼び出される。
    const params = new URLSearchParams({category})

    const response = await fetch(`/api/parts?${params}`, {
        signal,
        headers: {Accept: "application/json"},
    })

    if (!response.ok) {
        // HTTPエラーをパーツ配列として返さず、候補表のエラー表示へ渡す。
        throw new Error("パーツの取得に失敗しました")
    }

    return parseParts(await readCatalogJson(
        response,
        "パーツ一覧のレスポンスを解釈できませんでした",
    ))
}

export async function fetchPartsByIds(
    ids: number[],
    signal?: AbortSignal,
): Promise<Part[]> {
    // 比較画面で100件を超えてもAPI上限内のチャンクへ分割して並列取得する
    const uniqueIds = Array.from(new Set(ids))

    if (uniqueIds.length === 0) {
        return []
    }

    const chunks = Array.from(
        {length: Math.ceil(uniqueIds.length / MAX_PART_IDS_PER_REQUEST)},
        (_, index) => uniqueIds.slice(
            index * MAX_PART_IDS_PER_REQUEST,
            (index + 1) * MAX_PART_IDS_PER_REQUEST,
        ),
    )
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

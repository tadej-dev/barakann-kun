// frontend/src/api/parts.ts

import {
    parseParts,
    readCatalogJson,
} from "@/api/catalogResponse"
import type {Part} from "@/types/part"

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
    // 保存構成の復元時は、必要なIDだけをまとめて取得して通信回数を抑える。
    const params = new URLSearchParams()

    for (const id of ids) {
        // 同じクエリキーを繰り返し、バックエンドの複数ID入力形式に合わせる。
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
}

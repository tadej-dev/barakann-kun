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
    const params = new URLSearchParams({category})

    const response = await fetch(`/api/parts?${params}`, {
        signal,
        headers: {Accept: "application/json"},
    })

    if (!response.ok) {
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
    const params = new URLSearchParams()

    for (const id of ids) {
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

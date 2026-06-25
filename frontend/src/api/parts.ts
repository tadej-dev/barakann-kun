// frontend/src/api/parts.ts

import type {Part} from "@/types/part"

export async function fetchParts(
    category: string,
    signal?: AbortSignal,
): Promise<Part[]> {
    const params = new URLSearchParams({category})

    const response = await fetch(`/api/parts?${params}`, {
        signal,
    })

    if (!response.ok) {
        throw new Error("パーツの取得に失敗しました")
    }

    return response.json()
}
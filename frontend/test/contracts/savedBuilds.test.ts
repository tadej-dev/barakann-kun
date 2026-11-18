import {afterEach, describe, expect, it, vi} from "vitest"

import {fetchSavedBuilds} from "@/api/savedBuilds"
import fixture from "../fixtures/saved-build-list.json"

describe("保存構成の契約テスト", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    // APIの応答形式をフロントのパーサが受け付け、値を変えずに返す。
    it("共有フィクスチャをパースできる", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
            new Response(JSON.stringify(fixture), {
                status: 200,
                headers: {"content-type": "application/json"},
            }),
        ))

        await expect(fetchSavedBuilds()).resolves.toEqual(fixture)
    })

    // 契約から外れた応答(必須項目の欠落)は拒否する。
    it("必須項目が欠けた応答を拒否する", async () => {
        const broken = JSON.parse(JSON.stringify(fixture)) as {
            parts: {price: unknown}[]
        }[]
        delete (broken[0] as {version?: unknown}).version

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
            new Response(JSON.stringify(broken), {
                status: 200,
                headers: {"content-type": "application/json"},
            }),
        ))

        await expect(fetchSavedBuilds()).rejects.toThrow()
    })
})

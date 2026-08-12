import {afterEach, describe, expect, it, vi} from "vitest"

import {
    deleteSavedBuild,
    fetchSavedBuilds,
    renameSavedBuild,
    updateSavedBuild,
} from "@/api/savedBuilds"

const BUILD = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "通勤車",
    version: 1,
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
    parts: [{
        slotKey: "frame",
        partId: 1,
        price: 100000,
        weight: 1000,
    }],
}

function jsonResponse(value: unknown, status = 200) {
    return new Response(JSON.stringify(value), {
        status,
        headers: {"content-type": "application/json"},
    })
}

function csrfResponse() {
    return jsonResponse({csrfToken: "csrf-token"})
}

describe("savedBuilds API", () => {
    afterEach(() => vi.unstubAllGlobals())

    it("保存構成一覧のレスポンスを検証して返す", async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse([BUILD]))
        vi.stubGlobal("fetch", fetchMock)

        await expect(fetchSavedBuilds()).resolves.toEqual([BUILD])
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/builds",
            expect.objectContaining({credentials: "same-origin"}),
        )
    })

    it("名称変更はPATCHでversionとCSRFトークンを送る", async () => {
        const renamed = {...BUILD, name: "レース用", version: 2}
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(csrfResponse())
            .mockResolvedValueOnce(jsonResponse(renamed))
        vi.stubGlobal("fetch", fetchMock)

        await expect(renameSavedBuild(BUILD.id, 1, "レース用"))
            .resolves.toEqual(renamed)
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            `/api/builds/${BUILD.id}`,
            expect.objectContaining({
                method: "PATCH",
                body: JSON.stringify({
                    name: "レース用",
                    version: 1,
                    csrfToken: "csrf-token",
                }),
            }),
        )
    })

    it("上書きと削除にも競合検知用versionを送る", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(csrfResponse())
            .mockResolvedValueOnce(jsonResponse({...BUILD, version: 2}))
            .mockResolvedValueOnce(csrfResponse())
            .mockResolvedValueOnce(new Response(null, {status: 204}))
        vi.stubGlobal("fetch", fetchMock)

        await updateSavedBuild(
            BUILD.id,
            BUILD.version,
            BUILD.name,
            [{slotKey: "frame", partId: 2}],
        )
        await deleteSavedBuild(BUILD.id, 2)

        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            `/api/builds/${BUILD.id}`,
            expect.objectContaining({method: "PUT"}),
        )
        expect(fetchMock).toHaveBeenNthCalledWith(
            4,
            `/api/builds/${BUILD.id}`,
            expect.objectContaining({
                method: "DELETE",
                body: JSON.stringify({
                    version: 2,
                    csrfToken: "csrf-token",
                }),
            }),
        )
    })

    it("APIエラーコードを画面側で判定できる形にする", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
            error: {
                code: "SAVED_BUILD_LIMIT_EXCEEDED",
                message: "保存できる構成は20件までです",
            },
        }, 409)))

        await expect(fetchSavedBuilds()).rejects.toMatchObject({
            code: "SAVED_BUILD_LIMIT_EXCEEDED",
            message: "保存できる構成は20件までです",
        })
    })
})

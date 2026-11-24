import {afterEach, describe, expect, it, vi} from "vitest"

import {
    deleteSavedBuild,
    fetchSavedBuilds,
    renameSavedBuild,
    updateSavedBuild,
} from "@/api/savedBuilds"

// 保存構成APIの検証に使うテスト用の構成
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

// 任意のJSONとステータスを返すテスト用レスポンス
function jsonResponse(value: unknown, status = 200) {
    return new Response(JSON.stringify(value), {
        status,
        headers: {"content-type": "application/json"},
    })
}

// CSRFトークンだけを返すテスト用レスポンス
function csrfResponse() {
    return jsonResponse({csrfToken: "csrf-token"})
}

// 追加構成APIのCRUD、CSRF・version送信、上限・不正レスポンスの扱いを確認
describe("savedBuilds API", () => {
    afterEach(() => vi.unstubAllGlobals())

    // 一覧取得は、保存構成をカードに描画できる形へ検証して返す
    it("保存構成一覧のレスポンスを検証して返す", async () => {
        // 構成一覧を返す取得処理のモック
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse([BUILD]))
        vi.stubGlobal("fetch", fetchMock)

        await expect(fetchSavedBuilds()).resolves.toEqual([BUILD])
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/builds",
            expect.objectContaining({credentials: "same-origin"}),
        )
    })

    // 名前変更ではCSRFと取得時versionを送り、別端末の更新を検出できるようにする
    it("名称変更はPATCHでversionとCSRFトークンを送る", async () => {
        // 名前変更後の構成
        const renamed = {...BUILD, name: "レース用", version: 2}
        // CSRF取得と名前変更の応答を順に返すモック
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

    // 1〜20件の構成一覧を受け付ける
    it("20件の構成一覧を受け付ける", async () => {
        // 上限件数まで埋めた構成一覧
        const builds = Array.from({length: 20}, (_, index) => ({
            ...BUILD,
            id: `1111111${index}-1111-4111-8111-11111111111${index % 10}`,
        }))
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(builds)))

        await expect(fetchSavedBuilds()).resolves.toHaveLength(20)
    })

    // 上書き・削除も同じversion検証を通し、古い画面からの更新を防ぐ
    it("上書きと削除にも競合検知用versionを送る", async () => {
        // CSRF取得・上書き・CSRF取得・削除の応答を順に返すモック
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

    // 上限超過などの業務エラーコードを、一般的なHTTPエラーと区別して返す
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

    // 不正な重量を復元すると合計重量が壊れるため、一覧レスポンス全体を拒否
    it("不正な重量を含む保存構成レスポンスを拒否する", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([{
            ...BUILD,
            parts: [{...BUILD.parts[0], weight: null}],
        }])))

        await expect(fetchSavedBuilds()).rejects.toThrow(
            "保存構成のパーツ情報を解釈できませんでした",
        )
    })
})

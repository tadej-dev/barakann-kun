import {afterEach, describe, expect, it, vi} from "vitest"

import {
    fetchConfigOrder,
    saveConfigOrder,
} from "@/api/configOrder"

// 表示順APIの取得・保存と、重複した順序の拒否を確認
describe("configOrder API", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    // アカウントに保存されたキーの順番を、Sortableの初期値として返す
    it("ログインユーザーの構成表示順を取得する", async () => {
        // 保存済みの表示順を返す取得処理のモック
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            items: ["config:2", "config:1", "config:3", "config:4"],
        }), {
            headers: {"content-type": "application/json"},
        }))
        vi.stubGlobal("fetch", fetchMock)

        await expect(fetchConfigOrder()).resolves.toEqual([
            "config:2",
            "config:1",
            "config:3",
            "config:4",
        ])
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/config-order",
            expect.objectContaining({credentials: "same-origin"}),
        )
    })

    // 並び替えの保存ではCSRFトークンを先に取得し、同じ順序をPUT
    it("CSRFトークン付きで構成表示順を保存する", async () => {
        // CSRF取得と表示順保存の応答を順に返すモック
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({
                csrfToken: "csrf-token",
            }), {
                headers: {"content-type": "application/json"},
            }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                items: ["config:4", "config:2", "config:1", "config:3"],
            }), {
                headers: {"content-type": "application/json"},
            }))
        vi.stubGlobal("fetch", fetchMock)

        await expect(saveConfigOrder([
            "config:4",
            "config:2",
            "config:1",
            "config:3",
        ])).resolves.toEqual([
            "config:4",
            "config:2",
            "config:1",
            "config:3",
        ])
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "/api/config-order",
            expect.objectContaining({
                method: "PUT",
                body: JSON.stringify({
                    items: ["config:4", "config:2", "config:1", "config:3"],
                    csrfToken: "csrf-token",
                }),
            }),
        )
    })

    // 同じキーが複数ある順序は表示の不定化につながるため受け付けない
    it("重複した表示順レスポンスを拒否する", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            items: ["config:1", "config:1", "config:3", "config:4"],
        }), {
            headers: {"content-type": "application/json"},
        })))

        await expect(fetchConfigOrder()).rejects.toThrow(
            "構成の並び順レスポンスを解釈できませんでした",
        )
    })
})

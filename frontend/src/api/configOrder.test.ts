import {afterEach, describe, expect, it, vi} from "vitest"

import {
    fetchConfigOrder,
    saveConfigOrder,
} from "@/api/configOrder"

describe("configOrder API", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("ログインユーザーの構成表示順を取得する", async () => {
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

    it("CSRFトークン付きで構成表示順を保存する", async () => {
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

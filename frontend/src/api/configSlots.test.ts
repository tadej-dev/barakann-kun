import {afterEach, describe, expect, it, vi} from "vitest"

import {
    fetchConfigSlots,
    renameConfigSlot,
    saveConfigSlot,
    updateConfigSlotSharing,
} from "@/api/configSlots"

function slotPayload() {
    return ["1", "2", "3", "4"].map((configId) => ({
        configId,
        name: `構成${configId}`,
        version: 0,
        updatedAt: null,
        shareToken: null,
        parts: [],
    }))
}

// 固定構成の取得・名称変更・パーツ保存と、壊れたスロット情報の拒否を確認する。
describe("configSlots API", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    // 固定4スロットを取得し、ログイン後の構成カードの基礎データにする。
    it("ログインユーザーの4構成を取得する", async () => {
        const fetchMock = vi.fn(async () => new Response(JSON.stringify(
            slotPayload(),
        ), {
            headers: {"content-type": "application/json"},
        }))
        vi.stubGlobal("fetch", fetchMock)

        await expect(fetchConfigSlots()).resolves.toHaveLength(4)
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/config-slots",
            expect.objectContaining({credentials: "same-origin"}),
        )
    })

    // 構成名の変更は、CSRFと楽観的ロック用versionを同時に送る。
    it("CSRFトークン付きで構成名を変更する", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({
                csrfToken: "csrf-token",
            }), {
                headers: {"content-type": "application/json"},
            }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                configId: "1",
                name: "遠征用",
                version: 1,
                updatedAt: "2026-08-16T00:00:00.000Z",
                parts: [],
            }), {
                headers: {"content-type": "application/json"},
            }))
        vi.stubGlobal("fetch", fetchMock)

        await expect(renameConfigSlot("1", 0, "遠征用")).resolves.toMatchObject({
            configId: "1",
            name: "遠征用",
        })
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "/api/config-slots/1",
            expect.objectContaining({
                method: "PATCH",
                body: JSON.stringify({
                    name: "遠征用",
                    version: 0,
                    csrfToken: "csrf-token",
                }),
            }),
        )
    })

    // 現在選択中のパーツだけをスロットキー付きで保存し、返却値を検証する。
    it("現在の選択パーツをCSRFトークン付きで保存する", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({
                csrfToken: "csrf-token",
            }), {
                headers: {"content-type": "application/json"},
            }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                configId: "1",
                name: "構成1",
                version: 1,
                updatedAt: "2026-08-16T00:00:00.000Z",
                parts: [{
                    slotKey: "frame",
                    partId: 1,
                    price: 100,
                    weight: 100,
                }],
            }), {
                headers: {"content-type": "application/json"},
            }))
        vi.stubGlobal("fetch", fetchMock)

        await expect(saveConfigSlot(
            "1",
            0,
            "構成1",
            [{slotKey: "frame", partId: 1}],
        )).resolves.toMatchObject({
            configId: "1",
            parts: [{partId: 1}],
        })
    })

    it("標準枠の共有URLをCSRFトークン付きで発行する", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({
                csrfToken: "csrf-token",
            }), {
                headers: {"content-type": "application/json"},
            }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                configId: "1",
                name: "構成1",
                version: 1,
                updatedAt: "2026-08-16T00:00:00.000Z",
                shareToken: "cccccccccccccccccccccccccccccccc",
                parts: [],
            }), {
                headers: {"content-type": "application/json"},
            }))
        vi.stubGlobal("fetch", fetchMock)

        await expect(updateConfigSlotSharing("1", 0, true)).resolves.toMatchObject({
            version: 1,
            shareToken: "cccccccccccccccccccccccccccccccc",
        })
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "/api/config-slots/1/sharing",
            expect.objectContaining({
                method: "PATCH",
                body: JSON.stringify({
                    version: 0,
                    enabled: true,
                    csrfToken: "csrf-token",
                }),
            }),
        )
    })

    // 1つのスロットに同じ位置が重複するレスポンスは、復元前に拒否する。
    it("同じスロットが重複するレスポンスを拒否する", async () => {
        const fetchMock = vi.fn(async () => new Response(JSON.stringify(
            slotPayload().map((slot, index) => index === 0
                ? {...slot, parts: [
                    {slotKey: "frame", partId: 1, price: 100, weight: 100},
                    {slotKey: "frame", partId: 2, price: 200, weight: 200},
                ]}
                : slot),
        ), {
            headers: {"content-type": "application/json"},
        }))
        vi.stubGlobal("fetch", fetchMock)

        await expect(fetchConfigSlots()).rejects.toThrow(
            "構成スロットのパーツ情報を解釈できませんでした",
        )
    })
})

// @vitest-environment jsdom

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {act, cleanup, renderHook} from "@testing-library/react"

import type {SavedBuild} from "@/api/savedBuilds"
import type {ConfigCollection} from "@/features/simulator/useConfigCollection"
import {useConfigAutoSave} from "@/features/simulator/useConfigAutoSave"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"
import type {Part} from "@/types/part"

// 自動保存の待ち時間（useConfigAutoSaveのAUTO_SAVE_DELAY_MSと同じ値）
const AUTO_SAVE_DELAY_MS = 800

// テスト用パーツ
function createPart(): Part {
    return {
        id: 10,
        name: "Frame",
        brandName: "Test Brand",
        categoryKey: "frame",
        price: 500000,
        weight: 1133,
        blockedCategoryKeys: [],
        specifications: {},
    }
}

// テスト用の保存構成
function createBuild(version: number): SavedBuild {
    return {
        id: "config-1",
        name: "構成1",
        version,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        parts: [],
    }
}

// 版を切り替えられるテスト用コレクション
function createCollection(
    build: SavedBuild,
    updateConfig: ConfigCollection["updateConfig"],
): ConfigCollection {
    return {
        configs: [build],
        configsOperation: null,
        updateConfig,
    } as unknown as ConfigCollection
}

describe("useConfigAutoSave の失敗した保存の再試行", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        cleanup()
        vi.useRealTimers()
    })

    // 版が変われば、同じ内容でも再取得後として再試行する
    it("版が変わったら同じ内容を再試行する", async () => {
        // 1回目は失敗し、2回目は成功する更新
        const updateConfig = vi.fn()
            .mockRejectedValueOnce(new Error("conflict"))
            .mockResolvedValue(undefined)
        // 選択済みパーツ
        const selectedParts: SelectedParts = {frame: createPart()}

        // 版1の構成で自動保存を開始
        const {rerender} = renderHook(
            ({version}) => useConfigAutoSave({
                collection: createCollection(
                    createBuild(version),
                    updateConfig,
                ),
                selectedParts,
                activeConfigId: "config-1",
                isConfigLoading: false,
                isActiveConfigLoaded: true,
                autoSaveEnabled: true,
            }),
            {initialProps: {version: 1}},
        )

        // 1回目の保存を待ち、失敗を記録する
        await act(async () => {
            await vi.advanceTimersByTimeAsync(AUTO_SAVE_DELAY_MS)
        })

        expect(updateConfig).toHaveBeenCalledTimes(1)

        // 再読み込み相当に版を進めて再描画する
        rerender({version: 2})

        // 待ち時間を進め、同じ内容でも新しい版なら再試行する
        await act(async () => {
            await vi.advanceTimersByTimeAsync(AUTO_SAVE_DELAY_MS)
        })

        expect(updateConfig).toHaveBeenCalledTimes(2)
    })
})

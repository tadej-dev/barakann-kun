// @vitest-environment jsdom

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {act, cleanup, renderHook, waitFor} from "@testing-library/react"

import {fetchPartsByIds} from "@/api/parts"
import {diagnoseBuild} from "@/features/simulator/buildDiagnosis"
import {useSimulatorController} from "@/features/simulator/useSimulatorController"
import type {Part} from "@/types/part"

// localStorage復元に必要なパーツ取得だけをモック
vi.mock("@/api/parts", () => ({
    fetchPartsByIds: vi.fn(),
}))

// 未ログイン状態でcontrollerを動かす
vi.mock("@/features/auth/useAuth", () => ({
    useAuth: () => ({
        status: "unauthenticated",
        user: null,
    }),
}))

// パーツ取得処理のモック
const mockedFetchPartsByIds = vi.mocked(fetchPartsByIds)

// シミュレーター状態の保存キー
const STORAGE_KEY = "barakann-simulator-configs-v4"

// 復元テスト用のパーツを生成
function createPart(
    id: number,
    categoryKey: string,
    specifications: Record<string, string> = {},
): Part {
    return {
        id,
        name: `Part ${id}`,
        brandName: "Test Brand",
        categoryKey,
        price: 1000,
        weight: 200,
        blockedCategoryKeys: [],
        specifications,
    }
}

// 非互換の構成をlocalStorageへ保存
function storeIncompatibleState() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        activeConfigId: "config-1",
        configs: {
            "config-1": {
                frame: 1,
                wheel: 2,
            },
        },
    }))
}

// localStorage復元時の非互換の扱いを保証
describe("useSimulatorController のlocalStorage復元", () => {
    beforeEach(() => {
        window.localStorage.clear()
        mockedFetchPartsByIds.mockReset()
    })

    afterEach(() => {
        cleanup()
        window.localStorage.clear()
    })

    // 非互換の構成を空にせず、理由を表示して診断で見せる
    it("非互換の構成を保持し、復元理由を表示する", async () => {
        storeIncompatibleState()
        // ホイール径が一致しないフレームとホイール
        mockedFetchPartsByIds.mockResolvedValue([
            createPart(1, "frame", {wheel_diameter: "700C"}),
            createPart(2, "wheel", {wheel_diameter: "650B"}),
        ])

        const {result} = renderHook(() => useSimulatorController({
            categories: [],
            autoSaveEnabled: true,
        }))

        // 復元した2パーツが選択状態に残る
        await waitFor(() => {
            expect(Object.keys(result.current.selectedParts).sort()).toEqual([
                "frame",
                "wheel",
            ])
        })

        // 非互換の理由を警告として残し、再読み込みエラーとは分ける
        expect(result.current.restoreWarning).toContain("ホイール径")
        expect(result.current.restoreError).toBe("")

        // パーツを消さず、構成診断では非互換として見える
        expect(diagnoseBuild(
            result.current.selectedParts,
            [],
        ).incompatibleCount).toBeGreaterThan(0)

        // localStorageも空の構成へ書き換えない
        const stored = JSON.parse(
            window.localStorage.getItem(STORAGE_KEY) ?? "{}",
        ) as {configs?: Record<string, Record<string, number>>}

        expect(stored.configs?.["config-1"]).toEqual({frame: 1, wheel: 2})
    })

    // 非互換が無ければ、復元警告を表示しない
    it("適合する構成では復元警告を表示しない", async () => {
        storeIncompatibleState()
        // ホイール径が一致するフレームとホイール
        mockedFetchPartsByIds.mockResolvedValue([
            createPart(1, "frame", {wheel_diameter: "700C"}),
            createPart(2, "wheel", {wheel_diameter: "700C"}),
        ])

        const {result} = renderHook(() => useSimulatorController({
            categories: [],
            autoSaveEnabled: true,
        }))

        // 復元後に警告が残らない
        await waitFor(() => {
            expect(Object.keys(result.current.selectedParts)).toHaveLength(2)
        })
        expect(result.current.restoreWarning).toBe("")
        expect(result.current.restoreError).toBe("")
    })
    // 構成を切り替えると、前の構成の警告を残さない
    it("構成を切り替えると復元警告を消す", async () => {
        storeIncompatibleState()
        // ホイール径が一致しないフレームとホイール
        mockedFetchPartsByIds.mockResolvedValue([
            createPart(1, "frame", {wheel_diameter: "700C"}),
            createPart(2, "wheel", {wheel_diameter: "650B"}),
        ])

        const {result} = renderHook(() => useSimulatorController({
            categories: [],
            autoSaveEnabled: true,
        }))

        // 復元直後は警告が出る
        await waitFor(() => {
            expect(result.current.restoreWarning).toContain("ホイール径")
        })

        // 構成を切り替えると警告が消える
        act(() => {
            result.current.changeConfig("config-2")
        })

        expect(result.current.restoreWarning).toBe("")
    })

    // 適合する保存構成を開くと、前の警告を残さない
    it("適合する保存構成を開くと復元警告を消す", async () => {
        storeIncompatibleState()
        // 最初は非互換の構成を復元して警告を出す
        mockedFetchPartsByIds.mockResolvedValue([
            createPart(1, "frame", {wheel_diameter: "700C"}),
            createPart(2, "wheel", {wheel_diameter: "650B"}),
        ])

        const {result} = renderHook(() => useSimulatorController({
            categories: [],
            autoSaveEnabled: true,
        }))

        await waitFor(() => {
            expect(result.current.restoreWarning).toContain("ホイール径")
        })

        // 適合する構成のパーツを返すように切り替える
        mockedFetchPartsByIds.mockResolvedValue([
            createPart(3, "frame", {wheel_diameter: "700C"}),
            createPart(4, "wheel", {wheel_diameter: "700C"}),
        ])

        // 保存構成を開く
        await act(async () => {
            await result.current.selectConfig({
                id: "config-2",
                name: "正常構成",
                version: 1,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
                parts: [
                    {slotKey: "frame", partId: 3, price: 1000, weight: 200},
                    {slotKey: "wheel", partId: 4, price: 1000, weight: 200},
                ],
            })
        })

        expect(result.current.restoreWarning).toBe("")
    })

})

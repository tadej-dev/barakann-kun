// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {act, cleanup, renderHook} from "@testing-library/react"
import {useState} from "react"

import {
    AUTH_LOGOUT_FLUSH_EVENT,
    type LogoutFlushDetail,
} from "@/features/auth/authEvents"
import type {Part} from "@/types/part"
import {useLocalConfigCollection} from "@/features/saved-builds/useLocalConfigCollection"
import type {ConfigCollection} from "@/features/simulator/useConfigCollection"
import {useConfigAutoSave} from "@/features/simulator/useConfigAutoSave"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"
import {loadLocalConfigCollection} from "@/lib/simulator-storage"

// 自動保存の待ち時間（ミリ秒）
const AUTO_SAVE_DELAY_MS = 800
// ローカル構成の保存キー
const COLLECTION_STORAGE_KEY = "barakann-config-collection-v2"

// 自動保存テスト用のパーツを生成
function createPart(id: number, price = 1000, weight = 200): Part {
    return {
        id,
        name: `Part ${id}`,
        brandName: "Test Brand",
        price,
        weight,
        blockedCategoryKeys: [],
    }
}

// 自動保存に必要な項目だけを持つ構成データ
function createCollection(
    local: ReturnType<typeof useLocalConfigCollection>,
): ConfigCollection {
    return {
        ...local.builds,
        ...local.order,
        configs: local.builds.builds,
        configsOperation: local.builds.operation,
        updateConfig: local.builds.update,
    } as unknown as ConfigCollection
}

// ローカル構成と自動保存を組み合わせたテスト用フック
function useHarness(options: {isActiveConfigLoaded?: boolean} = {}) {
    // ローカル構成の操作
    const local = useLocalConfigCollection({enabled: true})
    const [selectedParts, setSelectedParts] = useState<SelectedParts>({})
    // 選択中の構成ID
    const activeConfigId = local.builds.builds[0]?.id ?? ""

    useConfigAutoSave({
        collection: createCollection(local),
        selectedParts,
        activeConfigId,
        isConfigLoading: false,
        isActiveConfigLoaded: options.isActiveConfigLoaded ?? true,
        autoSaveEnabled: true,
    })

    return {local, selectedParts, setSelectedParts, activeConfigId}
}

// 未ログイン時の構成自動保存のタイミングと確定処理を保証
describe("useConfigAutoSave（未ログイン時）", () => {
    beforeEach(() => {
        window.localStorage.clear()
        vi.useFakeTimers()
    })

    afterEach(() => {
        cleanup()
        vi.useRealTimers()
        window.localStorage.clear()
    })

    // 選択中の構成の変更を、待ち時間の後にローカルへ保存
    it("選択中の構成の変更をローカルへ自動保存する", async () => {
        const {result} = renderHook(() => useHarness())

        act(() => {
            result.current.setSelectedParts({
                frame: createPart(10, 500000, 1133),
            })
        })

        await act(async () => {
            await vi.advanceTimersByTimeAsync(AUTO_SAVE_DELAY_MS)
        })

        expect(loadLocalConfigCollection().configs[0]?.parts).toEqual([
            {slotKey: "frame", partId: 10, price: 500000, weight: 1133},
        ])
    })

    // 保存内容を読み込む前の構成は、空で上書きしない
    it("未読込の構成は自動保存しない", async () => {
        const {result} = renderHook(() =>
            useHarness({isActiveConfigLoaded: false}))

        act(() => {
            result.current.setSelectedParts({
                frame: createPart(10, 500000, 1133),
            })
        })

        await act(async () => {
            await vi.advanceTimersByTimeAsync(AUTO_SAVE_DELAY_MS)
        })

        expect(loadLocalConfigCollection().configs[0]?.parts).toEqual([])
    })

    // ログアウト前の確定依頼では、待ち時間を置かずに保存
    it("ログアウト前の確定依頼で待たずに保存する", async () => {
        const {result} = renderHook(() => useHarness())

        act(() => {
            result.current.setSelectedParts({
                frame: createPart(10, 500000, 1133),
            })
        })

        // 確定依頼への応答モック
        const respond = vi.fn()

        await act(async () => {
            window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_FLUSH_EVENT, {
                detail: {
                    handled: false,
                    respond,
                } satisfies LogoutFlushDetail,
            }))
            await Promise.resolve()
            await Promise.resolve()
        })

        expect(loadLocalConfigCollection().configs[0]?.parts).toHaveLength(1)
        expect(respond).toHaveBeenCalledWith(true)
    })

    // 実行中の保存があっても、終わるまで待って確定
    it("実行中の保存を待ってから確定する", async () => {
        // 保存対象の構成一覧
        const configs = [{
            id: "slow-1",
            name: "構成1",
            version: 1,
            createdAt: "",
            updatedAt: "",
            parts: [],
        }]
        // 100ミリ秒後に完了する保存処理のモック
        const updateConfig = vi.fn(() => new Promise<void>((resolve) => {
            setTimeout(resolve, 100)
        }))

        // 保存に時間がかかる自動保存のテスト用フック
        function useSlowHarness() {
            const [selectedParts, setSelectedParts] = useState<SelectedParts>({})

            useConfigAutoSave({
                collection: {
                    configs,
                    configsOperation: null,
                    updateConfig,
                } as unknown as ConfigCollection,
                selectedParts,
                activeConfigId: "slow-1",
                isConfigLoading: false,
                isActiveConfigLoaded: true,
                autoSaveEnabled: true,
            })

            return {setSelectedParts, updateConfig}
        }

        const {result} = renderHook(() => useSlowHarness())

        act(() => {
            result.current.setSelectedParts({frame: createPart(10)})
        })

        // 800ms後に保存が始まる
        await act(async () => {
            await vi.advanceTimersByTimeAsync(AUTO_SAVE_DELAY_MS)
        })

        // 確定依頼への応答モック
        const respond = vi.fn()

        // 保存中に確定依頼を出しても、完了を待って成功
        await act(async () => {
            window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_FLUSH_EVENT, {
                detail: {handled: false, respond} satisfies LogoutFlushDetail,
            }))
            await vi.advanceTimersByTimeAsync(500)
        })

        expect(respond).toHaveBeenCalledWith(true)
        // 待機後に二重保存しない
        expect(updateConfig).toHaveBeenCalledTimes(1)
    })

    // 変更が無い場合は、ログアウト時に保存しない
    it("変更が無ければログアウト時に保存しない", async () => {
        renderHook(() => useHarness())

        // 初期読み込み後の書き込みを数えないよう、ここから監視
        const setItem = vi.spyOn(Storage.prototype, "setItem")
        // 確定依頼への応答モック
        const respond = vi.fn()

        await act(async () => {
            window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_FLUSH_EVENT, {
                detail: {handled: false, respond} satisfies LogoutFlushDetail,
            }))
            await Promise.resolve()
        })

        expect(respond).toHaveBeenCalledWith(true)
        expect(setItem).not.toHaveBeenCalled()

        setItem.mockRestore()
    })

    // 実行中の保存が失敗した場合は、確定失敗として返す
    it("実行中の保存が失敗したら確定失敗にする", async () => {
        // 保存対象の構成一覧
        const configs = [{
            id: "slow-2",
            name: "構成1",
            version: 1,
            createdAt: "",
            updatedAt: "",
            parts: [],
        }]
        // 100ミリ秒後に失敗する保存処理のモック
        const updateConfig = vi.fn(() => new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error("failed")), 100)
        }))

        // 保存が失敗する自動保存のテスト用フック
        function useFailingHarness() {
            const [selectedParts, setSelectedParts] = useState<SelectedParts>({})

            useConfigAutoSave({
                collection: {
                    configs,
                    configsOperation: null,
                    updateConfig,
                } as unknown as ConfigCollection,
                selectedParts,
                activeConfigId: "slow-2",
                isConfigLoading: false,
                isActiveConfigLoaded: true,
                autoSaveEnabled: true,
            })

            return {setSelectedParts}
        }

        const {result} = renderHook(() => useFailingHarness())

        act(() => {
            result.current.setSelectedParts({frame: createPart(10)})
        })

        await act(async () => {
            await vi.advanceTimersByTimeAsync(AUTO_SAVE_DELAY_MS)
        })

        // 確定依頼への応答モック
        const respond = vi.fn()

        await act(async () => {
            window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_FLUSH_EVENT, {
                detail: {handled: false, respond} satisfies LogoutFlushDetail,
            }))
            await vi.advanceTimersByTimeAsync(500)
        })

        expect(respond).toHaveBeenCalledWith(false)
    })

    // 保存済みと同じ内容では、保存を繰り返さない
    it("保存済みと同じ内容では保存しない", async () => {
        const {result} = renderHook(() => useHarness())

        act(() => {
            result.current.setSelectedParts({
                frame: createPart(10, 500000, 1133),
            })
        })

        await act(async () => {
            vi.advanceTimersByTime(AUTO_SAVE_DELAY_MS)
            await Promise.resolve()
        })

        // 1回目の保存内容
        const saved = window.localStorage.getItem(COLLECTION_STORAGE_KEY)

        await act(async () => {
            vi.advanceTimersByTime(AUTO_SAVE_DELAY_MS)
            await Promise.resolve()
        })

        expect(window.localStorage.getItem(COLLECTION_STORAGE_KEY)).toBe(saved)
    })
})

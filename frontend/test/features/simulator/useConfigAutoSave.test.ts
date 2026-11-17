// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {act, renderHook} from "@testing-library/react"
import {useState} from "react"

import type {Part} from "@/types/part"
import {useLocalConfigCollection} from "@/features/saved-builds/useLocalConfigCollection"
import type {ConfigCollection} from "@/features/simulator/useConfigCollection"
import {useConfigAutoSave} from "@/features/simulator/useConfigAutoSave"
import type {SelectedParts} from "@/features/simulator/simulatorTypes"
import {loadLocalConfigCollection} from "@/lib/simulator-storage"

const AUTO_SAVE_DELAY_MS = 800
const COLLECTION_STORAGE_KEY = "barakann-config-collection-v2"

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

function useHarness(options: {isActiveConfigLoaded?: boolean} = {}) {
    const local = useLocalConfigCollection({enabled: true})
    const [selectedParts, setSelectedParts] = useState<SelectedParts>({})
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

describe("useConfigAutoSave（未ログイン時）", () => {
    beforeEach(() => {
        window.localStorage.clear()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        window.localStorage.clear()
    })

    // 選択中の構成の変更を、待ち時間の後にローカルへ保存する。
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

    // 保存内容を読み込む前の構成は、空で上書きしない。
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

    // 保存済みと同じ内容では、保存を繰り返さない。
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

        const saved = window.localStorage.getItem(COLLECTION_STORAGE_KEY)

        await act(async () => {
            vi.advanceTimersByTime(AUTO_SAVE_DELAY_MS)
            await Promise.resolve()
        })

        expect(window.localStorage.getItem(COLLECTION_STORAGE_KEY)).toBe(saved)
    })
})

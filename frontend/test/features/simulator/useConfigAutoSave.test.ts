// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {act, renderHook} from "@testing-library/react"
import {useState} from "react"

import type {SavedBuild} from "@/api/savedBuilds"
import type {Part} from "@/types/part"
import {useLocalConfigCollection} from "@/features/saved-builds/useLocalConfigCollection"
import type {ConfigCollection} from "@/features/simulator/useConfigCollection"
import {useConfigAutoSave} from "@/features/simulator/useConfigAutoSave"
import type {ConfigStates, SelectedParts} from "@/features/simulator/simulatorTypes"
import {loadLocalConfigCollection} from "@/lib/simulator-storage"

// 自動保存の待ち時間(実装と同じ値)
const AUTO_SAVE_DELAY_MS = 800

const emptyConfigStates: ConfigStates = {"1": {}, "2": {}, "3": {}, "4": {}}

// パーツを作る
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

// 未ログイン時の自動保存を検証するための、最小限の構成データ
function createGuestCollection(
    local: ReturnType<typeof useLocalConfigCollection>,
): ConfigCollection {
    return {
        isAuthenticated: false,
        isAuthLoading: false,
        authUserId: null,
        slots: [],
        slotOperation: null,
        slotsErrorMessage: "",
        isSlotsLoading: false,
        hasLoadedConfigSlots: false,
        saveSlot: async () => {},
        clearSlot: async () => {},
        renameSlot: async () => {},
        reloadConfigSlots: async () => [],
        savedBuilds: local.builds.builds,
        savedBuildsOperation: local.builds.operation,
        savedBuildsErrorMessage: local.builds.errorMessage,
        isSavedBuildsLoading: local.builds.isLoading,
        createSavedBuild: local.builds.create,
        updateSavedBuild: local.builds.update,
        renameSavedBuild: local.builds.rename,
        removeSavedBuild: local.builds.remove,
        reloadSavedBuilds: local.builds.reload,
        configOrderErrorMessage: local.order.errorMessage,
        isLoadingConfigOrder: local.order.isLoading,
        isSavingConfigOrder: local.order.isSaving,
        hasLoadedConfigOrder: local.order.hasLoaded,
        saveConfigOrder: local.order.save,
        reloadConfigOrder: local.order.reload,
        orderedItems: [],
        orderedItemKeys: [],
        totalSavedCount: 4 + local.builds.builds.length,
        isConfigListReady: local.isReady,
        activeConfigName: "構成1",
    } as unknown as ConfigCollection
}

// ローカル保存の追加構成を選択した状態で、自動保存を動かす
function useHarness(buildId: string) {
    const local = useLocalConfigCollection({enabled: true})
    const [selectedParts, setSelectedParts] = useState<SelectedParts>({})

    useConfigAutoSave({
        collection: createGuestCollection(local),
        configStates: emptyConfigStates,
        selectedParts,
        activeConfigId: "1",
        activeSavedBuildId: buildId,
        isSavedBuildLoading: false,
        autoSaveEnabled: true,
        onConfigChange: () => {},
        onRestoreConfigSlot: async () => {},
        onRestoreSavedBuild: async () => {},
    })

    return {local, selectedParts, setSelectedParts}
}

// 保存済みの追加構成を用意する
function seedBuild(id: string, parts: SavedBuild["parts"] = []) {
    window.localStorage.setItem(
        "barakann-config-collection-v1",
        JSON.stringify({
            savedBuilds: [{id, name: "通勤用", parts}],
            order: [`build:${id}`],
        }),
    )
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

    // 追加構成を選んでパーツを変えると、待ち時間の後にローカルへ保存される。
    it("選択中の追加構成の変更をローカルへ自動保存する", async () => {
        seedBuild("build-1")

        const {result} = renderHook(() => useHarness("build-1"))

        act(() => {
            result.current.setSelectedParts({
                frame: createPart(10, 500000, 1133),
            })
        })

        await act(async () => {
            vi.advanceTimersByTime(AUTO_SAVE_DELAY_MS)
            await Promise.resolve()
        })

        expect(loadLocalConfigCollection().savedBuilds[0]?.parts).toEqual([
            {slotKey: "frame", partId: 10, price: 500000, weight: 1133},
        ])
    })

    // 保存済みと同じ内容では、保存を繰り返さない。
    it("保存済みと同じ内容では保存しない", async () => {
        seedBuild("build-1", [{
            slotKey: "frame",
            partId: 10,
            price: 500000,
            weight: 1133,
        }])
        const before = window.localStorage.getItem(
            "barakann-config-collection-v1",
        )

        const {result} = renderHook(() => useHarness("build-1"))

        act(() => {
            result.current.setSelectedParts({
                frame: createPart(10, 500000, 1133),
            })
        })

        await act(async () => {
            vi.advanceTimersByTime(AUTO_SAVE_DELAY_MS)
            await Promise.resolve()
        })

        expect(window.localStorage.getItem("barakann-config-collection-v1"))
            .toBe(before)
    })
})

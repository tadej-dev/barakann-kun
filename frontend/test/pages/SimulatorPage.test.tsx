// @vitest-environment jsdom

import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react"
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"

import {createSavedBuild, fetchSavedBuilds} from "@/api/savedBuilds"
import {saveLocalOrigin} from "@/lib/local-config-sync"
import {saveLocalConfigCollection} from "@/lib/simulator-storage"
import {SimulatorPage} from "@/pages/SimulatorPage"

// 画面の表示に必要な依存だけを差し替え、移行の配線を検証する
vi.mock("@/features/auth/useAuth", () => ({
    useAuth: () => ({
        errorMessage: "",
        login: vi.fn(),
        status: "authenticated",
        user: {id: "user-1", displayName: "テスト"},
    }),
}))

vi.mock("@/api/categories", () => ({
    fetchCategories: vi.fn(async () => []),
}))

vi.mock("@/api/savedBuilds", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/savedBuilds")>()

    return {
        ...actual,
        createSavedBuild: vi.fn(),
        deleteSavedBuild: vi.fn(),
        fetchSavedBuilds: vi.fn(),
    }
})

// Simulatorへ渡されたpropsを記録し、ページの配線を検証する
const {simulatorProps} = vi.hoisted(() => ({
    simulatorProps: {} as {
        autoSaveEnabled?: boolean
        savedBuildsReloadKey?: number
    },
}))

vi.mock("@/components/simulator/Simulator", () => ({
    Simulator: (props: {
        autoSaveEnabled?: boolean
        savedBuildsReloadKey?: number
    }) => {
        Object.assign(simulatorProps, props)

        return <div data-testid="simulator" />
    },
}))

const mockedFetchSavedBuilds = vi.mocked(fetchSavedBuilds)
const mockedCreateSavedBuild = vi.mocked(createSavedBuild)

// ローカル構成を保存する
function seedLocalConfigs(configs: {
    id: string
    name: string
    parts: {slotKey: string; partId: number; price: number; weight: number}[]
}[]) {
    saveLocalConfigCollection(
        configs,
        configs.map((config) => `config:${config.id}`),
    )
}

// サーバー側の構成を作る
function createServerBuild(index: number) {
    return {
        id: `server-${index}`,
        name: `既存${index}`,
        version: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        parts: [],
    }
}

describe("SimulatorPage の構成引き継ぎ", () => {
    beforeEach(() => {
        window.localStorage.clear()
        vi.clearAllMocks()
        mockedFetchSavedBuilds.mockResolvedValue([])
        // 前のテストで記録したSimulatorのpropsを消す
        delete simulatorProps.autoSaveEnabled
        delete simulatorProps.savedBuildsReloadKey
    })

    afterEach(() => {
        cleanup()
    })

    // 別アカウント由来のローカル構成は、移行候補にしない
    it("別アカウント由来なら移行ダイアログを出さない", async () => {
        saveLocalOrigin("user-2")
        seedLocalConfigs([{
            id: "local-1",
            name: "構成1",
            parts: [{slotKey: "frame", partId: 1, price: 100, weight: 1000}],
        }])

        render(<SimulatorPage />)

        await screen.findByTestId("simulator")

        // 由来が違うため、サーバー側の取得も行わない
        expect(mockedFetchSavedBuilds).not.toHaveBeenCalled()
        expect(screen.queryByText("構成をアカウントへ保存")).toBeNull()
    })

    // すべて一致している場合は、移行ダイアログを出さない
    it("すべて一致なら移行ダイアログを出さない", async () => {
        const parts = [{slotKey: "frame", partId: 1, price: 100, weight: 1000}]

        saveLocalOrigin("user-1")
        seedLocalConfigs([{id: "local-1", name: "構成1", parts}])
        mockedFetchSavedBuilds.mockResolvedValue([{
            ...createServerBuild(1),
            name: "構成1",
            parts,
        }])

        render(<SimulatorPage />)

        await waitFor(() => {
            expect(mockedFetchSavedBuilds).toHaveBeenCalledTimes(1)
        })
        expect(screen.queryByText("構成をアカウントへ保存")).toBeNull()
    })

    // 一部だけ一致している場合は、未移行の構成を移行できるようダイアログを出す
    it("一部だけ一致している場合は移行ダイアログを出す", async () => {
        const parts = [{slotKey: "frame", partId: 1, price: 100, weight: 1000}]

        saveLocalOrigin("user-1")
        seedLocalConfigs([
            {id: "local-1", name: "構成1", parts},
            {
                id: "local-2",
                name: "構成2",
                parts: [{slotKey: "frame", partId: 2, price: 100, weight: 1000}],
            },
        ])
        mockedFetchSavedBuilds.mockResolvedValue([{
            ...createServerBuild(1),
            name: "構成1",
            parts,
        }])

        render(<SimulatorPage />)

        expect(await screen.findByText("構成をアカウントへ保存")).toBeTruthy()
    })

    // 上限超過の構成でも、他の選択を外せば保存できる
    it("上限超過の構成を選んで保存できる", async () => {
        saveLocalOrigin("user-1")
        seedLocalConfigs([
            {
                id: "local-1",
                name: "構成1",
                parts: [{slotKey: "frame", partId: 1, price: 100, weight: 1000}],
            },
            {
                id: "local-2",
                name: "構成2",
                parts: [{slotKey: "frame", partId: 2, price: 100, weight: 1000}],
            },
        ])
        // 残り枠を1件にする
        mockedFetchSavedBuilds.mockResolvedValue(
            Array.from({length: 19}, (_, index) => createServerBuild(index)),
        )
        mockedCreateSavedBuild.mockResolvedValue({
            id: "created",
            name: "構成2",
            version: 1,
            createdAt: "",
            updatedAt: "",
            parts: [],
        })

        const {container} = render(<SimulatorPage />)

        await screen.findByText("構成をアカウントへ保存")

        // 移行ダイアログの表示中は自動保存を止める
        expect(simulatorProps.autoSaveEnabled).toBe(false)

        const checkboxes = container.querySelectorAll('[data-slot="checkbox"]')

        // 既定の構成1を外し、上限超過の構成2を選ぶ
        fireEvent.click(checkboxes[0]!)
        fireEvent.click(checkboxes[1]!)

        fireEvent.click(screen.getByRole("button", {
            name: "選択した構成を保存",
        }))

        await waitFor(() => {
            expect(mockedCreateSavedBuild).toHaveBeenCalledTimes(1)
        })
        expect(mockedCreateSavedBuild).toHaveBeenCalledWith(
            "構成2",
            [{slotKey: "frame", partId: 2}],
        )

        // 保存できたらダイアログを閉じ、一覧を再取得する
        await waitFor(() => {
            expect(screen.queryByText("構成をアカウントへ保存")).toBeNull()
        })
        expect(simulatorProps.autoSaveEnabled).toBe(true)
        expect(simulatorProps.savedBuildsReloadKey).toBe(1)
    })
})

// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from "vitest"
import {cleanup, fireEvent, render, screen} from "@testing-library/react"

import type {ConfigSlot} from "@/api/configSlots"
import {SidebarProvider} from "@/components/ui/sidebar"
import {ConfigList} from "@/components/simulator/ConfigList"
import {orderSlotsByIds} from "@/features/simulator/configSlotOrder"
import type {ConfigCollection} from "@/features/simulator/useConfigCollection"
import type {ConfigId} from "@/features/simulator/simulatorTypes"

// jsdomはmatchMediaを実装していないため、スマホ幅の判定用に空の実装を入れる
if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
}

// テストごとに描画したDOMを破棄し、次のテストへ持ち越さない
afterEach(cleanup)

// 未ログイン時の固定枠(構成1〜4)
const guestSlots: ConfigSlot[] = (["1", "2", "3", "4"] as ConfigId[]).map(
    (configId) => ({
        configId,
        name: `構成${configId}`,
        version: 0,
        updatedAt: null,
        parts: [],
    }),
)

// 未ログイン時の構成データ。保存系は呼ばれないため空の実装で足りる。
function createGuestCollection(
    options: {isAuthLoading?: boolean} = {},
): ConfigCollection {
    const noop = () => Promise.resolve()

    return {
        isAuthenticated: false,
        isAuthLoading: options.isAuthLoading ?? false,
        authUserId: null,
        slots: guestSlots,
        slotOperation: null,
        slotsErrorMessage: "",
        isSlotsLoading: false,
        hasLoadedConfigSlots: false,
        saveSlot: noop,
        clearSlot: noop,
        renameSlot: noop,
        reloadConfigSlots: noop,
        savedBuilds: [],
        savedBuildsOperation: null,
        savedBuildsErrorMessage: "",
        isSavedBuildsLoading: false,
        createSavedBuild: noop,
        updateSavedBuild: noop,
        renameSavedBuild: noop,
        removeSavedBuild: noop,
        reloadSavedBuilds: noop,
        configOrderErrorMessage: "",
        isLoadingConfigOrder: false,
        isSavingConfigOrder: false,
        hasLoadedConfigOrder: false,
        saveConfigOrder: noop,
        reloadConfigOrder: noop,
        orderedItems: [],
        orderedItemKeys: [],
        totalSavedCount: guestSlots.length,
        isConfigListReady: false,
        activeConfigName: "構成1",
    } as unknown as ConfigCollection
}

function renderConfigList(
    options: {
        onConfigChange?: (id: ConfigId) => void
        onClearConfig?: (id: ConfigId) => Promise<void>
        isAuthLoading?: boolean
    } = {},
) {
    return render(
        <SidebarProvider>
            <ConfigList
                categories={[]}
                collection={createGuestCollection({
                    isAuthLoading: options.isAuthLoading,
                })}
                activeConfigId="1"
                activeSavedBuildId={null}
                configStates={{"1": {}, "2": {}, "3": {}, "4": {}}}
                selectedParts={{}}
                isSavedBuildLoading={false}
                savedBuildErrorMessage=""
                onConfigChange={options.onConfigChange ?? (() => {})}
                onSavedBuildSelect={() => {}}
                onSavedBuildPrefetch={() => {}}
                onClearConfig={options.onClearConfig ?? (async () => {})}
            />
        </SidebarProvider>,
    )
}

describe("orderSlotsByIds", () => {
    // 並び順のIDに従って構成を並べ替える。
    it("指定した順に構成を並べ替える", () => {
        const ordered = orderSlotsByIds(guestSlots, ["4", "2", "3", "1"])

        expect(ordered.map((slot) => slot.configId)).toEqual(["4", "2", "3", "1"])
    })

    // 未知のIDは無視する（該当しない構成は並びに含まれない）。
    it("未知のIDは無視する", () => {
        const ordered = orderSlotsByIds(guestSlots, ["2", "9" as ConfigId])

        expect(ordered.map((slot) => slot.configId)).toEqual(["2"])
    })
})

describe("ConfigList（未ログイン時）", () => {
    // ログイン時と同じカード形式で構成1〜4を並べる。
    it("構成1〜4をログイン時と同じカード形式で表示する", () => {
        renderConfigList()

        for (const configId of ["1", "2", "3", "4"]) {
            // 開いた状態と閉じた状態で1つずつ、選択ボタンが出る。
            expect(
                screen.getAllByRole("button", {name: `構成${configId}を選択`}),
            ).toHaveLength(2)
        }
        // ドラッグハンドルは各カードに1つ、標準枠のバッジも各カードに出る。
        expect(
            screen.getAllByRole("button", {name: /を並び替え$/}),
        ).toHaveLength(4)
        expect(screen.getAllByText("標準枠")).toHaveLength(4)
    })

    // 保存枠の使用数は、ログイン時と同じ位置に出す。
    it("保存枠の使用数を表示する", () => {
        renderConfigList()

        expect(screen.getByLabelText("保存枠使用数").textContent).toBe("4 / 20")
    })

    // 追加と一括削除は、ログイン時と同じ位置に無効な状態で表示する。
    it("追加と一括削除を無効な状態で表示する", () => {
        renderConfigList()

        expect(screen.getByText("追加")).toBeTruthy()
        expect(screen.getByText("一括削除")).toBeTruthy()
        expect(
            screen.getByRole("button", {name: "新しい構成を追加"})
                .hasAttribute("disabled"),
        ).toBe(true)
        expect(
            screen.getByRole("button", {name: /一括削除/}).hasAttribute("disabled"),
        ).toBe(true)
    })

    // 認証の確認中も、保存が要る操作はできない。
    it("認証の確認中は追加と一括削除を操作できない", () => {
        renderConfigList({isAuthLoading: true})

        expect(
            screen.getByRole("button", {name: "新しい構成を追加"})
                .hasAttribute("disabled"),
        ).toBe(true)
        expect(
            screen.getByRole("button", {name: /一括削除/}).hasAttribute("disabled"),
        ).toBe(true)
    })

    // 保存先が無い間は、カードの名前変更だけを操作できない。
    it("名前変更だけを操作できない", async () => {
        renderConfigList()

        fireEvent.click(
            screen.getAllByRole("button", {name: "構成2の操作メニュー"})[0],
        )

        expect(
            (await screen.findByText("名前変更")).closest("[role='menuitem']")
                ?.getAttribute("aria-disabled"),
        ).toBe("true")
        // クリアは確認ダイアログ付きで使える。
        expect(
            screen.getByText("クリア").closest("[role='menuitem']")
                ?.getAttribute("aria-disabled"),
        ).not.toBe("true")
    })

    // 認証の確認中は、保存枠の数を確定させない。
    it("認証の確認中は保存枠の数を確定しない", () => {
        renderConfigList({isAuthLoading: true})

        expect(screen.getByLabelText("保存枠使用数").textContent).toBe("… / 20")
    })

    // クリアはカードの操作メニューから、確認してから実行する。
    it("カードのメニューから確認してクリアする", async () => {
        const onClearConfig = vi.fn(async () => {})
        renderConfigList({onClearConfig})

        const menuButton = () => screen.getAllByRole("button", {
            name: "構成2の操作メニュー",
        })[0]

        fireEvent.click(menuButton())
        fireEvent.click(await screen.findByText("クリア"))

        // 開いただけでは実行しない。
        expect(await screen.findByText("構成2をクリアしますか？")).toBeTruthy()
        expect(onClearConfig).not.toHaveBeenCalled()

        // キャンセルしても実行しない。
        fireEvent.click(screen.getByText("キャンセル"))
        expect(onClearConfig).not.toHaveBeenCalled()

        // 確認して初めて1回だけ実行する。
        fireEvent.click(menuButton())
        fireEvent.click(await screen.findByText("クリア"))
        fireEvent.click(await screen.findByText("クリアする"))

        expect(onClearConfig).toHaveBeenCalledTimes(1)
        expect(onClearConfig).toHaveBeenCalledWith("2")
    })

    // ヘッダーには構成クリアを出さない（カードのメニューから実行する）。
    it("ヘッダーに構成クリアを出さない", () => {
        renderConfigList()

        expect(
            screen.queryByRole("button", {name: /構成\d+をクリア/}),
        ).toBeNull()
    })

    // カードの選択で、その構成へ切り替える。
    it("カードを選ぶと構成を切り替える", () => {
        const onConfigChange = vi.fn()
        renderConfigList({onConfigChange})

        // 折りたたみ用ではなく、カード内の選択ボタンを押す。
        fireEvent.click(
            screen.getAllByRole("button", {name: "構成2を選択"})[1],
        )

        expect(onConfigChange).toHaveBeenCalledWith("2")
    })
})

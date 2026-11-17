// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from "vitest"
import {cleanup, fireEvent, render, screen} from "@testing-library/react"

import type {ConfigSlot} from "@/api/configSlots"
import {SidebarProvider} from "@/components/ui/sidebar"
import {ConfigList} from "@/components/simulator/ConfigList"
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

// 未ログイン時の一覧項目（固定枠4件）
const guestItems = guestSlots.map((slot) => ({
    key: `config:${slot.configId}`,
    kind: "slot" as const,
    slot,
}))

// 未ログイン時の構成データ。保存系は呼ばれないため空の実装で足りる。
function createGuestCollection(
    options: {isAuthLoading?: boolean; buildName?: string} = {},
): ConfigCollection {
    const noop = () => Promise.resolve()
    const builds = options.buildName
        ? [{
            id: "build-1",
            name: options.buildName,
            version: 1,
            createdAt: "",
            updatedAt: "",
            parts: [],
        }]
        : []
    const items = [
        ...guestItems,
        ...builds.map((build) => ({
            key: `build:${build.id}`,
            kind: "build" as const,
            build,
        })),
    ]

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
        savedBuilds: builds,
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
        orderedItems: items,
        orderedItemKeys: items.map((item) => item.key),
        totalSavedCount: guestSlots.length + builds.length,
        isConfigListReady: (options.isAuthLoading ?? false) === false,
        activeConfigName: "構成1",
    } as unknown as ConfigCollection
}

function renderConfigList(
    options: {
        onConfigChange?: (id: ConfigId) => void
        onClearConfig?: (id: ConfigId) => Promise<void>
        isAuthLoading?: boolean
        buildName?: string
        onSavedBuildSelect?: (build: {id: string; name: string}) => void
    } = {},
) {
    return render(
        <SidebarProvider>
            <ConfigList
                categories={[]}
                collection={createGuestCollection({
                    isAuthLoading: options.isAuthLoading,
                    buildName: options.buildName,
                })}
                activeConfigId="1"
                activeSavedBuildId={null}
                selectedParts={{}}
                isSavedBuildLoading={false}
                savedBuildErrorMessage=""
                onConfigChange={options.onConfigChange ?? (() => {})}
                onSavedBuildSelect={options.onSavedBuildSelect ?? (() => {})}
                onSavedBuildPrefetch={() => {}}
                onClearConfig={options.onClearConfig ?? (async () => {})}
            />
        </SidebarProvider>,
    )
}

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

    // 追加は未ログインでも使え、一括削除は対象を選ぶまで押せない。
    it("追加を押せて、一括削除は選択まで押せない", () => {
        renderConfigList()

        expect(screen.getByText("追加")).toBeTruthy()
        expect(screen.getByText("一括削除")).toBeTruthy()
        expect(
            screen.getByRole("button", {name: "新しい構成を追加"})
                .hasAttribute("disabled"),
        ).toBe(false)
        expect(
            screen.getByRole("button", {name: /一括削除/}).hasAttribute("disabled"),
        ).toBe(true)
    })

    // 認証の確認中は、保存先が決まらないため操作できない。
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

    // 追加構成のカードは、未ログインでも名前変更・削除を操作できる。
    it("追加構成のカードは操作メニューを使える", async () => {
        renderConfigList({buildName: "通勤用"})

        expect(screen.getByText("通勤用")).toBeTruthy()

        fireEvent.click(
            screen.getAllByRole("button", {name: "通勤用の操作メニュー"})[0],
        )

        expect(
            (await screen.findByText("名前変更")).closest("[role='menuitem']")
                ?.getAttribute("aria-disabled"),
        ).not.toBe("true")
        expect(
            screen.getByText("削除").closest("[role='menuitem']")
                ?.getAttribute("aria-disabled"),
        ).not.toBe("true")
    })

    // 追加構成のカードを押すと、その構成の読み込みを親へ依頼する。
    it("追加構成のカードを選ぶと親へ通知する", () => {
        const onSavedBuildSelect = vi.fn()
        renderConfigList({buildName: "通勤用", onSavedBuildSelect})

        fireEvent.click(screen.getByText("通勤用"))

        expect(onSavedBuildSelect).toHaveBeenCalledTimes(1)
        expect(onSavedBuildSelect.mock.calls[0]?.[0]).toMatchObject({
            id: "build-1",
            name: "通勤用",
        })
    })

    // 追加構成のカードから、名前変更ダイアログを開ける。
    it("追加構成の名前変更ダイアログを開く", async () => {
        renderConfigList({buildName: "通勤用"})

        fireEvent.click(
            screen.getAllByRole("button", {name: "通勤用の操作メニュー"})[0],
        )
        fireEvent.click(await screen.findByText("名前変更"))

        expect(await screen.findByText("保存構成の名前を変更")).toBeTruthy()
    })

    // 追加構成のカードから、削除の確認ダイアログを開ける。
    it("追加構成の削除ダイアログを開く", async () => {
        renderConfigList({buildName: "通勤用"})

        fireEvent.click(
            screen.getAllByRole("button", {name: "通勤用の操作メニュー"})[0],
        )
        fireEvent.click(await screen.findByText("削除"))

        expect(await screen.findByText("保存構成を削除")).toBeTruthy()
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

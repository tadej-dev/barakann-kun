// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from "vitest"
import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react"

import type {SavedBuild} from "@/api/savedBuilds"
import {SidebarProvider} from "@/components/ui/sidebar"
import {ConfigList} from "@/components/simulator/ConfigList"
import type {ConfigCollection} from "@/features/simulator/useConfigCollection"

// テストごとに描画したDOMを破棄し、次のテストへ持ち越さない
afterEach(cleanup)

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

// 構成1件分のデータ。既定の構成は削除できない
function createConfig(id: string, name: string): SavedBuild {
    return {
        id,
        name,
        version: 1,
        createdAt: "",
        updatedAt: "",
        parts: [],
    }
}

// 未ログイン時の構成データ。保存系は呼ばれないため空の実装で足りる
function createGuestCollection(
    options: {
        configs?: SavedBuild[]
        isAuthLoading?: boolean
        createConfig?: (name: string) => Promise<SavedBuild>
        removeConfig?: () => Promise<void>
    } = {},
): ConfigCollection {
    // 呼び出しだけを確認する空の非同期処理
    const noop = () => Promise.resolve()
    // テストで使う構成一覧
    const configs = options.configs ?? [createConfig("config-1", "構成1")]

    return {
        isAuthenticated: false,
        isAuthLoading: options.isAuthLoading ?? false,
        authUserId: null,
        configs,
        configsOperation: null,
        configsErrorMessage: "",
        isConfigsLoading: false,
        createConfig: options.createConfig ?? noop,
        updateConfig: noop,
        renameConfig: noop,
        removeConfig: options.removeConfig ?? noop,
        reloadConfigs: noop,
        configOrderErrorMessage: "",
        isLoadingConfigOrder: false,
        isSavingConfigOrder: false,
        hasLoadedConfigOrder: true,
        saveConfigOrder: noop,
        reloadConfigOrder: noop,
        orderedConfigs: configs,
        orderedConfigKeys: configs.map((config) => `config:${config.id}`),
        totalSavedCount: configs.length,
        maxConfigs: 20,
        isConfigListReady: (options.isAuthLoading ?? false) === false,
        activeConfigName: configs[0]?.name ?? "構成",
    } as unknown as ConfigCollection
}

// 未ログイン時の構成一覧を描画
function renderConfigList(
    options: {
        configs?: SavedBuild[]
        onConfigChange?: (id: string) => void
        onConfigSelect?: (config: SavedBuild) => void
        createConfig?: (name: string) => Promise<SavedBuild>
        removeConfig?: () => Promise<void>
    } = {},
) {
    return render(
        <SidebarProvider>
            <ConfigList
                categories={[]}
                collection={createGuestCollection({
                    configs: options.configs,
                    createConfig: options.createConfig,
                    removeConfig: options.removeConfig,
                })}
                activeConfigId={options.configs?.[0]?.id ?? "config-1"}
                selectedParts={{}}
                isConfigLoading={false}
                configErrorMessage=""
                onConfigChange={options.onConfigChange ?? (() => {})}
                onConfigSelect={options.onConfigSelect ?? (() => {})}
                onConfigPrefetch={() => {}}
                onClearConfig={() => {}}
            />
        </SidebarProvider>,
    )
}

// 未ログイン時の構成一覧の表示と操作を保証
describe("ConfigList（未ログイン時）", () => {
    // 構成をカード形式で表示し、使用数を出す
    it("構成と使用数を表示する", () => {
        renderConfigList({
            configs: [
                createConfig("config-1", "構成1"),
                createConfig("config-2", "通勤用"),
            ],
        })

        expect(screen.getByText("構成1")).toBeTruthy()
        expect(screen.getByText("通勤用")).toBeTruthy()
        expect(screen.getByLabelText("構成数").textContent).toBe("2 / 20")
        expect(screen.getAllByRole("button", {name: /を並び替え$/}))
            .toHaveLength(2)
    })

    // 選択中の構成はaria-currentで示し、一覧はul/liの構造を保つ
    it("選択中の構成をaria-currentで示し、リスト項目として並べる", () => {
        renderConfigList({
            configs: [
                createConfig("config-1", "構成1"),
                createConfig("config-2", "通勤用"),
            ],
        })

        // 構成を並べるリストと、リスト直下の項目
        const list = document.querySelector<HTMLElement>(
            'ul[data-slot="sortable"]',
        )
        const items = within(list as HTMLElement).getAllByRole("listitem")
        const firstItem = items[0]
        const secondItem = items[1]

        expect(firstItem.getAttribute("role")).toBeNull()
        // 閉じたレール用と通常表示用の2つのボタンが同じ選択状態を示す
        expect(
            within(firstItem)
                .getAllByRole("button", {name: "構成1を選択"})
                .every((button) =>
                    button.getAttribute("aria-current") === "true",
                ),
        ).toBe(true)
        expect(
            within(secondItem)
                .getAllByRole("button", {name: "通勤用を選択"})[0]
                .hasAttribute("aria-current"),
        ).toBe(false)
        // 並べ替えハンドルはliとは別のボタンとして残す
        expect(
            within(firstItem).getByRole("button", {name: "構成1を並び替え"}),
        ).toBeTruthy()
    })

    // 追加は押せて、一括削除は対象を選ぶまで押せない
    it("追加を押せて、一括削除は選択まで押せない", () => {
        renderConfigList()

        expect(
            screen.getByRole("button", {name: "新しい構成を追加"})
                .hasAttribute("disabled"),
        ).toBe(false)
        expect(
            screen.getByRole("button", {name: /一括削除/}).hasAttribute("disabled"),
        ).toBe(true)
    })

    // 構成が1件でも削除できる（すべて削除すると「構成1」が作り直される）
    it("構成が1件でも削除を出す", async () => {
        renderConfigList()

        fireEvent.click(
            screen.getAllByRole("button", {name: "構成1の操作メニュー"})[0],
        )

        expect(await screen.findByText("名前変更")).toBeTruthy()
        expect(screen.getByText("クリア")).toBeTruthy()
        expect(screen.getByText("削除")).toBeTruthy()
    })

    // 構成が2件以上あるときは削除メニューを出す
    it("構成が2件以上あるときは削除を出す", async () => {
        renderConfigList({
            configs: [
                createConfig("config-1", "構成1"),
                createConfig("config-2", "通勤用"),
            ],
        })

        fireEvent.click(
            screen.getAllByRole("button", {name: "通勤用の操作メニュー"})[0],
        )

        expect(await screen.findByText("削除")).toBeTruthy()
    })

    // カードの選択で、選んだ構成の読み込みを親へ依頼
    it("構成のカードを選ぶと親へ通知する", () => {
        // 構成選択の通知先モック
        const onConfigSelect = vi.fn()
        renderConfigList({
            configs: [createConfig("config-1", "構成1")],
            onConfigSelect,
        })

        fireEvent.click(screen.getByText("構成1"))

        expect(onConfigSelect).toHaveBeenCalledTimes(1)
    })

    // 一括削除の確認には、選択した構成名をすべて出す
    it("一括削除の確認に選択した構成名をすべて出す", async () => {
        renderConfigList({
            configs: [
                createConfig("config-1", "構成1"),
                createConfig("config-2", "通勤用"),
                createConfig("config-3", "レース用"),
            ],
        })

        fireEvent.click(screen.getByRole("checkbox", {name: "構成1を削除対象に選択"}))
        fireEvent.click(screen.getByRole("checkbox", {name: "通勤用を削除対象に選択"}))
        fireEvent.click(screen.getByRole("checkbox", {name: "レース用を削除対象に選択"}))
        fireEvent.click(screen.getByRole("button", {name: /一括削除/}))

        // 一括削除の確認文
        const description = (await screen.findByText(/を削除します/)).textContent ?? ""

        expect(description).toContain("構成1")
        expect(description).toContain("通勤用")
        expect(description).toContain("レース用")
    })

    // すべて削除すると「構成1」を作り直して初期表示
    it("すべて削除すると構成1を作り直す", async () => {
        const created = createConfig("new-config", "構成1") // 作り直した構成
        const createSpy = vi.fn(async () => created) // 構成作成処理のモック
        const onConfigChange = vi.fn() // 構成変更の通知先モック

        renderConfigList({
            configs: [createConfig("config-1", "構成1")],
            createConfig: createSpy,
            onConfigChange,
            removeConfig: async () => {},
        })

        fireEvent.click(
            screen.getAllByRole("button", {name: "構成1の操作メニュー"})[0],
        )
        fireEvent.click(await screen.findByText("削除"))
        fireEvent.click(await screen.findByText("削除する"))

        await waitFor(() => {
            expect(createSpy).toHaveBeenCalledWith("構成1", [])
        })
        expect(onConfigChange).toHaveBeenCalledWith("new-config")
    })

    // 名前変更ダイアログを開ける
    it("名前変更ダイアログを開く", async () => {
        renderConfigList()

        fireEvent.click(
            screen.getAllByRole("button", {name: "構成1の操作メニュー"})[0],
        )
        fireEvent.click(await screen.findByText("名前変更"))

        expect(await screen.findByText("構成の名前を変更")).toBeTruthy()
    })
})

import type { Locator, Page } from "@playwright/test"

import type { ConfigList } from "../fixtures/pages/ConfigList"
import { resetBrowserState } from "../fixtures/storage"
import { expect, test } from "../fixtures/test"

// 構成一覧の保存キー（simulator-storage.ts のCOLLECTION_STORAGE_KEY）
const COLLECTION_STORAGE_KEY = "barakann-config-collection-v2"
// 構成の上限件数（savedBuilds.ts のMAX_SAVED_BUILDSと同じ値）
const MAX_CONFIGS = 20

// ブラウザ保存へ投入する構成1件
type SeedConfig = {
    id: string // 構成ID（英数字とハイフンのみ）
    name: string // 構成名（1〜50文字）
}

// 新しいブラウザ文脈への構成一覧投入と前回内容の破棄
// 実行順が不定のaddInitScriptを1回にまとめた初期化と投入
async function seedConfigs(page: Page, configs: SeedConfig[]): Promise<void> {
    await page.addInitScript(({ collectionKey, items }) => {
        // リロード時は投入済みの保存内容をそのまま使う
        if (window.sessionStorage.getItem("e2e-configs-seeded") === "1") {
            return
        }

        // 前の表示内容を残さない、投入構成だけの読み込み
        window.localStorage.clear()
        window.sessionStorage.setItem("e2e-configs-seeded", "1")

        // 一覧の表示順キー（config:ID形式）
        const order = items.map((item) => `config:${item.id}`)

        window.localStorage.setItem(
            collectionKey,
            JSON.stringify({
                configs: items.map((item) => ({ ...item, parts: [] })),
                order,
            }),
        )
    }, {
        collectionKey: COLLECTION_STORAGE_KEY,
        items: configs,
    })
}

// 一覧に表示されている構成名のDOM順一覧
async function readVisibleConfigNames(configList: ConfigList): Promise<string[]> {
    const labels = await configList.root
        .locator('button[aria-label$="を並び替え"]')
        .evaluateAll((buttons) => buttons.map((button) =>
            button.getAttribute("aria-label") ?? ""))

    return labels.map((label) => label.replace(/を並び替え$/, ""))
}

// 保存済みの構成名の保存順一覧
async function readStoredConfigNames(page: Page): Promise<string[]> {
    return page.evaluate((collectionKey) => {
        // localStorageに保存された構成一覧
        const raw = window.localStorage.getItem(collectionKey)

        // 未保存なら構成なし
        if (!raw) {
            return []
        }

        const stored = JSON.parse(raw) as {
            configs?: Array<{ name?: unknown } | null>
        }

        // 名前を持つ構成だけを保存順で返す
        return Array.isArray(stored.configs)
            ? stored.configs.flatMap((config) =>
                typeof config?.name === "string" ? [config.name] : [])
            : []
    }, COLLECTION_STORAGE_KEY)
}

// 保存済みの構成のパーツ件数
async function readStoredPartCount(
    page: Page,
    configName: string,
): Promise<number> {
    return page.evaluate(({ collectionKey, name }) => {
        // localStorageに保存された構成一覧
        const raw = window.localStorage.getItem(collectionKey)

        // 未保存ならパーツなし
        if (!raw) {
            return 0
        }

        const stored = JSON.parse(raw) as {
            configs?: Array<{ name?: unknown; parts?: unknown } | null>
        }
        // 対象の構成
        const config = Array.isArray(stored.configs)
            ? stored.configs.find((item) => item?.name === name)
            : undefined

        return config && Array.isArray(config.parts) ? config.parts.length : 0
    }, { collectionKey: COLLECTION_STORAGE_KEY, name: configName })
}

// 保存済みの表示順キーの一覧
async function readStoredOrderKeys(page: Page): Promise<string[]> {
    return page.evaluate((collectionKey) => {
        // localStorageに保存された構成一覧
        const raw = window.localStorage.getItem(collectionKey)

        // 未保存なら表示順なし
        if (!raw) {
            return []
        }

        const stored = JSON.parse(raw) as { order?: unknown }

        // 文字列の表示順キーだけを保存順で返す
        return Array.isArray(stored.order)
            ? stored.order.filter((key): key is string =>
                typeof key === "string")
            : []
    }, COLLECTION_STORAGE_KEY)
}

// スマホ幅でサイドバーを開くためのシミュレーター描画待ち
async function openConfigSidebar(
    page: Page,
    configList: ConfigList,
): Promise<void> {
    // カテゴリー取得後にシミュレーターが描画されるまで待つ
    await expect(page.getByText("選択中の構成", { exact: true })).toBeVisible()
    // スマホ幅のときだけ開くボタンを押す
    await configList.openIfMobile()
    // 構成一覧の読み込み完了を、構成数バッジの表示で待つ
    await expect(configList.countBadge).toHaveText(/^\d+ \/ 20$/)
}

// 上部の選択中構成カード
function activeConfigCard(page: Page): Locator {
    return page.locator('[data-slot="card"]').filter({
        has: page.getByText("選択中の構成", { exact: true }),
    })
}

// 追加ダイアログからの構成作成
async function createConfig(
    page: Page,
    configList: ConfigList,
    name: string,
): Promise<void> {
    await configList.addButton.click()

    // 追加ダイアログ
    const dialog = page.getByRole("dialog", { name: "新しい構成を追加" })
    await expect(dialog).toBeVisible()
    await dialog.getByRole("textbox").fill(name)
    await dialog.getByRole("button", { name: "追加する" }).click()
    // 一覧へ追加されたことを、選択ボタンの表示で待つ
    await expect(configList.savedBuildButton(name)).toBeVisible()
}

// 構成の操作メニューからの項目選択
async function chooseConfigMenu(
    page: Page,
    configName: string,
    itemName: string,
): Promise<void> {
    await page
        .getByRole("button", { name: `${configName}の操作メニュー` })
        .click()
    await page.getByRole("menuitem", { name: itemName, exact: true }).click()
}

// 削除確認ダイアログまでの進行と確定
async function deleteConfig(page: Page, name: string): Promise<void> {
    await chooseConfigMenu(page, name, "削除")

    // 削除確認ダイアログ
    const dialog = page.getByRole("dialog", { name: "構成を削除" })
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "削除する" }).click()
}

// 構成の作成・名前変更・削除・並び替え・自動保存を確認
test.describe("構成の管理", () => {
    // 構成の新規作成・名前変更・削除が保存されることを保証
    test("構成を新規作成・名前変更・削除できる", async ({
        page,
        configList,
        simulatorPage,
    }) => {
        await resetBrowserState(page)
        await simulatorPage.goto()
        await openConfigSidebar(page, configList)

        // 起動時の「構成1」への構成追加
        await expect(configList.countBadge).toHaveText("1 / 20")
        await createConfig(page, configList, "通勤用")
        await expect(configList.countBadge).toHaveText("2 / 20")
        await expect.poll(() => readStoredConfigNames(page)).toEqual([
            "構成1",
            "通勤用",
        ])

        // 追加した構成の名前変更
        await chooseConfigMenu(page, "通勤用", "名前変更")

        // 名前変更ダイアログ
        const renameDialog = page.getByRole("dialog", {
            name: "構成の名前を変更",
        })
        await expect(renameDialog).toBeVisible()
        await renameDialog.getByRole("textbox").fill("週末用")
        await renameDialog.getByRole("button", { name: "変更する" }).click()
        await expect(configList.savedBuildButton("週末用")).toBeVisible()
        await expect.poll(() => readStoredConfigNames(page)).toEqual([
            "構成1",
            "週末用",
        ])

        // 追加した構成の削除と起動時構成だけの残存
        await deleteConfig(page, "週末用")
        await expect(configList.savedBuildButton("週末用")).toBeHidden()
        await expect(configList.countBadge).toHaveText("1 / 20")
        await expect.poll(() => readStoredConfigNames(page)).toEqual([
            "構成1",
        ])
    })

    // dnd-kitのマウス操作による並び替えと保存を保証
    test("構成を並び替えできる", async ({
        page,
        configList,
        simulatorPage,
    }) => {
        await seedConfigs(page, [
            { id: "e2e-config-a", name: "構成A" },
            { id: "e2e-config-b", name: "構成B" },
            { id: "e2e-config-c", name: "構成C" },
        ])
        await simulatorPage.goto()
        await openConfigSidebar(page, configList)

        // 投入した構成の表示順
        await expect(configList.countBadge).toHaveText("3 / 20")
        await expect.poll(() => readVisibleConfigNames(configList)).toEqual([
            "構成A",
            "構成B",
            "構成C",
        ])

        // 先頭の構成Aから1つ下の構成Bへのマウスドラッグ
        const sourceItem = configList.root.locator(
            '[data-slot="sortable-item"][data-value="config:e2e-config-a"]',
        )
        const targetItem = configList.root.locator(
            '[data-slot="sortable-item"][data-value="config:e2e-config-b"]',
        )
        // ドラッグのつかみ手
        const sourceHandle = sourceItem.getByRole("button", {
            name: "構成Aを並び替え",
        })
        await expect(sourceHandle).toBeVisible()
        await expect(targetItem).toBeVisible()

        // サイドバー開閉アニメーション終了までの待機
        await sourceHandle.hover()

        // ドラッグ開始と終了に使う画面上の位置
        const handleBox = await sourceHandle.boundingBox()
        const targetBox = await targetItem.boundingBox()

        // 位置未取得時のドラッグ中止
        if (!handleBox || !targetBox) {
            throw new Error("構成のドラッグ位置を取得できませんでした")
        }

        // dnd-kitのMouseSensorは10px動かすまでドラッグを開始しない
        const startX = handleBox.x + handleBox.width / 2
        const startY = handleBox.y + handleBox.height / 2
        await page.mouse.move(startX, startY)
        await page.mouse.down()
        await page.mouse.move(startX, startY + 12, { steps: 4 })
        // 構成Bの行中央への縦移動とドロップ
        await page.mouse.move(
            startX,
            targetBox.y + targetBox.height / 2,
            { steps: 10 },
        )
        await page.mouse.up()

        // 表示順の更新とlocalStorageへの反映
        await expect.poll(() => readVisibleConfigNames(configList)).toEqual([
            "構成B",
            "構成A",
            "構成C",
        ])
        await expect.poll(() => readStoredOrderKeys(page)).toEqual([
            "config:e2e-config-b",
            "config:e2e-config-a",
            "config:e2e-config-c",
        ])

        // リロード後のDOM順が、保存した表示順（構成B・A・C）と一致する
        await page.reload()
        await openConfigSidebar(page, configList)
        await expect(configList.countBadge).toHaveText("3 / 20")
        await expect.poll(() => readVisibleConfigNames(configList)).toEqual([
            "構成B",
            "構成A",
            "構成C",
        ])
    })

    // パーツ選択の自動保存が構成一覧へ反映されることを保証
    test("パーツ変更を自動保存する", async ({ page, simulatorPage }) => {
        await seedConfigs(page, [
            { id: "e2e-config-save", name: "構成1" },
        ])
        await simulatorPage.goto()

        // 上部カードの構成名による構成読み込み完了の判定
        await expect(
            activeConfigCard(page).getByText("構成1", { exact: true }),
        ).toBeVisible()

        // フレーム候補の先頭のキーボード選択
        const firstCandidate = simulatorPage.candidatePartsTable
            .locator("tbody tr[aria-selected]")
            .first()
        await expect(firstCandidate).toBeVisible()
        await firstCandidate.focus()
        await page.keyboard.press("Enter")
        await expect(firstCandidate).toHaveAttribute("aria-selected", "true")

        // 自動保存の待ち時間後の構成一覧へのパーツ反映
        await expect
            .poll(() => readStoredPartCount(page, "構成1"))
            .toBeGreaterThan(0)

        // 選択したフレームのスロットへのパーツ保存
        const slotKeys = await page.evaluate((collectionKey) => {
            // localStorageに保存された構成一覧
            const raw = window.localStorage.getItem(collectionKey)

            // 未保存ならスロットなし
            if (!raw) {
                return []
            }

            const stored = JSON.parse(raw) as {
                configs?: Array<{ parts?: Array<{ slotKey?: unknown }> }>
            }

            return stored.configs?.[0]?.parts?.flatMap((part) =>
                typeof part.slotKey === "string" ? [part.slotKey] : []) ?? []
        }, COLLECTION_STORAGE_KEY)
        expect(slotKeys).toEqual(["frame"])
    })

    // 保存数が上限の20件に達したら、件数表示と追加不可を保証
    test("構成が上限の20件に達すると追加できない", async ({
        page,
        configList,
        simulatorPage,
    }) => {
        // 上限ちょうどの20件投入
        const configs = Array.from({ length: MAX_CONFIGS }, (_, index) => ({
            id: `e2e-limit-${index + 1}`,
            name: `構成${index + 1}`,
        }))
        await seedConfigs(page, configs)
        await simulatorPage.goto()
        await openConfigSidebar(page, configList)

        // 使用数と一覧件数の上限到達
        await expect(configList.countBadge).toHaveText(
            `${MAX_CONFIGS} / ${MAX_CONFIGS}`,
        )
        await expect(
            configList.root.getByRole("button", { name: /を並び替え$/ }),
        ).toHaveCount(MAX_CONFIGS)
        // 上限に達しているため、追加ボタンは押せない
        await expect(configList.addButton).toBeDisabled()
    })

    // 最後の1件を削除したときに「構成1」が作り直されることを保証
    test("すべての構成を削除すると構成1を作り直す", async ({
        page,
        configList,
        simulatorPage,
    }) => {
        await seedConfigs(page, [
            { id: "e2e-only-config", name: "唯一の構成" },
        ])
        await simulatorPage.goto()
        await openConfigSidebar(page, configList)
        await expect(configList.countBadge).toHaveText("1 / 20")

        // 唯一の構成の削除
        await deleteConfig(page, "唯一の構成")

        // 削除後の初期構成の作り直し
        await expect(configList.savedBuildButton("構成1")).toBeVisible()
        await expect(configList.countBadge).toHaveText("1 / 20")
        await expect.poll(() => readStoredConfigNames(page)).toEqual([
            "構成1",
        ])
    })

    // スマホ幅では閉じたサイドバーを開いて操作できることを保証
    test("画面幅に応じてサイドバーを開いて操作できる", async ({
        page,
        configList,
        simulatorPage,
    }) => {
        await resetBrowserState(page)
        await simulatorPage.goto()
        // カテゴリー取得後にシミュレーターが描画されるまで待つ
        await expect(
            page.getByText("選択中の構成", { exact: true }),
        ).toBeVisible()

        // 画面幅がスマホ相当か
        const isMobile = await page.evaluate(() =>
            window.matchMedia("(max-width: 767px)").matches)

        // スマホ幅でのサイドバー開放後の操作
        if (isMobile) {
            await expect(configList.openTrigger).toBeVisible()
            await expect(configList.root).toBeHidden()
            await configList.openTrigger.click()
            await expect(configList.root).toBeVisible()
        } else {
            // デスクトップ幅でのサイドバー常時表示
            await expect(configList.openTrigger).toBeHidden()
            await expect(configList.root).toBeVisible()
        }

        // 開いた一覧からの構成追加
        await createConfig(page, configList, "サイドバー確認")
        await expect(
            configList.savedBuildButton("サイドバー確認"),
        ).toBeVisible()
    })
})

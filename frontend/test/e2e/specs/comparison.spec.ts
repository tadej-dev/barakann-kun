import type { Locator, Page } from "@playwright/test"

import type { ConfigList } from "../fixtures/pages/ConfigList"
import type { SimulatorPage } from "../fixtures/pages/SimulatorPage"
import { expect, test } from "../fixtures/test"

// localStorageへ入れる構成のパーツ（保存形式はlib/simulator-storage.tsと同じ）
type SeedPart = {
    slotKey: string // 選択枠のキー
    partId: number // パーツID
    price: number // 保存時点の価格（円）
    weight: number // 保存時点の重量（g）
}

// localStorageへ入れる構成
type SeedConfig = {
    id: string // 構成ID
    name: string // 構成名
    parts: SeedPart[] // 構成内のパーツ
}

const COLLECTION_STORAGE_KEY = "barakann-config-collection-v2" // 構成一覧の保存キー

const COMMUTE_CONFIG: SeedConfig = {
    id: "e2e-compare-commute",
    name: "通勤用",
    parts: [{ slotKey: "handlebar", partId: 48, price: 6660, weight: 304 }],
} // 比較する1件目の構成（ハンドルのみ）

const RACE_CONFIG: SeedConfig = {
    id: "e2e-compare-race",
    name: "レース用",
    parts: [{ slotKey: "wheel", partId: 93, price: 129000, weight: 1612 }],
} // 比較する2件目の構成（ホイールのみ）

// 比較できないことを示す案内文
const NEED_TWO_CONFIGS_MESSAGE = "比較する構成を2件以上選択してください"

// 比較用パーツの読み込み中表示
const COMPARISON_LOADING_MESSAGE = /比較データを読み込んでいます/

// 構成をlocalStorageへ保存し、比較用の2件を用意
async function seedComparisonConfigs(page: Page): Promise<void> {
    // 前のテストのセッションCookieを消して未ログイン状態にする
    await page.context().clearCookies()
    await page.addInitScript(
        (seed) => {
            // 前のテストの保存内容を消してから比較用の構成一覧を入れる
            window.localStorage.clear()
            window.sessionStorage.clear()
            window.localStorage.setItem(seed.key, JSON.stringify({
                configs: seed.configs,
                order: seed.configs.map((config) => `config:${config.id}`),
            }))
        },
        {
            key: COLLECTION_STORAGE_KEY,
            configs: [COMMUTE_CONFIG, RACE_CONFIG],
        },
    )
}

// 比較ダイアログを開き、表示されたダイアログを返す
async function openComparisonDialog(
    page: Page,
    configList: ConfigList,
    simulatorPage: SimulatorPage,
): Promise<Locator> {
    await page.goto("/")
    await expect(simulatorPage.activeConfigCard).toBeVisible()
    // スマホ幅ではサイドバーを開いてから比較ボタンを押す
    await configList.openIfMobile()
    await expect(configList.comparisonButton).toBeEnabled()
    await configList.comparisonButton.click()

    // 見出し「構成を比較」を含む比較ダイアログ
    const dialog = page.getByRole("dialog").filter({ hasText: "構成を比較" })
    await expect(dialog).toBeVisible()

    return dialog
}

// 構成名から比較対象のチェックボックスを取得
function buildToggle(dialog: Locator, name: string): Locator {
    return dialog.locator("label").filter({ hasText: name }).getByRole("checkbox")
}

// 日本円の表示書式（比較ダイアログの合計金額と同じ）
const currencyFormatter = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
})

// 比較ダイアログの選択操作と表示を確認
test.describe("構成の比較", () => {
    // 2件の構成をパーツ名・合計金額・重量で比較できることを保証
    test("パーツ名・合計金額・重量を比較する", async ({
        page,
        configList,
        simulatorPage,
    }) => {
        await seedComparisonConfigs(page)
        const dialog = await openComparisonDialog(
            page,
            configList,
            simulatorPage,
        )
        // 比較結果の表
        const table = dialog.locator("table")

        // 構成名を見出しとして並べる
        await expect(table.getByRole("columnheader", {
            name: COMMUTE_CONFIG.name,
        })).toBeVisible()
        await expect(table.getByRole("columnheader", {
            name: RACE_CONFIG.name,
        })).toBeVisible()

        // 合計金額は保存時点の金額になる
        const priceRow = table.locator("tbody tr").filter({
            hasText: "合計金額",
        })
        await expect(priceRow.locator("td")).toHaveText([
            currencyFormatter.format(COMMUTE_CONFIG.parts[0].price),
            currencyFormatter.format(RACE_CONFIG.parts[0].price),
        ])

        // 完成重量は保存時点の重量になる（付属品重量はなし）
        const weightRow = table.locator("tbody tr").filter({
            hasText: "完成重量",
        })
        await expect(weightRow.locator("td")).toHaveText([
            `${COMMUTE_CONFIG.parts[0].weight.toLocaleString("ja-JP")} g`,
            `${RACE_CONFIG.parts[0].weight.toLocaleString("ja-JP")} g`,
        ])

        // ハンドル・ホイールのパーツ名を各構成の列に表示
        const handlebarRow = table.locator("tbody tr").filter({
            hasText: "ハンドル",
        })
        await expect(handlebarRow.locator("td").first())
            .toContainText("Deda Zero1 RHM Handlebar")
        const wheelRow = table.locator("tbody tr").filter({
            hasText: "ホイール",
        })
        await expect(wheelRow.locator("td").nth(1))
            .toContainText("WH-RS710-C46-TL Wheelset")

        // 選択を1件に減らすと2件以上を促すメッセージが出る
        const raceToggle = buildToggle(dialog, RACE_CONFIG.name)
        // 比較対象の読み込みが終わってから選択を減らす
        await expect(dialog.getByRole("columnheader", {
            name: COMMUTE_CONFIG.name,
        })).toBeVisible()
        // 1件分の再取得が終わるまで待つための応答待ち
        const reloadResponse = page.waitForResponse((response) => {
            // 応答の成否とURLのパス・取得するパーツID
            const url = new URL(response.url())

            return response.ok() &&
                url.pathname.endsWith("/api/parts/by-ids") &&
                url.searchParams.getAll("ids").join(",") === "48"
        })
        await raceToggle.click()
        await expect(raceToggle).toHaveAttribute("aria-checked", "false")
        await expect(dialog.getByText(NEED_TWO_CONFIGS_MESSAGE)).toBeVisible()
        // 再取得の完了後に読み込み表示が残らない
        await reloadResponse
        await expect(dialog.getByText(COMPARISON_LOADING_MESSAGE)).toHaveCount(0)
    })

    // 比較中に選択を0件にしても読み込み表示が消えることを保証
    test("選択を0件にすると読み込み表示が消える", async ({
        page,
        configList,
        simulatorPage,
    }) => {
        await seedComparisonConfigs(page)

        // 保留中の比較用リクエストを解放する関数
        let releaseHeldRequests: (() => void) | undefined
        // 解放まで取得を待たせるためのゲート
        const heldRequestGate = new Promise<void>((resolve) => {
            releaseHeldRequests = resolve
        })

        // 比較用パーツの取得を保留し、読み込み表示が続く状態にする
        await page.route("**/api/parts/by-ids*", async (route) => {
            await heldRequestGate
            // 中断済みのリクエストは応答できないため失敗を無視
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: "[]",
            }).catch(() => undefined)
        })

        const dialog = await openComparisonDialog(
            page,
            configList,
            simulatorPage,
        )
        // 取得が終わらない間は読み込み表示が出る
        await expect(dialog.getByText(COMPARISON_LOADING_MESSAGE)).toBeVisible()

        // 1件に減らしても取得は保留のままで、メッセージだけが出る
        await buildToggle(dialog, RACE_CONFIG.name).click()
        await expect(dialog.getByText(NEED_TWO_CONFIGS_MESSAGE)).toBeVisible()

        // 0件にすると保留中の取得があっても読み込み表示が消える
        await buildToggle(dialog, COMMUTE_CONFIG.name).click()
        await expect(dialog.getByText(COMPARISON_LOADING_MESSAGE)).toHaveCount(0)
        await expect(dialog.getByText(NEED_TWO_CONFIGS_MESSAGE)).toBeVisible()

        // 保留した取得を解放し、ルートの差し替えを外す
        releaseHeldRequests?.()
        await page.unroute("**/api/parts/by-ids*")
    })
})

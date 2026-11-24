import type { Locator, Page } from "@playwright/test"

import type { ConfigList } from "../fixtures/pages/ConfigList"
import { resetBrowserState } from "../fixtures/storage"
import { expect, test } from "../fixtures/test"

// 構成一覧の保存キー（simulator-storage.ts のCOLLECTION_STORAGE_KEY）
const COLLECTION_STORAGE_KEY = "barakann-config-collection-v2"
// 構成名の最大文字数（configRules.ts のMAX_BUILD_NAME_LENGTHと同じ値）
const MAX_CONFIG_NAME_LENGTH = 50

// ブラウザ保存へ投入する構成1件
type SeedConfig = {
    id: string // 構成ID（英数字とハイフンのみ）
    name: string // 構成名（1〜50文字）
}

// seedConfigsへ渡す投入条件
type SeedOptions = {
    failCollectionSave: boolean // 読み込み後の構成一覧の保存を失敗させるか
}

// 新しいブラウザ文脈への構成一覧投入と前回内容の破棄
// 実行順が不定のaddInitScriptを1回にまとめた初期化と保存失敗の設定
async function seedConfigs(
    page: Page,
    configs: SeedConfig[],
    options: SeedOptions = { failCollectionSave: false },
): Promise<void> {
    await page.addInitScript(({ collectionKey, items, failCollectionSave }) => {
        // 前の表示内容を残さない、投入構成だけの読み込み
        window.localStorage.clear()

        // 一覧の表示順キー（config:ID形式）
        const order = items.map((item) => `config:${item.id}`)

        window.localStorage.setItem(
            collectionKey,
            JSON.stringify({
                configs: items.map((item) => ({ ...item, parts: [] })),
                order,
            }),
        )

        // 保存失敗の再現指定があるときだけ、投入後の保存を失敗させる設定
        if (failCollectionSave) {
            // 元のsetItem（構成一覧以外の保存に使う）
            const originalSetItem = Storage.prototype.setItem

            Storage.prototype.setItem = function (
                this: Storage,
                key: string,
                value: string,
            ) {
                // 構成一覧だけを容量超過とする失敗設定
                if (key === collectionKey) {
                    throw new DOMException(
                        "保存領域が不足しています",
                        "QuotaExceededError",
                    )
                }

                originalSetItem.call(this, key, value)
            }
        }
    }, {
        collectionKey: COLLECTION_STORAGE_KEY,
        items: configs,
        failCollectionSave: options.failCollectionSave,
    })
}

// スマホ幅でサイドバーを開くためのシミュレーター描画待ち
async function openConfigSidebar(
    page: Page,
    configList: ConfigList,
): Promise<void> {
    // カテゴリー取得後のシミュレーター描画待ち
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

// エラー表示・入力検証・通信失敗からの復旧導線を確認
test.describe("構成のエラー表示", () => {
    // ブラウザ保存の失敗が自動保存のエラーとして表示されることを保証
    test("ブラウザ保存に失敗すると自動保存のエラーを表示する", async ({
        page,
        configList,
        simulatorPage,
    }) => {
        // 構成一覧だけ保存失敗とした自動保存エラーの再現
        await seedConfigs(page, [
            { id: "e2e-save-failure", name: "構成1" },
        ], { failCollectionSave: true })
        await simulatorPage.goto()

        // 上部カードの構成名による構成読み込み完了の判定
        await expect(
            activeConfigCard(page).getByText("構成1", { exact: true }),
        ).toBeVisible()

        // フレーム候補の先頭選択による自動保存の発生
        const firstCandidate = simulatorPage.candidatePartsTable
            .locator("tbody tr[aria-selected]")
            .first()
        await expect(firstCandidate).toBeVisible()
        await firstCandidate.focus()
        await page.keyboard.press("Enter")

        // スマホ幅でのサイドバー開放と通知確認
        await configList.openIfMobile()

        // 保存領域の失敗の利用者向けメッセージ表示
        const alert = configList.root.getByRole("alert")
        await expect(alert).toBeVisible()
        await expect(alert).toContainText("構成を保存できませんでした")
    })

    // 構成名の空文字と50文字超が保存できないことを保証
    test("構成名が空・50文字超のときは保存できない", async ({
        page,
        configList,
        simulatorPage,
    }) => {
        await resetBrowserState(page)
        await simulatorPage.goto()
        await openConfigSidebar(page, configList)
        await configList.addButton.click()

        // 追加ダイアログの入力欄・確定ボタン
        const dialog = page.getByRole("dialog", {
            name: "新しい構成を追加",
        })
        await expect(dialog).toBeVisible()
        // 構成名の入力欄
        const nameInput = dialog.getByRole("textbox")
        // 追加確定ボタン
        const confirmButton = dialog.getByRole("button", {
            name: "追加する",
        })

        // 空文字は1文字以上に満たないため追加できない
        await nameInput.fill("")
        await expect(nameInput).toHaveAttribute("aria-invalid", "true")
        await expect(confirmButton).toBeDisabled()
        await expect(dialog.getByText("0 / 50文字")).toBeVisible()

        // 50文字ちょうどの受け付け
        await nameInput.fill("あ".repeat(MAX_CONFIG_NAME_LENGTH))
        await expect(nameInput).toHaveAttribute("aria-invalid", "false")
        await expect(confirmButton).toBeEnabled()

        // 50文字を超えると追加できない
        // maxlengthでは51文字を入力できないため、属性を外した検証
        await nameInput.evaluate((element) =>
            element.removeAttribute("maxlength"))
        await nameInput.fill("あ".repeat(MAX_CONFIG_NAME_LENGTH + 1))
        await expect(nameInput).toHaveAttribute("aria-invalid", "true")
        await expect(confirmButton).toBeDisabled()
        await expect(dialog.getByText("51 / 50文字")).toBeVisible()
    })

    // 一覧の取得失敗で再読み込みの導線が表示されることを保証
    test("保存構成の取得に失敗すると再読み込み導線を表示する", async ({
        page,
        auth,
        configList,
        simulatorPage,
    }) => {
        await resetBrowserState(page)
        // ログイン後の一覧取得の通信失敗設定
        await page.route("**/api/builds", (route) => route.abort("failed"))
        await simulatorPage.goto()
        await auth.login()

        // カテゴリー取得後のシミュレーター描画待ち
        await expect(simulatorPage.activeConfigCard).toBeVisible()
        await configList.openIfMobile()

        // 一覧取得失敗時の再読み込みボタン付き通知
        const alert = configList.root.getByRole("alert")
        await expect(alert).toBeVisible()
        // 取得し直すための再読み込みボタン
        const retryButton = alert.getByRole("button", {
            name: "再読み込み",
        })
        await expect(retryButton).toBeVisible()

        // 通信復旧後の再読み込みによる初期構成の取得
        await page.unroute("**/api/builds")
        await retryButton.click()
        // 取得できた一覧の件数が1件以上になる
        await expect(configList.countBadge).toHaveText(/^[1-9]\d* \/ 20$/)
        await expect(alert).toBeHidden()
    })

    // セッションAPIが401を返したとき、ログイン導線が残ることを保証
    test("セッションが401のときはログイン導線を表示する", async ({
        page,
        header,
        simulatorPage,
    }) => {
        await resetBrowserState(page)
        // セッション切れを再現するための401応答
        await page.route("**/api/auth/session", (route) =>
            route.fulfill({
                status: 401,
                contentType: "application/json",
                body: JSON.stringify({
                    error: { message: "ログインが必要です" },
                }),
            }))

        await simulatorPage.goto()

        // 認証エラー時にも再ログインできるログイン導線
        await expect(header.loginButton).toBeVisible()
        // 認証エラー案内の画面表示
        await expect(page.getByRole("alert").first()).toContainText(
            "ログインが必要です",
        )
    })
})

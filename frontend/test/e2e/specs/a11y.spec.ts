import type { Locator, Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

import type { Header } from "../fixtures/pages/Header"
import { resetBrowserState } from "../fixtures/storage"
import { expect, test } from "../fixtures/test"

// 重大なアクセシビリティ違反として扱う影響度
const SERIOUS_IMPACTS = new Set(["serious", "critical"])

// 引き継ぎダイアログ用の構成一覧の保存キー
const COLLECTION_STORAGE_KEY = "barakann-config-collection-v2"

// 検査対象の固定ページ
type A11yPage = {
    name: string // レポートに出すページ名
    path: string // 開くURL
    heading: string | null // 固定ページのh1見出し（トップはnull）
}

// 重大な違反を確認するページ
const a11yPages: A11yPage[] = [
    { name: "トップ", path: "/", heading: null },
    { name: "使い方", path: "/guide", heading: "使い方" },
    { name: "利用規約", path: "/terms", heading: "利用規約" },
    {
        name: "プライバシーポリシー",
        path: "/privacy",
        heading: "プライバシーポリシー",
    },
]

// 影響度が重大以上か判定
function isSeriousImpact(impact: string | null | undefined): boolean {
    // 影響度が未設定なら重大違反として扱わない
    if (!impact) {
        return false
    }

    return SERIOUS_IMPACTS.has(impact)
}

// 現在の画面に重大なアクセシビリティ違反が無いことを確認
async function expectNoSeriousViolations(
    page: Page,
    label: string,
): Promise<void> {
    // axeで現在の画面を解析
    const results = await new AxeBuilder({ page }).analyze()
    // 影響度が重大以上の違反だけ残す
    const seriousViolations = results.violations.filter((violation) =>
        isSeriousImpact(violation.impact))
    // 失敗時に原因を特定できるよう、ルールIDと対象要素をまとめる
    const violationSummary = seriousViolations.map((violation) =>
        `${violation.id}: ${
            violation.nodes.map((node) => node.target.join(" ")).join(", ")
        }`)

    // 重大な違反が無いことを確認
    expect(
        violationSummary,
        `${label}に重大なアクセシビリティ違反があります`,
    ).toEqual([])
}

// 候補パーツ表にデータ行（2セル以上）が表示されるまで待つ
async function waitForCandidateDataRows(page: Page): Promise<void> {
    // 読み込み中・空状態の行は1セルなので、複数セルの行を待つ
    await expect.poll(
        () => page.getByRole("table", { name: "候補パーツ一覧" })
            .locator("tbody tr").first().locator("td").count(),
    ).toBeGreaterThan(1)
}

// ブラウザ構成をアカウントへ引き継ぐダイアログ
function migrationDialog(page: Page): Locator {
    return page.locator(
        '[role="dialog"][aria-labelledby="saved-build-migration-title"]',
    )
}

// ログアウト時の構成保存ダイアログ
function logoutSaveDialog(page: Page): Locator {
    return page.locator('[role="dialog"][aria-labelledby="logout-save-title"]')
}

// アカウント削除ダイアログ
function accountDeleteDialog(page: Page): Locator {
    return page.locator(
        '[role="alertdialog"][aria-labelledby="account-delete-title"]',
    )
}

// 引き継ぎダイアログが出るよう、パーツ付きの構成をブラウザへ保存
async function seedMigrationConfig(page: Page): Promise<void> {
    // Cookieと保存領域を消し、未ログインの初期状態へ戻す
    await resetBrowserState(page)
    await page.addInitScript((key) => {
        // 前のテストの保存内容を消してから、パーツ付きの構成を入れる
        window.localStorage.clear()
        window.localStorage.setItem(key, JSON.stringify({
            configs: [{
                id: "e2e-a11y-migration",
                name: "移行対象",
                parts: [{
                    slotKey: "wheel",
                    partId: 93,
                    price: 129000,
                    weight: 1612,
                }],
            }],
            order: ["config:e2e-a11y-migration"],
        }))
    }, COLLECTION_STORAGE_KEY)
    await page.goto("/")
}

// アカウントメニューをキーボードで開き、指定項目をフォーカスする
async function focusAccountMenuItem(
    page: Page,
    header: Header,
    label: string,
): Promise<Locator> {
    // メニューをキーボードで開く
    await header.accountMenuButton.focus()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("menu")).toBeVisible()

    // 操作するメニュー項目
    const item = page.getByRole("menuitem", { name: label })

    // 項目にフォーカスが移るまで矢印キーで移動（メニュー項目は3件）
    for (let index = 0; index < 3; index += 1) {
        // 対象項目にフォーカス済みなら移動を止める
        if (await item.evaluate(
            (element) => element === document.activeElement,
        )) {
            break
        }

        await page.keyboard.press("ArrowDown")
    }

    await expect(item).toBeFocused()

    return item
}

// 固定ページごとに重大なアクセシビリティ違反が無いことを確認
for (const a11yPage of a11yPages) {
    // 対象ページを開き、表示が整ってからaxeで検査
    test(`${a11yPage.name}ページに重大なアクセシビリティ違反が無い`, async ({
        page,
    }) => {
        // 対象ページを開く
        await page.goto(a11yPage.path)

        // 固定ページは見出しの表示を待つ
        if (a11yPage.heading) {
            await expect(
                page.getByRole("heading", {
                    name: a11yPage.heading,
                    level: 1,
                }),
            ).toBeVisible()
        } else {
            // トップはシミュレーターの一覧の表示後に検査
            await expect(
                page.getByRole("table", { name: "選択済みパーツ一覧" }),
            ).toBeVisible()
            // 読み込み中の行ではなく、候補のデータ行が出るまで待つ
            await waitForCandidateDataRows(page)
        }

        // 重大な違反が無いことを確認
        await expectNoSeriousViolations(page, `${a11yPage.name}ページ`)
    })
}

// ヘッダーメニューを開いた状態でも重大な違反が無いことを確認
test("ヘッダーメニュー展開後も重大な違反が無い", async ({
    page,
    header,
}) => {
    // トップページを開く
    await page.goto("/")
    // シミュレーターの一覧が表示されるまで待つ
    await expect(
        page.getByRole("table", { name: "選択済みパーツ一覧" }),
    ).toBeVisible()
    // 読み込み中の行ではなく、候補のデータ行が出るまで待つ
    await waitForCandidateDataRows(page)

    // ヘッダーの三本線メニューを開く
    await header.openSiteMenu()
    // メニュー項目の表示後に検査
    await expect(
        page.getByRole("menuitem", { name: "使い方" }),
    ).toBeVisible()

    // メニュー展開後の画面に重大な違反が無いことを確認
    await expectNoSeriousViolations(
        page,
        "ヘッダーメニュー展開後のトップページ",
    )
})

// 引き継ぎダイアログをキーボードだけで操作できることを確認
test("引き継ぎダイアログをキーボードで操作できる", async ({ page, auth }) => {
    // パーツ付きのブラウザ構成を用意し、ログイン後に引き継ぎダイアログを出す
    await seedMigrationConfig(page)
    await auth.login()

    // 引き継ぎダイアログ
    const dialog = migrationDialog(page)
    await expect(dialog).toBeVisible({ timeout: 20_000 })

    // 開いた直後はダイアログへフォーカスが移る
    await expect(dialog).toBeFocused()

    // Tabで先頭の閉じるボタンへ移る
    await page.keyboard.press("Tab")
    // 閉じるボタン
    const closeButton = dialog.getByRole("button", {
        name: "移行ダイアログを閉じる",
    })
    await expect(closeButton).toBeFocused()

    // Shift+Tabで末尾の保存ボタンへ折り返す
    await page.keyboard.press("Shift+Tab")
    await expect(
        dialog.getByRole("button", { name: "選択した構成を保存" }),
    ).toBeFocused()

    // Tabで先頭の閉じるボタンへ折り返す
    await page.keyboard.press("Tab")
    await expect(closeButton).toBeFocused()

    // Escapeでダイアログを閉じる
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    // 自動表示で開く前の操作要素が無いため、フォーカスは本文へ戻る
    await expect(page.locator("body")).toBeFocused()
})

// ログアウト保存ダイアログをキーボードだけで操作できることを確認
test("ログアウト保存ダイアログをキーボードで操作できる", async ({
    page,
    header,
    auth,
}) => {
    await page.goto("/")
    await auth.login()

    // 保存に失敗させ、閉じた後にアカウントメニューへ戻れる状態にする
    await page.route("**/api/builds", async (route) => {
        // 一覧取得だけを失敗させる
        if (route.request().method() !== "GET") {
            await route.continue()
            return
        }

        await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
                error: {
                    code: "E2E_A11Y_FAILURE",
                    message: "E2Eテスト用の保存失敗",
                },
            }),
        })
    })

    // アカウントメニューからログアウトし、保存失敗ダイアログを出す
    await focusAccountMenuItem(page, header, "ログアウト")
    await page.keyboard.press("Enter")

    // ログアウト保存ダイアログ
    const dialog = logoutSaveDialog(page)
    await expect(
        dialog.getByText("構成を保存できませんでした", { exact: true }),
    ).toBeVisible()

    // 開いた直後はダイアログへフォーカスが移る
    await expect(dialog).toBeFocused()

    // Tabで先頭のキャンセルへ移る
    await page.keyboard.press("Tab")
    // キャンセルボタン
    const cancelButton = dialog.getByRole("button", { name: "キャンセル" })
    await expect(cancelButton).toBeFocused()

    // Shift+Tabで末尾の再試行へ折り返す
    await page.keyboard.press("Shift+Tab")
    await expect(
        dialog.getByRole("button", { name: "再試行" }),
    ).toBeFocused()

    // Tabで先頭のキャンセルへ折り返す
    await page.keyboard.press("Tab")
    await expect(cancelButton).toBeFocused()

    // Escapeで保存処理を取り消して閉じる
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    // 閉じた後はメニューを開いたアカウントメニューへフォーカスが戻る
    await expect(header.accountMenuButton).toBeFocused()
})

// アカウント削除ダイアログをキーボードだけで操作できることを確認
test("アカウント削除ダイアログをキーボードで操作できる", async ({
    page,
    header,
    auth,
}) => {
    await page.goto("/")
    await auth.login()

    // アカウントメニューから削除ダイアログを出す
    await focusAccountMenuItem(page, header, "アカウントを削除")
    await page.keyboard.press("Enter")

    // アカウント削除ダイアログ
    const dialog = accountDeleteDialog(page)
    await expect(dialog).toBeVisible()

    // 開いた直後はダイアログへフォーカスが移る
    await expect(dialog).toBeFocused()

    // Tabで先頭の閉じるボタンへ移る
    await page.keyboard.press("Tab")
    // 閉じるボタン
    const closeButton = dialog.getByRole("button", {
        name: "アカウント削除ダイアログを閉じる",
    })
    await expect(closeButton).toBeFocused()

    // Shift+Tabで末尾の削除ボタンへ折り返す
    await page.keyboard.press("Shift+Tab")
    await expect(
        dialog.getByRole("button", { name: "アカウントを削除" }),
    ).toBeFocused()

    // Tabで先頭の閉じるボタンへ折り返す
    await page.keyboard.press("Tab")
    await expect(closeButton).toBeFocused()

    // Escapeで削除を取り消して閉じる
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    // 閉じた後はメニューを開いたアカウントメニューへフォーカスが戻る
    await expect(header.accountMenuButton).toBeFocused()
})

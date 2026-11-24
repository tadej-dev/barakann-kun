import type { Locator, Page } from "@playwright/test"

import type { ConfigList } from "../fixtures/pages/ConfigList"
import { expect, test } from "../fixtures/test"

// ログアウト時の構成保存ダイアログ
function logoutSaveDialog(page: Page): Locator {
    return page.locator('[role="dialog"][aria-labelledby="logout-save-title"]')
}

// 上部の「選択中の構成」カードに表示された構成名
function activeConfigNameCard(page: Page): Locator {
    return page.locator('[data-slot="card"]')
        .filter({ has: page.getByText("選択中の構成", { exact: true }) })
        .locator("p[title]")
}

// アカウントの保存構成のうち、削除に使う項目
type AccountBuildSummary = {
    id: string // 構成ID
    version: number // 楽観ロック用の版番号
}

// 保存構成一覧のJSONから、検証済みの項目を取り出す
function parseAccountBuilds(value: unknown): AccountBuildSummary[] {
    // 配列以外は保存構成一覧として扱えない
    if (!Array.isArray(value)) {
        throw new Error("保存構成一覧を取得できませんでした")
    }

    return value.map((build) => {
        // 構成1件分の保存内容
        const record = build as Record<string, unknown>

        // ID・版がそろわない構成は削除に使えない
        if (
            typeof record.id !== "string" ||
            typeof record.version !== "number"
        ) {
            throw new Error("保存構成の項目を取得できませんでした")
        }

        return {
            id: record.id,
            version: record.version,
        }
    })
}

// アカウントの保存構成をすべて削除し、前のテストの残りを消す
async function clearAccountBuilds(page: Page): Promise<void> {
    // CSRFトークン取得の応答
    const csrfResponse = await page.request.get("/api/auth/csrf")
    expect(csrfResponse.ok()).toBe(true)
    // CSRFトークンを含む応答
    const csrfPayload = await csrfResponse.json() as { csrfToken?: unknown }

    // トークンが無い場合は構成を削除できない
    if (typeof csrfPayload.csrfToken !== "string") {
        throw new Error("CSRFトークンを取得できませんでした")
    }

    // 保存構成一覧の応答
    const buildsResponse = await page.request.get("/api/builds")
    expect(buildsResponse.ok()).toBe(true)
    // 削除対象の構成
    const builds = parseAccountBuilds(await buildsResponse.json())

    for (const build of builds) {
        // 版一致を条件に1件削除
        const deleteResponse = await page.request.delete(
            `/api/builds/${encodeURIComponent(build.id)}`,
            {
                data: {
                    version: build.version,
                    csrfToken: csrfPayload.csrfToken,
                },
            },
        )
        expect(deleteResponse.ok()).toBe(true)
    }
}

// アカウントに空の初期構成を用意
async function ensureInitialAccountConfig(page: Page): Promise<void> {
    // 構成が無ければサーバーが空の初期構成を作成
    const response = await page.request.get("/api/builds")
    expect(response.ok()).toBe(true)
}

// 候補パーツ一覧の先頭（最初のフレーム）を選択
async function selectFirstFrame(page: Page): Promise<void> {
    // 候補パーツ一覧
    const candidateTable = page.getByRole("table", { name: "候補パーツ一覧" })
    // 先頭の候補行
    const firstRow = candidateTable.locator("tbody tr").first()

    await expect(firstRow).toBeVisible()
    // 行内のバリエーション操作と競合しないよう、キーボードで選択
    await firstRow.focus()
    await page.keyboard.press("Enter")
    // 選択内容が候補行へ反映されたことを確認
    await expect(firstRow).toHaveAttribute("aria-selected", "true")
}

// 現在のパーツ選択を複製して新しい構成を追加
async function addConfigFromCurrentParts(
    page: Page,
    configList: ConfigList,
    name: string,
): Promise<void> {
    // スマホ幅のときだけ構成一覧を開く
    await configList.openIfMobile()
    await configList.addButton.click()

    // 構成の追加ダイアログ
    const addDialog = page.getByRole("dialog", { name: "新しい構成を追加" })
    await expect(addDialog).toBeVisible()
    await addDialog.getByRole("textbox").fill(name)
    await addDialog.getByRole("button", { name: "追加する" }).click()
    // 一覧へ追加されたことを、選択ボタンの表示で待つ
    await expect(configList.savedBuildButton(name)).toBeVisible()
    // 追加ダイアログが閉じるまで待ち、キー操作の対象を構成一覧だけにする
    await expect(addDialog).toBeHidden()
}

// スマホ幅の構成一覧シートを閉じ、ヘッダーを操作できる状態へ戻す
async function closeMobileSidebar(page: Page): Promise<void> {
    // シート内のフォーカスごとEscapeで閉じる（デスクトップでは影響なし）
    await page.keyboard.press("Escape")
}

// localStorageに保存された構成のパーツ数を返す
async function readLocalPartCount(page: Page, name: string): Promise<number> {
    return page.evaluate((configName) => {
        // localStorageに保存された構成一覧
        const raw = window.localStorage.getItem("barakann-config-collection-v2")

        // 未保存ならパーツなし
        if (!raw) {
            return 0
        }

        // 保存済みJSONのうち構成一覧だけを使う
        const stored = JSON.parse(raw) as { configs?: unknown }
        // 配列でない場合は構成なしとして扱う
        const configs = Array.isArray(stored.configs) ? stored.configs : []
        // 対象の構成
        const config = configs.find((candidate) =>
            (candidate as { name?: unknown }).name === configName)

        // 構成が見つからない、またはパーツが配列でない場合は0
        if (!config || !Array.isArray(config.parts)) {
            return 0
        }

        return config.parts.length
    }, name)
}

// ログアウト時の構成保存と失敗時の復旧を確認
test.describe("ログアウト時の構成保存", () => {
    // 保存中の案内から完了まで表示し、未ログイン一覧への引き継ぎを保証
    test("構成を保存してログアウトする", async ({
        page,
        header,
        configList,
        auth,
    }) => {
        // 画面更新と構成作成を含むため、上限時間を延ばす
        test.slow()
        await page.goto("/")
        await auth.login()

        // 前のテストの構成を消し、空の初期構成から始める
        await clearAccountBuilds(page)
        // 並び順の取得が空にならないよう、初期構成を用意
        await ensureInitialAccountConfig(page)
        await page.reload()
        await expect(header.accountMenuButton).toBeVisible({
            timeout: 20_000,
        })
        await expect(activeConfigNameCard(page)).toHaveText("構成1")

        // 選択したフレームが自動保存されるまで待つ
        const autoSaveResponse = page.waitForResponse((response) => {
            // 構成の上書きAPIの応答か
            return response.request().method() === "PUT" &&
                new URL(response.url()).pathname.startsWith("/api/builds/")
        })
        await selectFirstFrame(page)
        await autoSaveResponse

        // 保存対象として構成を1件作る
        await addConfigFromCurrentParts(page, configList, "ログアウト構成")
        // サイドバーを閉じ、ヘッダーを操作できる状態へ戻す
        await closeMobileSidebar(page)

        // 保存中の表示を確認できるよう、一覧取得の応答を保留する
        let releaseBuildsResponse: (() => void) | undefined
        // 保留を解除するまで待つPromise
        const heldBuildsResponse = new Promise<void>((resolve) => {
            releaseBuildsResponse = resolve
        })
        await page.route("**/api/builds", async (route) => {
            // 一覧取得だけを保留する
            if (route.request().method() !== "GET") {
                await route.continue()
                return
            }

            await heldBuildsResponse
            await route.continue()
        })

        // アカウントメニューからログアウトを開始
        await header.openAccountMenu()
        await page.getByRole("menuitem", { name: "ログアウト" }).click()
        // 保存中ダイアログ
        const dialog = logoutSaveDialog(page)
        await expect(
            dialog.getByText("構成を保存しています", { exact: true }),
        ).toBeVisible()

        // 保留した一覧取得を再開すると保存が完了する
        releaseBuildsResponse?.()
        await expect(
            dialog.getByText("構成を保存しました", { exact: true }),
        ).toBeVisible()
        await dialog.getByRole("button", { name: "閉じる" }).click()
        // ログアウトしてログイン導線へ戻る
        await expect(header.loginButton).toBeVisible()

        // 未ログインの構成一覧へ、作成した構成が保存される
        await configList.openIfMobile()
        await expect(configList.countBadge).toHaveText("2 / 20")
        await expect(
            configList.savedBuildButton("ログアウト構成"),
        ).toBeVisible()
        // 構成のパーツ内容も引き継がれる
        await expect.poll(() => readLocalPartCount(page, "ログアウト構成"))
            .toBe(1)
    })

    // 保存失敗から再試行し、保存とログアウトを完了できることを保証
    test("保存に失敗しても再試行でログアウトできる", async ({
        page,
        header,
        auth,
    }) => {
        await page.goto("/")
        await auth.login()

        // 前のテストの構成を消し、空の初期構成から始める
        await clearAccountBuilds(page)
        // 並び順の取得が空にならないよう、初期構成を用意
        await ensureInitialAccountConfig(page)
        await page.reload()
        await expect(header.accountMenuButton).toBeVisible({
            timeout: 20_000,
        })
        await expect(activeConfigNameCard(page)).toHaveText("構成1")

        // 自動保存の完了を待ち、ログアウト時の保存処理を安定させる
        const autoSaveResponse = page.waitForResponse((response) => {
            // 構成の上書きAPIの応答か
            return response.request().method() === "PUT" &&
                new URL(response.url()).pathname.startsWith("/api/builds/")
        })
        await selectFirstFrame(page)
        await autoSaveResponse

        // ログアウト時の保存構成一覧取得を失敗させる
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
                        code: "E2E_SAVE_FAILURE",
                        message: "E2Eテスト用の保存失敗",
                    },
                }),
            })
        })

        // ログアウトを開始すると保存失敗のダイアログが出る
        await header.openAccountMenu()
        await page.getByRole("menuitem", { name: "ログアウト" }).click()
        // 保存失敗ダイアログ
        const dialog = logoutSaveDialog(page)
        await expect(
            dialog.getByText("構成を保存できませんでした", { exact: true }),
        ).toBeVisible()
        // 再試行と保存せずログアウトの導線
        await expect(
            dialog.getByRole("button", { name: "再試行" }),
        ).toBeVisible()
        await expect(
            dialog.getByRole("button", { name: "保存せずログアウト" }),
        ).toBeVisible()

        // 通信を復旧して再試行すると保存とログアウトが完了する
        await page.unroute("**/api/builds")
        await dialog.getByRole("button", { name: "再試行" }).click()
        await expect(
            dialog.getByText("構成を保存しました", { exact: true }),
        ).toBeVisible()
        await dialog.getByRole("button", { name: "閉じる" }).click()
        await expect(header.loginButton).toBeVisible()
    })

    // 保存失敗時に保存せずログアウトできることを保証
    test("保存に失敗したら保存せずログアウトできる", async ({
        page,
        header,
        auth,
    }) => {
        await page.goto("/")
        await auth.login()

        // 前のテストの構成を消し、空の初期構成から始める
        await clearAccountBuilds(page)
        // 並び順の取得が空にならないよう、初期構成を用意
        await ensureInitialAccountConfig(page)
        await page.reload()
        await expect(header.accountMenuButton).toBeVisible({
            timeout: 20_000,
        })
        await expect(activeConfigNameCard(page)).toHaveText("構成1")

        // 自動保存の完了を待ち、ログアウト時の保存処理を安定させる
        const autoSaveResponse = page.waitForResponse((response) => {
            // 構成の上書きAPIの応答か
            return response.request().method() === "PUT" &&
                new URL(response.url()).pathname.startsWith("/api/builds/")
        })
        await selectFirstFrame(page)
        await autoSaveResponse

        // ログアウト時の保存構成一覧取得を失敗させる
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
                        code: "E2E_SAVE_FAILURE",
                        message: "E2Eテスト用の保存失敗",
                    },
                }),
            })
        })

        // ログアウトを開始すると保存失敗のダイアログが出る
        await header.openAccountMenu()
        await page.getByRole("menuitem", { name: "ログアウト" }).click()
        // 保存失敗ダイアログ
        const dialog = logoutSaveDialog(page)
        await expect(
            dialog.getByText("構成を保存できませんでした", { exact: true }),
        ).toBeVisible()

        // 保存せずログアウトすると、ログイン導線へ戻る
        await dialog.getByRole("button", { name: "保存せずログアウト" }).click()
        await expect(header.loginButton).toBeVisible()
        await expect(dialog).toBeHidden()
    })
})

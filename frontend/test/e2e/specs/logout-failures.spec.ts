import type { Locator, Page, Route } from "@playwright/test"

import type { Header } from "../fixtures/pages/Header"
import { expect, test } from "../fixtures/test"

// fixtureのauthと同じ形のログイン操作
type LoginAction = {
    login: () => Promise<void> // ログインしてアカウント表示を待つ
}

// アカウントの保存構成のうち、削除に使う項目
type AccountBuildSummary = {
    id: string // 構成ID
    version: number // 楽観ロック用の版番号
    name: string // 構成名
}

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

// 保存構成一覧のJSONから、検証済みの項目を取り出す
function parseAccountBuilds(value: unknown): AccountBuildSummary[] {
    // 配列以外は保存構成一覧として扱えない
    if (!Array.isArray(value)) {
        throw new Error("保存構成一覧を取得できませんでした")
    }

    return value.map((build) => {
        // 構成1件分の保存内容
        const record = build as Record<string, unknown>

        // ID・版・名前がそろわない構成は削除に使えない
        if (
            typeof record.id !== "string" ||
            typeof record.version !== "number" ||
            typeof record.name !== "string"
        ) {
            throw new Error("保存構成の項目を取得できませんでした")
        }

        return {
            id: record.id,
            version: record.version,
            name: record.name,
        }
    })
}

// 変更系APIのCSRFトークンを取得
async function fetchCsrfToken(page: Page): Promise<string> {
    // CSRFトークン取得の応答
    const response = await page.request.get("/api/auth/csrf")
    expect(response.ok()).toBe(true)
    // CSRFトークンを含む応答
    const payload = await response.json() as { csrfToken?: unknown }

    // トークンが無い場合は作成・削除を実行できない
    if (typeof payload.csrfToken !== "string") {
        throw new Error("CSRFトークンを取得できませんでした")
    }

    return payload.csrfToken
}

// アカウントの保存構成一覧を取得
async function fetchAccountBuilds(page: Page): Promise<AccountBuildSummary[]> {
    // 保存構成一覧の応答
    const response = await page.request.get("/api/builds")
    expect(response.ok()).toBe(true)

    return parseAccountBuilds(await response.json())
}

// 保存構成を1件削除
async function deleteAccountBuild(
    page: Page,
    build: AccountBuildSummary,
    csrfToken: string,
): Promise<void> {
    // 版一致を条件に1件削除
    const response = await page.request.delete(
        `/api/builds/${encodeURIComponent(build.id)}`,
        {
            data: {
                version: build.version,
                csrfToken,
            },
        },
    )
    expect(response.status()).toBe(204)
}

// アカウントの保存構成をすべて削除
async function clearAccountBuilds(page: Page): Promise<void> {
    // 削除で共用するCSRFトークン
    const csrfToken = await fetchCsrfToken(page)
    // 取得した削除対象の構成
    const builds = await fetchAccountBuilds(page)

    for (const build of builds) {
        await deleteAccountBuild(page, build, csrfToken)
    }
}

// アカウントに空の「構成1」1件だけを用意
async function prepareInitialAccountConfig(page: Page): Promise<void> {
    // 更新・削除で共用するCSRFトークン
    const csrfToken = await fetchCsrfToken(page)
    // 現在のアカウント構成
    const builds = await fetchAccountBuilds(page)
    // 残す構成（一覧取得時に初期構成が用意され、存在は1件以上）
    const kept = builds[0]

    // 残す構成が無い場合は初期状態を作れない
    if (!kept) {
        throw new Error("残すアカウント構成を取得できませんでした")
    }

    for (const build of builds.slice(1)) {
        await deleteAccountBuild(page, build, csrfToken)
    }

    // 残した構成を空の構成1へ更新
    const response = await page.request.put(
        `/api/builds/${encodeURIComponent(kept.id)}`,
        {
            data: {
                name: "構成1",
                version: kept.version,
                parts: [],
                csrfToken,
            },
        },
    )
    expect(response.ok()).toBe(true)
}

// ログインして空の初期構成を表示
async function openLoggedInWithInitialConfig(
    page: Page,
    header: Header,
    auth: LoginAction,
): Promise<void> {
    await page.goto("/")
    await auth.login()
    await prepareInitialAccountConfig(page)
    await page.reload()
    await expect(header.accountMenuButton).toBeVisible()
    await expect(activeConfigNameCard(page)).toHaveText("構成1")
}

// 500のJSON応答を返し、画面の失敗表示を再現
async function fulfillServerError(route: Route, code: string): Promise<void> {
    await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
            error: {
                code,
                message: "E2Eテスト用のサーバーエラー",
            },
        }),
    })
}

// ログアウトを開始し、構成保存ダイアログを返す
async function startLogout(page: Page, header: Header): Promise<Locator> {
    await header.openAccountMenu()
    await page.getByRole("menuitem", {
        name: "ログアウト",
        exact: true,
    }).click()

    return logoutSaveDialog(page)
}

// ログアウト成功後に再ログインし、アカウント構成を空へ戻す
async function clearAccountAfterLogout(
    page: Page,
    auth: LoginAction,
): Promise<void> {
    // ログアウト保存の構成を再ログインの引き継ぎ判定に使わない
    await page.evaluate(() => {
        window.localStorage.clear()
    })
    await auth.login()
    // 一覧取得の完了を、選択中構成名の表示で待つ
    await expect(activeConfigNameCard(page)).toHaveText("構成1")
    await clearAccountBuilds(page)
}

// ログアウトの失敗種別ごとの表示と復旧を確認
test.describe("ログアウト失敗時の表示と復旧", () => {
    // ログアウトだけ失敗した場合に、再試行で完了できることを保証
    test("ログアウトAPIの失敗は再試行で復旧できる", async ({
        page,
        header,
        auth,
    }) => {
        // 保存と再試行を含むため、上限時間を延ばす
        test.slow()
        await openLoggedInWithInitialConfig(page, header, auth)

        // ログアウトAPIだけを500にする
        await page.route("**/api/auth/logout", (route) =>
            fulfillServerError(route, "E2E_LOGOUT_FAILURE"))

        // ログアウト保存ダイアログ
        const dialog = await startLogout(page, header)
        // 構成の保存は成功し、ログアウトだけが失敗する
        await expect(
            dialog.getByText("ログアウトできませんでした", { exact: true }),
        ).toBeVisible()
        await expect(dialog.getByRole("alert")).toContainText(
            "ログアウトに失敗しました",
        )
        // 構成の保存は成功している
        await expect(dialog.getByText(
            /構成は保存しましたが、ログアウトに失敗しました/,
        )).toBeVisible()
        // ログイン状態が残る
        await expect(header.accountMenuButton).toBeVisible()

        // 通信を復旧して再試行
        await page.unroute("**/api/auth/logout")
        await dialog.getByRole("button", { name: "再試行" }).click()
        await expect(header.loginButton).toBeVisible()
        await expect(dialog).toBeHidden()

        // 次のテストのため、アカウントの構成を空に戻す
        await clearAccountAfterLogout(page, auth)
    })

    // 保存せずログアウトも失敗したときのエラー維持を保証
    test("保存せずログアウトも失敗したらエラーを維持する", async ({
        page,
        header,
        auth,
    }) => {
        // 保存失敗とログアウト失敗を含むため、上限時間を延ばす
        test.slow()
        await openLoggedInWithInitialConfig(page, header, auth)

        // ログアウト時の構成一覧取得とログアウトAPIを500にする
        await page.route("**/api/builds", async (route) => {
            // 一覧取得だけを失敗させる
            if (route.request().method() !== "GET") {
                await route.continue()
                return
            }

            await fulfillServerError(route, "E2E_SAVE_FAILURE")
        })
        await page.route("**/api/auth/logout", (route) =>
            fulfillServerError(route, "E2E_LOGOUT_FAILURE"))

        // ログアウト保存ダイアログ
        const dialog = await startLogout(page, header)
        // 保存失敗の表示
        await expect(
            dialog.getByText("構成を保存できませんでした", { exact: true }),
        ).toBeVisible()
        await expect(dialog.getByRole("alert")).toContainText(
            "E2Eテスト用のサーバーエラー",
        )

        // 保存せずログアウトも失敗する
        await dialog.getByRole("button", {
            name: "保存せずログアウト",
        }).click()
        await expect(
            dialog.getByText("ログアウトできませんでした", { exact: true }),
        ).toBeVisible()
        await expect(dialog.getByRole("alert")).toContainText(
            "ログアウトに失敗しました",
        )
        // 保存せずログアウトの失敗であることを表示
        await expect(dialog.getByText(
            /構成を保存せずにログアウトしようとしましたが、失敗しました/,
        )).toBeVisible()
        // ダイアログとログイン状態が残る
        await expect(dialog).toBeVisible()
        await expect(header.accountMenuButton).toBeVisible()

        // 通信とダイアログを戻し、アカウントの構成を空に戻す
        await page.unroute("**/api/builds")
        await page.unroute("**/api/auth/logout")
        await dialog.getByRole("button", { name: "キャンセル" }).click()
        await expect(dialog).toBeHidden()
        await clearAccountBuilds(page)
    })

    // 自動保存の失敗直後のログアウトも再試行で完了できることを保証
    test("自動保存の失敗直後のログアウトは再試行で完了できる", async ({
        page,
        header,
        auth,
        simulatorPage,
    }) => {
        // 保存と再試行を含むため、上限時間を延ばす
        test.slow()
        await openLoggedInWithInitialConfig(page, header, auth)

        // 自動保存の上書きAPIだけを500にする
        await page.route("**/api/builds/*", async (route) => {
            // 上書き以外の通信は変更せず通す
            if (route.request().method() !== "PUT") {
                await route.continue()
                return
            }

            await fulfillServerError(route, "E2E_AUTOSAVE_FAILURE")
        })

        // 候補の先頭フレームを選び、自動保存の対象を作る
        const firstRow = simulatorPage.candidatePartsTable
            .locator("tbody tr[aria-selected]")
            .first()
        await expect(firstRow).toBeVisible()
        await firstRow.focus()
        await page.keyboard.press("Enter")
        await expect(firstRow).toHaveAttribute("aria-selected", "true")

        // 自動保存の待ち時間を待たずにログアウトを開始
        const dialog = await startLogout(page, header)
        // 確定できなかった自動保存の失敗表示
        await expect(
            dialog.getByText("構成を保存できませんでした", { exact: true }),
        ).toBeVisible()
        await expect(dialog.getByRole("alert")).toContainText(
            "自動保存を確定できませんでした",
        )

        // 通信を復旧して再試行
        await page.unroute("**/api/builds/*")
        await dialog.getByRole("button", { name: "再試行" }).click()
        await expect(
            dialog.getByText("構成を保存しました", { exact: true }),
        ).toBeVisible()
        await dialog.getByRole("button", { name: "閉じる" }).click()
        await expect(header.loginButton).toBeVisible()

        // 次のテストのため、アカウントの構成を空に戻す
        await clearAccountAfterLogout(page, auth)
    })

    // localStorageへ保存できない場合に、保存失敗を表示することを保証
    test("ブラウザ保存の失敗を表示する", async ({ page, header, auth }) => {
        // ログインと保存失敗の確認を含むため、上限時間を延ばす
        test.slow()
        await openLoggedInWithInitialConfig(page, header, auth)

        // localStorageへの保存を容量超過として失敗させる
        await page.evaluate(() => {
            // 元の保存処理（後片付けで戻す）
            const originalSetItem = Storage.prototype.setItem
            // 元の保存処理を退避するwindow
            const e2eWindow = window as unknown as {
                __e2eSetItem?: typeof Storage.prototype.setItem
            }
            e2eWindow.__e2eSetItem = originalSetItem
            // localStorageへの保存をすべて失敗させる
            Storage.prototype.setItem = () => {
                throw new DOMException(
                    "保存領域が不足しています",
                    "QuotaExceededError",
                )
            }
        })

        // ログアウト保存ダイアログ
        const dialog = await startLogout(page, header)
        // ブラウザ保存失敗の表示
        await expect(
            dialog.getByText("構成を保存できませんでした", { exact: true }),
        ).toBeVisible()
        await expect(dialog.getByRole("alert")).toContainText(
            "ブラウザに構成を保存できませんでした",
        )
        // 保存失敗時の再試行導線
        await expect(
            dialog.getByRole("button", { name: "再試行" }),
        ).toBeVisible()

        // 保存処理を戻してから、アカウントの構成を空に戻す
        await dialog.getByRole("button", { name: "キャンセル" }).click()
        await expect(dialog).toBeHidden()
        await page.evaluate(() => {
            // 退避した元の保存処理
            const e2eWindow = window as unknown as {
                __e2eSetItem?: typeof Storage.prototype.setItem
            }

            // 退避値が無い場合は復元できない
            if (!e2eWindow.__e2eSetItem) {
                throw new Error("元の保存処理を復元できませんでした")
            }

            Storage.prototype.setItem = e2eWindow.__e2eSetItem
        })
        await clearAccountBuilds(page)
    })
})

import type { Locator, Page } from "@playwright/test"

import type { ConfigList } from "../fixtures/pages/ConfigList"
import { expect, test } from "../fixtures/test"

// ブラウザ構成をアカウントへ引き継ぐダイアログ
function migrationDialog(page: Page): Locator {
    return page.locator(
        '[role="dialog"][aria-labelledby="saved-build-migration-title"]',
    )
}

// 上部の「選択中の構成」カードに表示された構成名
function activeConfigNameCard(page: Page): Locator {
    return page.locator('[data-slot="card"]')
        .filter({ has: page.getByText("選択中の構成", { exact: true }) })
        .locator("p[title]")
}

// fixtureのauthと同じ形の認証操作
type AuthActions = {
    login: () => Promise<void> // ログインしてアカウント表示を待つ
    logout: () => Promise<void> // ログアウトしてログイン導線へ戻す
}

// ブラウザ保存の構成（移行判定に使う名前とパーツ数）
type LocalConfigSummary = {
    name: string // 構成名
    partsCount: number // 保存中のパーツ数
}

// アカウントの保存構成のうち、削除と確認に使う項目
type AccountBuildSummary = {
    id: string // 構成ID
    version: number // 楽観ロック用の版番号
    name: string // 構成名
}

// localStorageから未ログイン時の構成一覧を読み取る
async function readLocalConfigs(page: Page): Promise<LocalConfigSummary[]> {
    return page.evaluate(() => {
        // localStorageに保存された構成一覧
        const raw = window.localStorage.getItem("barakann-config-collection-v2")

        // 未保存なら構成なし
        if (!raw) {
            return []
        }

        // 保存済みJSONのうち構成一覧だけを使う
        const stored = JSON.parse(raw) as { configs?: unknown }
        // 配列でない場合は構成なしとして扱う
        const configs = Array.isArray(stored.configs) ? stored.configs : []

        // 移行判定に必要な名前とパーツ数だけを取り出す
        return configs.map((config) => {
            // 構成1件分の保存内容
            const record = config as { name?: unknown; parts?: unknown }

            return {
                name: typeof record.name === "string" ? record.name : "",
                partsCount: Array.isArray(record.parts)
                    ? record.parts.length
                    : 0,
            }
        })
    })
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

        // ID・版・名前がそろわない構成は削除や確認に使えない
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

// アカウントの保存構成を空にし、未ログイン状態へ戻す
async function resetAccountToLoggedOut(
    page: Page,
    auth: AuthActions,
): Promise<void> {
    // 前のテストが残した構成を削除するためログイン
    await auth.login()
    // アカウントの構成をすべて削除
    await clearAccountBuilds(page)
    // ログアウト時の処理が空の並び順を取得しないよう、初期構成を用意
    await ensureInitialAccountConfig(page)
    // ログアウト時の保存で、空の初期構成だけをブラウザへ引き継ぐ
    await auth.logout()
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

// 指定した構成のパーツがlocalStorageへ保存されるまで待つ
async function waitForLocalConfigParts(
    page: Page,
    name: string,
    expectedCount: number,
): Promise<void> {
    await expect.poll(async () => {
        // localStorageの構成一覧
        const configs = await readLocalConfigs(page)

        return configs.find((config) => config.name === name)?.partsCount ?? 0
    }).toBe(expectedCount)
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

// 未ログイン構成の引き継ぎと移行判定を確認
test.describe("構成の引き継ぎ", () => {
    // 選択した構成だけを保存し、重複表示と再表示されないことを確認
    test("未ログインの構成をアカウントへ引き継ぐ", async ({
        page,
        header,
        configList,
        auth,
    }) => {
        // 複数回のログインと画面更新を含むため、上限時間を延ばす
        test.slow()
        await page.goto("/")
        await resetAccountToLoggedOut(page, auth)

        // 未ログインの初期構成が選択されるまで待つ
        await expect(activeConfigNameCard(page)).toHaveText("構成1")

        // 初期構成へフレームを選び、ブラウザ保存を待つ
        await selectFirstFrame(page)
        await waitForLocalConfigParts(page, "構成1", 1)

        // 現在の選択を複製して2件目の構成を作る
        await addConfigFromCurrentParts(page, configList, "構成2")
        await waitForLocalConfigParts(page, "構成2", 1)
        await closeMobileSidebar(page)

        // ログイン後の引き継ぎダイアログを待つ
        await auth.login()
        // ログイン後の再読み込みで移行判定をやり直す
        await page.reload()
        // 引き継ぎダイアログ
        const dialog = migrationDialog(page)
        await expect(dialog).toBeVisible({ timeout: 20_000 })

        // 空の初期構成の置き換えと、新規2件の判定を確認
        await expect(dialog.getByText(/保存できる残り枠: 20件/)).toBeVisible()
        await expect(
            dialog.getByText(/一致 0件.*新規 2件.*上限超過 0件/),
        ).toBeVisible()
        await expect(
            dialog.getByText("2件を選択中", { exact: true }),
        ).toBeVisible()

        // 構成1の選択を外すと選択件数が1件になる
        const config1Checkbox = dialog.getByRole("checkbox", {
            name: "構成1を引き継ぐ",
        })
        await config1Checkbox.click()
        await expect(
            dialog.getByText("1件を選択中", { exact: true }),
        ).toBeVisible()

        // 選択し直すと選択件数が2件へ戻る
        await config1Checkbox.click()
        await expect(
            dialog.getByText("2件を選択中", { exact: true }),
        ).toBeVisible()

        // 構成2だけを選択して保存
        await config1Checkbox.click()
        await dialog.getByRole("button", { name: "選択した構成を保存" }).click()
        await expect(dialog).toBeHidden()

        // アカウント側が選択した構成1件だけになる
        await configList.openIfMobile()
        await expect(configList.countBadge).toHaveText("1 / 20")
        await expect(configList.savedBuildButton("構成2")).toBeVisible()

        // 再読み込みすると、保存済みの構成2は重複として表示される
        await page.reload()
        await expect(dialog).toBeVisible({ timeout: 20_000 })
        await expect(
            dialog.getByText(/一致 1件.*新規 1件.*上限超過 0件/),
        ).toBeVisible()
        await expect(
            dialog.getByText("1件を選択中", { exact: true }),
        ).toBeVisible()
        // 重複した構成2のチェックは選ばれず、移行済みと表示される
        const duplicateCheckbox = dialog.getByRole("checkbox", {
            name: "構成2を引き継ぐ",
        })
        await expect(duplicateCheckbox).toHaveAttribute(
            "aria-checked",
            "false",
        )
        await expect(
            duplicateCheckbox.locator("xpath=ancestor::label")
                .getByText(/・移行済み/),
        ).toBeVisible()

        // 残る構成1を保存し、ダイアログを閉じる
        await dialog.getByRole("button", { name: "選択した構成を保存" }).click()
        await expect(dialog).toBeHidden()

        // 保存後の一覧再取得が終わってから、再読み込みで移行判定を確認
        await configList.openIfMobile()
        await expect(configList.countBadge).toHaveText("2 / 20")
        await closeMobileSidebar(page)

        // 保存構成一覧の取得回数
        let buildsRequestCount = 0
        page.on("response", (response) => {
            // 保存構成一覧のGETだけを数える
            if (
                new URL(response.url()).pathname === "/api/builds" &&
                response.request().method() === "GET"
            ) {
                buildsRequestCount += 1
            }
        })
        // 再読み込み前の取得回数
        const countBeforeReload = buildsRequestCount
        await page.reload()
        await expect(header.accountMenuButton).toBeVisible({
            timeout: 20_000,
        })
        // 一覧表示と移行判定で保存構成一覧を取得するまで待つ
        await expect.poll(() => buildsRequestCount - countBeforeReload)
            .toBeGreaterThanOrEqual(2)
        // 通信完了後の再描画を2フレーム分待つ
        await page.evaluate(() => new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => resolve())
            })
        }))
        // すべて同じ構成のため引き継ぎダイアログは表示されない
        await expect(dialog).toBeHidden()

        // 次のテストのため、アカウントの構成を空に戻す
        await clearAccountBuilds(page)
    })

    // 「保存しない」で閉じるとアカウントの構成が増えないことを保証
    test("保存しないで引き継ぎダイアログを閉じる", async ({
        page,
        configList,
        auth,
    }) => {
        // 複数回のログインと画面更新を含むため、上限時間を延ばす
        test.slow()
        await page.goto("/")
        await resetAccountToLoggedOut(page, auth)
        await expect(activeConfigNameCard(page)).toHaveText("構成1")

        // 未ログインの構成を2件用意する
        await selectFirstFrame(page)
        await waitForLocalConfigParts(page, "構成1", 1)
        await addConfigFromCurrentParts(page, configList, "構成2")
        await waitForLocalConfigParts(page, "構成2", 1)
        await closeMobileSidebar(page)

        await auth.login()
        // 引き継ぎダイアログ
        const dialog = migrationDialog(page)
        await expect(dialog).toBeVisible({ timeout: 20_000 })
        await expect(
            dialog.getByText("2件を選択中", { exact: true }),
        ).toBeVisible()

        // 保存せずダイアログを閉じる
        await dialog.getByRole("button", { name: "保存しない" }).click()
        await expect(dialog).toBeHidden()

        // アカウントには空の初期構成だけが残る
        const buildsResponse = await page.request.get("/api/builds")
        expect(buildsResponse.ok()).toBe(true)
        // 検証対象の保存構成
        const builds = parseAccountBuilds(await buildsResponse.json())
        expect(builds.map((build) => build.name)).toEqual(["構成1"])
    })

})

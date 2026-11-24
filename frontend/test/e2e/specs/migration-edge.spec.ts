import type { Locator, Page } from "@playwright/test"

import { expect, test } from "../fixtures/test"

// 保存構成の上限件数（savedBuilds.tsのMAX_SAVED_BUILDSと同じ値）
const MAX_CONFIGS = 20
// 構成一覧の保存キー（simulator-storage.tsのCOLLECTION_STORAGE_KEY）
const COLLECTION_STORAGE_KEY = "barakann-config-collection-v2"
// 移行元の構成へ入れるフレームのスロットキー
const FRAME_SLOT_KEY = "frame"

// ブラウザ保存へ投入する構成1件
type SeedConfig = {
    id: string // 構成ID（英数字とハイフンのみ）
    name: string // 構成名（1〜50文字）
}

// 移行元の構成へ入れるフレームパーツ
type FramePart = {
    id: number // パーツID
    price: number // 価格（円）
    weight: number // 重量（g）
}

// アカウントの保存構成のうち、削除と確認に使う項目
type AccountBuildSummary = {
    id: string // 構成ID
    version: number // 楽観ロック用の版番号
    name: string // 構成名
}

// ブラウザ構成をアカウントへ引き継ぐダイアログ
function migrationDialog(page: Page): Locator {
    return page.locator(
        '[role="dialog"][aria-labelledby="saved-build-migration-title"]',
    )
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

// 保存構成を1件作成
async function createAccountBuild(
    page: Page,
    name: string,
    csrfToken: string,
): Promise<void> {
    // パーツを持たない構成の作成応答
    const response = await page.request.post("/api/builds", {
        data: {
            name,
            parts: [],
            csrfToken,
        },
    })
    expect(response.status()).toBe(201)
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

    // 退避する構成が無い場合は初期状態を作れない
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

// 空を経由せず、アカウント構成を指定件数へ置き換え
async function replaceAccountBuilds(
    page: Page,
    count: number,
    namePrefix: string,
): Promise<void> {
    // 作成・削除で共用するCSRFトークン
    const csrfToken = await fetchCsrfToken(page)
    // 置き換え前のアカウント構成
    const builds = await fetchAccountBuilds(page)
    // 作成中に0件を作らないための退避構成
    const kept = builds[0]

    // 退避する構成が無い場合は置き換えできない
    if (!kept) {
        throw new Error("退避するアカウント構成を取得できませんでした")
    }

    // 退避構成と作成分が上限を超えないか
    if (count + 1 > MAX_CONFIGS) {
        throw new Error(`構成上限を超える件数は作成できません: ${count}`)
    }

    for (const build of builds.slice(1)) {
        await deleteAccountBuild(page, build, csrfToken)
    }

    for (let index = 1; index <= count; index += 1) {
        await createAccountBuild(page, `${namePrefix}${index}`, csrfToken)
    }

    // 退避構成を削除し、指定件数だけを残す
    await deleteAccountBuild(page, kept, csrfToken)
}

// 移行元に使うフレームパーツを1件取得
async function fetchFirstFramePart(page: Page): Promise<FramePart> {
    // フレーム候補の応答
    const response = await page.request.get("/api/parts?category=frame")
    expect(response.ok()).toBe(true)
    // 取得したフレーム候補
    const parts = await response.json() as unknown

    // 候補が配列でない場合は移行元を作れない
    if (!Array.isArray(parts)) {
        throw new Error("フレーム候補を取得できませんでした")
    }

    // 先頭のフレーム候補
    const first = parts[0] as {
        id?: unknown // パーツID
        price?: unknown // 価格（円）
        weight?: unknown // 重量（g）
    } | undefined

    // 保存に必要な数値がそろわない場合は移行元を作れない
    if (
        typeof first?.id !== "number" ||
        typeof first.price !== "number" ||
        typeof first.weight !== "number"
    ) {
        throw new Error("フレーム候補の項目を取得できませんでした")
    }

    return { id: first.id, price: first.price, weight: first.weight }
}

// ブラウザ保存へ移行元の構成を投入
async function seedLocalConfigs(
    page: Page,
    configs: SeedConfig[],
    part: FramePart,
): Promise<void> {
    await page.addInitScript(({ collectionKey, items, framePart }) => {
        // 前の表示内容を残さない、投入構成だけの読み込み
        window.localStorage.clear()

        // 一覧の表示順キー（config:ID形式）
        const order = items.map((item) => `config:${item.id}`)

        window.localStorage.setItem(
            collectionKey,
            JSON.stringify({
                configs: items.map((item) => ({
                    ...item,
                    parts: [framePart],
                })),
                order,
            }),
        )
    }, {
        collectionKey: COLLECTION_STORAGE_KEY,
        items: configs,
        framePart: {
            slotKey: FRAME_SLOT_KEY,
            partId: part.id,
            price: part.price,
            weight: part.weight,
        },
    })
}

// 構成の引き継ぎで上限超過と部分失敗から復旧できることを確認
test.describe("構成引き継ぎの上限と部分失敗", () => {
    // 残り枠の増加後に、上限超過だった構成を保存できることを保証
    test("上限超過の構成も残り枠の増加後に保存できる", async ({
        page,
        configList,
        auth,
    }) => {
        // 多数の構成作成と画面更新を含むため、上限時間を延ばす
        test.slow()
        await page.goto("/")
        // 移行元のフレームパーツ
        const framePart = await fetchFirstFramePart(page)
        // 2件目が上限超過になるローカル構成
        await seedLocalConfigs(page, [
            { id: "e2e-limit-local-a", name: "ローカルA" },
            { id: "e2e-limit-local-b", name: "ローカルB" },
        ], framePart)

        // アカウントへ19件を用意し、残り枠を1件にする
        await auth.login()
        await replaceAccountBuilds(page, 19, "サーバー構成")
        await page.reload()

        // 引き継ぎダイアログ
        const dialog = migrationDialog(page)
        await expect(dialog).toBeVisible()
        // 残り枠1件と上限超過1件の判定
        await expect(
            dialog.getByText("保存できる残り枠: 1件", { exact: true }),
        ).toBeVisible()
        await expect(
            dialog.getByText(/一致 0件.*新規 1件.*上限超過 1件/),
        ).toBeVisible()
        // 上限超過の構成チェックボックス
        const overLimitCheckbox = dialog.getByRole("checkbox", {
            name: "ローカルBを引き継ぐ",
        })
        await expect(overLimitCheckbox).toBeEnabled()
        // 既定では上限超過の構成は選ばれない
        await expect(overLimitCheckbox).toHaveAttribute(
            "aria-checked",
            "false",
        )
        // 上限超過の構成へ残り枠超過の案内を表示
        await expect(
            overLimitCheckbox.locator("xpath=ancestor::label")
                .getByText(/・残り枠を超えています/),
        ).toBeVisible()

        // ダイアログ内のサーバー構成1件を削除
        const serverRow = dialog.getByRole("listitem")
            .filter({ hasText: "サーバー構成" })
            .first()
        await serverRow.getByRole("button", {
            name: "削除",
            exact: true,
        }).click()
        await serverRow.getByRole("button", { name: "削除する" }).click()

        // 削除後に残り枠が2件へ増える
        await expect(
            dialog.getByText("保存できる残り枠: 2件", { exact: true }),
        ).toBeVisible()
        await expect(
            dialog.getByText(/一致 0件.*新規 2件.*上限超過 0件/),
        ).toBeVisible()
        // 残り枠に収まった構成から超過の案内が消える
        await expect(
            overLimitCheckbox.locator("xpath=ancestor::label")
                .getByText(/・残り枠を超えています/),
        ).toBeHidden()

        // 上限超過だった構成を選び直して保存
        await overLimitCheckbox.click()
        await expect(
            dialog.getByText("2件を選択中", { exact: true }),
        ).toBeVisible()
        await dialog.getByRole("button", {
            name: "選択した構成を保存",
        }).click()
        await expect(dialog).toBeHidden()

        // 一覧が20件へ反映されるまで待つ
        await configList.openIfMobile()
        await expect(configList.countBadge).toHaveText(
            `${MAX_CONFIGS} / ${MAX_CONFIGS}`,
        )

        // ローカル2件がアカウントへ保存されたことを確認
        const builds = await fetchAccountBuilds(page)
        // アカウントの構成名
        const names = builds.map((build) => build.name)
        expect(builds).toHaveLength(MAX_CONFIGS)
        expect(names).toContain("ローカルA")
        expect(names).toContain("ローカルB")
        expect(names.filter((name) => name.startsWith("サーバー構成")))
            .toHaveLength(18)

        // 次のテストのため、アカウントの構成を空に戻す
        await clearAccountBuilds(page)
    })

    // 2件目の保存だけ失敗した引き継ぎを再試行で完了できることを保証
    test("2件目の保存だけ失敗した構成を再試行で保存できる", async ({
        page,
        configList,
        auth,
    }) => {
        // 3件の作成と再試行を含むため、上限時間を延ばす
        test.slow()
        await page.goto("/")
        // 移行元のフレームパーツ
        const framePart = await fetchFirstFramePart(page)
        // 移行元のローカル3件
        await seedLocalConfigs(page, [
            { id: "e2e-partial-local-a", name: "部分失敗A" },
            { id: "e2e-partial-local-b", name: "部分失敗B" },
            { id: "e2e-partial-local-c", name: "部分失敗C" },
        ], framePart)

        // アカウントを空の構成1だけにする
        await auth.login()
        await prepareInitialAccountConfig(page)
        await page.reload()

        // 引き継ぎダイアログ
        const dialog = migrationDialog(page)
        await expect(dialog).toBeVisible()
        await expect(
            dialog.getByText("3件を選択中", { exact: true }),
        ).toBeVisible()

        // 2件目の作成POSTだけを失敗させる
        let createRequestCount = 0
        await page.route("**/api/builds", async (route) => {
            // 作成以外の通信は変更せず通す
            if (
                route.request().method() !== "POST" ||
                new URL(route.request().url()).pathname !== "/api/builds"
            ) {
                await route.continue()
                return
            }

            createRequestCount += 1

            // 2件目の作成だけを500にする
            if (createRequestCount === 2) {
                await route.fulfill({
                    status: 500,
                    contentType: "application/json",
                    body: JSON.stringify({
                        error: {
                            code: "E2E_MIGRATION_FAILURE",
                            message: "E2Eテスト用の保存失敗",
                        },
                    }),
                })
                return
            }

            await route.continue()
        })

        await dialog.getByRole("button", {
            name: "選択した構成を保存",
        }).click()

        // 失敗件数の通知
        await expect(dialog.getByRole("alert")).toContainText(
            "1件の構成を保存できませんでした。もう一度お試しください。",
        )

        // 成功した構成の移行済み表示
        for (const name of ["部分失敗A", "部分失敗C"]) {
            // 保存済みの構成チェックボックス
            const savedCheckbox = dialog.getByRole("checkbox", {
                name: `${name}を引き継ぐ`,
            })
            await expect(savedCheckbox).toBeDisabled()
            await expect(
                savedCheckbox.locator("xpath=ancestor::label")
                    .getByText(/・移行済み/),
            ).toBeVisible()
        }

        // 失敗した構成だけが再試行の対象として選ばれる
        const failedCheckbox = dialog.getByRole("checkbox", {
            name: "部分失敗Bを引き継ぐ",
        })
        await expect(failedCheckbox).toHaveAttribute("aria-checked", "true")
        await expect(
            dialog.getByText("1件を選択中", { exact: true }),
        ).toBeVisible()

        // 失敗分を選び直して、再試行できる状態を確認
        await failedCheckbox.click()
        await expect(
            dialog.getByText("0件を選択中", { exact: true }),
        ).toBeVisible()
        await failedCheckbox.click()
        await expect(
            dialog.getByText("1件を選択中", { exact: true }),
        ).toBeVisible()

        // 通信を復旧して保存を再試行
        await page.unroute("**/api/builds")
        await dialog.getByRole("button", {
            name: "選択した構成を保存",
        }).click()
        await expect(dialog).toBeHidden()

        // 一覧が3件へ反映されるまで待つ
        await configList.openIfMobile()
        await expect(configList.countBadge).toHaveText("3 / 20")

        // 3件すべてがアカウントへ保存されたことを確認
        const builds = await fetchAccountBuilds(page)
        expect(builds.map((build) => build.name).sort()).toEqual([
            "部分失敗A",
            "部分失敗B",
            "部分失敗C",
        ])

        // 次のテストのため、アカウントの構成を空に戻す
        await clearAccountBuilds(page)
    })
})

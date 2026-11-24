import type {Locator, Page} from "@playwright/test"

import type {ConfigList} from "../fixtures/pages/ConfigList"
import type {Header} from "../fixtures/pages/Header"
import {
    DEFAULT_MOCK_PROFILE,
    USER_A,
    USER_B,
    fetchMockGoogleProfile,
    setMockGoogleProfile,
    type MockGoogleProfile,
} from "../fixtures/multiuser"
import {expect, test} from "../fixtures/test"
import type {AuthFixture} from "../fixtures/test"

// ブラウザ保存の構成キー（simulator-storage.tsのCOLLECTION_STORAGE_KEY）
const COLLECTION_STORAGE_KEY = "barakann-config-collection-v2"
// ローカル構成の由来アカウント保存キー（local-config-sync.tsのORIGIN_STORAGE_KEY）
const ORIGIN_STORAGE_KEY = "barakann-local-config-origin-v1"

// ブラウザ保存の構成1件（確認に使う項目）
type LocalConfigSummary = {
    id: string // 構成ID
    name: string // 構成名
    partsCount: number // 保存中のパーツ数
}

// アカウントの保存構成（確認に使う項目）
type AccountBuild = {
    id: string // 構成ID
    version: number // 楽観ロック用の版番号
    name: string // 構成名
    partsCount: number // 保存中のパーツ数
}

// ブラウザ構成をアカウントへ引き継ぐダイアログ
function migrationDialog(page: Page): Locator {
    return page.locator(
        '[role="dialog"][aria-labelledby="saved-build-migration-title"]',
    )
}

// 上部の「選択中の構成」カードに表示された構成名
function activeConfigNameCard(page: Page): Locator {
    return page.locator('[data-slot="card"]')
        .filter({has: page.getByText("選択中の構成", {exact: true})})
        .locator("p[title]")
}

// localStorageからブラウザ保存の構成一覧を読み取る
async function readLocalConfigs(page: Page): Promise<LocalConfigSummary[]> {
    return page.evaluate((collectionKey) => {
        // localStorageに保存された構成一覧
        const raw = window.localStorage.getItem(collectionKey)

        // 未保存なら構成なし
        if (!raw) {
            return []
        }

        // 保存済みJSONのうち構成一覧だけを使う
        const stored = JSON.parse(raw) as {configs?: unknown}
        // 配列でない場合は構成なしとして扱う
        const configs = Array.isArray(stored.configs) ? stored.configs : []

        // 確認に必要なID・名前・パーツ数だけを取り出す
        return configs.map((config) => {
            // 構成1件分の保存内容
            const record = config as {
                id?: unknown
                name?: unknown
                parts?: unknown
            }

            return {
                id: typeof record.id === "string" ? record.id : "",
                name: typeof record.name === "string" ? record.name : "",
                partsCount: Array.isArray(record.parts)
                    ? record.parts.length
                    : 0,
            }
        })
    }, COLLECTION_STORAGE_KEY)
}

// localStorageに記録された構成の由来アカウントIDを読み取る
async function readLocalOrigin(page: Page): Promise<string | null> {
    return page.evaluate((originKey) =>
        window.localStorage.getItem(originKey), ORIGIN_STORAGE_KEY)
}

// 保存構成一覧のJSONから、確認済みの項目を取り出す
function parseAccountBuilds(value: unknown): AccountBuild[] {
    // 配列以外は保存構成一覧として扱えない
    if (!Array.isArray(value)) {
        throw new Error("保存構成一覧を取得できませんでした")
    }

    return value.map((build) => {
        // 構成1件分の保存内容
        const record = build as Record<string, unknown>

        // ID・版・名前・パーツがそろわない構成は確認に使えない
        if (
            typeof record.id !== "string" ||
            typeof record.version !== "number" ||
            typeof record.name !== "string" ||
            !Array.isArray(record.parts)
        ) {
            throw new Error("保存構成の項目を取得できませんでした")
        }

        return {
            id: record.id,
            version: record.version,
            name: record.name,
            partsCount: record.parts.length,
        }
    })
}

// アカウントの保存構成一覧をAPIから取得
async function fetchAccountBuilds(page: Page): Promise<AccountBuild[]> {
    // 保存構成一覧の応答
    const response = await page.request.get("/api/builds")
    expect(response.ok()).toBe(true)

    return parseAccountBuilds(await response.json())
}

// 名前からアカウントの保存構成を1件取り出す
async function findAccountBuild(
    page: Page,
    name: string,
): Promise<AccountBuild> {
    // アカウントの保存構成一覧
    const builds = await fetchAccountBuilds(page)
    // 名前が一致する構成
    const build = builds.find((candidate) => candidate.name === name)

    // 見つからない場合はテストの前提が崩れているため止める
    if (!build) {
        throw new Error(`保存構成が見つかりません: ${name}`)
    }

    return build
}

// 現在ログイン中のユーザーIDをセッションAPIから取得
async function readSessionUserId(page: Page): Promise<string> {
    // セッション取得の応答
    const response = await page.request.get("/api/auth/session")
    expect(response.ok()).toBe(true)
    // セッション取得のJSON本文
    const payload = await response.json() as {
        authenticated?: unknown // 認証済みか
        user?: {id?: unknown} // ログイン中のユーザー
    }

    // 認証済みでユーザーIDが文字列のときだけ返す
    if (
        payload.authenticated !== true ||
        typeof payload.user?.id !== "string"
    ) {
        throw new Error("ログイン中のユーザーIDを取得できませんでした")
    }

    return payload.user.id
}

// アカウントの保存構成をすべて削除する
async function clearAccountBuilds(page: Page): Promise<void> {
    // CSRFトークン取得の応答
    const csrfResponse = await page.request.get("/api/auth/csrf")
    expect(csrfResponse.ok()).toBe(true)
    // CSRFトークンを含む応答
    const csrfPayload = await csrfResponse.json() as {csrfToken?: unknown}

    // トークンが無い場合は構成を削除できない
    if (typeof csrfPayload.csrfToken !== "string") {
        throw new Error("CSRFトークンを取得できませんでした")
    }

    // 削除対象のアカウント構成
    const builds = await fetchAccountBuilds(page)

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

// アカウントを空にして未ログイン状態から始める
async function clearAccountAndReturnLoggedOut(
    page: Page,
    auth: Pick<AuthFixture, "loginAs">,
    header: Header,
    profile: MockGoogleProfile,
): Promise<void> {
    await auth.loginAs(profile)
    await clearAccountBuilds(page)
    // ログイン直後の初期構成を用意し、引き継ぎ時の置き換え対象にする
    await ensureInitialAccountConfig(page)
    // 次の確認が未ログインの初期状態から始まるようCookieと保存領域を消す
    await page.context().clearCookies()
    await page.evaluate(() => {
        window.localStorage.clear()
        window.sessionStorage.clear()
    })
    await page.goto("/")
    await expect(header.loginButton).toBeVisible()
}

// 候補パーツ一覧の先頭（最初のフレーム）を選択
async function selectFirstFrame(page: Page): Promise<void> {
    // 候補パーツ一覧
    const candidateTable = page.getByRole("table", {name: "候補パーツ一覧"})
    // 先頭の候補行
    const firstRow = candidateTable.locator("tbody tr").first()

    await expect(firstRow).toBeVisible()

    // 一覧の再描画でフォーカスが外れる場合に備え、選択できるまでキー操作を繰り返す
    await expect(async () => {
        // 行内のバリエーション操作と競合しないよう、キーボードで選択
        await firstRow.focus()
        await page.keyboard.press("Enter")
        // 選択内容が候補行へ反映されたことを確認
        await expect(firstRow).toHaveAttribute("aria-selected", "true", {
            timeout: 1_000,
        })
    }).toPass({timeout: 10_000})
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
    const addDialog = page.getByRole("dialog", {name: "新しい構成を追加"})
    await expect(addDialog).toBeVisible()
    await addDialog.getByRole("textbox").fill(name)
    await addDialog.getByRole("button", {name: "追加する"}).click()
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

// 構成サイドバーを開き、一覧の読み込み完了まで待つ
async function openConfigSidebar(
    page: Page,
    configList: ConfigList,
): Promise<void> {
    // カテゴリー取得後にシミュレーターが描画されるまで待つ
    await expect(page.getByText("選択中の構成", {exact: true})).toBeVisible()
    // スマホ幅のときだけ一覧を開く
    await configList.openIfMobile()
    // 構成一覧の読み込み完了を、構成数バッジの表示で待つ
    await expect(configList.countBadge).toHaveText(/^\d+ \/ 20$/)
}

// 保存構成一覧のGET回数を数える
function countBuildsRequests(page: Page): () => number {
    // 数えたGET回数
    let count = 0

    page.on("response", (response) => {
        // 保存構成一覧のGETだけを数える
        if (
            response.request().method() === "GET" &&
            new URL(response.url()).pathname === "/api/builds"
        ) {
            count += 1
        }
    })

    return () => count
}

// 通信完了後の再描画を2フレーム分待つ
async function waitForStableRender(page: Page): Promise<void> {
    await page.evaluate(() => new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve())
        })
    }))
}

// モックGoogleのユーザー切替を確認
test.describe("モックGoogleのユーザー切替", () => {
    // 制御エンドポイントの設定がユーザー情報応答へ反映されることを保証
    test("制御エンドポイントでログインプロフィールを切り替えられる", async () => {
        await setMockGoogleProfile(USER_A)
        expect(await fetchMockGoogleProfile()).toEqual(USER_A)

        // 既定プロフィールへ戻せることも確認
        await setMockGoogleProfile(DEFAULT_MOCK_PROFILE)
        expect(await fetchMockGoogleProfile()).toEqual(DEFAULT_MOCK_PROFILE)
    })
})

// ログインとログアウトをまたいだ構成の引き継ぎを確認
test.describe("ログインをまたぐ構成の引き継ぎ", () => {
    // 未ログインの構成を1件だけ引き継ぎ、再ログインで重複しないことを保証
    test("構成を引き継いで再ログインしても重複しない", async ({
        page,
        header,
        configList,
        auth,
    }) => {
        // 複数回のログインと画面更新を含むため、上限時間を延ばす
        test.slow()
        await page.goto("/")
        // 前回の実行で残ったAの構成とブラウザ保存を消す
        await clearAccountAndReturnLoggedOut(page, auth, header, USER_A)
        await expect(activeConfigNameCard(page)).toHaveText("構成1")

        // 未ログインでパーツ付きの構成を2件作る
        await selectFirstFrame(page)
        await waitForLocalConfigParts(page, "構成1", 1)
        await addConfigFromCurrentParts(page, configList, "構成2")
        await waitForLocalConfigParts(page, "構成2", 1)
        await closeMobileSidebar(page)

        // Aでログインし、構成2だけを引き継ぐ
        await auth.loginAs(USER_A)
        // 引き継ぎダイアログ
        const dialog = migrationDialog(page)
        await expect(dialog).toBeVisible({timeout: 20_000})
        await expect(
            dialog.getByText(/一致 0件.*新規 2件.*上限超過 0件/),
        ).toBeVisible()
        await expect(
            dialog.getByText("2件を選択中", {exact: true}),
        ).toBeVisible()
        // 構成1の選択を外して構成2だけを残す
        await dialog.getByRole("checkbox", {name: "構成1を引き継ぐ"}).click()
        await expect(
            dialog.getByText("1件を選択中", {exact: true}),
        ).toBeVisible()
        await dialog.getByRole("button", {name: "選択した構成を保存"}).click()
        await expect(dialog).toBeHidden()

        // アカウントに構成2だけが保存されたことを確認
        const migratedBuild = await findAccountBuild(page, "構成2")
        expect(migratedBuild.partsCount).toBe(1)
        expect(
            (await fetchAccountBuilds(page)).map((build) => build.name),
        ).toEqual(["構成2"])
        // 同じAの再ログインを確認するためのユーザーID
        const userId = await readSessionUserId(page)
        await openConfigSidebar(page, configList)
        await expect(configList.countBadge).toHaveText("1 / 20")
        await expect(configList.savedBuildButton("構成2")).toBeVisible()
        await expect(configList.savedBuildButton("構成1")).toBeHidden()
        await closeMobileSidebar(page)

        // ログアウト時の保存でブラウザ保存がサーバー構成へ置き換わる
        await auth.logout()
        await expect.poll(() => readLocalConfigs(page)).toEqual([{
            id: migratedBuild.id,
            name: "構成2",
            partsCount: 1,
        }])
        await expect.poll(() => readLocalOrigin(page)).toBe(userId)

        // 同じAで再ログインすると、すべて一致するためダイアログが出ない
        const buildsRequestCount = countBuildsRequests(page)
        await auth.loginAs(USER_A)
        await expect.poll(buildsRequestCount).toBeGreaterThanOrEqual(2)
        await waitForStableRender(page)
        await expect(dialog).toBeHidden()
        expect(await readSessionUserId(page)).toBe(userId)
        // 再ログイン後の一覧は構成2だけ
        await openConfigSidebar(page, configList)
        await expect(configList.countBadge).toHaveText("1 / 20")
        await expect(configList.savedBuildButton("構成2")).toBeVisible()
        await expect(configList.savedBuildButton("構成1")).toBeHidden()
        await closeMobileSidebar(page)

        // 再ログアウトでもブラウザ保存は構成2のまま重複・消失しない
        await expect(
            (await fetchAccountBuilds(page)).map((build) => build.name),
        ).toEqual(["構成2"])
        await auth.logout()
        await expect.poll(() => readLocalConfigs(page)).toEqual([{
            id: migratedBuild.id,
            name: "構成2",
            partsCount: 1,
        }])
        await expect.poll(() => readLocalOrigin(page)).toBe(userId)
    })
})

// 複数ユーザー間で保存構成が分離されることを確認
test.describe("複数ユーザーの構成分離", () => {
    // 別ユーザーには一覧が見えず、IDを直接指定しても404になることを保証
    test("別ユーザーの構成は一覧にも直接取得にも現れない", async ({
        page,
        header,
        configList,
        auth,
    }) => {
        // 複数回のログインと画面更新を含むため、上限時間を延ばす
        test.slow()
        await page.goto("/")
        // Aでログインし、前回の実行で残った構成を消す
        await auth.loginAs(USER_A)
        await clearAccountBuilds(page)
        await page.reload()
        await expect(header.accountMenuButton).toBeVisible({
            timeout: 20_000,
        })
        await expect(activeConfigNameCard(page)).toHaveText("構成1")

        // 構成1へフレームを選び、Aの構成として自動保存する
        const autoSaveResponse = page.waitForResponse((response) => {
            // 構成の上書きAPIの応答か
            return response.request().method() === "PUT" &&
                new URL(response.url()).pathname.startsWith("/api/builds/")
        })
        await selectFirstFrame(page)
        await autoSaveResponse

        // Aだけが持つ名前の構成を作り、後で直接取得するIDを控える
        await addConfigFromCurrentParts(page, configList, "Aの構成")
        await closeMobileSidebar(page)
        const aBuild = await findAccountBuild(page, "Aの構成")
        const aUserId = await readSessionUserId(page)

        // Aの構成をブラウザへ保存してログアウト
        await auth.logout()

        // Bでログインし、A由来のブラウザ構成が移行されないことを確認
        await auth.loginAs(USER_B)
        await openConfigSidebar(page, configList)
        await waitForStableRender(page)
        await expect(migrationDialog(page)).toBeHidden()
        expect(await readSessionUserId(page)).not.toBe(aUserId)
        // Bの一覧にAの構成が無い
        await expect(configList.savedBuildButton("Aの構成")).toBeHidden()
        await closeMobileSidebar(page)

        // BからAの構成IDを直接取得すると404
        const directResponse = await page.request.get(
            `/api/builds/${encodeURIComponent(aBuild.id)}`,
        )
        expect(directResponse.status()).toBe(404)
        // 未所有の構成も存在しないものとして返すことを確認
        const directPayload = await directResponse.json() as {
            error?: {code?: unknown}
        }
        expect(directPayload.error?.code).toBe("SAVED_BUILD_NOT_FOUND")

        // BからログアウトしてAへ戻る
        await auth.logout()
        await auth.loginAs(USER_A)
        await openConfigSidebar(page, configList)
        await waitForStableRender(page)
        await expect(migrationDialog(page)).toBeHidden()
        expect(await readSessionUserId(page)).toBe(aUserId)

        // Aの一覧には自分の構成が見える
        await expect(configList.savedBuildButton("Aの構成")).toBeVisible()
        await expect(configList.savedBuildButton("構成1")).toBeVisible()
    })
})

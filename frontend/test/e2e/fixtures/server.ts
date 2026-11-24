import type { Locator, Page, Response } from "@playwright/test"

import type { ConfigList } from "./pages/ConfigList"
import type { Header } from "./pages/Header"
import type { SimulatorPage } from "./pages/SimulatorPage"
import { resetBrowserState } from "./storage"
import { expect } from "./test"

// 構成の上限件数（api/src/db/saved-build-repository.tsと同じ値）
export const MAX_SERVER_CONFIGS = 20
// 構成の表示順キーの接頭辞（画面のconfigRules.tsと同じ形式）
const CONFIG_ITEM_KEY_PREFIX = "config:"

// fixtures/test.tsのauthと同じ形のログイン操作
export type ServerAuth = {
    login: () => Promise<void> // モックGoogle経由のログイン
}

// 保存構成APIが返す構成の検証済み項目
export type ServerBuild = {
    id: string // 構成ID
    name: string // 構成名
    version: number // 楽観ロック用の版番号
    parts: ServerBuildPart[] // 保存済みパーツ
}

// 保存構成に含まれるパーツ
export type ServerBuildPart = {
    slotKey: string // 構成内のパーツ位置
    partId: number // パーツID
}

// サーバーモードを開くために必要な操作対象
export type ServerModeContext = {
    page: Page // 操作対象のページ
    header: Header // 共通ヘッダー
    simulatorPage: SimulatorPage // シミュレーター画面
    configList: ConfigList // 構成選択サイドバー
    auth: ServerAuth // ログイン操作
}

// 保存構成のパーツ1件を検証し、検証済みのパーツへ変換
function parseServerBuildPart(payload: unknown): ServerBuildPart {
    // パーツ1件分の応答
    const record = payload as Record<string, unknown>

    // オブジェクト以外はパーツとして扱えない
    if (typeof payload !== "object" || payload === null) {
        throw new Error("保存構成のパーツを取得できませんでした")
    }

    // スロットキーとパーツIDがそろわないパーツは比較に使えない
    if (
        typeof record.slotKey !== "string" ||
        typeof record.partId !== "number"
    ) {
        throw new Error("保存構成のパーツを取得できませんでした")
    }

    return { slotKey: record.slotKey, partId: record.partId }
}

// 保存構成1件の応答を検証し、検証済みの構成へ変換
function parseServerBuild(payload: unknown): ServerBuild {
    // 構成1件分の応答
    const record = payload as Record<string, unknown>

    // オブジェクト以外は保存構成として扱えない
    if (typeof payload !== "object" || payload === null) {
        throw new Error("保存構成のレスポンスを解釈できませんでした")
    }

    // 応答から取り出した構成の項目
    const id = record.id // 構成ID
    const name = record.name // 構成名
    const version = record.version // 版番号
    const partsValue = record.parts // パーツ一覧

    // ID・名前・版・パーツがそろわない構成は一覧の比較に使えない
    if (
        typeof id !== "string" ||
        typeof name !== "string" ||
        typeof version !== "number" ||
        !Array.isArray(partsValue)
    ) {
        throw new Error("保存構成の項目を取得できませんでした")
    }

    // 検証済みのパーツ
    const parts = partsValue.map(parseServerBuildPart)

    return { id, name, version, parts }
}

// 保存構成一覧の応答を検証し、検証済みの一覧へ変換
function parseServerBuilds(payload: unknown): ServerBuild[] {
    // 配列以外は保存構成一覧として扱えない
    if (!Array.isArray(payload)) {
        throw new Error("保存構成一覧を取得できませんでした")
    }

    return payload.map(parseServerBuild)
}

// CSRFトークンを取得し、変更系APIの本文へ載せる
async function fetchCsrfToken(page: Page): Promise<string> {
    // CSRFトークン取得の応答
    const response = await page.request.get("/api/auth/csrf")
    expect(response.ok()).toBe(true)
    // CSRFトークンを含む応答本文
    const payload = await response.json() as { csrfToken?: unknown }

    // 文字列のトークンが無い場合は変更操作を続けられない
    if (
        typeof payload.csrfToken !== "string" ||
        payload.csrfToken.length === 0
    ) {
        throw new Error("CSRFトークンを取得できませんでした")
    }

    return payload.csrfToken
}

// ログイン中の保存構成一覧を取得
export async function fetchServerBuilds(page: Page): Promise<ServerBuild[]> {
    // 保存構成一覧の応答
    const response = await page.request.get("/api/builds")
    expect(response.ok()).toBe(true)

    return parseServerBuilds(await response.json())
}

// 保存構成一覧からID一致の構成を1件取得
export async function fetchServerBuild(
    page: Page,
    buildId: string,
): Promise<ServerBuild> {
    // 現在の保存構成一覧
    const builds = await fetchServerBuilds(page)
    // IDが一致する保存構成
    const build = builds.find((candidate) => candidate.id === buildId)

    // 対象の構成が消えている場合は比較を続けられない
    if (!build) {
        throw new Error(`保存構成が見つかりません: ${buildId}`)
    }

    return build
}

// ログイン中の構成表示順を取得
export async function fetchServerConfigOrder(
    page: Page,
): Promise<string[]> {
    const response = await page.request.get("/api/config-order") // 構成の表示順の応答
    expect(response.ok()).toBe(true)
    const payload = await response.json() as { items?: unknown } // 構成キーの配列を含む応答本文
    const items = payload.items // 応答から取り出した表示順キー

    // 文字列だけの配列でない場合は表示順として扱えない
    if (
        !Array.isArray(items) ||
        !items.every((item) => typeof item === "string")
    ) {
        throw new Error("構成の並び順を取得できませんでした")
    }

    return items as string[]
}

// 指定した保存構成を版一致確認付きで削除
async function deleteServerBuilds(
    page: Page,
    builds: ServerBuild[],
): Promise<void> {
    // 削除対象が無ければトークン取得も省略
    if (builds.length === 0) {
        return
    }

    // 一連の削除で使い回すCSRFトークン
    const csrfToken = await fetchCsrfToken(page)

    for (const build of builds) {
        // 版一致を条件に1件削除
        const response = await page.request.delete(
            `/api/builds/${encodeURIComponent(build.id)}`,
            { data: { version: build.version, csrfToken } },
        )
        expect(response.ok()).toBe(true)
    }
}

// ログイン中のアカウントの保存構成をすべて削除
export async function deleteAllServerBuilds(page: Page): Promise<void> {
    // 削除対象の保存構成一覧
    const builds = await fetchServerBuilds(page)
    await deleteServerBuilds(page, builds)
}

// テスト後の後片付けとして、ログイン中なら保存構成を空へ戻す
export async function clearAccountBuildsAfterTest(
    page: Page,
): Promise<void> {
    // ログイン状態の確認を兼ねた保存構成一覧の応答
    const response = await page.request.get("/api/builds")

    // 未ログインならアカウントの構成を操作できないため終了
    if (response.status() === 401) {
        return
    }

    expect(response.ok()).toBe(true)
    // 削除対象の保存構成
    const builds = parseServerBuilds(await response.json())

    await deleteServerBuilds(page, builds)
}

// 構成が1件も無ければサーバーに初期構成を用意させる
export async function ensureInitialServerConfig(page: Page): Promise<void> {
    // 初期構成の作成を兼ねた保存構成一覧の取得
    const response = await page.request.get("/api/builds")
    expect(response.ok()).toBe(true)
}

// 指定した名前の保存構成をAPIでまとめて作成
export async function createServerBuilds(
    page: Page,
    names: string[],
): Promise<ServerBuild[]> {
    // 連続作成で使い回すCSRFトークン
    const csrfToken = await fetchCsrfToken(page)
    // 作成した保存構成
    const created: ServerBuild[] = []

    for (const name of names) {
        // 空の構成として1件作成
        const response = await page.request.post("/api/builds", {
            data: { name, parts: [], csrfToken },
        })
        expect(response.status()).toBe(201)
        created.push(parseServerBuild(await response.json()))
    }

    return created
}

// 保存構成の名前をAPIで変更し、変更後の構成を返す
export async function renameServerBuild(
    page: Page,
    build: ServerBuild,
    name: string,
): Promise<ServerBuild> {
    // 名前だけを変更するPATCHのCSRFトークン
    const csrfToken = await fetchCsrfToken(page)
    // 変更後の保存構成の応答
    const response = await page.request.patch(
        `/api/builds/${encodeURIComponent(build.id)}`,
        { data: { name, version: build.version, csrfToken } },
    )
    expect(response.ok()).toBe(true)

    return parseServerBuild(await response.json())
}

// 保存構成をAPIで1件削除
export async function deleteServerBuild(
    page: Page,
    build: ServerBuild,
): Promise<void> {
    await deleteServerBuilds(page, [build])
}

// 保存構成IDから表示順キーを作成
export function configItemKey(buildId: string): string {
    return `${CONFIG_ITEM_KEY_PREFIX}${buildId}`
}

// 表示順キーを保存構成の名前に置き換える
export function orderToConfigNames(
    order: string[],
    builds: ServerBuild[],
): string[] {
    // 表示順キーから構成名を引く対応表
    const nameByItemKey = new Map(builds.map((build) => [
        configItemKey(build.id),
        build.name,
    ]))

    return order.map((itemKey) => nameByItemKey.get(itemKey) ?? "")
}

// 名前から保存構成を1件取得
export function findServerBuild(
    builds: ServerBuild[],
    name: string,
): ServerBuild {
    // 名前が一致する保存構成
    const build = builds.find((candidate) => candidate.name === name)

    // 対象が無い場合は後続の比較を続けられない
    if (!build) {
        throw new Error(`保存構成が見つかりません: ${name}`)
    }

    return build
}

// 構成一覧のサイドバーを表示し、構成数の読み込み完了まで待つ
export async function openConfigSidebar(
    configList: ConfigList,
): Promise<void> {
    // スマホ幅で閉じているときだけ開く
    if (!(await configList.root.isVisible())) {
        await configList.openTrigger.click()
    }

    await expect(configList.root).toBeVisible()
    await expect(configList.countBadge).toHaveText(/^\d+ \/ \d+$/)
}

// スマホ幅の構成一覧シートを閉じ、シミュレーターを操作できる状態へ戻す
export async function closeConfigSidebar(
    configList: ConfigList,
): Promise<void> {
    // デスクトップ幅では常時表示のため閉じない
    if ((configList.page.viewportSize()?.width ?? 0) >= 768) {
        return
    }

    // 既に閉じている場合は操作しない
    if (!(await configList.root.isVisible())) {
        return
    }

    // シート内のフォーカスごとEscapeで閉じる
    await configList.page.keyboard.press("Escape")
    await expect(configList.root).toBeHidden()
}

// 構成一覧に表示されている構成名をDOM順で返す
export async function readVisibleConfigNames(
    configList: ConfigList,
): Promise<string[]> {
    // 並び替えハンドルのラベル（構成名＋を並び替え）
    const labels = await configList.root
        .getByRole("button", { name: /を並び替え$/ })
        .evaluateAll((buttons) => buttons.map((button) =>
            button.getAttribute("aria-label") ?? ""))

    return labels.map((label) => label.replace(/を並び替え$/, ""))
}

// 構成一覧に表示されたエラー通知
export function configAlert(configList: ConfigList): Locator {
    return configList.root.getByRole("alert")
}

// 失敗した操作のダイアログをキャンセルで閉じる
export async function cancelDialog(dialog: Locator): Promise<void> {
    // ダイアログのキャンセルボタン
    const cancelButton = dialog.getByRole("button", { name: "キャンセル" })
    await expect(cancelButton).toBeEnabled()
    await cancelButton.click()
    await expect(dialog).toBeHidden()
}

// 構成の操作メニューから項目を選ぶ
async function chooseConfigMenu(
    page: Page,
    configList: ConfigList,
    configName: string,
    itemName: string,
): Promise<void> {
    await openConfigSidebar(configList)
    // 対象構成の操作メニュー
    const menuButton = configList.root.getByRole("button", {
        name: `${configName}の操作メニュー`,
    })
    await menuButton.click()
    await page.getByRole("menuitem", { name: itemName, exact: true }).click()
}

// 追加ダイアログを開き、構成名を入力
export async function openCreateDialog(
    page: Page,
    configList: ConfigList,
    name: string,
): Promise<Locator> {
    await openConfigSidebar(configList)
    await configList.addButton.click()
    // 構成の追加ダイアログ
    const dialog = page.getByRole("dialog", { name: "新しい構成を追加" })
    await expect(dialog).toBeVisible()
    await dialog.getByRole("textbox").fill(name)

    return dialog
}

// 名前変更ダイアログを開き、新しい構成名を入力
export async function openRenameDialog(
    page: Page,
    configList: ConfigList,
    currentName: string,
    nextName: string,
): Promise<Locator> {
    await chooseConfigMenu(page, configList, currentName, "名前変更")
    // 構成の名前変更ダイアログ
    const dialog = page.getByRole("dialog", { name: "構成の名前を変更" })
    await expect(dialog).toBeVisible()
    await dialog.getByRole("textbox").fill(nextName)

    return dialog
}

// クリア確認ダイアログを開く
export async function openClearDialog(
    page: Page,
    configList: ConfigList,
    configName: string,
): Promise<Locator> {
    await chooseConfigMenu(page, configList, configName, "クリア")
    // パーツ解除の確認ダイアログ
    const dialog = page.getByRole("dialog", {
        name: `「${configName}」をクリアしますか？`,
    })
    await expect(dialog).toBeVisible()

    return dialog
}

// 削除確認ダイアログを開く
export async function openDeleteDialog(
    page: Page,
    configList: ConfigList,
    configName: string,
): Promise<Locator> {
    await chooseConfigMenu(page, configList, configName, "削除")
    // 構成の削除確認ダイアログ
    const dialog = page.getByRole("dialog", { name: "構成を削除" })
    await expect(dialog).toBeVisible()

    return dialog
}

// 構成の変更操作と表示順保存が終わるまで待つ
export async function waitForConfigOperationIdle(
    configList: ConfigList,
    configName: string,
): Promise<void> {
    // 操作中は無効になる対象構成の操作メニュー
    const menuButton = configList.root.getByRole("button", {
        name: `${configName}の操作メニュー`,
    })
    await expect(menuButton).toBeEnabled()
}

// 追加ダイアログから構成を作成し、一覧と表示順の反映まで待つ
export async function createConfig(
    page: Page,
    configList: ConfigList,
    name: string,
): Promise<void> {
    // 構成の追加ダイアログ
    const dialog = await openCreateDialog(page, configList, name)
    // 追加を確定するボタン
    const confirmButton = dialog.getByRole("button", { name: "追加する" })
    await expect(confirmButton).toBeEnabled()
    await confirmButton.click()
    await expect(dialog).toBeHidden()
    await expect(configList.savedBuildButton(name)).toBeVisible()
    // 作成後の表示順保存が終わるまで操作メニューの有効化を待つ
    await waitForConfigOperationIdle(configList, name)
}

// 名前変更ダイアログから構成名を変更し、一覧への反映まで待つ
export async function renameConfig(
    page: Page,
    configList: ConfigList,
    currentName: string,
    nextName: string,
): Promise<void> {
    // 構成の名前変更ダイアログ
    const dialog = await openRenameDialog(
        page,
        configList,
        currentName,
        nextName,
    )
    // 変更を確定するボタン
    const confirmButton = dialog.getByRole("button", { name: "変更する" })
    await expect(confirmButton).toBeEnabled()
    await confirmButton.click()
    await expect(dialog).toBeHidden()
    await expect(configList.savedBuildButton(nextName)).toBeVisible()
}

// クリア確認から構成のパーツを解除
export async function clearConfig(
    page: Page,
    configList: ConfigList,
    configName: string,
): Promise<void> {
    // パーツ解除の確認ダイアログ
    const dialog = await openClearDialog(page, configList, configName)
    await dialog.getByRole("button", { name: "クリア", exact: true }).click()
    await expect(dialog).toBeHidden()
}

// 削除確認から構成を削除
export async function deleteConfig(
    page: Page,
    configList: ConfigList,
    configName: string,
): Promise<void> {
    // 構成の削除確認ダイアログ
    const dialog = await openDeleteDialog(page, configList, configName)
    await dialog.getByRole("button", { name: "削除する" }).click()
    await expect(dialog).toBeHidden()
}

// 画面の表示順とサーバー保存の表示順が期待どおりになるまで待つ
export async function waitForConfigOrder(
    page: Page,
    configList: ConfigList,
    expectedNames: string[],
): Promise<void> {
    await expect.poll(() => readVisibleConfigNames(configList))
        .toEqual(expectedNames)
    await expect.poll(async () => {
        // サーバー保存の構成一覧と表示順
        const builds = await fetchServerBuilds(page)
        const order = await fetchServerConfigOrder(page)

        return orderToConfigNames(order, builds)
    }).toEqual(expectedNames)
}

// 候補パーツ一覧の指定位置のフレームをキーボードで選択
export async function selectFrameCandidate(
    page: Page,
    simulatorPage: SimulatorPage,
    index: number,
): Promise<void> {
    // 候補行のうち選択可能な行
    const candidate = simulatorPage.candidatePartsTable
        .locator("tbody tr[aria-selected]")
        .nth(index)
    await expect(candidate).toBeVisible()
    await candidate.focus()
    await page.keyboard.press("Enter")
    await expect(candidate).toHaveAttribute("aria-selected", "true")
}

// 自動保存の構成更新応答を待つ
export function waitForBuildUpdateResponse(page: Page): Promise<Response> {
    return page.waitForResponse((response) => {
        // 構成の上書きAPI（PUT）か
        if (response.request().method() !== "PUT") {
            return false
        }

        return new URL(response.url()).pathname.startsWith("/api/builds/")
    })
}

// 指定したメソッドの構成API応答を待つ
export function waitForBuildMutationResponse(
    page: Page,
    method: "POST" | "PATCH" | "DELETE",
): Promise<Response> {
    return page.waitForResponse((response) => {
        // 対象メソッド以外は対象外
        if (response.request().method() !== method) {
            return false
        }

        return new URL(response.url()).pathname.startsWith("/api/builds")
    })
}

// 先頭のフレームを選び、自動保存の完了まで待つ
export async function selectFirstFrameAndWait(
    page: Page,
    simulatorPage: SimulatorPage,
    configList: ConfigList,
    configName: string,
): Promise<void> {
    // スマホ幅で構成一覧が候補パーツを覆わないよう閉じる
    await closeConfigSidebar(configList)
    // 自動保存の構成更新応答
    const saveResponse = waitForBuildUpdateResponse(page)
    await selectFrameCandidate(page, simulatorPage, 0)
    // 保存結果の応答
    const response = await saveResponse
    expect(response.ok()).toBe(true)
    // 変更操作の完了を一覧の操作メニューで確認できるよう開き直す
    await openConfigSidebar(configList)
    await waitForConfigOperationIdle(configList, configName)
}

// 構成をドラッグして対象構成の位置へ移動
export async function dragConfigBelow(
    page: Page,
    configList: ConfigList,
    sourceName: string,
    targetName: string,
): Promise<void> {
    await openConfigSidebar(configList)
    // ドラッグ元の並び替えハンドル
    const sourceHandle = configList.root.getByRole("button", {
        name: `${sourceName}を並び替え`,
    })
    // ドロップ先の構成行
    const targetItem = configList.root
        .locator('[data-slot="sortable-item"]')
        .filter({
            has: page.getByRole("button", {
                name: `${targetName}を並び替え`,
            }),
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
    // 対象構成の行中央への縦移動とドロップ
    await page.mouse.move(
        startX,
        targetBox.y + targetBox.height / 2,
        { steps: 10 },
    )
    await page.mouse.up()
}

// ページを再読み込みし、ログイン中の一覧と表示順の読み込み完了まで待つ
export async function reloadServerMode(
    page: Page,
    header: Header,
    configList: ConfigList,
): Promise<void> {
    // 再読み込み後の保存構成一覧の取得
    const buildsResponse = page.waitForResponse((response) => {
        // 保存構成一覧のGETだけを待つ
        return response.request().method() === "GET" &&
            new URL(response.url()).pathname === "/api/builds"
    })
    // 再読み込み後の構成表示順の取得
    const orderResponse = page.waitForResponse((response) => {
        // 構成表示順のGETだけを待つ
        return response.request().method() === "GET" &&
            new URL(response.url()).pathname === "/api/config-order"
    })

    await page.reload()
    await buildsResponse
    await orderResponse
    await expect(header.accountMenuButton).toBeVisible({ timeout: 20_000 })
    await openConfigSidebar(configList)
}

// ログイン中のサーバーモードを構成1だけの状態で開く
export async function openServerMode(
    context: ServerModeContext,
): Promise<void> {
    const { page, header, simulatorPage, configList, auth } = context
    await resetBrowserState(page)
    await simulatorPage.goto()

    // モックGoogle経由のログイン
    await auth.login()
    // 前のテストが残した保存構成を削除
    await deleteAllServerBuilds(page)
    // 表示順の取得が空にならないよう初期構成を用意
    await ensureInitialServerConfig(page)
    // 構成1だけのサーバー状態で画面を作り直す
    await reloadServerMode(page, header, configList)

    await expect(configList.countBadge).toHaveText(
        `1 / ${MAX_SERVER_CONFIGS}`,
    )
    // 選択中構成の読み込み完了を、選択ボタンの状態で待つ
    await expect(configList.savedBuildButton("構成1"))
        .toHaveAttribute("aria-current", "true")
    await expect(configList.savedBuildButton("構成1")).toBeEnabled()
}

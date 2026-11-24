import type { Locator, Page } from "@playwright/test"

import { resetBrowserState } from "../fixtures/storage"
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
const INITIAL_CONFIG_NAME = "はじめての構成" // 初期表示で確認する構成名
const SECOND_CONFIG_NAME = "レース用" // 構成の切り替えで選ぶ2件目の構成名
const SECOND_CONFIG_PART_NAME = "WH-RS710-C46-TL" // 2件目の構成のホイール名の一部

// NumberFlowが描画に使う値（合計金額・重量の読み取り用）
type NumberFlowData = {
    _data?: {
        value?: number // 描画中の数値
    }
}

// 見出し名から上部のサマリーカードを取得
function summaryCard(page: Page, title: string): Locator {
    return page.locator('[data-slot="card"]').filter({ hasText: title })
}

// 合計金額・完成重量カードが表示している数値を読む
async function readSummaryNumber(card: Locator): Promise<number> {
    // NumberFlowは数字を影DOMへ分けて描画するため、描画元の値を使う
    const value = await card.locator("number-flow-react").evaluate(
        (element) => (element as unknown as NumberFlowData)._data?.value,
    )

    return typeof value === "number" ? value : Number.NaN
}

// 構成をlocalStorageへ保存し、テスト開始時の状態を用意
async function seedConfigCollection(
    page: Page,
    configs: SeedConfig[],
): Promise<void> {
    // 前のテストのセッションCookieを消して未ログイン状態にする
    await page.context().clearCookies()
    await page.addInitScript(
        (seed) => {
            // 前のテストの保存内容を消してから構成一覧を入れる
            window.localStorage.clear()
            window.sessionStorage.clear()
            window.localStorage.setItem(seed.key, JSON.stringify({
                configs: seed.configs,
                order: seed.configs.map((config) => `config:${config.id}`),
            }))
        },
        { key: COLLECTION_STORAGE_KEY, configs },
    )
}

// 候補パーツ表にデータ行が出るまで待つ
async function waitForCandidateRows(table: Locator): Promise<void> {
    // 読み込み中・空状態の行は1セルなので、複数セルの行が出るまで待つ
    await expect.poll(
        () => table.locator("tbody tr").first().locator("td").count(),
    ).toBeGreaterThan(1)
}

// 候補表の各行のブランド名を読む
async function readBrands(table: Locator): Promise<string[]> {
    return await table.locator("tbody tr").evaluateAll((rows) =>
        rows.map((row) => row.querySelector("td")?.textContent?.trim() ?? ""))
}

// 候補表の見出し名から列位置を求める
async function findColumnIndex(
    table: Locator,
    headerName: string,
): Promise<number> {
    // 列見出しの表示名（左から順）
    const headers = await table.getByRole("columnheader").allInnerTexts()
    // 見出し名が一致する列の位置（見つからなければ-1）
    const index = headers.findIndex((header) => header.trim() === headerName)

    // 見出しが無ければ列を特定できないため原因を明示して止める
    if (index < 0) {
        throw new Error(`候補パーツ表に見出し「${headerName}」がありません`)
    }

    return index
}

// 候補表の指定列を全行から読む
async function readColumn(
    table: Locator,
    columnIndex: number,
): Promise<string[]> {
    return await table.locator("tbody tr").evaluateAll(
        (rows, index) => rows.map((row) =>
            row.querySelectorAll("td")[index]?.textContent?.trim() ?? ""),
        columnIndex,
    )
}

// 「1,137g」のような重量表示から数値を取り出す
function parseWeight(text: string): number {
    // 桁区切りを含む重量の数値部分
    const match = text.match(/([\d,]+)g/)

    return match ? Number(match[1].replaceAll(",", "")) : Number.NaN
}

// 「￥670,000」のような価格表示から数値を取り出す
function parsePrice(text: string): number {
    // 通貨記号と桁区切りを除いた数値部分
    const digits = text.replace(/[^\d]/g, "")

    return digits ? Number(digits) : Number.NaN
}

// 候補表の行から指定列のセル文字列を読む
async function readRowCell(
    row: Locator,
    columnIndex: number,
): Promise<string> {
    return await row.getByRole("cell").nth(columnIndex).innerText()
}

// 数値が昇順に並んでいるか判定
function isAscending(values: number[]): boolean {
    return values.every((value, index) =>
        index === 0 || values[index - 1] <= value)
}

// 数値が降順に並んでいるか判定
function isDescending(values: number[]): boolean {
    return values.every((value, index) =>
        index === 0 || values[index - 1] >= value)
}

// 候補表の先頭行の製品名セルを押して選択
async function selectFirstCandidate(table: Locator): Promise<void> {
    // 行の中央ではなく製品名セルを押し、バリエーション選択と取り違えない
    await table.locator("tbody tr").first().getByRole("cell").nth(1).click()
}

// シミュレーター画面の表示・絞り込み・選択・構成切り替えを確認
test.describe("シミュレーター画面", () => {
    // トップ表示・構成名・合計金額・完成重量の初期値を保証
    test("初期表示を確認する", async ({ page, simulatorPage }) => {
        // 空の構成を1件だけ用意し、構成名の初期表示を固定
        await seedConfigCollection(page, [{
            id: "e2e-initial",
            name: INITIAL_CONFIG_NAME,
            parts: [],
        }])
        await simulatorPage.goto()

        // ページタイトル
        await expect(page).toHaveTitle("barakann-kun")

        // 選択中の構成カードに保存した構成名が出る
        const configCard = summaryCard(page, "選択中の構成")
        await expect(configCard).toBeVisible()
        await expect(configCard.getByText(INITIAL_CONFIG_NAME)).toBeVisible()

        // 合計金額・完成重量は未選択のため0
        const priceCard = summaryCard(page, "合計金額")
        const weightCard = summaryCard(page, "完成重量")
        await expect(priceCard).toBeVisible()
        await expect(weightCard).toBeVisible()
        await expect.poll(() => readSummaryNumber(priceCard)).toBe(0)
        await expect.poll(() => readSummaryNumber(weightCard)).toBe(0)

        // 選択済み・候補のパーツ一覧
        await expect(simulatorPage.selectedPartsTable).toBeVisible()
        await expect(simulatorPage.candidatePartsTable).toBeVisible()
    })

    // フレーム候補をブランドで絞り込み、重量で並び替えて選択できることを保証
    test("フレーム候補を絞り込み・並び替えして選択する", async ({
        page,
        simulatorPage,
    }) => {
        // Cookieと保存領域を消し、未ログインの初期状態から始める
        await resetBrowserState(page)
        await simulatorPage.goto()
        // 候補パーツ表
        const table = simulatorPage.candidatePartsTable
        await waitForCandidateRows(table)

        const initialBrands = await readBrands(table) // 絞り込み前のブランド一覧
        const initialCount = initialBrands.length // 絞り込み前の候補数
        const targetBrand = initialBrands[0] // 絞り込み対象のブランド

        // 絞り込みメニューからメーカーのサブメニューを開く
        await page.getByRole("button", { name: "絞り込み" }).click()
        await page.getByRole("menuitem", { name: "メーカー" }).hover()
        // 先頭行と同じブランドだけに絞る
        const brandOption = page.getByRole("menuitemcheckbox", {
            name: targetBrand,
            exact: true,
        })
        await expect(brandOption).toBeVisible()
        await brandOption.click()

        // 絞り込み後は全行が選んだブランドになり、件数も減る
        await expect.poll(async () =>
            (await readBrands(table)).every((brand) => brand === targetBrand),
        ).toBe(true)
        await expect.poll(async () => (await readBrands(table)).length)
            .toBeLessThan(initialCount)

        // 同じブランドをもう一度押して絞り込みを解除
        await brandOption.click()
        await expect.poll(async () => (await readBrands(table)).length)
            .toBe(initialCount)
        // 開いたままのメニューを閉じ、次の並び替え操作を妨げない
        await page.keyboard.press("Escape")
        await page.keyboard.press("Escape")
        await expect(page.getByRole("menu")).toHaveCount(0)

        // 重量列の位置と見出しボタン
        const weightIndex = await findColumnIndex(table, "重量")
        // 重量の並び替えボタン
        const weightHeader = table.getByRole("button", {
            name: "重量",
            exact: true,
        })

        // 1回目の押下で重量の昇順に並ぶ
        await weightHeader.click()
        await expect.poll(async () => {
            // 現在の並びの重量一覧
            const weights = (await readColumn(table, weightIndex)).map(parseWeight)

            return isAscending(weights)
        }).toBe(true)

        // 2回目の押下で重量の降順に並ぶ
        await weightHeader.click()
        await expect.poll(async () => {
            // 現在の並びの重量一覧
            const weights = (await readColumn(table, weightIndex)).map(parseWeight)

            return isDescending(weights)
        }).toBe(true)

        // 先頭のフレームを選び、合計金額・完成重量が0より大きくなる
        await selectFirstCandidate(table)
        await expect(table.locator("tbody tr").first())
            .toHaveAttribute("aria-selected", "true")
        await expect.poll(() =>
            readSummaryNumber(summaryCard(page, "合計金額")),
        ).toBeGreaterThan(0)
        await expect.poll(() =>
            readSummaryNumber(summaryCard(page, "完成重量")),
        ).toBeGreaterThan(0)
    })

    // 合計金額・重量が候補行の価格・重量の合計と一致することを保証
    test("パーツ選択で合計金額・重量が更新される", async ({
        page,
        simulatorPage,
    }) => {
        // Cookieと保存領域を消し、未ログインの初期状態から始める
        await resetBrowserState(page)
        await simulatorPage.goto()
        // 候補パーツ表
        const table = simulatorPage.candidatePartsTable
        await waitForCandidateRows(table)

        // 重量加算する付属品が無いフレームに絞り、行の表示値を期待値に使う
        await page.getByRole("searchbox", { name: "検索" }).fill("Cannondale")
        // 絞り込んだフレームの候補行
        const frameRow = table.locator("tbody tr")
            .filter({ hasText: "Cannondale" })
            .first()
        await expect(frameRow).toBeVisible()

        // フレームの価格の列位置
        const framePriceIndex = await findColumnIndex(table, "価格")
        // フレームの候補行から読んだ価格
        const framePrice = parsePrice(
            await readRowCell(frameRow, framePriceIndex),
        )

        // フレームを選択し、合計金額が候補行の価格と一致する
        await frameRow.getByRole("cell").nth(1).click()
        await expect(table.locator("tbody tr").first())
            .toHaveAttribute("aria-selected", "true")
        const priceCard = summaryCard(page, "合計金額") // 合計金額カード
        const weightCard = summaryCard(page, "完成重量") // 完成重量カード
        await expect.poll(() => readSummaryNumber(priceCard)).toBe(framePrice)
        // 付属品の重量を含む、フレーム選択直後の合計重量
        const frameTotalWeight = await readSummaryNumber(weightCard)
        // 付属品の価格を含む、フレーム選択直後の合計金額
        const frameTotalPrice = await readSummaryNumber(priceCard)

        // 選択済み一覧のサドル行へ選択枠を移す
        const saddleRow = simulatorPage.selectedPartsTable.getByRole("row", {
            name: /サドル/,
        })
        await saddleRow.click()
        await expect(saddleRow).toHaveAttribute("aria-selected", "true")
        await waitForCandidateRows(table)

        // サドルの価格・重量の列位置（列構成が変わるため読み直す）
        const saddlePriceIndex = await findColumnIndex(table, "価格")
        const saddleWeightIndex = await findColumnIndex(table, "重量")
        // 選択するサドルの候補行から読んだ価格・重量
        const saddleCandidateRow = table.locator("tbody tr").first()
        const saddlePrice = parsePrice(
            await readRowCell(saddleCandidateRow, saddlePriceIndex),
        )
        const saddleWeight = parseWeight(
            await readRowCell(saddleCandidateRow, saddleWeightIndex),
        )

        // サドル選択後の合計が、フレームとサドルの行の合計と一致する
        await selectFirstCandidate(table)
        await expect.poll(() => readSummaryNumber(priceCard))
            .toBe(frameTotalPrice + saddlePrice)
        await expect.poll(() => readSummaryNumber(weightCard))
            .toBe(frameTotalWeight + saddleWeight)
        await expect(saddleRow.getByText("未選択")).toHaveCount(0)
    })

    // フレームと規格が合わないパーツへ非互換の警告が出ることを保証
    test("非互換の組み合わせに警告を表示する", async ({
        page,
        simulatorPage,
    }) => {
        // Cookieと保存領域を消し、未ログインの初期状態から始める
        await resetBrowserState(page)
        await simulatorPage.goto()
        // 候補パーツ表
        const table = simulatorPage.candidatePartsTable
        await waitForCandidateRows(table)

        // 検索でBB規格を持つフレームを1件に絞る
        await page.getByRole("searchbox", { name: "検索" }).fill("Cervelo")
        await expect(table.locator("tbody tr").first()).toContainText("Cervelo")
        await selectFirstCandidate(table)
        await expect(table.locator("tbody tr").first())
            .toHaveAttribute("aria-selected", "true")

        // 選択済み一覧のボトムブラケット行へ選択枠を移す
        const bottomBracketRow = simulatorPage.selectedPartsTable.getByRole(
            "row",
            { name: /ボトムブラケット/ },
        )
        await bottomBracketRow.click()
        await expect(bottomBracketRow).toHaveAttribute("aria-selected", "true")
        await waitForCandidateRows(table)

        // フレームのBB規格と合わない候補行
        const incompatibleRows = table.locator('tbody tr[aria-disabled="true"]')
        // 非互換行が表示されるまで待つ
        await expect.poll(() => incompatibleRows.count()).toBeGreaterThan(0)
        // 非互換行の件数
        const incompatibleCount = await incompatibleRows.count()
        // 非互換バッジと非互換行の件数が同じ
        await expect(table.getByText("非互換", { exact: true }))
            .toHaveCount(incompatibleCount)

        // 非互換行は、同じ行で選択不可とBB規格の理由を持つ
        for (let index = 0; index < incompatibleCount; index++) {
            // 非互換の候補行
            const row = incompatibleRows.nth(index)
            await expect(row).toHaveAttribute("aria-disabled", "true")
            await expect(
                row.getByText("非互換", { exact: true }),
            ).toBeVisible()
            await expect(row).toContainText(/BB規格（フレーム：/)
        }
    })

    // サイドバーから構成を切り替えると構成名と選択内容が変わることを保証
    test("サイドバーから構成を選ぶ", async ({
        page,
        configList,
        simulatorPage,
    }) => {
        // パーツ構成が異なる2件の構成を用意
        await seedConfigCollection(page, [
            {
                id: "e2e-config-a",
                name: "通勤用",
                parts: [{
                    slotKey: "handlebar",
                    partId: 48,
                    price: 6660,
                    weight: 304,
                }],
            },
            {
                id: "e2e-config-b",
                name: SECOND_CONFIG_NAME,
                parts: [{
                    slotKey: "wheel",
                    partId: 93,
                    price: 129000,
                    weight: 1612,
                }],
            },
        ])
        await simulatorPage.goto()
        await expect(simulatorPage.activeConfigCard).toBeVisible()

        // スマホ幅のときだけ開くボタンからサイドバーを表示
        await configList.openIfMobile()

        // 2件目の構成を選ぶ
        const secondBuildButton = configList.savedBuildButton(SECOND_CONFIG_NAME)
        await expect(secondBuildButton).toBeVisible()
        await secondBuildButton.click()

        // 上部カードの構成名が切り替わる
        await expect(
            summaryCard(page, "選択中の構成").getByText(SECOND_CONFIG_NAME),
        ).toBeVisible()
        await expect(secondBuildButton).toHaveAttribute("aria-current", "true")

        // 保存されていたホイールが選択済み一覧へ復元される
        // スマホ幅は構成選択シートが開いたままなので、閉じてから確認
        if (test.info().project.name === "mobile") {
            await configList.root
                .getByRole("button", { name: "構成選択を開閉" })
                .click()
            await expect(configList.root).toHaveCount(0)
        }
        // 復元されたホイールの行
        const selectedWheelRow = simulatorPage.selectedPartsTable
            .getByRole("row", { name: /ホイール/ })
        await selectedWheelRow.scrollIntoViewIfNeeded()
        await expect(selectedWheelRow).toBeVisible()
        await expect(selectedWheelRow).toContainText(SECOND_CONFIG_PART_NAME)
        // 合計金額・完成重量も選択内容に合わせて更新される
        await expect.poll(() =>
            readSummaryNumber(summaryCard(page, "合計金額")),
        ).toBeGreaterThan(0)
        await expect.poll(() =>
            readSummaryNumber(summaryCard(page, "完成重量")),
        ).toBeGreaterThan(0)
    })
})

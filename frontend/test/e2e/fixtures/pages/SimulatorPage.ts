import type { Locator, Page } from "@playwright/test"

// シミュレーター画面（トップページ）
export class SimulatorPage {
    readonly page: Page // 操作対象のページ
    readonly selectedPartsTable: Locator // 選択済みパーツ一覧
    readonly candidatePartsTable: Locator // 候補パーツ一覧
    readonly activeConfigCard: Locator // 選択中の構成カード
    readonly totalPriceCard: Locator // 合計金額カード
    readonly totalWeightCard: Locator // 完成重量カード

    // 画面内の要素をページから引く
    constructor(page: Page) {
        this.page = page
        this.selectedPartsTable = page.getByRole("table", {
            name: "選択済みパーツ一覧",
        })
        this.candidatePartsTable = page.getByRole("table", {
            name: "候補パーツ一覧",
        })
        this.activeConfigCard = page.getByText("選択中の構成", { exact: true })
        this.totalPriceCard = page.getByText("合計金額", { exact: true })
        this.totalWeightCard = page.getByText("完成重量", { exact: true })
    }

    // トップページを開く
    async goto(): Promise<void> {
        await this.page.goto("/")
    }
}

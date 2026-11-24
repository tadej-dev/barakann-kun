import type { Locator, Page } from "@playwright/test"

// シミュレーターの構成選択サイドバー
export class ConfigList {
    readonly page: Page // 操作対象のページ
    readonly root: Locator // サイドバー全体
    readonly openTrigger: Locator // スマホ幅でサイドバーを開くボタン
    readonly addButton: Locator // 新しい構成を追加するボタン
    readonly comparisonButton: Locator // 構成の比較を開くボタン
    readonly bulkDeleteButton: Locator // 選択した構成の一括削除ボタン
    readonly countBadge: Locator // 構成の使用数

    // サイドバー内の要素をページから引く
    constructor(page: Page) {
        this.page = page
        this.root = page.locator('[data-slot="sidebar"]')
        this.openTrigger = page.getByRole("button", { name: "構成選択を開く" })
        this.addButton = this.root.getByRole("button", {
            name: "新しい構成を追加",
        })
        this.comparisonButton = this.root.getByRole("button", {
            name: "比較",
            exact: true,
        })
        this.bulkDeleteButton = this.root.getByRole("button", {
            name: /一括削除/,
        })
        this.countBadge = this.root.locator('[aria-label="構成数"]')
    }

    // スマホ幅のときだけサイドバーを開く
    async openIfMobile(): Promise<void> {
        // 開くボタンが表示されている場合だけ押す
        // モバイル幅のときだけサイドバーを開く
        if ((this.page.viewportSize()?.width ?? 0) < 768) {
            await this.openTrigger.waitFor({state: "visible"})
            await this.openTrigger.click()
        }
    }

    // 名前から保存済み構成を選ぶボタン
    savedBuildButton(name: string): Locator {
        return this.root.getByRole("button", { name: `${name}を選択` })
    }
}

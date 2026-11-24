import type { Locator, Page } from "@playwright/test"

// 全ページ共通のヘッダー
export class Header {
    readonly page: Page // 操作対象のページ
    readonly root: Locator // ヘッダー全体
    readonly brandButton: Locator // トップページへ戻るボタン
    readonly loginButton: Locator // Googleログインを開始するボタン
    readonly accountMenuButton: Locator // アカウントメニューを開くボタン
    readonly siteMenuButton: Locator // サイト内メニューの開閉ボタン

    // ヘッダー内の要素をページから引く
    constructor(page: Page) {
        this.page = page
        this.root = page.getByRole("banner")
        this.brandButton = this.root.getByRole("button", {
            name: "barakann-kun シミュレーターへ戻る",
        })
        this.loginButton = this.root.getByRole("button", { name: /ログイン/ })
        this.accountMenuButton = this.root.getByRole("button", {
            name: "アカウントメニューを開く",
        })
        this.siteMenuButton = this.root.getByRole("button", {
            name: /サイト内メニューを/,
        })
    }

    // サイト内メニューを開く
    async openSiteMenu(): Promise<void> {
        await this.siteMenuButton.click()
    }

    // アカウントメニューを開く
    async openAccountMenu(): Promise<void> {
        await this.accountMenuButton.click()
    }

    // サイト内メニューから固定ページを開く
    async openSitePage(label: string): Promise<void> {
        await this.openSiteMenu()
        await this.page.getByRole("menuitem", { name: label }).click()
    }
}

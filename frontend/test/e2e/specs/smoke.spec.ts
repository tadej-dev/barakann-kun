import { expect, test } from "../fixtures/test"

// トップページ・ヘッダー・フッターの最小限の表示を確認
test.describe("スモークテスト", () => {
    // トップページの主要な表示を保証
    test("トップページを表示する", async ({ page, header, simulatorPage }) => {
        // トップページを開く
        await simulatorPage.goto()

        // ページタイトル
        await expect(page).toHaveTitle("barakann-kun")
        // ヘッダーと未ログインのログイン導線
        await expect(header.root).toBeVisible()
        await expect(header.brandButton).toBeVisible()
        await expect(header.loginButton).toBeVisible()
        await expect(header.siteMenuButton).toBeVisible()
        // シミュレーターの構成カードとパーツ一覧
        await expect(simulatorPage.activeConfigCard).toBeVisible()
        await expect(simulatorPage.totalPriceCard).toBeVisible()
        await expect(simulatorPage.totalWeightCard).toBeVisible()
        await expect(simulatorPage.selectedPartsTable).toBeVisible()
        await expect(simulatorPage.candidatePartsTable).toBeVisible()
    })

    // ヘッダーのサイト内メニューから固定ページへ移動できることを保証
    test("ヘッダーから使い方ページへ移動する", async ({ page, header }) => {
        // トップページを開く
        await page.goto("/")
        // ヘッダーの三本線メニューから使い方ページを開く
        await header.openSitePage("使い方")

        await expect(page).toHaveURL(/\/guide$/)
        await expect(
            page.getByRole("heading", { name: "使い方", level: 1 }),
        ).toBeVisible()
    })

    // フッターのリンクと著作権表示を保証
    test("フッターに各ページへのリンクを表示する", async ({ page }) => {
        // トップページを開く
        await page.goto("/")

        // フッター全体
        const footer = page.getByRole("contentinfo")
        await expect(footer).toBeVisible()
        await expect(footer.getByText("© 2026 barakann-kun")).toBeVisible()

        // フッターのナビゲーション
        const navigation = footer.getByRole("navigation", {
            name: "フッターナビゲーション",
        })
        await expect(navigation).toBeVisible()
        // 各固定ページへのリンク先
        await expect(
            navigation.getByRole("link", { name: "使い方" }),
        ).toHaveAttribute("href", "/guide")
        await expect(
            navigation.getByRole("link", { name: "利用規約" }),
        ).toHaveAttribute("href", "/terms")
        await expect(
            navigation.getByRole("link", { name: "プライバシーポリシー" }),
        ).toHaveAttribute("href", "/privacy")
    })
})

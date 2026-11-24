import { expect, test } from "../fixtures/test"

// ヘッダーとフッターから開ける固定ページ
const sitePages = [
    { label: "使い方", path: "/guide" }, // 保存先と引き継ぎの説明
    { label: "利用規約", path: "/terms" }, // サービスの利用条件
    { label: "プライバシーポリシー", path: "/privacy" }, // 情報の取り扱い
]

// 使い方ページの主要な見出し
const guideHeadings = [
    { text: "使い方", level: 1 }, // ページ全体の見出し
    {
        text: "1台の端末を1人で使う前提です",
        level: 2,
    }, // 共有端末を想定しない前提
    { text: "構成の保存先", level: 2 }, // 未ログインとログイン中の保存先
    {
        text: "ログインすると、ブラウザの構成を引き継げます",
        level: 2,
    }, // ログイン時の移行
    {
        text: "ログアウトすると、構成をブラウザへ保存します",
        level: 2,
    }, // ログアウト時の保存
    { text: "構成の数と自動保存", level: 2 }, // 上限と自動保存
] as const

// ヘッダーの三本線メニューから固定ページへ移動できることを確認
test.describe("ヘッダーメニューのナビゲーション", () => {
    // 固定ページごとにメニューからの遷移を確認
    for (const sitePage of sitePages) {
        // 三本線メニューから対象ページを開き、URLと見出しを確認
        test(`${sitePage.label}ページをヘッダーメニューから開ける`, async ({
            page,
            header,
        }) => {
            // トップページを開く
            await page.goto("/")
            // ヘッダーの三本線メニューから対象ページを開く
            await header.openSitePage(sitePage.label)

            // URLが固定ページへ変わったことを確認
            await expect(page).toHaveURL(new RegExp(`${sitePage.path}$`))
            // 固定ページの見出しが表示されたことを確認
            await expect(
                page.getByRole("heading", {
                    name: sitePage.label,
                    level: 1,
                }),
            ).toBeVisible()
        })
    }
})

// フッターの3リンクから固定ページへ移動できることを確認
test.describe("フッターのナビゲーション", () => {
    // 固定ページごとにフッターからの遷移を確認
    for (const sitePage of sitePages) {
        // フッターリンクから対象ページを開き、URLと見出しを確認
        test(`フッターから${sitePage.label}ページを開ける`, async ({ page }) => {
            // トップページを開く
            await page.goto("/")

            // フッターのナビゲーションから対象ページを開く
            await page
                .getByRole("contentinfo")
                .getByRole("navigation", {
                    name: "フッターナビゲーション",
                })
                .getByRole("link", { name: sitePage.label })
                .click()

            // URLが固定ページへ変わったことを確認
            await expect(page).toHaveURL(new RegExp(`${sitePage.path}$`))
            // 固定ページの見出しが表示されたことを確認
            await expect(
                page.getByRole("heading", {
                    name: sitePage.label,
                    level: 1,
                }),
            ).toBeVisible()
        })
    }
})

// 使い方ページの内容が利用者へ伝わることを確認
test.describe("使い方ページ", () => {
    // 主要な見出しと、1台の端末を1人で使う前提を確認
    test("主要な見出しと利用前提を表示する", async ({ page }) => {
        // 使い方ページを開く
        await page.goto("/guide")

        // 主要な見出しを順に確認
        for (const heading of guideHeadings) {
            await expect(
                page.getByRole("heading", {
                    name: heading.text,
                    level: heading.level,
                }),
            ).toBeVisible()
        }

        // 共有端末を想定しない前提の本文を確認
        await expect(
            page.getByText("1台の端末を1人で使うことを想定しています。"),
        ).toBeVisible()
    })

    // 未ログインの状態でも三本線メニューを開けることを確認
    test("未ログインでもヘッダーメニューを開ける", async ({
        page,
        header,
    }) => {
        // トップページを開く
        await page.goto("/")
        // 未ログインであることをログイン導線で確認
        await expect(header.loginButton).toBeVisible()

        // ヘッダーの三本線メニューを開く
        await header.openSiteMenu()

        // メニューが展開されたことを確認
        await expect(header.siteMenuButton).toHaveAttribute(
            "aria-expanded",
            "true",
        )
        // 3つの固定ページを選べることを確認
        for (const sitePage of sitePages) {
            await expect(
                page.getByRole("menuitem", { name: sitePage.label }),
            ).toBeVisible()
        }
    })
})

import { expect, test } from "../fixtures/test"

// スマホ幅でもヘッダーのメニューを開けることを確認
test.describe("ヘッダー", () => {
    // 三本線メニューからサイト内ページの項目を確認
    test("三本線メニューからサイト内ページを選べる", async ({
        page,
        header,
    }) => {
        // トップページを開く
        await page.goto("/")
        // ヘッダーの三本線メニューを開く
        await header.openSiteMenu()

        // メニューが展開されたことを確認
        await expect(header.siteMenuButton).toHaveAttribute(
            "aria-expanded",
            "true",
        )
        // サイト内ページの項目が表示されることを確認
        await expect(
            page.getByRole("menuitem", { name: "使い方" }),
        ).toBeVisible()
        await expect(
            page.getByRole("menuitem", { name: "利用規約" }),
        ).toBeVisible()
        await expect(
            page.getByRole("menuitem", { name: "プライバシーポリシー" }),
        ).toBeVisible()
    })
})

// スマホ幅のサイドバーと構成カードの操作を確認
test.describe("構成サイドバー", () => {
    // サイドバーを開き、構成カードの選択と操作メニューを確認
    test("構成サイドバーと構成カードを操作できる", async ({
        page,
        configList,
    }) => {
        // トップページを開く
        await page.goto("/")
        // Page Objectの表示判定が初回描画を待てないため、一覧の描画を待つ
        await expect(
            page.getByRole("table", { name: "選択済みパーツ一覧" }),
        ).toBeVisible()
        // スマホ幅のときだけサイドバーを開く
        await configList.openIfMobile()

        // サイドバーと構成数が表示されることを確認
        await expect(configList.root).toBeVisible()
        await expect(configList.countBadge).toBeVisible()

        // 構成カードを選択
        const card = configList.root.getByRole("button", {
            name: "構成1を選択",
            exact: true,
        })
        await card.click()
        // 選択中の状態が支援技術へ伝わることを確認
        await expect(card).toHaveAttribute("aria-current", "true")

        // 構成カードの操作メニューを開く
        await configList.root
            .getByRole("button", {
                name: "構成1の操作メニュー",
                exact: true,
            })
            .click()
        // 名前変更などの操作を選べることを確認
        await expect(
            page.getByRole("menuitem", { name: "名前変更" }),
        ).toBeVisible()
    })

    // スマホ幅でサイドバーがSheetとして開閉することを確認
    test("スマホ幅ではサイドバーをSheetとして開ける", async ({
        page,
        configList,
    }, testInfo) => {
        // スマホ幅のプロジェクトだけ確認
        test.skip(testInfo.project.name !== "mobile", "スマホ幅のプロジェクトのみ")

        // トップページを開く
        await page.goto("/")
        // 閉じている間はサイドバーが描画されないことを確認
        await expect(configList.root).toHaveCount(0)
        // Page Objectの表示判定が初回描画を待てないため、一覧の描画を待つ
        await expect(
            page.getByRole("table", { name: "選択済みパーツ一覧" }),
        ).toBeVisible()

        // 構成選択ボタンからSheetを開く
        await configList.openIfMobile()

        // Sheetがダイアログとして表示されることを確認
        await expect(page.getByRole("dialog", { name: "Sidebar" })).toBeVisible()
        await expect(configList.root).toHaveAttribute("data-mobile", "true")
        // Sheet内の構成カードが表示されることを確認
        await expect(
            configList.root.getByRole("button", {
                name: "構成1を選択",
                exact: true,
            }),
        ).toBeVisible()

        // Sheetの開閉ボタンで閉じる
        await configList.root
            .getByRole("button", { name: "構成選択を開閉" })
            .click()
        // 閉じた後にサイドバーが残らないことを確認
        await expect(configList.root).toHaveCount(0)
    })
})

// 主要なダイアログが画面内に収まることを確認
test.describe("ダイアログの表示", () => {
    // 構成名変更ダイアログの画面内表示とキャンセルを確認
    test("構成名変更ダイアログが画面内に収まる", async ({
        page,
        configList,
    }) => {
        // トップページを開き、スマホ幅ではサイドバーを開く
        await page.goto("/")
        // Page Objectの表示判定が初回描画を待てないため、一覧の描画を待つ
        await expect(
            page.getByRole("table", { name: "選択済みパーツ一覧" }),
        ).toBeVisible()
        await configList.openIfMobile()

        // 構成一覧の読み込みが終わってから操作する
        await expect(
            configList.root.getByRole("button", {
                name: "構成1を選択",
                exact: true,
            }),
        ).toBeVisible()

        // 構成カードの操作メニューから名前変更を開く
        await configList.root
            .getByRole("button", {
                name: "構成1の操作メニュー",
                exact: true,
            })
            .click()
        await page.getByRole("menuitem", { name: "名前変更" }).click()

        // 構成名変更ダイアログを取得
        const dialog = page.getByRole("dialog", {
            name: "構成の名前を変更",
        })
        await expect(dialog).toBeVisible()

        // ダイアログ全体と主要な操作が画面内に収まることを確認
        await expect(dialog).toBeInViewport({ ratio: 1 })
        await expect(
            dialog.getByRole("textbox", { name: "構成名" }),
        ).toBeInViewport({ ratio: 1 })
        await expect(
            dialog.getByRole("button", { name: "変更する" }),
        ).toBeInViewport({ ratio: 1 })

        // キャンセルでダイアログを閉じられることを確認
        await dialog.getByRole("button", { name: "キャンセル" }).click()
        await expect(dialog).toBeHidden()
    })

    // スマホ幅の追加ダイアログの画面内表示とキャンセルを確認
    test("追加ダイアログがスマホ画面内に収まる", async ({
        page,
        configList,
    }, testInfo) => {
        // スマホ幅のプロジェクトだけ確認
        test.skip(testInfo.project.name !== "mobile", "スマホ幅のプロジェクトのみ")

        // トップページを開き、サイドバーを開く
        await page.goto("/")
        // Page Objectの表示判定が初回描画を待てないため、一覧の描画を待つ
        await expect(
            page.getByRole("table", { name: "選択済みパーツ一覧" }),
        ).toBeVisible()
        await configList.openIfMobile()

        // 構成一覧の読み込みが終わってから操作する
        await expect(
            configList.root.getByRole("button", {
                name: "構成1を選択",
                exact: true,
            }),
        ).toBeVisible()

        // 新しい構成の追加ダイアログを開く
        await configList.addButton.click()
        const dialog = page.getByRole("dialog", {
            name: "新しい構成を追加",
        })
        await expect(dialog).toBeVisible()

        // ダイアログ全体と主要な操作が画面内に収まることを確認
        await expect(dialog).toBeInViewport({ ratio: 1 })
        await expect(
            dialog.getByRole("textbox", { name: "構成名" }),
        ).toBeInViewport({ ratio: 1 })
        await expect(
            dialog.getByRole("button", { name: "追加する" }),
        ).toBeInViewport({ ratio: 1 })

        // キャンセルでダイアログを閉じられることを確認
        await dialog.getByRole("button", { name: "キャンセル" }).click()
        await expect(dialog).toBeHidden()
    })
})

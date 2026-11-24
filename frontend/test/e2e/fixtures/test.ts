import { expect, test as base } from "@playwright/test"

import {
    DEFAULT_MOCK_PROFILE,
    setMockGoogleProfile,
    type MockGoogleProfile,
} from "./multiuser"
import { ConfigList } from "./pages/ConfigList"
import { Header } from "./pages/Header"
import { SimulatorPage } from "./pages/SimulatorPage"

// モックGoogle経由のログイン操作
export type AuthFixture = {
    login: () => Promise<void> // 既定プロフィールでログインしてアカウント表示を待つ
    loginAs: (profile: MockGoogleProfile) => Promise<void> // 指定プロフィールでログインしてアカウント表示を待つ
    logout: () => Promise<void> // ログアウトしてログイン導線へ戻す
}

// E2Eテストから利用できる共通fixture
type E2EFixtures = {
    header: Header // 共通ヘッダー
    configList: ConfigList // 構成選択サイドバー
    simulatorPage: SimulatorPage // シミュレーター画面
    auth: AuthFixture // ログイン操作
}

// ページオブジェクトと認証操作を足したE2E用test
export const test = base.extend<E2EFixtures>({
    // 共通ヘッダーのPage Objectを提供
    header: async ({ page }, use) => {
        await use(new Header(page))
    },
    // 構成選択サイドバーのPage Objectを提供
    configList: async ({ page }, use) => {
        await use(new ConfigList(page))
    },
    // シミュレーター画面のPage Objectを提供
    simulatorPage: async ({ page }, use) => {
        await use(new SimulatorPage(page))
    },
    // モックGoogleを使うログイン・ログアウト操作を提供
    auth: async ({ page, header }, use) => {
        // モックGoogleのプロフィールを設定してからログイン
        async function loginWithProfile(
            profile: MockGoogleProfile,
        ): Promise<void> {
            // 制御エンドポイントで次回ログインのプロフィールを切り替える
            await setMockGoogleProfile(profile)
            await header.loginButton.click()
            // 認証後の再描画でアカウントメニューが出るまで待つ
            await expect(header.accountMenuButton).toBeVisible({
                timeout: 20_000,
            })
        }

        // テストへ渡す認証操作
        const auth: AuthFixture = {
            // 既定プロフィールでのログイン
            async login() {
                // 前のテストが切り替えたプロフィールを残さず既定へ戻す
                await loginWithProfile(DEFAULT_MOCK_PROFILE)
            },
            // 指定プロフィールでのログイン
            async loginAs(profile) {
                await loginWithProfile(profile)
            },
            // アカウントメニューからのログアウト
            async logout() {
                await header.openAccountMenu()
                await page.getByRole("menuitem", { name: "ログアウト" }).click()
                // 保存完了のダイアログが出たら閉じる
                const closeButton = page.getByRole("button", { name: "閉じる" })
                await expect(closeButton).toBeVisible()
                await closeButton.click()
                // ログアウト後にログイン導線へ戻ったことを確認
                await expect(header.loginButton).toBeVisible()
            },
        }

        await use(auth)
    },
})

export { expect }

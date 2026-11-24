import type { Page } from "@playwright/test"

// ブラウザ保存の構成データ初期化
export async function clearBrowserStorage(page: Page): Promise<void> {
    // 初回描画前に保存領域を消し、前のテストの構成を読み込ませない
    await page.addInitScript(() => {
        window.localStorage.clear()
        window.sessionStorage.clear()
    })
}

// Cookieとブラウザ保存を初期化し、未ログイン状態から始める
export async function resetBrowserState(page: Page): Promise<void> {
    // 前のテストで残ったセッションCookieを消す
    await page.context().clearCookies()
    await clearBrowserStorage(page)
}

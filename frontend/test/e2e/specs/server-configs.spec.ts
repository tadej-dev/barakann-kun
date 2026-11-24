import { expect, test } from "../fixtures/test"
import {
    cancelDialog,
    clearAccountBuildsAfterTest,
    clearConfig,
    closeConfigSidebar,
    configAlert,
    configItemKey,
    createConfig,
    createServerBuilds,
    deleteConfig,
    deleteServerBuild,
    dragConfigBelow,
    fetchServerBuild,
    fetchServerBuilds,
    fetchServerConfigOrder,
    findServerBuild,
    MAX_SERVER_CONFIGS,
    openConfigSidebar,
    openCreateDialog,
    openDeleteDialog,
    openRenameDialog,
    openServerMode,
    reloadServerMode,
    renameConfig,
    renameServerBuild,
    selectFirstFrameAndWait,
    selectFrameCandidate,
    waitForBuildMutationResponse,
    waitForBuildUpdateResponse,
    waitForConfigOrder,
} from "../fixtures/server"

// ログイン中の構成一覧・表示順・エラー処理をサーバーAPIと突き合わせて確認
test.describe("サーバー保存の構成管理", () => {
    // 各テストの後にアカウントの構成を空へ戻し、次のテストへ残さない
    test.afterEach(async ({ page }) => {
        await clearAccountBuildsAfterTest(page)
    })

    // 構成の作成・名前変更・クリア・削除がサーバーへ保存されることを保証
    test("構成を作成・名前変更・クリア・削除できる", async ({
        page,
        header,
        simulatorPage,
        configList,
        auth,
    }) => {
        // 画面更新と複数のAPI操作を含むため、上限時間を延ばす
        test.slow()
        await openServerMode({ page, header, simulatorPage, configList, auth })

        // 複製元のパーツを用意するため、構成1の先頭フレームを選ぶ
        await selectFirstFrameAndWait(
            page,
            simulatorPage,
            configList,
            "構成1",
        )
        const baseBuilds = await fetchServerBuilds(page)
        const baseBuild = findServerBuild(baseBuilds, "構成1")
        expect(baseBuild.parts).toHaveLength(1)

        // 選択中パーツを複製して構成を3件作成
        await createConfig(page, configList, "通勤用")
        await createConfig(page, configList, "週末用")
        await createConfig(page, configList, "山道用")
        await expect(configList.countBadge).toHaveText(
            `4 / ${MAX_SERVER_CONFIGS}`,
        )

        // 2件目の構成名を変更
        await renameConfig(page, configList, "週末用", "週末ライド")
        await expect(configList.savedBuildButton("週末ライド")).toBeVisible()

        // 1件目のパーツを解除
        await clearConfig(page, configList, "通勤用")
        const clearedBuilds = await fetchServerBuilds(page)
        expect(findServerBuild(clearedBuilds, "通勤用").parts)
            .toHaveLength(0)

        // 3件目の構成を削除
        await deleteConfig(page, configList, "山道用")
        await expect(configList.savedBuildButton("山道用")).toBeHidden()
        await expect(configList.countBadge).toHaveText(
            `3 / ${MAX_SERVER_CONFIGS}`,
        )

        // 再読み込み後も一覧・表示順・パーツがAPIと一致
        await reloadServerMode(page, header, configList)
        const expectedNames = ["構成1", "通勤用", "週末ライド"]
        await waitForConfigOrder(page, configList, expectedNames)
        const reloadedBuilds = await fetchServerBuilds(page)
        expect([...reloadedBuilds.map((build) => build.name)].sort())
            .toEqual([...expectedNames].sort())
        expect(findServerBuild(reloadedBuilds, "通勤用").parts)
            .toHaveLength(0)
        expect(findServerBuild(reloadedBuilds, "週末ライド").parts)
            .toHaveLength(1)
    })

    // ドラッグで並び替えた表示順がサーバーへ保存されることを保証
    test("構成を並び替えるとサーバーの表示順と一致する", async ({
        page,
        header,
        simulatorPage,
        configList,
        auth,
    }) => {
        await openServerMode({ page, header, simulatorPage, configList, auth })
        await createConfig(page, configList, "構成A")
        await createConfig(page, configList, "構成B")

        // 先頭の構成1を構成Aの下へ移動
        await dragConfigBelow(page, configList, "構成1", "構成A")

        const expectedNames = ["構成A", "構成1", "構成B"] // 並び替え後の構成名
        await waitForConfigOrder(page, configList, expectedNames)

        // /api/config-orderが並び替え後の順序を返す
        const builds = await fetchServerBuilds(page) // 現在の保存構成一覧
        const order = await fetchServerConfigOrder(page) // 保存済みの表示順キー
        expect(order).toEqual([
            configItemKey(findServerBuild(builds, "構成A").id),
            configItemKey(findServerBuild(builds, "構成1").id),
            configItemKey(findServerBuild(builds, "構成B").id),
        ])

        // 再読み込み後の表示順も同じ
        await reloadServerMode(page, header, configList)
        await waitForConfigOrder(page, configList, expectedNames)
    })

    // 別経路で版が進んだ構成の改名が競合し、再読み込みで回復することを保証
    test("改名が競合すると通知し、再読み込みで回復する", async ({
        page,
        header,
        simulatorPage,
        configList,
        auth,
    }) => {
        await openServerMode({ page, header, simulatorPage, configList, auth })
        const initialBuild = findServerBuild(
            await fetchServerBuilds(page),
            "構成1",
        )

        // 別端末相当のAPI更新で版を進める
        await renameServerBuild(page, initialBuild, "別端末で変更")

        // 古い版のまま画面から改名し、409を確認
        const dialog = await openRenameDialog(
            page,
            configList,
            "構成1",
            "競合後の名前",
        )
        const conflictResponse = waitForBuildMutationResponse(page, "PATCH")
        await dialog.getByRole("button", { name: "変更する" }).click()
        expect((await conflictResponse).status()).toBe(409)
        await cancelDialog(dialog)

        // エラー通知と再読み込み導線
        const alert = configAlert(configList)
        await expect(alert).toBeVisible()
        await expect(alert).toContainText("先に更新されています")
        const reloadButton = alert.getByRole("button", { name: "再読み込み" })
        await expect(reloadButton).toBeVisible()

        // 再読み込みで最新状態を取得
        await reloadButton.click()
        await expect(alert).toBeHidden()
        await expect(configList.savedBuildButton("別端末で変更"))
            .toBeVisible()

        // 最新版で改名し直して回復
        await renameConfig(page, configList, "別端末で変更", "競合後の名前")
        const recoveredBuilds = await fetchServerBuilds(page)
        expect(recoveredBuilds.map((build) => build.name))
            .toEqual(["競合後の名前"])
    })

    // 自動保存の競合が通知され、再読み込み後の再保存で回復することを保証
    test("自動保存が競合すると通知し、再読み込みで回復する", async ({
        page,
        header,
        simulatorPage,
        configList,
        auth,
    }) => {
        await openServerMode({ page, header, simulatorPage, configList, auth })
        await selectFirstFrameAndWait(
            page,
            simulatorPage,
            configList,
            "構成1",
        )

        // 自動保存済みの構成と先頭フレームのパーツID
        const savedBuild = findServerBuild(
            await fetchServerBuilds(page),
            "構成1",
        )
        expect(savedBuild.parts).toHaveLength(1)
        const firstPartId = savedBuild.parts[0]!.partId

        // 別端末相当のAPI更新で版を進める
        await renameServerBuild(page, savedBuild, savedBuild.name)

        // 2件目のフレームを選ぶため、スマホ幅の構成一覧を閉じる
        await closeConfigSidebar(configList)
        // 古い版のまま2件目のフレームを選び、自動保存の409を確認
        const conflictResponse = waitForBuildUpdateResponse(page)
        await selectFrameCandidate(page, simulatorPage, 1)
        expect((await conflictResponse).status()).toBe(409)

        // スマホ幅でも通知を確認できるよう構成一覧を開く
        await openConfigSidebar(configList)
        // エラー通知と再読み込み導線
        const alert = configAlert(configList)
        await expect(alert).toBeVisible()
        await expect(alert).toContainText("先に更新されています")
        const reloadButton = alert.getByRole("button", { name: "再読み込み" })
        await expect(reloadButton).toBeVisible()

        // 再読み込み後の自動再保存の成功を待つ
        const retryResponse = waitForBuildUpdateResponse(page)
        await reloadButton.click()
        await expect(alert).toBeHidden()
        expect((await retryResponse).ok()).toBe(true)

        // 2件目のフレームがサーバーへ保存された
        await expect.poll(async () =>
            (await fetchServerBuild(page, savedBuild.id)).parts[0]?.partId,
        ).not.toBe(firstPartId)
        const recoveredBuild = await fetchServerBuild(page, savedBuild.id)
        expect(recoveredBuild.parts).toHaveLength(1)
    })

    // 別経路で削除済みの構成を改名したときの通知と一覧回復を保証
    test("削除済みの構成を改名すると見つからない旨を表示する", async ({
        page,
        header,
        simulatorPage,
        configList,
        auth,
    }) => {
        await openServerMode({ page, header, simulatorPage, configList, auth })
        await createConfig(page, configList, "削除対象")
        const targetBuild = findServerBuild(
            await fetchServerBuilds(page),
            "削除対象",
        )

        // 別経路のAPIで先に削除
        await deleteServerBuild(page, targetBuild)

        // 画面に残る構成の改名で404を確認
        const dialog = await openRenameDialog(
            page,
            configList,
            "削除対象",
            "改名後",
        )
        const notFoundResponse = waitForBuildMutationResponse(page, "PATCH")
        await dialog.getByRole("button", { name: "変更する" }).click()
        expect((await notFoundResponse).status()).toBe(404)
        await cancelDialog(dialog)

        // 見つからない旨の通知と再読み込み導線
        const alert = configAlert(configList)
        await expect(alert).toContainText("保存構成が見つかりません")
        const reloadButton = alert.getByRole("button", { name: "再読み込み" })
        await expect(reloadButton).toBeVisible()

        // 再読み込みで一覧から消える
        await reloadButton.click()
        await expect(alert).toBeHidden()
        await expect(configList.savedBuildButton("削除対象")).toBeHidden()
        await expect(configList.countBadge).toHaveText(
            `1 / ${MAX_SERVER_CONFIGS}`,
        )
        expect((await fetchServerBuilds(page)).map((build) => build.name))
            .toEqual(["構成1"])
    })

    // 別経路で削除済みの構成を削除したときの通知と一覧回復を保証
    test("削除済みの構成を削除すると見つからない旨を表示する", async ({
        page,
        header,
        simulatorPage,
        configList,
        auth,
    }) => {
        await openServerMode({ page, header, simulatorPage, configList, auth })
        await createConfig(page, configList, "削除対象")
        const targetBuild = findServerBuild(
            await fetchServerBuilds(page),
            "削除対象",
        )

        // 別経路のAPIで先に削除
        await deleteServerBuild(page, targetBuild)

        // 画面に残る構成の削除で404を確認
        const dialog = await openDeleteDialog(page, configList, "削除対象")
        const notFoundResponse = waitForBuildMutationResponse(page, "DELETE")
        await dialog.getByRole("button", { name: "削除する" }).click()
        expect((await notFoundResponse).status()).toBe(404)
        await cancelDialog(dialog)

        // 見つからない旨の通知と再読み込み導線
        const alert = configAlert(configList)
        await expect(alert).toContainText("保存構成が見つかりません")
        const reloadButton = alert.getByRole("button", { name: "再読み込み" })
        await expect(reloadButton).toBeVisible()

        // 再読み込みで一覧から消える
        await reloadButton.click()
        await expect(alert).toBeHidden()
        await expect(configList.savedBuildButton("削除対象")).toBeHidden()
        await expect(configList.countBadge).toHaveText(
            `1 / ${MAX_SERVER_CONFIGS}`,
        )
        expect((await fetchServerBuilds(page)).map((build) => build.name))
            .toEqual(["構成1"])
    })

    // 保存上限に達した状態で追加したときの上限エラーと件数回復を保証
    test("保存上限に達した状態で追加すると上限エラーを表示する", async ({
        page,
        header,
        simulatorPage,
        configList,
        auth,
    }) => {
        // APIで19件作成するため、上限時間を延ばす
        test.slow()
        await openServerMode({ page, header, simulatorPage, configList, auth })

        // 構成1に加えて19件をAPIで作成し、上限の20件にする
        const extraNames = Array.from(
            { length: MAX_SERVER_CONFIGS - 1 },
            (_, index) => `上限構成${index + 2}`,
        )
        await createServerBuilds(page, extraNames)

        // 画面の件数は構成1のままなので、追加を試して409を確認
        const dialog = await openCreateDialog(page, configList, "上限超過")
        const limitResponse = waitForBuildMutationResponse(page, "POST")
        await dialog.getByRole("button", { name: "追加する" }).click()
        expect((await limitResponse).status()).toBe(409)
        await cancelDialog(dialog)

        // 上限エラーの通知と再読み込み導線
        const alert = configAlert(configList)
        await expect(alert).toContainText("保存できる構成は20件までです")
        const reloadButton = alert.getByRole("button", { name: "再読み込み" })
        await expect(reloadButton).toBeVisible()

        // 再読み込みで最新の20件と追加不可を表示
        await reloadButton.click()
        await expect(alert).toBeHidden()
        await expect(configList.countBadge).toHaveText(
            `${MAX_SERVER_CONFIGS} / ${MAX_SERVER_CONFIGS}`,
        )
        await expect(configList.addButton).toBeDisabled()
        expect(await fetchServerBuilds(page)).toHaveLength(MAX_SERVER_CONFIGS)
    })

    // 最後の1件を削除したときに構成1を作り直すことを保証
    test("最後の構成を削除すると構成1を作り直す", async ({
        page,
        header,
        simulatorPage,
        configList,
        auth,
    }) => {
        // 作り直しと再読み込みを含むため、上限時間を延ばす
        test.slow()
        await openServerMode({ page, header, simulatorPage, configList, auth })
        const lastBuild = findServerBuild(
            await fetchServerBuilds(page),
            "構成1",
        )

        // 最後の1件を削除し、作り直しのPOST応答を待つ
        const recreateResponse = waitForBuildMutationResponse(page, "POST")
        await deleteConfig(page, configList, "構成1")
        expect((await recreateResponse).ok()).toBe(true)

        // 作り直された構成1をAPIで確認
        await expect(configList.countBadge).toHaveText(
            `1 / ${MAX_SERVER_CONFIGS}`,
        )
        const recreatedBuilds = await fetchServerBuilds(page)
        expect(recreatedBuilds).toHaveLength(1)
        const recreatedBuild = findServerBuild(recreatedBuilds, "構成1")
        expect(recreatedBuild.id).not.toBe(lastBuild.id)
        expect(recreatedBuild.parts).toHaveLength(0)
        await expect.poll(() => fetchServerConfigOrder(page)).toEqual([
            configItemKey(recreatedBuild.id),
        ])

        // 再読み込み後も作り直した構成1が残る
        await reloadServerMode(page, header, configList)
        await waitForConfigOrder(page, configList, ["構成1"])
        const persistedBuilds = await fetchServerBuilds(page)
        expect(persistedBuilds.map((build) => build.id))
            .toEqual([recreatedBuild.id])
    })
})
